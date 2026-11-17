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
    const reason = body?.reason?.trim() || "Pembatalan / Retur transaksi penjualan";

    const result = await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!sale) {
        throw new Error("Transaksi penjualan tidak ditemukan");
      }

      if (sale.status === "VOIDED") {
        throw new Error("Transaksi penjualan ini sudah pernah dibatalkan (void)");
      }

      // Reverse stock (add back sold items)
      for (const item of sale.items) {
        const prod = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!prod) continue;

        const prevStock = prod.stock;
        const newStock = prevStock + item.quantity;

        await tx.product.update({
          where: { id: item.productId },
          data: { stock: newStock },
        });

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: "VOID_SALE",
            refNumber: sale.invoiceNumber,
            quantity: item.quantity,
            previousStock: prevStock,
            currentStock: newStock,
            reason: `Void Penjualan (${sale.invoiceNumber}): ${reason}`,
            createdById: session.id,
          },
        });
      }

      // Update sale status
      const updatedSale = await tx.sale.update({
        where: { id },
        data: { status: "VOIDED" },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          action: "VOID",
          entity: "Sale",
          recordId: id,
          metadata: JSON.stringify({ reason, invoiceNumber: sale.invoiceNumber }),
          createdById: session.id,
        },
      });

      return updatedSale;
    });

    return NextResponse.json({ success: true, sale: result });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Gagal membatalkan penjualan";
    const status = msg.includes("UNAUTHORIZED") ? 401 : msg.includes("FORBIDDEN") ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
