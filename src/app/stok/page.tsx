"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { formatRupiah, formatDateTime } from "@/lib/calculations";
import {
  Boxes,
  ArrowRightLeft,
  Search,
  Filter,
  Plus,
  Minus,
  AlertTriangle,
  X,
  History,
  FileSpreadsheet,
} from "lucide-react";

interface Product {
  id: string;
  sku: string;
  name: string;
  categoryName: string;
  unit: string;
  stock: number;
  minStock: number;
  averageBuyPrice: number;
  assetValue: number;
}

interface StockMovement {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  unit: string;
  type: string;
  refNumber: string;
  quantity: number;
  previousStock: number;
  currentStock: number;
  reason: string;
  userName: string;
  createdAt: string;
}

export default function StokPage() {
  const [activeTab, setActiveTab] = useState<"balance" | "card">("card");
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedType, setSelectedType] = useState("ALL");
  const [search, setSearch] = useState("");

  // Adjustment Modal
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjProductId, setAdjProductId] = useState("");
  const [adjType, setAdjType] = useState<"ADD" | "SUBTRACT">("ADD");
  const [adjQty, setAdjQty] = useState("1");
  const [adjReason, setAdjReason] = useState("");
  const [adjSubmitting, setAdjSubmitting] = useState(false);
  const [adjError, setAdjError] = useState<string | null>(null);

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/products");
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
        if (data.products?.length > 0 && !adjProductId) {
          setAdjProductId(data.products[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMovements = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedProductId) params.append("productId", selectedProductId);
      if (selectedType !== "ALL") params.append("type", selectedType);

      const res = await fetch(`/api/stock?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setMovements(data.movements || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (activeTab === "card") {
      fetchMovements();
    }
  }, [activeTab, selectedProductId, selectedType]);

  const handleOpenAdjust = (prodId?: string) => {
    if (prodId) setAdjProductId(prodId);
    setAdjType("ADD");
    setAdjQty("1");
    setAdjReason("");
    setAdjError(null);
    setShowAdjustModal(true);
  };

  const handleSubmitAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdjError(null);

    if (!adjProductId) {
      setAdjError("Pilih barang terlebih dahulu");
      return;
    }

    const qtyNum = parseInt(adjQty, 10);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      setAdjError("Jumlah kuantitas harus lebih dari 0");
      return;
    }

    // AC-06: Alasan wajib diisi
    if (!adjReason.trim()) {
      setAdjError("Alasan penyesuaian stok wajib diisi!");
      return;
    }

    setAdjSubmitting(true);

    try {
      const finalQty = adjType === "ADD" ? qtyNum : -qtyNum;
      const res = await fetch("/api/stock/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: adjProductId,
          adjustmentQty: finalQty,
          reason: adjReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan penyesuaian");

      setShowAdjustModal(false);
      fetchProducts();
      fetchMovements();
    } catch (err: unknown) {
      setAdjError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setAdjSubmitting(false);
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "IN_PURCHASE":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">Beli Masuk</span>;
      case "OUT_SALE":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">Jual Keluar</span>;
      case "ADJUSTMENT_IN":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">Penyesuaian (+)</span>;
      case "ADJUSTMENT_OUT":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">Penyesuaian (-)</span>;
      case "OPNAME":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">Stok Opname</span>;
      case "VOID_PURCHASE":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">Void Beli</span>;
      case "VOID_SALE":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800">Void Jual</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">{type}</span>;
    }
  };

  return (
    <AppLayout
      title="Stok & Kartu Stok"
      subtitle="Audit trail mutasi stok barang (keluar-masuk), saldo berjalan, dan penyesuaian stok fisik"
    >
      {/* Top Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center space-x-2 bg-white p-1 rounded-xl border border-slate-200 shadow-xs">
          <button
            onClick={() => setActiveTab("card")}
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "card"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Kartu Stok (Mutasi)</span>
          </button>
          <button
            onClick={() => setActiveTab("balance")}
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "balance"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>Saldo Stok Berjalan</span>
          </button>
        </div>

        <button
          onClick={() => handleOpenAdjust()}
          className="flex items-center space-x-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <ArrowRightLeft className="w-4 h-4" />
          <span>Penyesuaian Stok (Koreksi)</span>
        </button>
      </div>

      {activeTab === "card" ? (
        <div>
          {/* Filters for Kartu Stok */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs mb-6 flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Filter Berdasarkan Barang
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                <option value="">Semua Barang</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.sku}] {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-full sm:w-60">
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Tipe Mutasi Stok
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                <option value="ALL">Semua Tipe Mutasi</option>
                <option value="IN_PURCHASE">Pembelian (Masuk)</option>
                <option value="OUT_SALE">Penjualan (Keluar)</option>
                <option value="ADJUSTMENT_IN">Penyesuaian Masuk (+)</option>
                <option value="ADJUSTMENT_OUT">Penyesuaian Keluar (-)</option>
                <option value="OPNAME">Stok Opname</option>
                <option value="VOID_PURCHASE">Void Pembelian</option>
                <option value="VOID_SALE">Void Penjualan</option>
              </select>
            </div>
          </div>

          {/* Kartu Stok Movements Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                    <th className="py-3.5 px-4">Waktu</th>
                    <th className="py-3.5 px-4">SKU / Nama Barang</th>
                    <th className="py-3.5 px-4 text-center">Tipe Mutasi</th>
                    <th className="py-3.5 px-4 font-mono">No. Referensi</th>
                    <th className="py-3.5 px-4 text-center">Mutasi (Qty)</th>
                    <th className="py-3.5 px-4 text-center">Sebelum</th>
                    <th className="py-3.5 px-4 text-center font-bold">Sesudah</th>
                    <th className="py-3.5 px-4">Alasan / Keterangan</th>
                    <th className="py-3.5 px-4">Petugas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        Memuat data kartu stok...
                      </td>
                    </tr>
                  ) : movements.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        Belum ada riwayat pergerakan stok untuk kriteria ini.
                      </td>
                    </tr>
                  ) : (
                    movements.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                          {formatDateTime(m.createdAt)}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-mono text-[10px] font-bold text-slate-500">{m.sku}</p>
                          <p className="font-semibold text-slate-900">{m.productName}</p>
                        </td>
                        <td className="py-3 px-4 text-center">{getTypeBadge(m.type)}</td>
                        <td className="py-3 px-4 font-mono font-medium text-slate-700">
                          {m.refNumber}
                        </td>
                        <td className="py-3 px-4 text-center font-extrabold">
                          <span
                            className={
                              m.quantity > 0
                                ? "text-blue-600"
                                : m.quantity < 0
                                ? "text-rose-600"
                                : "text-slate-600"
                            }
                          >
                            {m.quantity > 0 ? `+${m.quantity}` : m.quantity} {m.unit}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center text-slate-500">
                          {m.previousStock}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-900 bg-slate-50/50">
                          {m.currentStock}
                        </td>
                        <td className="py-3 px-4 text-slate-600 max-w-xs">{m.reason}</td>
                        <td className="py-3 px-4 text-slate-500">{m.userName}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Tab 2: Saldo Stok Berjalan */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                  <th className="py-3.5 px-4">SKU</th>
                  <th className="py-3.5 px-4">Nama Barang</th>
                  <th className="py-3.5 px-4">Kategori</th>
                  <th className="py-3.5 px-4 text-center">Stok Fisik</th>
                  <th className="py-3.5 px-4 text-center">Batas Min</th>
                  <th className="py-3.5 px-4 text-right">HPP Moving Average</th>
                  <th className="py-3.5 px-4 text-right">Nilai Total Persediaan</th>
                  <th className="py-3.5 px-4 text-center">Aksi Cepat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{p.sku}</td>
                    <td className="py-3 px-4 font-medium text-slate-900">{p.name}</td>
                    <td className="py-3 px-4 text-slate-500">{p.categoryName}</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full font-bold text-xs ${
                          p.stock <= p.minStock
                            ? "bg-rose-100 text-rose-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {p.stock} {p.unit}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center text-slate-400">
                      {p.minStock} {p.unit}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-600">
                      {formatRupiah(p.averageBuyPrice)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-700">
                      {formatRupiah(p.assetValue)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleOpenAdjust(p.id)}
                        className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 font-semibold text-[11px] transition-colors cursor-pointer"
                      >
                        Koreksi Stok
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Penyesuaian Stok (AC-06: Wajib Alasan) */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Penyesuaian Stok Manual</h3>
              <button
                onClick={() => setShowAdjustModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {adjError && (
              <div className="my-3 p-3 rounded-lg bg-rose-50 text-rose-700 text-xs border border-rose-200">
                {adjError}
              </div>
            )}

            <form onSubmit={handleSubmitAdjustment} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Pilih Barang <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={adjProductId}
                  onChange={(e) => setAdjProductId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.sku}] {p.name} (Stok: {p.stock} {p.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Jenis Penyesuaian <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjType("ADD")}
                    className={`py-2 px-3 rounded-lg border font-bold flex items-center justify-center space-x-1.5 cursor-pointer ${
                      adjType === "ADD"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah Stok (+)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdjType("SUBTRACT")}
                    className={`py-2 px-3 rounded-lg border font-bold flex items-center justify-center space-x-1.5 cursor-pointer ${
                      adjType === "SUBTRACT"
                        ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <Minus className="w-4 h-4" />
                    <span>Kurang Stok (-)</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Jumlah Kuantitas Penyesuaian <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={adjQty}
                  onChange={(e) => setAdjQty(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Alasan Penyesuaian (Wajib Diisi - Sesuai Aturan Audit AC-06){" "}
                  <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  placeholder="Contoh: Barang rusak saat display / Selisih fisik saat bongkar kardus / Bonus promo distributor..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={adjSubmitting}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold cursor-pointer disabled:opacity-50"
                >
                  {adjSubmitting ? "Menyimpan..." : "Terapkan Koreksi Stok"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
