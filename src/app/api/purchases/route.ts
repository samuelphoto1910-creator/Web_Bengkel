import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateUser } from "@/lib/auth";
import { calculateMovingAverageHPP, generateCode } from "@/lib/calculations";

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

    const purchases = await prisma.purchase.findMany({
      where,
      include: {
        supplier: true,
        user: { select: { id: true, name: true } },
        items: {
          include: {
            product: { select: { id: true, sku: true, name: true, unit: true } },
          },
        },
      },
      orderBy: { date: "desc" },
    });

    const result = purchases.map((p) => ({
      id: p.id,
      invoiceNumber: p.invoiceNumber,
      supplierId: p.supplierId,
      supplierName: p.supplier.name,
      date: p.date,
      status: p.status,
      subtotal: Number(p.subtotal),
      discount: Number(p.discount),
      additionalFee: Number(p.additionalFee),
      total: Number(p.total),
      notes: p.notes,
      creatorName: p.user.name,
      itemCount: p.items.length,
      items: p.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        sku: item.product.sku,
        productName: item.product.name,
        unit: item.product.unit,
        quantity: item.quantity,
        buyPrice: Number(item.buyPrice),
        subtotal: Number(item.subtotal),
      })),
      createdAt: p.createdAt,
    }));

    return NextResponse.json({ purchases: result });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Gagal memuat pembelian";
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
      supplierId,
      date = new Date(),
      discount = 0,
      additionalFee = 0,
      notes,
      items = [],
    } = body;

    if (!supplierId || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Supplier dan minimal satu barang wajib diisi" },
        { status: 400 }
      );
    }

    // Auto-generate invoice number if not specified
    let finalInvoiceNumber = invoiceNumber?.trim();
    if (!finalInvoiceNumber) {
      const todayCount = await prisma.purchase.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      });
      finalInvoiceNumber = generateCode("PB", todayCount + 1);
    }

    // Calculate subtotal
    let subtotalCalc = 0;
    const validatedItems = items.map((item: { productId: string; quantity: number; buyPrice: number }) => {
      const qty = Number(item.quantity) || 1;
      const price = Number(item.buyPrice) || 0;
      const sub = qty * price;
      subtotalCalc += sub;
      return {
        productId: item.productId,
        quantity: qty,
        buyPrice: price,
        subtotal: sub,
      };
    });

    const disc = Number(discount) || 0;
    const fee = Number(additionalFee) || 0;
    const grandTotal = Math.max(0, subtotalCalc - disc + fee);

    // Atomic transaction: create purchase, update stock & moving average HPP, log stock movements
    const purchaseResult = await prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.create({
        data: {
          invoiceNumber: finalInvoiceNumber,
          supplierId,
          date: new Date(date),
          status: "POSTED",
          subtotal: subtotalCalc,
          discount: disc,
          additionalFee: fee,
          total: grandTotal,
          notes: notes?.trim() || null,
          createdById: session.id,
          items: {
            create: validatedItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              buyPrice: item.buyPrice,
              subtotal: item.subtotal,
            })),
          },
        },
        include: { items: true, supplier: true },
      });

      // Update each product: stock, last buy price, moving weighted average HPP
      for (const item of validatedItems) {
        const prod = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!prod) {
          throw new Error(`Barang dengan ID ${item.productId} tidak ditemukan`);
        }

        const prevStock = prod.stock;
        const newStock = prevStock + item.quantity;
        const newHPP = calculateMovingAverageHPP(
          prevStock,
          prod.averageBuyPrice,
          item.quantity,
          item.buyPrice
        );

        // Update product
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: newStock,
            lastBuyPrice: item.buyPrice,
            averageBuyPrice: newHPP,
          },
        });

        // Insert stock movement
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: "IN_PURCHASE",
            refNumber: finalInvoiceNumber,
            quantity: item.quantity,
            previousStock: prevStock,
            currentStock: newStock,
            reason: `Pembelian dari ${purchase.supplier.name} (${finalInvoiceNumber})`,
            createdById: session.id,
          },
        });
      }

      // Record Audit Log
      await tx.auditLog.create({
        data: {
          action: "POST",
          entity: "Purchase",
          recordId: purchase.id,
          metadata: JSON.stringify({
            invoiceNumber: finalInvoiceNumber,
            total: grandTotal,
            itemCount: validatedItems.length,
          }),
          createdById: session.id,
        },
      });

      return purchase;
    });

    return NextResponse.json({ success: true, purchase: purchaseResult });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Gagal menyimpan pembelian";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
