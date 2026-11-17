import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await authenticateUser(req);
    if (!session) {
      return NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });
    }

    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: "asc" },
    });

    const result = categories.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      status: c.status,
      productCount: c._count.products,
      createdAt: c.createdAt,
    }));

    return NextResponse.json({ categories: result });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Gagal memuat kategori";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await authenticateUser(req);
    if (!session) {
      return NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });
    }

    const { name, description } = await req.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: "Nama kategori wajib diisi" }, { status: 400 });
    }

    const existing = await prisma.category.findUnique({
      where: { name: name.trim() },
    });
    if (existing) {
      return NextResponse.json({ error: "Kategori dengan nama ini sudah ada" }, { status: 400 });
    }

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        status: "ACTIVE",
      },
    });

    return NextResponse.json({ success: true, category });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Gagal menambah kategori";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await authenticateUser(req);
    if (!session) {
      return NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });
    }

    const { id, name, description, status } = await req.json();
    if (!id || !name?.trim()) {
      return NextResponse.json({ error: "ID dan Nama kategori wajib diisi" }, { status: 400 });
    }

    const updated = await prisma.category.update({
      where: { id },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        status: status || "ACTIVE",
      },
    });

    return NextResponse.json({ success: true, category: updated });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Gagal mengupdate kategori";
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
      return NextResponse.json({ error: "ID kategori wajib disertakan" }, { status: 400 });
    }

    // Per FR-04: Kategori yang sudah digunakan tidak dihapus secara fisik
    const productCount = await prisma.product.count({
      where: { categoryId: id },
    });

    if (productCount > 0) {
      // Soft-delete / nonaktifkan
      await prisma.category.update({
        where: { id },
        data: { status: "INACTIVE" },
      });
      return NextResponse.json({
        success: true,
        message: "Kategori dinonaktifkan karena telah terhubung ke data produk.",
      });
    }

    // If completely unused, physical delete is permitted
    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Kategori berhasil dihapus." });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Gagal menghapus kategori";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
