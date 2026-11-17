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
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const categoryId = searchParams.get("categoryId");

    const where: Record<string, unknown> = {};

    if (categoryId && categoryId !== "ALL") {
      where.categoryId = categoryId;
    }

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(`${endDate}T23:59:59.999Z`),
      };
    }

    const [expenses, categories] = await Promise.all([
      prisma.expense.findMany({
        where,
        include: {
          category: true,
          user: { select: { id: true, name: true } },
        },
        orderBy: { date: "desc" },
      }),
      prisma.expenseCategory.findMany({
        where: { status: "ACTIVE" },
        orderBy: { name: "asc" },
      }),
    ]);

    const result = expenses.map((e) => ({
      id: e.id,
      categoryId: e.categoryId,
      categoryName: e.category.name,
      date: e.date,
      amount: Number(e.amount),
      description: e.description,
      creatorName: e.user.name,
      createdAt: e.createdAt,
    }));

    const totalAmount = result.reduce((sum, item) => sum + item.amount, 0);

    return NextResponse.json({
      expenses: result,
      totalAmount,
      categories,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Gagal memuat pengeluaran";
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

    // Check if adding category
    if (body.type === "CATEGORY") {
      const { name } = body;
      if (!name?.trim()) {
        return NextResponse.json({ error: "Nama kategori biaya wajib diisi" }, { status: 400 });
      }
      const cat = await prisma.expenseCategory.upsert({
        where: { name: name.trim() },
        update: {},
        create: { name: name.trim() },
      });
      return NextResponse.json({ success: true, category: cat });
    }

    const { categoryId, amount, description, date = new Date() } = body;

    if (!categoryId || !amount || !description?.trim()) {
      return NextResponse.json(
        { error: "Kategori, Jumlah (Nominal), dan Keterangan wajib diisi" },
        { status: 400 }
      );
    }

    const expense = await prisma.expense.create({
      data: {
        categoryId,
        amount: Number(amount),
        description: description.trim(),
        date: new Date(date),
        createdById: session.id,
      },
      include: { category: true },
    });

    return NextResponse.json({ success: true, expense });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Gagal menyimpan pengeluaran";
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
      return NextResponse.json({ error: "ID pengeluaran wajib disertakan" }, { status: 400 });
    }

    await prisma.expense.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Pengeluaran berhasil dihapus" });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Gagal menghapus pengeluaran";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
