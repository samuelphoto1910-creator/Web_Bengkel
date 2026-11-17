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
    const dateParam = searchParams.get("date"); // Optional specific date (YYYY-MM-DD)

    const targetDate = dateParam ? new Date(dateParam) : new Date();
    const startOfToday = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);

    // 1. DATA SEBELUM HARI INI (Untuk menghitung Sisa Saldo Kemarin / Saldo Awal)
    const [
      salesBefore,
      topUpsBefore,
      withdrawsBefore,
      expensesBefore,
    ] = await Promise.all([
      // Penjualan tunai sebelum hari ini
      prisma.sale.aggregate({
        where: {
          status: "POSTED",
          paymentMethod: "CASH",
          date: { lt: startOfToday },
        },
        _sum: { total: true },
      }),
      // Top up kas sebelum hari ini
      prisma.cashMutation.aggregate({
        where: {
          type: "TOP_UP",
          date: { lt: startOfToday },
        },
        _sum: { amount: true },
      }),
      // Tarik kas sebelum hari ini
      prisma.cashMutation.aggregate({
        where: {
          type: "WITHDRAW",
          date: { lt: startOfToday },
        },
        _sum: { amount: true },
      }),
      // Pengeluaran sebelum hari ini
      prisma.expense.aggregate({
        where: {
          date: { lt: startOfToday },
        },
        _sum: { amount: true },
      }),
    ]);

    const cashInBefore = (Number(salesBefore._sum.total) || 0) + (Number(topUpsBefore._sum.amount) || 0);
    const cashOutBefore = (Number(expensesBefore._sum.amount) || 0) + (Number(withdrawsBefore._sum.amount) || 0);
    const sisaSaldoKemarin = cashInBefore - cashOutBefore;

    // 2. DATA HARI INI
    const [
      salesToday,
      expensesToday,
      topUpsToday,
      withdrawsToday,
      recentMutations,
    ] = await Promise.all([
      prisma.sale.findMany({
        where: {
          status: "POSTED",
          date: { gte: startOfToday, lte: endOfToday },
        },
        include: {
          items: {
            include: {
              product: {
                select: { id: true, name: true, isService: true },
              },
            },
          },
        },
        orderBy: { date: "desc" },
      }),
      prisma.expense.aggregate({
        where: {
          date: { gte: startOfToday, lte: endOfToday },
        },
        _sum: { amount: true },
      }),
      prisma.cashMutation.aggregate({
        where: {
          type: "TOP_UP",
          date: { gte: startOfToday, lte: endOfToday },
        },
        _sum: { amount: true },
      }),
      prisma.cashMutation.aggregate({
        where: {
          type: "WITHDRAW",
          date: { gte: startOfToday, lte: endOfToday },
        },
        _sum: { amount: true },
      }),
      prisma.cashMutation.findMany({
        where: {
          date: { gte: startOfToday, lte: endOfToday },
        },
        include: {
          user: { select: { id: true, name: true } },
        },
        orderBy: { date: "desc" },
        take: 20,
      }),
    ]);

    let pemasukanHariIni = 0;
    let omzetTunaiHariIni = 0;
    let omzetDebitCreditHariIni = 0;
    let omzetTransferHariIni = 0;
    let omzetBarangHariIni = 0;
    let omzetJasaHariIni = 0;

    for (const sale of salesToday) {
      const saleTotal = Number(sale.total) || 0;
      pemasukanHariIni += saleTotal;

      if (sale.paymentMethod === "CASH") {
        omzetTunaiHariIni += saleTotal;
      } else if (sale.paymentMethod === "DEBIT" || sale.paymentMethod === "CREDIT") {
        omzetDebitCreditHariIni += saleTotal;
      } else if (sale.paymentMethod === "TRANSFER") {
        omzetTransferHariIni += saleTotal;
      }

      for (const item of sale.items) {
        const itemSubtotal = Number(item.subtotal) || 0;
        if (item.product?.isService) {
          omzetJasaHariIni += itemSubtotal;
        } else {
          omzetBarangHariIni += itemSubtotal;
        }
      }
    }

    const pengeluaranHariIni = Number(expensesToday._sum.amount) || 0;
    const topUpHariIni = Number(topUpsToday._sum.amount) || 0;
    const withdrawHariIni = Number(withdrawsToday._sum.amount) || 0;

    // Saldo Kasir (Uang Tunai Laci) Saat Ini
    const saldoKasir = sisaSaldoKemarin + omzetTunaiHariIni + topUpHariIni - pengeluaranHariIni - withdrawHariIni;

    return NextResponse.json({
      date: targetDate.toISOString().split("T")[0],
      saldoKasir,
      sisaSaldoKemarin,
      pemasukanHariIni,
      omzetTunaiHariIni,
      omzetDebitCreditHariIni,
      omzetTransferHariIni,
      omzetNonTunaiHariIni: omzetDebitCreditHariIni + omzetTransferHariIni,
      omzetBarangHariIni,
      omzetJasaHariIni,
      pengeluaranHariIni,
      topUpHariIni,
      withdrawHariIni,
      mutations: recentMutations.map((m) => ({
        id: m.id,
        date: m.date,
        type: m.type,
        amount: Number(m.amount),
        notes: m.notes,
        userName: m.user.name,
      })),
    });
  } catch (error) {
    console.error("Error GET /api/cash:", error);
    return NextResponse.json({ error: "Gagal mengambil data saldo kas" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await authenticateUser(req);
    if (!session) {
      return NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });
    }

    const body = await req.json();
    const { amount, notes, type = "TOP_UP", date } = body;

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      return NextResponse.json({ error: "Nominal harus lebih dari 0" }, { status: 400 });
    }

    if (type !== "TOP_UP" && type !== "WITHDRAW") {
      return NextResponse.json({ error: "Tipe mutasi tidak valid" }, { status: 400 });
    }

    const mutation = await prisma.cashMutation.create({
      data: {
        amount: numAmount,
        notes: notes ? String(notes).trim() : type === "TOP_UP" ? "Tambah Saldo Kas Operasional" : "Tarik Kas",
        type,
        date: date ? new Date(date) : new Date(),
        createdById: session.id,
      },
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({
      success: true,
      mutation: {
        id: mutation.id,
        date: mutation.date,
        type: mutation.type,
        amount: Number(mutation.amount),
        notes: mutation.notes,
        userName: mutation.user.name,
      },
    });
  } catch (error) {
    console.error("Error POST /api/cash:", error);
    return NextResponse.json({ error: "Gagal mencatat mutasi kas" }, { status: 500 });
  }
}
