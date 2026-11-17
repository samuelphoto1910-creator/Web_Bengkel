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

    // Default to current month if not specified
    const now = new Date();
    const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const start = startDate ? new Date(startDate) : defaultStart;
    const end = endDate ? new Date(`${endDate}T23:59:59.999Z`) : defaultEnd;

    // 1. Fetch POSTED sales with items in date range
    const sales = await prisma.sale.findMany({
      where: {
        status: "POSTED",
        date: {
          gte: start,
          lte: end,
        },
      },
      include: {
        items: {
          include: {
            product: { select: { id: true, sku: true, name: true } },
          },
        },
      },
      orderBy: { date: "asc" },
    });

    // 2. Fetch Expenses in date range
    const expenses = await prisma.expense.findMany({
      where: {
        date: {
          gte: start,
          lte: end,
        },
      },
      include: { category: true },
      orderBy: { date: "asc" },
    });

    // 3. Calculate Aggregates
    let totalOmzet = 0;
    let totalHpp = 0;

    const topProductMap: Record<
      string,
      { sku: string; name: string; qty: number; subtotal: number; profit: number }
    > = {};

    const dailyTrendsMap: Record<
      string,
      { date: string; omzet: number; hpp: number; grossProfit: number; expense: number; netProfit: number }
    > = {};

    for (const sale of sales) {
      const saleDateStr = sale.date.toISOString().split("T")[0];

      if (!dailyTrendsMap[saleDateStr]) {
        dailyTrendsMap[saleDateStr] = {
          date: saleDateStr,
          omzet: 0,
          hpp: 0,
          grossProfit: 0,
          expense: 0,
          netProfit: 0,
        };
      }

      totalOmzet += Number(sale.total);
      dailyTrendsMap[saleDateStr].omzet += Number(sale.total);

      for (const item of sale.items) {
        const itemHpp = item.quantity * Number(item.hppSnapshot);
        const itemSubtotal = Number(item.subtotal);
        const itemProfit = itemSubtotal - itemHpp;

        totalHpp += itemHpp;
        dailyTrendsMap[saleDateStr].hpp += itemHpp;

        // Top product aggregation
        const key = item.productId;
        if (!topProductMap[key]) {
          topProductMap[key] = {
            sku: item.product.sku,
            name: item.product.name,
            qty: 0,
            subtotal: 0,
            profit: 0,
          };
        }
        topProductMap[key].qty += item.quantity;
        topProductMap[key].subtotal += itemSubtotal;
        topProductMap[key].profit += itemProfit;
      }
    }

    // Process expenses
    let totalExpenses = 0;
    const expenseCategoryMap: Record<string, { category: string; amount: number }> = {};

    for (const exp of expenses) {
      const expAmount = Number(exp.amount);
      totalExpenses += expAmount;

      const expDateStr = exp.date.toISOString().split("T")[0];
      if (!dailyTrendsMap[expDateStr]) {
        dailyTrendsMap[expDateStr] = {
          date: expDateStr,
          omzet: 0,
          hpp: 0,
          grossProfit: 0,
          expense: 0,
          netProfit: 0,
        };
      }
      dailyTrendsMap[expDateStr].expense += expAmount;

      const catName = exp.category.name;
      if (!expenseCategoryMap[catName]) {
        expenseCategoryMap[catName] = { category: catName, amount: 0 };
      }
      expenseCategoryMap[catName].amount += expAmount;
    }

    // Complete daily trend calculations
    const dailyTrends = Object.values(dailyTrendsMap)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => ({
        ...d,
        grossProfit: d.omzet - d.hpp,
        netProfit: d.omzet - d.hpp - d.expense,
      }));

    const labaKotor = totalOmzet - totalHpp;
    const labaBersih = labaKotor - totalExpenses;
    const marginKotor = totalOmzet > 0 ? (labaKotor / totalOmzet) * 100 : 0;
    const marginBersih = totalOmzet > 0 ? (labaBersih / totalOmzet) * 100 : 0;

    const topSellingProducts = Object.values(topProductMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);

    const expenseBreakdown = Object.values(expenseCategoryMap).sort(
      (a, b) => b.amount - a.amount
    );

    return NextResponse.json({
      summary: {
        omzet: totalOmzet,
        hpp: totalHpp,
        labaKotor,
        pengeluaran: totalExpenses,
        labaBersih,
        marginKotor: Math.round(marginKotor * 10) / 10,
        marginBersih: Math.round(marginBersih * 10) / 10,
        salesCount: sales.length,
        expenseCount: expenses.length,
      },
      dailyTrends,
      topSellingProducts,
      expenseBreakdown,
      period: {
        startDate: start.toISOString().split("T")[0],
        endDate: end.toISOString().split("T")[0],
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Gagal memproses laporan";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
