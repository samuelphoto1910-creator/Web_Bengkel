import ExcelJS from "exceljs";

export interface ReportFinancialData {
  periodLabel: string;
  omzet: number;
  hpp: number;
  labaKotor: number;
  pengeluaran: number;
  labaBersih: number;
  salesCount: number;
  salesItems: Array<{
    invoiceNumber: string;
    date: string;
    productName: string;
    sku: string;
    quantity: number;
    sellPrice: number;
    hppSnapshot: number;
    labaItem: number;
  }>;
  expenses: Array<{
    date: string;
    category: string;
    description: string;
    amount: number;
  }>;
}

export async function generateReportExcel(data: ReportFinancialData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sistem Inventory Bengkel Motor";
  workbook.created = new Date();

  // Sheet 1: Ringkasan Laba Rugi
  const summarySheet = workbook.addWorksheet("Ringkasan Laba Rugi");

  summarySheet.columns = [
    { header: "Indikator / Metrik", key: "metric", width: 35 },
    { header: "Nominal (Rp)", key: "value", width: 25 },
  ];

  summarySheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  summarySheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1E3A8A" }, // Dark blue
  };

  summarySheet.addRows([
    { metric: "Periode Laporan", value: data.periodLabel },
    { metric: "Total Penjualan / Omzet (A)", value: data.omzet },
    { metric: "Harga Pokok Penjualan - HPP (B)", value: data.hpp },
    { metric: "Laba Kotor (A - B)", value: data.labaKotor },
    { metric: "Biaya Operasional (C)", value: data.pengeluaran },
    { metric: "Laba Bersih Operasional (A - B - C)", value: data.labaBersih },
    { metric: "Total Transaksi Penjualan", value: data.salesCount },
  ]);

  // Format currency for value rows (rows 3 to 7)
  for (let i = 3; i <= 7; i++) {
    const cell = summarySheet.getCell(`B${i}`);
    cell.numFmt = "#,##0";
  }

  // Highlight Net Profit row
  const netProfitRow = summarySheet.getRow(7);
  netProfitRow.font = { bold: true };
  netProfitRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFDCFCE7" }, // Soft green
  };

  // Sheet 2: Rincian Penjualan & Margin
  const salesSheet = workbook.addWorksheet("Rincian Penjualan");
  salesSheet.columns = [
    { header: "No. Faktur", key: "invoice", width: 20 },
    { header: "Tanggal", key: "date", width: 16 },
    { header: "Kode SKU", key: "sku", width: 16 },
    { header: "Nama Barang", key: "name", width: 30 },
    { header: "Qty", key: "qty", width: 10 },
    { header: "Harga Jual Satuan", key: "sellPrice", width: 20 },
    { header: "HPP Snapshot", key: "hpp", width: 20 },
    { header: "Margin Laba (Rp)", key: "profit", width: 20 },
  ];

  salesSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  salesSheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2563EB" },
  };

  data.salesItems.forEach((item) => {
    const row = salesSheet.addRow({
      invoice: item.invoiceNumber,
      date: item.date,
      sku: item.sku,
      name: item.productName,
      qty: item.quantity,
      sellPrice: item.sellPrice,
      hpp: item.hppSnapshot,
      profit: item.labaItem,
    });
    row.getCell("sellPrice").numFmt = "#,##0";
    row.getCell("hpp").numFmt = "#,##0";
    row.getCell("profit").numFmt = "#,##0";
  });

  // Sheet 3: Rincian Pengeluaran Operasional
  const expenseSheet = workbook.addWorksheet("Rincian Biaya Operasional");
  expenseSheet.columns = [
    { header: "Tanggal", key: "date", width: 16 },
    { header: "Kategori Pengeluaran", key: "category", width: 25 },
    { header: "Deskripsi", key: "desc", width: 35 },
    { header: "Nominal (Rp)", key: "amount", width: 20 },
  ];

  expenseSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  expenseSheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFDC2626" }, // Red
  };

  data.expenses.forEach((exp) => {
    const row = expenseSheet.addRow({
      date: exp.date,
      category: exp.category,
      desc: exp.description,
      amount: exp.amount,
    });
    row.getCell("amount").numFmt = "#,##0";
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function generateProductsExcel(
  products: Array<{
    sku: string;
    name: string;
    category: string;
    unit: string;
    lastBuyPrice: number;
    averageBuyPrice: number;
    sellPrice: number;
    stock: number;
    minStock: number;
    assetValue: number;
    status: string;
  }>
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Master Barang & Stok");

  sheet.columns = [
    { header: "SKU", key: "sku", width: 15 },
    { header: "Nama Barang", key: "name", width: 32 },
    { header: "Kategori", key: "category", width: 20 },
    { header: "Satuan", key: "unit", width: 12 },
    { header: "Stok Saat Ini", key: "stock", width: 14 },
    { header: "Min. Stok", key: "minStock", width: 12 },
    { header: "HPP Rata-rata (Rp)", key: "avgBuyPrice", width: 20 },
    { header: "Harga Jual (Rp)", key: "sellPrice", width: 20 },
    { header: "Nilai Aset Persediaan", key: "assetValue", width: 24 },
    { header: "Status", key: "status", width: 12 },
  ];

  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1E3A8A" },
  };

  products.forEach((p) => {
    const row = sheet.addRow({
      sku: p.sku,
      name: p.name,
      category: p.category,
      unit: p.unit,
      stock: p.stock,
      minStock: p.minStock,
      avgBuyPrice: p.averageBuyPrice,
      sellPrice: p.sellPrice,
      assetValue: p.assetValue,
      status: p.status,
    });
    row.getCell("avgBuyPrice").numFmt = "#,##0";
    row.getCell("sellPrice").numFmt = "#,##0";
    row.getCell("assetValue").numFmt = "#,##0";
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
