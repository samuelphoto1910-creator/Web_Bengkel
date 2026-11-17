"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { formatDate, formatDateTime } from "@/lib/calculations";
import {
  ClipboardCheck,
  CheckCircle2,
  AlertCircle,
  Plus,
  RefreshCw,
  Eye,
  X,
  Save,
} from "lucide-react";

interface Product {
  id: string;
  sku: string;
  name: string;
  unit: string;
  stock: number;
}

interface OpnameRow {
  productId: string;
  sku: string;
  name: string;
  unit: string;
  systemStock: number;
  physicalStock: number;
  difference: number;
  reason: string;
}

interface PastOpname {
  id: string;
  opnameNumber: string;
  date: string;
  status: "DRAFT" | "CONFIRMED";
  notes: string | null;
  creatorName: string;
  itemCount: number;
  items: Array<{
    id: string;
    sku: string;
    productName: string;
    unit: string;
    systemStock: number;
    physicalStock: number;
    difference: number;
    reason: string | null;
  }>;
}

export default function StokOpnamePage() {
  const [activeTab, setActiveTab] = useState<"new" | "history">("new");
  const [products, setProducts] = useState<Product[]>([]);
  const [opnameRows, setOpnameRows] = useState<OpnameRow[]>([]);
  const [notes, setNotes] = useState("");
  const [pastOpnames, setPastOpnames] = useState<PastOpname[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [viewingPast, setViewingPast] = useState<PastOpname | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [prodRes, opnameRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/stock-opname"),
      ]);

      if (prodRes.ok) {
        const prodData = await prodRes.json();
        const prods: Product[] = prodData.products || [];
        setProducts(prods);

        // Initialize rows with current system stock
        setOpnameRows(
          prods.map((p) => ({
            productId: p.id,
            sku: p.sku,
            name: p.name,
            unit: p.unit,
            systemStock: p.stock,
            physicalStock: p.stock, // Default to system stock
            difference: 0,
            reason: "",
          }))
        );
      }

      if (opnameRes.ok) {
        const opData = await opnameRes.json();
        setPastOpnames(opData.opnames || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePhysicalStockChange = (index: number, val: number) => {
    setOpnameRows((prev) => {
      const copy = [...prev];
      const item = copy[index];
      const phys = isNaN(val) ? 0 : val;
      copy[index] = {
        ...item,
        physicalStock: phys,
        difference: phys - item.systemStock,
      };
      return copy;
    });
  };

  const handleReasonChange = (index: number, reason: string) => {
    setOpnameRows((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        reason,
      };
      return copy;
    });
  };

  const handleSubmit = async (confirmImmediately: boolean) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    // Validate that items with difference have reasons
    const discrepanciesWithoutReason = opnameRows.filter(
      (r) => r.difference !== 0 && !r.reason.trim()
    );

    if (confirmImmediately && discrepanciesWithoutReason.length > 0) {
      setErrorMsg(
        `Ada ${discrepanciesWithoutReason.length} barang berselisih yang belum diisi alasannya. Harap isi alasan perbedaan stok sebelum konfirmasi.`
      );
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/stock-opname", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes,
          isConfirm: confirmImmediately,
          items: opnameRows.map((r) => ({
            productId: r.productId,
            systemStock: r.systemStock,
            physicalStock: r.physicalStock,
            reason: r.reason,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan stok opname");

      setSuccessMsg(
        confirmImmediately
          ? "Stok opname berhasil dikonfirmasi! Stok sistem telah diperbarui sesuai hasil fisik."
          : "Draft stok opname berhasil disimpan."
      );

      loadData();
      setActiveTab("history");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  };

  const totalDifferences = opnameRows.filter((r) => r.difference !== 0).length;

  return (
    <AppLayout
      title="Stok Opname Fisik"
      subtitle="Pencocokan saldo stok sistem dengan hitung fisik berkala di gudang & etalase bengkel"
    >
      {/* Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="flex items-center space-x-2 bg-white p-1 rounded-xl border border-slate-200 shadow-xs overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab("new")}
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "new"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            <span>Form Hitung Fisik Baru</span>
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "history"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <span>Riwayat Sesi Opname ({pastOpnames.length})</span>
          </button>
        </div>

        {activeTab === "new" && (
          <div className="text-xs text-slate-600 font-medium">
            Barang berselisih:{" "}
            <strong className={totalDifferences > 0 ? "text-rose-600" : "text-emerald-700"}>
              {totalDifferences} item
            </strong>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {activeTab === "new" ? (
        <div className="space-y-6">
          {/* Notes Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Catatan Sesi Stok Opname (Opsional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Stok opname akhir bulan / Audit tahunan / Pemeriksaan rak oli..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          {/* Table Physical Count */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                    <th className="py-3.5 px-4">SKU</th>
                    <th className="py-3.5 px-4">Nama Barang</th>
                    <th className="py-3.5 px-4 text-center">Stok Sistem</th>
                    <th className="py-3.5 px-4 text-center">Hitung Fisik (Aktual)</th>
                    <th className="py-3.5 px-4 text-center">Selisih</th>
                    <th className="py-3.5 px-4">Alasan Selisih (Wajib Jika Beda)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        Memuat data persediaan...
                      </td>
                    </tr>
                  ) : (
                    opnameRows.map((row, idx) => (
                      <tr key={row.productId} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{row.sku}</td>
                        <td className="py-3 px-4 font-medium text-slate-900">{row.name}</td>
                        <td className="py-3 px-4 text-center font-bold text-slate-600 bg-slate-50/50">
                          {row.systemStock} {row.unit}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <input
                              type="number"
                              min="0"
                              value={row.physicalStock}
                              onChange={(e) =>
                                handlePhysicalStockChange(idx, parseInt(e.target.value, 10))
                              }
                              className="w-20 text-center px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                            />
                            <span className="text-slate-500 text-xs">{row.unit}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full font-bold text-xs ${
                              row.difference === 0
                                ? "bg-slate-100 text-slate-600"
                                : row.difference > 0
                                ? "bg-blue-100 text-blue-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {row.difference > 0 ? `+${row.difference}` : row.difference} {row.unit}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            value={row.reason}
                            disabled={row.difference === 0}
                            onChange={(e) => handleReasonChange(idx, e.target.value)}
                            placeholder={
                              row.difference === 0
                                ? "Sesuai (tidak ada selisih)"
                                : "Wajib diisi: barang pecah / hilang / salah catat..."
                            }
                            className={`w-full px-2.5 py-1.5 rounded-lg border text-xs ${
                              row.difference !== 0 && !row.reason.trim()
                                ? "border-rose-300 bg-rose-50/40 placeholder-rose-400"
                                : "border-slate-300 bg-white"
                            }`}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Action Bar */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                Konfirmasi akan memperbarui saldo stok sistem dan membuat catatan audit pergerakan stok (OPNAME).
              </p>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleSubmit(false)}
                  className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  Simpan Sebagai Draft
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleSubmit(true)}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{submitting ? "Memproses..." : "Terapkan & Konfirmasi Fisik"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Tab 2: Past Opnames */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                  <th className="py-3.5 px-5">No. Opname</th>
                  <th className="py-3.5 px-5">Tanggal</th>
                  <th className="py-3.5 px-5">Keterangan</th>
                  <th className="py-3.5 px-5 text-center">Jumlah Barang</th>
                  <th className="py-3.5 px-5 text-center">Status</th>
                  <th className="py-3.5 px-5">Pencatat</th>
                  <th className="py-3.5 px-5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {pastOpnames.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      Belum ada sesi stok opname yang tercatat.
                    </td>
                  </tr>
                ) : (
                  pastOpnames.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-5 font-mono font-bold text-slate-900">
                        {o.opnameNumber}
                      </td>
                      <td className="py-3.5 px-5 text-slate-600">{formatDate(o.date)}</td>
                      <td className="py-3.5 px-5 text-slate-500">{o.notes || "-"}</td>
                      <td className="py-3.5 px-5 text-center font-bold text-blue-600">
                        {o.itemCount} item
                      </td>
                      <td className="py-3.5 px-5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                            o.status === "CONFIRMED"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {o.status === "CONFIRMED" ? "Diterapkan" : "Draft"}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-slate-500">{o.creatorName}</td>
                      <td className="py-3.5 px-5 text-center">
                        <button
                          onClick={() => setViewingPast(o)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Past Opname Modal */}
      {viewingPast && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Hasil Opname: {viewingPast.opnameNumber}
                </h3>
                <p className="text-xs text-slate-500">
                  {formatDate(viewingPast.date)} • Oleh: {viewingPast.creatorName}
                </p>
              </div>
              <button
                onClick={() => setViewingPast(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4">
              <table className="w-full text-left text-xs mb-4">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 uppercase font-semibold">
                    <th className="py-2 px-3">SKU</th>
                    <th className="py-2 px-3">Barang</th>
                    <th className="py-2 px-3 text-center">Sistem</th>
                    <th className="py-2 px-3 text-center">Fisik</th>
                    <th className="py-2 px-3 text-center">Selisih</th>
                    <th className="py-2 px-3">Alasan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {viewingPast.items.map((it) => (
                    <tr key={it.id}>
                      <td className="py-2.5 px-3 font-mono font-medium">{it.sku}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-900">{it.productName}</td>
                      <td className="py-2.5 px-3 text-center">
                        {it.systemStock} {it.unit}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold">
                        {it.physicalStock} {it.unit}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`font-bold ${
                            it.difference === 0
                              ? "text-slate-500"
                              : it.difference > 0
                              ? "text-blue-600"
                              : "text-rose-600"
                          }`}
                        >
                          {it.difference > 0 ? `+${it.difference}` : it.difference}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">{it.reason || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingPast(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
