"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import { formatRupiah, formatDate } from "@/lib/calculations";
import {
  ShoppingCart,
  Plus,
  Eye,
  RotateCcw,
  Search,
  Filter,
  X,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

interface PurchaseItem {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  unit: string;
  quantity: number;
  buyPrice: number;
  subtotal: number;
}

interface Purchase {
  id: string;
  invoiceNumber: string;
  supplierId: string;
  supplierName: string;
  date: string;
  status: "POSTED" | "VOIDED";
  subtotal: number;
  discount: number;
  additionalFee: number;
  total: number;
  notes: string | null;
  creatorName: string;
  itemCount: number;
  items: PurchaseItem[];
}

export default function PembelianPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Detail Modal
  const [viewingPurchase, setViewingPurchase] = useState<Purchase | null>(null);

  // Void Modal
  const [voidingPurchase, setVoidingPurchase] = useState<Purchase | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [voidSubmitting, setVoidSubmitting] = useState(false);
  const [voidError, setVoidError] = useState<string | null>(null);

  const fetchPurchases = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.append("status", statusFilter);

      const res = await fetch(`/api/purchases?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setPurchases(data.purchases || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, [statusFilter]);

  const handleOpenVoid = (p: Purchase) => {
    setVoidingPurchase(p);
    setVoidReason("");
    setVoidError(null);
  };

  const handleConfirmVoid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voidingPurchase) return;
    if (!voidReason.trim()) {
      setVoidError("Alasan pembatalan (void) wajib diisi");
      return;
    }

    setVoidSubmitting(true);
    setVoidError(null);

    try {
      const res = await fetch(`/api/purchases/${voidingPurchase.id}/void`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: voidReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membatalkan pembelian");

      setVoidingPurchase(null);
      fetchPurchases();
    } catch (err: unknown) {
      setVoidError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setVoidSubmitting(false);
    }
  };

  const filteredPurchases = purchases.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.invoiceNumber.toLowerCase().includes(q) ||
      p.supplierName.toLowerCase().includes(q)
    );
  });

  return (
    <AppLayout
      title="Daftar Pembelian & Stok Masuk"
      subtitle="Pencatatan faktur barang masuk dari distributor, histori transaksi, dan pembatalan (void)"
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
              placeholder="Cari No. Faktur atau Supplier..."
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
          href="/pembelian/baru"
          className="flex items-center justify-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Catat Pembelian Baru</span>
        </Link>
      </div>

      {/* Purchases Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-3.5 px-4">No. Faktur</th>
                <th className="py-3.5 px-4">Tanggal</th>
                <th className="py-3.5 px-4">Supplier</th>
                <th className="py-3.5 px-4 text-center">Jml Item</th>
                <th className="py-3.5 px-4 text-right">Total Transaksi</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4">Dicatat Oleh</th>
                <th className="py-3.5 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Memuat data pembelian...
                  </td>
                </tr>
              ) : filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Tidak ada data pembelian.
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {p.invoiceNumber}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{formatDate(p.date)}</td>
                    <td className="py-3.5 px-4 font-medium text-slate-900">{p.supplierName}</td>
                    <td className="py-3.5 px-4 text-center font-semibold text-blue-600">
                      {p.itemCount} barang
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                      {formatRupiah(p.total)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                          p.status === "POSTED"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-rose-100 text-rose-800 line-through"
                        }`}
                      >
                        {p.status === "POSTED" ? "Terposting" : "Void / Batal"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">{p.creatorName}</td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          onClick={() => setViewingPurchase(p)}
                          title="Lihat Detail Barang"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {p.status === "POSTED" && (
                          <button
                            onClick={() => handleOpenVoid(p)}
                            title="Batalkan Faktur (Reversal / Void)"
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

      {/* Modal View Detail */}
      {viewingPurchase && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Faktur Pembelian: {viewingPurchase.invoiceNumber}
                </h3>
                <p className="text-xs text-slate-500">
                  {viewingPurchase.supplierName} • {formatDate(viewingPurchase.date)}
                </p>
              </div>
              <button
                onClick={() => setViewingPurchase(null)}
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
                    <th className="py-2 px-3 text-right">Harga Beli Satuan</th>
                    <th className="py-2 px-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {viewingPurchase.items.map((it) => (
                    <tr key={it.id}>
                      <td className="py-2.5 px-3 font-mono font-medium">{it.sku}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-900">{it.productName}</td>
                      <td className="py-2.5 px-3 text-center font-bold">
                        {it.quantity} {it.unit}
                      </td>
                      <td className="py-2.5 px-3 text-right">{formatRupiah(it.buyPrice)}</td>
                      <td className="py-2.5 px-3 text-right font-semibold">
                        {formatRupiah(it.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-1.5 max-w-xs ml-auto">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span>{formatRupiah(viewingPurchase.subtotal)}</span>
                </div>
                {viewingPurchase.discount > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Diskon:</span>
                    <span>- {formatRupiah(viewingPurchase.discount)}</span>
                  </div>
                )}
                {viewingPurchase.additionalFee > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Biaya Tambahan:</span>
                    <span>+ {formatRupiah(viewingPurchase.additionalFee)}</span>
                  </div>
                )}
                <div className="flex justify-between font-extrabold text-sm text-slate-900 pt-2 border-t border-slate-200">
                  <span>Grand Total:</span>
                  <span className="text-blue-700">{formatRupiah(viewingPurchase.total)}</span>
                </div>
              </div>

              {viewingPurchase.notes && (
                <div className="mt-4 p-3 rounded-lg bg-blue-50/70 border border-blue-100 text-xs text-blue-900">
                  <span className="font-semibold">Catatan:</span> {viewingPurchase.notes}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingPurchase(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Void Pembelian */}
      {voidingPurchase && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center space-x-3 text-rose-600 mb-3">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-slate-900 text-base">Batalkan (Void) Pembelian?</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Anda akan membatalkan faktur <strong>{voidingPurchase.invoiceNumber}</strong> senilai{" "}
              <strong>{formatRupiah(voidingPurchase.total)}</strong>.
              <br />
              <span className="text-rose-600 font-semibold">
                Sistem akan secara otomatis mengurangi saldo stok kembali (reversal) dan mencatat jejak audit pergerakan stok.
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
                  placeholder="Contoh: Salah input jumlah barang / Faktur ganda / Barang diretur ke supplier..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setVoidingPurchase(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={voidSubmitting}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-semibold cursor-pointer disabled:opacity-50"
                >
                  {voidSubmitting ? "Memproses..." : "Konfirmasi Void Pembelian"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
