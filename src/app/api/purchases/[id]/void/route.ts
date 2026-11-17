import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireOwner } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireOwner(req);

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const reason = body?.reason?.trim() || "Pembatalan / Retur transaksi pembelian";

    const result = await prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!purchase) {
        throw new Error("Transaksi pembelian tidak ditemukan");
      }

      if (purchase.status === "VOIDED") {
        throw new Error("Transaksi pembelian ini sudah pernah dibatalkan (void)");
      }

      // Reverse stock for each item
      for (const item of purchase.items) {
        const prod = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!prod) continue;

        const prevStock = prod.stock;
        const newStock = Math.max(0, prevStock - item.quantity);

        await tx.product.update({
          where: { id: item.productId },
          data: { stock: newStock },
        });

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: "VOID_PURCHASE",
            refNumber: purchase.invoiceNumber,
            quantity: -item.quantity,
            previousStock: prevStock,
            currentStock: newStock,
            reason: `Void Pembelian (${purchase.invoiceNumber}): ${reason}`,
            createdById: session.id,
          },
        });
      }

      // Update purchase status
      const updatedPurchase = await tx.purchase.update({
        where: { id },
        data: { status: "VOIDED" },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          action: "VOID",
          entity: "Purchase",
          recordId: id,
          metadata: JSON.stringify({ reason, invoiceNumber: purchase.invoiceNumber }),
          createdById: session.id,
        },
      });

      return updatedPurchase;
    });

    return NextResponse.json({ success: true, purchase: result });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Gagal membatalkan pembelian";
    const status = msg.includes("UNAUTHORIZED") ? 401 : msg.includes("FORBIDDEN") ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
