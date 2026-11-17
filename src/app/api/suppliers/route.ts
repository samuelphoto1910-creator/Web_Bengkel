import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await authenticateUser(req);
    if (!session) {
      return NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });
    }

    const suppliers = await prisma.supplier.findMany({
      include: {
        _count: {
          select: { purchases: true },
        },
      },
      orderBy: { name: "asc" },
    });

    const result = suppliers.map((s) => ({
      id: s.id,
      name: s.name,
      contactPerson: s.contactPerson,
      phone: s.phone,
      address: s.address,
      notes: s.notes,
      status: s.status,
      purchaseCount: s._count.purchases,
      createdAt: s.createdAt,
    }));

    return NextResponse.json({ suppliers: result });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Gagal memuat supplier";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await authenticateUser(req);
    if (!session) {
      return NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });
    }

    const { name, contactPerson, phone, address, notes } = await req.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: "Nama supplier wajib diisi" }, { status: 400 });
    }

    const supplier = await prisma.supplier.create({
      data: {
        name: name.trim(),
        contactPerson: contactPerson?.trim() || null,
        phone: phone?.trim() || null,
        address: address?.trim() || null,
        notes: notes?.trim() || null,
        status: "ACTIVE",
      },
    });

    return NextResponse.json({ success: true, supplier });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Gagal menambah supplier";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await authenticateUser(req);
    if (!session) {
      return NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });
    }

    const { id, name, contactPerson, phone, address, notes, status } = await req.json();
    if (!id || !name?.trim()) {
      return NextResponse.json({ error: "ID dan Nama supplier wajib diisi" }, { status: 400 });
    }

    const updated = await prisma.supplier.update({
      where: { id },
      data: {
        name: name.trim(),
        contactPerson: contactPerson?.trim() || null,
        phone: phone?.trim() || null,
        address: address?.trim() || null,
        notes: notes?.trim() || null,
        status: status || "ACTIVE",
      },
    });

    return NextResponse.json({ success: true, supplier: updated });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Gagal memperbarui supplier";
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
      return NextResponse.json({ error: "ID supplier wajib disertakan" }, { status: 400 });
    }

    const purchaseCount = await prisma.purchase.count({
      where: { supplierId: id },
    });

    if (purchaseCount > 0) {
      await prisma.supplier.update({
        where: { id },
        data: { status: "INACTIVE" },
      });
      return NextResponse.json({
        success: true,
        message: "Supplier dinonaktifkan karena telah memiliki riwayat transaksi pembelian.",
      });
    }

    await prisma.supplier.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Supplier berhasil dihapus." });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Gagal menghapus supplier";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
