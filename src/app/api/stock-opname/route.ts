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

    const opnames = await prisma.stockOpname.findMany({
      include: {
        user: { select: { id: true, name: true } },
        items: {
          include: {
            product: { select: { id: true, sku: true, name: true, unit: true } },
          },
        },
      },
      orderBy: { date: "desc" },
    });

    const result = opnames.map((o) => ({
      id: o.id,
      opnameNumber: o.opnameNumber,
      date: o.date,
      status: o.status,
      notes: o.notes,
      creatorName: o.user.name,
      itemCount: o.items.length,
      items: o.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        sku: item.product.sku,
        productName: item.product.name,
        unit: item.product.unit,
        systemStock: item.systemStock,
        physicalStock: item.physicalStock,
        difference: item.difference,
        reason: item.reason,
      })),
      createdAt: o.createdAt,
    }));

    return NextResponse.json({ opnames: result });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Gagal memuat stok opname";
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
    const { opnameNumber, notes, items = [], isConfirm = false } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Minimal harus ada satu item dalam stok opname" },
        { status: 400 }
      );
    }

    let finalNumber = opnameNumber?.trim();
    if (!finalNumber) {
      const count = await prisma.stockOpname.count();
      finalNumber = generateCode("SO", count + 1);
    }

    const result = await prisma.$transaction(async (tx) => {
      // Create StockOpname header
      const opname = await tx.stockOpname.create({
        data: {
          opnameNumber: finalNumber,
          date: new Date(),
          status: isConfirm ? "CONFIRMED" : "DRAFT",
          notes: notes?.trim() || null,
          createdById: session.id,
          items: {
            create: items.map(
              (item: {
                productId: string;
                systemStock: number;
                physicalStock: number;
                reason?: string;
              }) => {
                const sys = Number(item.systemStock) || 0;
                const phy = Number(item.physicalStock) || 0;
                return {
                  productId: item.productId,
                  systemStock: sys,
                  physicalStock: phy,
                  difference: phy - sys,
                  reason: item.reason?.trim() || null,
                };
              }
            ),
          },
        },
        include: { items: true },
      });

      // If confirmed directly, adjust stock and log movement
      if (isConfirm) {
        for (const item of opname.items) {
          if (item.difference !== 0) {
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: item.physicalStock },
            });

            await tx.stockMovement.create({
              data: {
                productId: item.productId,
                type: "OPNAME",
                refNumber: finalNumber,
                quantity: item.difference,
                previousStock: item.systemStock,
                currentStock: item.physicalStock,
                reason: `Stok Opname ${finalNumber}: ${item.reason || "Penyesuaian fisik"}`,
                createdById: session.id,
              },
            });
          }
        }
      }

      return opname;
    });

    return NextResponse.json({ success: true, opname: result });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Gagal menyimpan stok opname";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
