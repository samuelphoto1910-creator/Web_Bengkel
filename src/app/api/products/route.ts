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
    const categoryId = searchParams.get("categoryId");
    const status = searchParams.get("status") || "ACTIVE";
    const search = searchParams.get("search") || "";
    const lowStockOnly = searchParams.get("lowStock") === "true";

    const where: Record<string, unknown> = {};

    if (status !== "ALL") {
      where.status = status;
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
      ];
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: true,
      },
      orderBy: { name: "asc" },
    });

    const result = products
      .filter((p) => {
        if (lowStockOnly) {
          return !p.isService && p.stock <= p.minStock;
        }
        return true;
      })
      .map((p) => {
        const stock = p.stock;
        const avgBuy = Number(p.averageBuyPrice);
        const sell = Number(p.sellPrice);
        return {
          id: p.id,
          sku: p.sku,
          name: p.name,
          categoryId: p.categoryId,
          categoryName: p.category.name,
          unit: p.unit,
          isService: p.isService,
          lastBuyPrice: Number(p.lastBuyPrice),
          averageBuyPrice: avgBuy,
          sellPrice: sell,
          stock: p.stock,
          minStock: p.minStock,
          assetValue: p.isService ? 0 : stock * avgBuy,
          isLowStock: !p.isService && p.stock <= p.minStock,
          status: p.status,
          createdAt: p.createdAt,
        };
      });

    return NextResponse.json({ products: result });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Gagal memuat barang";
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
      sku,
      name,
      categoryId,
      unit = "Pcs",
      buyPrice = 0,
      sellPrice = 0,
      initialStock = 0,
      minStock = 5,
      isService = false,
    } = body;

    if (!sku || !name || !categoryId) {
      return NextResponse.json(
        { error: "SKU, Nama Barang, dan Kategori wajib diisi" },
        { status: 400 }
      );
    }

    // Check SKU duplicate
    const existingSku = await prisma.product.findUnique({
      where: { sku: sku.trim() },
    });

    if (existingSku) {
      return NextResponse.json(
        { error: `SKU "${sku}" sudah digunakan pada barang lain` },
        { status: 400 }
      );
    }

    const isServ = Boolean(isService);

    // Create product in transaction
    const created = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          sku: sku.trim().toUpperCase(),
          name: name.trim(),
          categoryId,
          unit: isServ ? "Jasa" : unit.trim(),
          isService: isServ,
          lastBuyPrice: isServ ? 0 : Number(buyPrice),
          averageBuyPrice: isServ ? 0 : Number(buyPrice),
          sellPrice: Number(sellPrice),
          stock: isServ ? 0 : Number(initialStock),
          minStock: isServ ? 0 : Number(minStock),
          status: "ACTIVE",
        },
        include: { category: true },
      });

      // Record initial stock movement if initialStock > 0 and not service
      if (!isServ && Number(initialStock) > 0) {
        await tx.stockMovement.create({
          data: {
            productId: product.id,
            type: "ADJUSTMENT_IN",
            refNumber: "STOK-AWAL",
            quantity: Number(initialStock),
            previousStock: 0,
            currentStock: Number(initialStock),
            reason: "Saldo stok awal saat pendaftaran barang",
            createdById: session.id,
          },
        });
      }

      // Record audit log
      await tx.auditLog.create({
        data: {
          action: "CREATE",
          entity: "Product",
          recordId: product.id,
          metadata: JSON.stringify({ sku: product.sku, name: product.name, stock: product.stock }),
          createdById: session.id,
        },
      });

      return product;
    });

    return NextResponse.json({ success: true, product: created });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Gagal menambah barang";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await authenticateUser(req);
    if (!session) {
      return NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });
    }

    const body = await req.json();
    const { id, sku, name, categoryId, unit, sellPrice, minStock, status, isService } = body;

    if (!id || !sku || !name || !categoryId) {
      return NextResponse.json({ error: "Data wajib diisi" }, { status: 400 });
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        sku: sku.trim().toUpperCase(),
        name: name.trim(),
        categoryId,
        unit,
        sellPrice: Number(sellPrice),
        minStock: Number(minStock),
        status,
        ...(isService !== undefined ? { isService: Boolean(isService) } : {}),
      },
      include: { category: true },
    });

    return NextResponse.json({ success: true, product: updated });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Gagal memperbarui barang";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await authenticateUser(req);
    if (!session) {
      return NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID barang wajib disertakan" }, { status: 400 });
    }

    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return NextResponse.json({ error: "Barang tidak ditemukan" }, { status: 404 });
    }

    // Check transaction history
    const [purchaseCount, saleCount, opnameCount] = await Promise.all([
      prisma.purchaseItem.count({ where: { productId: id } }),
      prisma.saleItem.count({ where: { productId: id } }),
      prisma.stockOpnameItem.count({ where: { productId: id } }),
    ]);

    const hasTransactionsOrStock =
      purchaseCount > 0 || saleCount > 0 || opnameCount > 0 || product.stock > 0;

    if (hasTransactionsOrStock) {
      // Soft-delete / nonaktifkan agar audit trail & pembukuan tidak rusak
      await prisma.product.update({
        where: { id },
        data: { status: "INACTIVE" },
      });

      await prisma.auditLog.create({
        data: {
          action: "DEACTIVATE",
          entity: "Product",
          recordId: id,
          metadata: JSON.stringify({
            sku: product.sku,
            name: product.name,
            reason: "Soft delete karena sudah ada transaksi historis",
          }),
          createdById: session.id,
        },
      });

      return NextResponse.json({
        success: true,
        action: "DEACTIVATED",
        message: `Barang "${product.name}" dinonaktifkan (arsip) karena telah memiliki riwayat transaksi agar laporan keuangan masa lalu tetap aman.`,
      });
    }

    // If completely unused, physical delete is safe
    await prisma.$transaction(async (tx) => {
      await tx.stockMovement.deleteMany({ where: { productId: id } });
      await tx.auditLog.deleteMany({ where: { recordId: id } });
      await tx.product.delete({ where: { id } });
    });

    return NextResponse.json({
      success: true,
      action: "DELETED",
      message: `Barang "${product.name}" berhasil dihapus permanen dari sistem.`,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Gagal menghapus barang";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
