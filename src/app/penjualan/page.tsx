"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import { formatRupiah, formatDate, formatDateTime } from "@/lib/calculations";
import {
  BadgeDollarSign,
  Plus,
  Eye,
  RotateCcw,
  Search,
  Printer,
  X,
  AlertCircle,
} from "lucide-react";

interface SaleItem {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  unit: string;
  quantity: number;
  sellPrice: number;
  hppSnapshot: number;
  discount: number;
  subtotal: number;
}

interface Sale {
  id: string;
  invoiceNumber: string;
  customerName: string;
  date: string;
  status: "POSTED" | "VOIDED";
  subtotal: number;
  discount: number;
  total: number;
  notes: string | null;
  creatorName: string;
  itemCount: number;
  items: SaleItem[];
}

export default function PenjualanPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Detail Modal
  const [viewingSale, setViewingSale] = useState<Sale | null>(null);

  // Void Modal
  const [voidingSale, setVoidingSale] = useState<Sale | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [voidSubmitting, setVoidSubmitting] = useState(false);
  const [voidError, setVoidError] = useState<string | null>(null);

  const fetchSales = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.append("status", statusFilter);

      const res = await fetch(`/api/sales?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setSales(data.sales || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, [statusFilter]);

  const handleOpenVoid = (s: Sale) => {
    setVoidingSale(s);
    setVoidReason("");
    setVoidError(null);
  };

  const handleConfirmVoid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voidingSale) return;
    if (!voidReason.trim()) {
      setVoidError("Alasan pembatalan (void) penjualan wajib diisi");
      return;
    }

    setVoidSubmitting(true);
    setVoidError(null);

    try {
      const res = await fetch(`/api/sales/${voidingSale.id}/void`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: voidReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membatalkan penjualan");

      setVoidingSale(null);
      fetchSales();
    } catch (err: unknown) {
      setVoidError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setVoidSubmitting(false);
    }
  };

  const handlePrintReceipt = (s: Sale) => {
    const printWindow = window.open("", "_blank", "width=400,height=600");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Struk Penjualan - ${s.invoiceNumber}</title>
          <style>
            body { font-family: monospace; font-size: 12px; margin: 15px; color: #111; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .bold { font-weight: bold; }
            .divider { border-bottom: 1px dashed #444; margin: 8px 0; }
            table { width: 100%; font-size: 11px; }
            td { vertical-align: top; }
          </style>
        </head>
        <body>
          <div class="text-center bold" style="font-size: 15px;">BENGKEL MOTOR SAHABAT</div>
          <div class="text-center">Jl. Raya Otomotif No. 123, Jakarta</div>
          <div class="text-center">Telp: 0812-3456-7890</div>
          <div class="divider"></div>
          <div>No: ${s.invoiceNumber}</div>
          <div>Tgl: ${formatDateTime(s.date)}</div>
          <div>Kasir: ${s.creatorName}</div>
          <div>Pelanggan: ${s.customerName}</div>
          <div class="divider"></div>
          <table>
            ${s.items
              .map(
                (it) => `
              <tr>
                <td colspan="3" class="bold">${it.productName}</td>
              </tr>
              <tr>
                <td>${it.quantity} x ${formatRupiah(it.sellPrice)}</td>
                <td class="text-right">${formatRupiah(it.subtotal)}</td>
              </tr>
            `
              )
              .join("")}
          </table>
          <div class="divider"></div>
          <table>
            <tr>
              <td>Subtotal</td>
              <td class="text-right">${formatRupiah(s.subtotal)}</td>
            </tr>
            ${
              s.discount > 0
                ? `<tr><td>Diskon</td><td class="text-right">-${formatRupiah(s.discount)}</td></tr>`
                : ""
            }
            <tr class="bold" style="font-size: 13px;">
              <td>TOTAL</td>
              <td class="text-right">${formatRupiah(s.total)}</td>
            </tr>
          </table>
          <div class="divider"></div>
          <div class="text-center" style="font-size: 10px; margin-top: 10px;">
            Terima kasih atas kunjungan Anda.<br/>Garansi servis & suku cadang asli.
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const filteredSales = sales.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.invoiceNumber.toLowerCase().includes(q) ||
      s.customerName.toLowerCase().includes(q)
    );
  });

  return (
    <AppLayout
      title="Daftar Penjualan & Kasir"
      subtitle="Histori transaksi penjualan suku cadang ke pelanggan, cetak struk, dan pembatalan (void)"
    >
      {/* Top Filter and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 flex-1 max-w-xl">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari No. Invoice atau Nama Pelanggan..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-xs"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-medium shadow-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Semua Status</option>
            <option value="POSTED">Terposting (Posted)</option>
            <option value="VOIDED">Dibatalkan (Voided)</option>
          </select>
        </div>

        <Link
          href="/penjualan/baru"
          className="flex items-center justify-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Buka POS / Kasir Baru</span>
        </Link>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-3.5 px-4">No. Invoice</th>
                <th className="py-3.5 px-4">Tanggal</th>
                <th className="py-3.5 px-4">Pelanggan</th>
                <th className="py-3.5 px-4 text-center">Jml Item</th>
                <th className="py-3.5 px-4 text-right">Total Transaksi</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4">Kasir</th>
                <th className="py-3.5 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Memuat data penjualan...
                  </td>
                </tr>
              ) : filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Tidak ada data penjualan.
                  </td>
                </tr>
              ) : (
                filteredSales.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {s.invoiceNumber}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{formatDate(s.date)}</td>
                    <td className="py-3.5 px-4 font-medium text-slate-900">{s.customerName}</td>
                    <td className="py-3.5 px-4 text-center font-semibold text-emerald-700">
                      {s.itemCount} barang
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                      {formatRupiah(s.total)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                          s.status === "POSTED"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-rose-100 text-rose-800 line-through"
                        }`}
                      >
                        {s.status === "POSTED" ? "Terposting" : "Void / Batal"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">{s.creatorName}</td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          onClick={() => setViewingSale(s)}
                          title="Lihat Detail Transaksi"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handlePrintReceipt(s)}
                          title="Cetak Struk"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        {s.status === "POSTED" && (
                          <button
                            onClick={() => handleOpenVoid(s)}
                            title="Batalkan Invoice (Void Reversal)"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {viewingSale && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Invoice Penjualan: {viewingSale.invoiceNumber}
                </h3>
                <p className="text-xs text-slate-500">
                  {viewingSale.customerName} • {formatDateTime(viewingSale.date)}
                </p>
              </div>
              <button
                onClick={() => setViewingSale(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4">
              <table className="w-full text-left text-xs mb-4">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                    <th className="py-2 px-3">SKU</th>
                    <th className="py-2 px-3">Barang</th>
                    <th className="py-2 px-3 text-center">Qty</th>
                    <th className="py-2 px-3 text-right">Harga Jual</th>
                    <th className="py-2 px-3 text-right">HPP Snapshot</th>
                    <th className="py-2 px-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {viewingSale.items.map((it) => (
                    <tr key={it.id}>
                      <td className="py-2.5 px-3 font-mono font-medium">{it.sku}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-900">{it.productName}</td>
                      <td className="py-2.5 px-3 text-center font-bold">
                        {it.quantity} {it.unit}
                      </td>
                      <td className="py-2.5 px-3 text-right">{formatRupiah(it.sellPrice)}</td>
                      <td className="py-2.5 px-3 text-right text-slate-500">
                        {formatRupiah(it.hppSnapshot)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                        {formatRupiah(it.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-1.5 max-w-xs ml-auto">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span>{formatRupiah(viewingSale.subtotal)}</span>
                </div>
                {viewingSale.discount > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Diskon:</span>
                    <span>- {formatRupiah(viewingSale.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-extrabold text-sm text-slate-900 pt-2 border-t border-slate-200">
                  <span>Grand Total:</span>
                  <span className="text-emerald-700">{formatRupiah(viewingSale.total)}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => handlePrintReceipt(viewingSale)}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Struk</span>
              </button>
              <button
                type="button"
                onClick={() => setViewingSale(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Void Modal */}
      {voidingSale && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center space-x-3 text-rose-600 mb-3">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-slate-900 text-base">Batalkan (Void) Penjualan?</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Anda akan membatalkan invoice <strong>{voidingSale.invoiceNumber}</strong> senilai{" "}
              <strong>{formatRupiah(voidingSale.total)}</strong>.
              <br />
              <span className="text-rose-600 font-semibold">
                Sistem akan secara otomatis mengembalikan stok barang yang telah terjual (reversal) dan mencatat jejak audit pergerakan stok.
              </span>
            </p>

            {voidError && (
              <div className="my-3 p-3 rounded-lg bg-rose-50 text-rose-700 text-xs border border-rose-200">
                {voidError}
              </div>
            )}

            <form onSubmit={handleConfirmVoid} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Alasan Pembatalan (Wajib) *
                </label>
                <textarea
                  required
                  rows={3}
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="Contoh: Barang salah beli / Pembeli membatalkan transaksi..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setVoidingSale(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={voidSubmitting}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-semibold cursor-pointer disabled:opacity-50"
                >
                  {voidSubmitting ? "Memproses..." : "Konfirmasi Void Penjualan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
