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

    const result = await prisma.$transaction(
      async (tx) => {
        const purchase = await tx.purchase.findUnique({
          where: { id },
          include: {
            items: {
              include: {
                product: {
                  select: { id: true, name: true, stock: true },
                },
              },
            },
          },
        });

        if (!purchase) {
          throw new Error("Transaksi pembelian tidak ditemukan");
        }

        if (purchase.status === "VOIDED") {
          throw new Error("Transaksi pembelian ini sudah pernah dibatalkan (void)");
        }

        if (purchase.items.length > 0) {
          const runningStock = new Map<string, number>();
          for (const item of purchase.items) {
            if (!runningStock.has(item.productId)) {
              runningStock.set(item.productId, item.product.stock);
            }
          }

          const stockMovementsData = purchase.items.map((item) => {
            const prevStock = runningStock.get(item.productId)!;
            const newStock = Math.max(0, prevStock - item.quantity);
            runningStock.set(item.productId, newStock);

            return {
              productId: item.productId,
              type: "VOID_PURCHASE" as const,
              refNumber: purchase.invoiceNumber,
              quantity: -item.quantity,
              previousStock: prevStock,
              currentStock: newStock,
              reason: `Void Pembelian (${purchase.invoiceNumber}): ${reason}`,
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
      },
      {
        maxWait: 10000,
        timeout: 30000,
      }
    );

    return NextResponse.json({ success: true, purchase: result });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Gagal membatalkan pembelian";
    const status = msg.includes("UNAUTHORIZED") ? 401 : msg.includes("FORBIDDEN") ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
