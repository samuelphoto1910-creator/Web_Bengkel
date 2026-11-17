import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await authenticateUser(req);
    if (!session) {
      return NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");
    const type = searchParams.get("type");
    const limit = Number(searchParams.get("limit")) || 100;

    const where: Record<string, unknown> = {};

    if (productId) {
      where.productId = productId;
    }

    if (type && type !== "ALL") {
      where.type = type;
    }

    const movements = await prisma.stockMovement.findMany({
      where,
      include: {
        product: { select: { id: true, sku: true, name: true, unit: true } },
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const result = movements.map((m) => ({
      id: m.id,
      productId: m.productId,
      sku: m.product.sku,
      productName: m.product.name,
      unit: m.product.unit,
      type: m.type,
      refNumber: m.refNumber || "-",
      quantity: m.quantity,
      previousStock: m.previousStock,
      currentStock: m.currentStock,
      reason: m.reason || "-",
      userName: m.user?.name || "Sistem",
      createdAt: m.createdAt,
    }));

    return NextResponse.json({ movements: result });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Gagal memuat kartu stok";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
