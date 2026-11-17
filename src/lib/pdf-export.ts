import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatRupiah } from "./calculations";

export interface PDFBengkelInfo {
  storeName: string;
  phone: string;
  address: string;
}

export interface PDFReportData {
  bengkel: PDFBengkelInfo;
  periodLabel: string;
  generatedAt: string;
  omzet: number;
  hpp: number;
  labaKotor: number;
  pengeluaran: number;
  labaBersih: number;
  topSellingItems: Array<{
    name: string;
    sku: string;
    qty: number;
    subtotal: number;
    profit: number;
  }>;
  expenses: Array<{
    date: string;
    category: string;
    description: string;
    amount: number;
  }>;
}

export function generateFinancialReportPDF(data: PDFReportData): Buffer {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Header / Kop Bengkel
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(30, 58, 138); // Dark Blue
  doc.text(data.bengkel.storeName.toUpperCase(), pageWidth / 2, 18, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(75, 85, 99); // Gray
  doc.text(data.bengkel.address, pageWidth / 2, 24, { align: "center" });
  doc.text(`Telp/WA: ${data.bengkel.phone}`, pageWidth / 2, 29, { align: "center" });

  // Divider Line
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.8);
  doc.line(14, 33, pageWidth - 14, 33);

  // Document Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(17, 24, 39);
  doc.text("LAPORAN LABA RUGI OPERASIONAL", pageWidth / 2, 42, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(107, 114, 128);
  doc.text(`Periode: ${data.periodLabel}`, 14, 50);
  doc.text(`Dicetak Pada: ${data.generatedAt}`, pageWidth - 14, 50, { align: "right" });

  // Summary KPI Table
  autoTable(doc, {
    startY: 55,
    theme: "grid",
    head: [["Komponen Finansial", "Nominal (Rp)"]],
    body: [
      ["Total Penjualan / Omzet (A)", formatRupiah(data.omzet)],
      ["Harga Pokok Penjualan - HPP (B)", formatRupiah(data.hpp)],
      ["Laba Kotor (A - B)", formatRupiah(data.labaKotor)],
      ["Beban / Pengeluaran Operasional (C)", formatRupiah(data.pengeluaran)],
      ["Laba Bersih Operasional (A - B - C)", formatRupiah(data.labaBersih)],
    ],
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    columnStyles: {
      0: { fontStyle: "normal", cellWidth: 120 },
      1: { halign: "right", fontStyle: "bold" },
    },
    didParseCell: (hookData) => {
      // Highlight Net Profit Row
      if (hookData.section === "body" && hookData.row.index === 4) {
        hookData.cell.styles.fillColor = [220, 252, 231]; // Soft Green
        hookData.cell.styles.textColor = [22, 101, 52];
      }
    },
  });

  // Top Selling Items Section
  let currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(17, 24, 39);
  doc.text("Ringkasan Penjualan Produk", 14, currentY);

  const topItemsBody = data.topSellingItems.map((item) => [
    item.sku,
    item.name,
    item.qty.toString(),
    formatRupiah(item.subtotal),
    formatRupiah(item.profit),
  ]);

  autoTable(doc, {
    startY: currentY + 4,
    theme: "striped",
    head: [["SKU", "Nama Barang", "Qty Terjual", "Omzet", "Laba"]],
    body: topItemsBody.length > 0 ? topItemsBody : [["-", "Tidak ada penjualan pada periode ini", "-", "-", "-"]],
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    columnStyles: {
      2: { halign: "center" },
      3: { halign: "right" },
      4: { halign: "right" },
    },
  });

  // Operational Expenses Section
  currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  if (currentY > 230) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(17, 24, 39);
  doc.text("Rincian Biaya Operasional", 14, currentY);

  const expenseBody = data.expenses.map((exp) => [
    exp.date,
    exp.category,
    exp.description,
    formatRupiah(exp.amount),
  ]);

  autoTable(doc, {
    startY: currentY + 4,
    theme: "striped",
    head: [["Tanggal", "Kategori", "Keterangan", "Jumlah"]],
    body: expenseBody.length > 0 ? expenseBody : [["-", "Tidak ada pengeluaran", "-", "-"]],
    headStyles: {
      fillColor: [220, 38, 38],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    columnStyles: {
      3: { halign: "right" },
    },
  });

  // Signatures
  currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;
  if (currentY > 250) {
    doc.addPage();
    currentY = 30;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(55, 65, 81);

  doc.text("Dibuat Oleh,", 30, currentY);
  doc.text("( ............................. )", 30, currentY + 25);
  doc.text("Admin / Operator", 30, currentY + 30);

  doc.text("Mengetahui & Menyetujui,", pageWidth - 70, currentY);
  doc.text("( ............................. )", pageWidth - 70, currentY + 25);
  doc.text("Pemilik Bengkel", pageWidth - 70, currentY + 30);

  const pdfOutput = doc.output("arraybuffer");
  return Buffer.from(pdfOutput);
}
