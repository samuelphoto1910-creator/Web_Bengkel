import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await authenticateUser(req);
    if (!session) {
      return NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });
    }

    const { productId, adjustmentQty, reason } = await req.json();

    if (!productId) {
      return NextResponse.json({ error: "Barang wajib dipilih" }, { status: 400 });
    }

    const qty = Number(adjustmentQty);
    if (isNaN(qty) || qty === 0) {
      return NextResponse.json(
        { error: "Kuantitas penyesuaian tidak boleh nol (0)" },
        { status: 400 }
      );
    }

    // AC-06: Penyesuaian stok mewajibkan alasan
    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { error: "Alasan penyesuaian stok wajib diisi (contoh: Barang rusak, Salah hitung, Bonus supplier)" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new Error("Barang tidak ditemukan");
      }

      const prevStock = product.stock;
      const newStock = prevStock + qty;

      if (newStock < 0) {
        throw new Error(
          `Penyesuaian ditolak. Stok tidak boleh negatif (Stok saat ini: ${prevStock}, pengurangan: ${Math.abs(qty)})`
        );
      }

      // Update product stock
      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: { stock: newStock },
      });

      // Insert stock movement record
      const type = qty > 0 ? "ADJUSTMENT_IN" : "ADJUSTMENT_OUT";
      await tx.stockMovement.create({
        data: {
          productId,
          type,
          refNumber: `ADJ-${Date.now().toString().slice(-6)}`,
          quantity: qty,
          previousStock: prevStock,
          currentStock: newStock,
          reason: reason.trim(),
          createdById: session.id,
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          action: "UPDATE",
          entity: "StockAdjustment",
          recordId: productId,
          metadata: JSON.stringify({
            productName: product.name,
            diff: qty,
            prevStock,
            newStock,
            reason: reason.trim(),
          }),
          createdById: session.id,
        },
      });

      return updatedProduct;
    }, {
      maxWait: 10000,
      timeout: 20000,
    });

    return NextResponse.json({ success: true, product: result });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Gagal menyimpan penyesuaian stok";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
