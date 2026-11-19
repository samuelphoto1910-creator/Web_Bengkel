import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateUser } from "@/lib/auth";
import { generateCode } from "@/lib/calculations";

export async function GET(req: NextRequest) {
  try {
    const session = await authenticateUser(req);
    if (!session) {
      return NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {};

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(`${endDate}T23:59:59.999Z`),
      };
    }

    const sales = await prisma.sale.findMany({
      where,
      include: {
        user: { select: { id: true, name: true } },
        items: {
          include: {
            product: { select: { id: true, sku: true, name: true, unit: true, isService: true } },
          },
        },
      },
      orderBy: { date: "desc" },
    });

    const result = sales.map((s) => ({
      id: s.id,
      invoiceNumber: s.invoiceNumber,
      customerName: s.customerName || "Umum",
      date: s.date,
      status: s.status,
      paymentMethod: s.paymentMethod,
      cardReference: s.cardReference,
      cashGiven: Number(s.cashGiven),
      change: Number(s.change),
      subtotal: Number(s.subtotal),
      discount: Number(s.discount),
      total: Number(s.total),
      notes: s.notes,
      creatorName: s.user.name,
      itemCount: s.items.length,
      items: s.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        sku: item.product.sku,
        productName: item.product.name,
        unit: item.product.unit,
        isService: item.product.isService,
        quantity: item.quantity,
        sellPrice: Number(item.sellPrice),
        hppSnapshot: Number(item.hppSnapshot),
        discount: Number(item.discount),
        subtotal: Number(item.subtotal),
      })),
      createdAt: s.createdAt,
    }));

    return NextResponse.json({ sales: result });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Gagal memuat penjualan";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await authenticateUser(req);
    if (!session) {
      return NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });
    }

    const body = await req.json();
    const {
      invoiceNumber,
      customerName = "Pelanggan Umum",
      date = new Date(),
      discount = 0,
      paymentMethod = "CASH",
      cardReference = null,
      cashGiven = 0,
      change = 0,
      notes,
      items = [],
    } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Minimal harus memilih satu barang untuk penjualan" },
        { status: 400 }
      );
    }

    // Generate Invoice Number if empty (with collision prevention)
    let finalInvoiceNumber = invoiceNumber?.trim();
    if (!finalInvoiceNumber) {
      const todayCount = await prisma.sale.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      });
      let seq = todayCount + 1;
      finalInvoiceNumber = generateCode("PJ", seq);
      while (await prisma.sale.findUnique({ where: { invoiceNumber: finalInvoiceNumber } })) {
        seq += 1;
        finalInvoiceNumber = generateCode("PJ", seq);
      }
    }

    // Atomic transaction for posting sale with timeout configuration
    const saleResult = await prisma.$transaction(
      async (tx) => {
        // 1. Batch fetch all products in a single round-trip
        const productIds = items.map((i: { productId: string }) => i.productId);
        const uniqueProductIds = Array.from(new Set(productIds));

        const products = await tx.product.findMany({
          where: { id: { in: uniqueProductIds } },
        });

        const productMap = new Map(products.map((p) => [p.id, p]));

        // Check if any product is missing
        for (const pid of uniqueProductIds) {
          if (!productMap.has(pid)) {
            throw new Error(`Barang dengan ID ${pid} tidak ditemukan`);
          }
        }

        // Aggregate requested quantities per product to accurately check total stock
        const requestedQtyMap = new Map<string, number>();
        for (const item of items) {
          const qty = Number(item.quantity) || 1;
          requestedQtyMap.set(item.productId, (requestedQtyMap.get(item.productId) || 0) + qty);
        }

        // Validate stock sufficiency for physical products (AC-04: Ditolak jika stok tidak cukup, kecuali jasa)
        for (const [pid, totalRequestedQty] of requestedQtyMap.entries()) {
          const prod = productMap.get(pid)!;
          if (!prod.isService && prod.stock < totalRequestedQty) {
            throw new Error(
              `Stok tidak mencukupi untuk "${prod.name}". Stok tersedia: ${prod.stock} ${prod.unit}, diminta: ${totalRequestedQty}`
            );
          }
        }

        let subtotalCalc = 0;
        const preparedItems = [];

        for (const item of items) {
          const qty = Number(item.quantity) || 1;
          const sellPrice = Number(item.sellPrice) || 0;
          const itemDisc = Number(item.discount) || 0;
          const sub = Math.max(0, qty * sellPrice - itemDisc);
          const product = productMap.get(item.productId)!;

          subtotalCalc += sub;
          preparedItems.push({
            productId: product.id,
            productName: product.name,
            unit: product.unit,
            isService: product.isService,
            currentStock: product.stock,
            quantity: qty,
            sellPrice,
            hppSnapshot: product.isService ? 0 : Number(product.averageBuyPrice),
            discount: itemDisc,
            subtotal: sub,
          });
        }

        const discTotal = Number(discount) || 0;
        const grandTotal = Math.max(0, subtotalCalc - discTotal);

        // Validasi payment method
        const validPaymentMethods = ["CASH", "DEBIT", "CREDIT", "TRANSFER"] as const;
        const finalPaymentMethod = validPaymentMethods.includes(paymentMethod as typeof validPaymentMethods[number])
          ? (paymentMethod as typeof validPaymentMethods[number])
          : "CASH";

        // 2. Create Sale Header & Details (Single Query)
        const sale = await tx.sale.create({
          data: {
            invoiceNumber: finalInvoiceNumber,
            customerName: customerName?.trim() || "Pelanggan Umum",
            date: new Date(date),
            status: "POSTED",
            paymentMethod: finalPaymentMethod,
            cardReference: cardReference ? String(cardReference).trim() : null,
            cashGiven: Number(cashGiven) || 0,
            change: Number(change) || 0,
            subtotal: subtotalCalc,
            discount: discTotal,
            total: grandTotal,
            notes: notes?.trim() || null,
            createdById: session.id,
            items: {
              create: preparedItems.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                sellPrice: item.sellPrice,
                hppSnapshot: item.hppSnapshot,
                discount: item.discount,
                subtotal: item.subtotal,
              })),
            },
          },
          include: { items: true },
        });

        // 3. Stock deduction and movements (Only for physical goods, jasa does not change stock)
        const physicalItems = preparedItems.filter((i) => !i.isService);

        if (physicalItems.length > 0) {
          // Track progressive stock in case an item appears multiple times
          const runningStock = new Map<string, number>();
          for (const item of physicalItems) {
            if (!runningStock.has(item.productId)) {
              runningStock.set(item.productId, item.currentStock);
            }
          }

          const stockMovementsData = physicalItems.map((item) => {
            const prevStock = runningStock.get(item.productId)!;
            const newStock = prevStock - item.quantity;
            runningStock.set(item.productId, newStock);

            return {
              productId: item.productId,
              type: "OUT_SALE" as const,
              refNumber: finalInvoiceNumber,
              quantity: -item.quantity,
              previousStock: prevStock,
              currentStock: newStock,
              reason: `Penjualan ${finalInvoiceNumber} (${sale.customerName})`,
              createdById: session.id,
            };
          });

          // Single batch insert for all stock movements
          await tx.stockMovement.createMany({
            data: stockMovementsData,
          });

          // Concurrently update physical product stock
          const stockUpdates = Array.from(runningStock.entries()).map(([productId, finalStock]) =>
            tx.product.update({
              where: { id: productId },
              data: { stock: finalStock },
            })
          );

          await Promise.all(stockUpdates);
        }

        // 4. Record Audit Log (Single Query)
        await tx.auditLog.create({
          data: {
            action: "POST",
            entity: "Sale",
            recordId: sale.id,
            metadata: JSON.stringify({
              invoiceNumber: finalInvoiceNumber,
              total: grandTotal,
              itemCount: preparedItems.length,
            }),
            createdById: session.id,
          },
        });

        return sale;
      },
      {
        maxWait: 10000,
        timeout: 30000,
      }
    );

    return NextResponse.json({ success: true, sale: saleResult });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Gagal memproses penjualan";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
