import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateUser } from "@/lib/auth";
import { generateFinancialReportPDF } from "@/lib/pdf-export";
import { formatDate, formatDateTime } from "@/lib/calculations";

export async function GET(req: NextRequest) {
  try {
    const session = await authenticateUser(req);
    if (!session) {
      return NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const now = new Date();
    const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
    const end = endDate ? new Date(`${endDate}T23:59:59.999Z`) : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const [settings, sales, expenses] = await Promise.all([
      prisma.setting.findFirst({ where: { id: "default" } }),
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
    const topMap: Record<string, { name: string; sku: string; qty: number; subtotal: number; profit: number }> = {};

    for (const s of sales) {
      omzet += Number(s.total);
      for (const item of s.items) {
        const itemHpp = item.quantity * Number(item.hppSnapshot);
        const sub = Number(item.subtotal);
        hpp += itemHpp;

        const pid = item.productId;
        if (!topMap[pid]) {
          topMap[pid] = {
            sku: item.product.sku,
            name: item.product.name,
            qty: 0,
            subtotal: 0,
            profit: 0,
          };
        }
        topMap[pid].qty += item.quantity;
        topMap[pid].subtotal += sub;
        topMap[pid].profit += sub - itemHpp;
      }
    }

    const totalExpense = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const labaKotor = omzet - hpp;
    const labaBersih = labaKotor - totalExpense;

    const pdfBuffer = generateFinancialReportPDF({
      bengkel: {
        storeName: settings?.storeName || "Bengkel Motor Sahabat",
        phone: settings?.phone || "0812-3456-7890",
        address: settings?.address || "Jl. Raya Otomotif No. 123, Jakarta",
      },
      periodLabel: `${formatDate(start)} - ${formatDate(end)}`,
      generatedAt: formatDateTime(new Date()),
      omzet,
      hpp,
      labaKotor,
      pengeluaran: totalExpense,
      labaBersih,
      topSellingItems: Object.values(topMap).sort((a, b) => b.qty - a.qty).slice(0, 10),
      expenses: expenses.map((e) => ({
        date: formatDate(e.date),
        category: e.category.name,
        description: e.description,
        amount: Number(e.amount),
      })),
    });

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="Laporan_Laba_Rugi_Bengkel.pdf"',
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Gagal mengekspor PDF";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
