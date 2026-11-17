import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateUser } from "@/lib/auth";
import { generateReportExcel, generateProductsExcel } from "@/lib/excel-export";
import { formatDate } from "@/lib/calculations";

export async function GET(req: NextRequest) {
  try {
    const session = await authenticateUser(req);
    if (!session) {
      return NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "report";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (type === "products") {
      const products = await prisma.product.findMany({
        include: { category: true },
        orderBy: { name: "asc" },
      });

      const buffer = await generateProductsExcel(
        products.map((p) => {
          const avg = Number(p.averageBuyPrice);
          return {
            sku: p.sku,
            name: p.name,
            category: p.category.name,
            unit: p.unit,
            lastBuyPrice: Number(p.lastBuyPrice),
            averageBuyPrice: avg,
            sellPrice: Number(p.sellPrice),
            stock: p.stock,
            minStock: p.minStock,
            assetValue: p.stock * avg,
            status: p.status,
          };
        })
      );

      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": 'attachment; filename="Daftar_Barang_Bengkel.xlsx"',
        },
      });
    }

    // Default: Financial Report Excel
    const now = new Date();
    const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
    const end = endDate ? new Date(`${endDate}T23:59:59.999Z`) : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const [sales, expenses] = await Promise.all([
      prisma.sale.findMany({
        where: {
          status: "POSTED",
          date: { gte: start, lte: end },
        },
        include: {
          items: { include: { product: true } },
        },
      }),
      prisma.expense.findMany({
        where: {
          date: { gte: start, lte: end },
        },
        include: { category: true },
      }),
    ]);

    let omzet = 0;
    let hpp = 0;
    const salesItems: Array<{
      invoiceNumber: string;
      date: string;
      productName: string;
      sku: string;
      quantity: number;
      sellPrice: number;
      hppSnapshot: number;
      labaItem: number;
    }> = [];

    for (const s of sales) {
      omzet += Number(s.total);
      for (const item of s.items) {
        const itemHpp = item.quantity * Number(item.hppSnapshot);
        const sub = Number(item.subtotal);
        hpp += itemHpp;
        salesItems.push({
          invoiceNumber: s.invoiceNumber,
          date: formatDate(s.date),
          productName: item.product.name,
          sku: item.product.sku,
          quantity: item.quantity,
          sellPrice: Number(item.sellPrice),
          hppSnapshot: Number(item.hppSnapshot),
          labaItem: sub - itemHpp,
        });
      }
    }

    const totalExpense = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const labaKotor = omzet - hpp;
    const labaBersih = labaKotor - totalExpense;

    const buffer = await generateReportExcel({
      periodLabel: `${formatDate(start)} s/d ${formatDate(end)}`,
      omzet,
      hpp,
      labaKotor,
      pengeluaran: totalExpense,
      labaBersih,
      salesCount: sales.length,
      salesItems,
      expenses: expenses.map((e) => ({
        date: formatDate(e.date),
        category: e.category.name,
        description: e.description,
        amount: Number(e.amount),
      })),
    });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="Laporan_Keuangan_Bengkel.xlsx"',
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Gagal mengekspor Excel";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
