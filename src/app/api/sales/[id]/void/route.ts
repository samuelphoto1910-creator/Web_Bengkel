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

    const result = await prisma.$transaction(
      async (tx) => {
        const sale = await tx.sale.findUnique({
          where: { id },
          include: {
            items: {
              include: {
                product: {
                  select: { id: true, name: true, stock: true, isService: true },
                },
              },
            },
          },
        });

        if (!sale) {
          throw new Error("Transaksi penjualan tidak ditemukan");
        }

        if (sale.status === "VOIDED") {
          throw new Error("Transaksi penjualan ini sudah pernah dibatalkan (void)");
        }

        // Only reverse physical items (services do not have physical inventory)
        const physicalItems = sale.items.filter((item) => !item.product.isService);

        if (physicalItems.length > 0) {
          const runningStock = new Map<string, number>();
          for (const item of physicalItems) {
            if (!runningStock.has(item.productId)) {
              runningStock.set(item.productId, item.product.stock);
            }
          }

          const stockMovementsData = physicalItems.map((item) => {
            const prevStock = runningStock.get(item.productId)!;
            const newStock = prevStock + item.quantity;
            runningStock.set(item.productId, newStock);

            return {
              productId: item.productId,
              type: "VOID_SALE" as const,
              refNumber: sale.invoiceNumber,
              quantity: item.quantity,
              previousStock: prevStock,
              currentStock: newStock,
              reason: `Void Penjualan (${sale.invoiceNumber}): ${reason}`,
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
      },
      {
        maxWait: 10000,
        timeout: 30000,
      }
    );

    return NextResponse.json({ success: true, sale: result });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Gagal membatalkan penjualan";
    const status = msg.includes("UNAUTHORIZED") ? 401 : msg.includes("FORBIDDEN") ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
