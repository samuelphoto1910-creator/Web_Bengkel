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

    // Generate Invoice Number if empty
    let finalInvoiceNumber = invoiceNumber?.trim();
    if (!finalInvoiceNumber) {
      const todayCount = await prisma.sale.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      });
      finalInvoiceNumber = generateCode("PJ", todayCount + 1);
    }

    // Atomic transaction for posting sale
    const saleResult = await prisma.$transaction(async (tx) => {
      let subtotalCalc = 0;
      const preparedItems = [];

      // Validate stock availability and snapshot current HPP for each item
      for (const item of items) {
        const qty = Number(item.quantity) || 1;
        const sellPrice = Number(item.sellPrice) || 0;
        const itemDisc = Number(item.discount) || 0;
        const sub = Math.max(0, qty * sellPrice - itemDisc);

        // Fetch product with row-level check
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          throw new Error(`Barang dengan ID ${item.productId} tidak ditemukan`);
        }

        // Check if sufficient stock (AC-04: Ditolak jika stok tidak mencukupi, kecuali jasa)
        if (!product.isService && product.stock < qty) {
          throw new Error(
            `Stok tidak mencukupi untuk "${product.name}". Stok tersedia: ${product.stock} ${product.unit}, diminta: ${qty}`
          );
        }

        subtotalCalc += sub;
        preparedItems.push({
          productId: product.id,
          productName: product.name,
          unit: product.unit,
          isService: product.isService,
          currentStock: product.stock,
          quantity: qty,
          sellPrice,
          hppSnapshot: product.isService ? 0 : Number(product.averageBuyPrice), // HPP Jasa = 0
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

      // 1. Create Sale Header & Details
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

      // 2. Reduce stock and record stock movements (hanya untuk barang fisik, jasa tidak potong stok)
      for (const item of preparedItems) {
        if (item.isService) continue;

        const prevStock = item.currentStock;
        const newStock = prevStock - item.quantity;

        // Deduct product stock
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: newStock },
        });

        // Insert stock movement record
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: "OUT_SALE",
            refNumber: finalInvoiceNumber,
            quantity: -item.quantity,
            previousStock: prevStock,
            currentStock: newStock,
            reason: `Penjualan ${finalInvoiceNumber} (${sale.customerName})`,
            createdById: session.id,
          },
        });
      }

      // 3. Record Audit Log
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
    });

    return NextResponse.json({ success: true, sale: saleResult });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Gagal memproses penjualan";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
