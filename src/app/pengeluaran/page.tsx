"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { formatRupiah, formatDate } from "@/lib/calculations";
import {
  Receipt,
  Plus,
  Trash2,
  Filter,
  DollarSign,
  X,
  AlertCircle,
  FolderPlus,
} from "lucide-react";

interface ExpenseCategory {
  id: string;
  name: string;
}

interface Expense {
  id: string;
  categoryId: string;
  categoryName: string;
  date: string;
  amount: number;
  description: string;
  creatorName: string;
  createdAt: string;
}

export default function PengeluaranPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Modal Add Expense
  const [showAddModal, setShowAddModal] = useState(false);
  const [formCatId, setFormCatId] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formDate, setFormDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal Add Category
  const [showAddCatModal, setShowAddCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState("");

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== "ALL") params.append("categoryId", selectedCategory);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const res = await fetch(`/api/expenses?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setExpenses(data.expenses || []);
        setTotalAmount(data.totalAmount || 0);
        setCategories(data.categories || []);
        if (data.categories?.length > 0 && !formCatId) {
          setFormCatId(data.categories[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setFormDate(new Date().toISOString().split("T")[0]);
    fetchExpenses();
  }, [selectedCategory, startDate, endDate]);

  const handleSubmitExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: formCatId,
          amount: Number(formAmount) || 0,
          description: formDesc.trim(),
          date: formDate,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mencatat pengeluaran");

      setShowAddModal(false);
      setFormAmount("");
      setFormDesc("");
      fetchExpenses();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitNewCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "CATEGORY",
          name: newCatName.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menambah kategori biaya");

      setShowAddCatModal(false);
      setNewCatName("");
      fetchExpenses();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Terjadi kesalahan");
    }
  };

  const handleDeleteExpense = async (id: string, desc: string) => {
    if (!confirm(`Hapus catatan biaya "${desc}"?`)) return;

    try {
      const res = await fetch(`/api/expenses?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus");
      fetchExpenses();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Terjadi kesalahan");
    }
  };

  return (
    <AppLayout
      title="Biaya Operasional"
      subtitle="Pencatatan pengeluaran operasional bengkel (listrik, gaji mekanik, sewa toko, konsumsi, dan alat)"
    >
      {/* Top Bar: Summary & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="bg-white px-5 py-3 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-4">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total Biaya Periode Terpilih
            </p>
            <p className="text-xl font-extrabold text-rose-700">{formatRupiah(totalAmount)}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 flex-wrap sm:flex-nowrap">
          <button
            onClick={() => setShowAddCatModal(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <FolderPlus className="w-4 h-4 text-slate-500" />
            <span>Kategori Biaya</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Pengeluaran</span>
          </button>
        </div>
      </div>

      {/* Filter Card */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs mb-6 flex flex-col sm:flex-row items-center gap-3">
        <div className="flex-1 w-full">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
          >
            <option value="ALL">Semua Kategori Biaya</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto text-xs">
          <span className="text-slate-500 font-medium whitespace-nowrap">Tanggal:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
          />
          <span className="text-slate-400">s/d</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-3.5 px-5">Tanggal</th>
                <th className="py-3.5 px-5">Kategori Biaya</th>
                <th className="py-3.5 px-5">Keterangan / Keperluan</th>
                <th className="py-3.5 px-5 text-right">Nominal (Rp)</th>
                <th className="py-3.5 px-5">Dicatat Oleh</th>
                <th className="py-3.5 px-5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Memuat data pengeluaran...
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Belum ada pengeluaran yang dicatat pada periode ini.
                  </td>
                </tr>
              ) : (
                expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-5 text-slate-600 whitespace-nowrap">
                      {formatDate(e.date)}
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700">
                        {e.categoryName}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 font-medium text-slate-900">{e.description}</td>
                    <td className="py-3.5 px-5 text-right font-extrabold text-rose-700">
                      {formatRupiah(e.amount)}
                    </td>
                    <td className="py-3.5 px-5 text-slate-500">{e.creatorName}</td>
                    <td className="py-3.5 px-5 text-center">
                      <button
                        onClick={() => handleDeleteExpense(e.id, e.description)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add Expense */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Catat Pengeluaran Baru</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="my-3 p-3 rounded-lg bg-rose-50 text-rose-700 text-xs border border-rose-200">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmitExpense} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Kategori Pengeluaran *
                </label>
                <select
                  required
                  value={formCatId}
                  onChange={(e) => setFormCatId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nominal Pengeluaran (Rp) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  placeholder="50000"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tanggal Pengeluaran *
                </label>
                <input
                  type="date"
                  required
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Keterangan / Rincian Keperluan *
                </label>
                <textarea
                  required
                  rows={3}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Contoh: Pembayaran tagihan listrik PLN bengkel bulan November..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-semibold cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "Menyimpan..." : "Simpan Pengeluaran"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Add Category */}
      {showAddCatModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Tambah Kategori Biaya</h3>
              <button onClick={() => setShowAddCatModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitNewCategory} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Kategori Biaya *</label>
                <input
                  type="text"
                  required
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Contoh: Pajak & Retribusi"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddCatModal(false)}
                  className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-semibold cursor-pointer"
                >
                  Tambah Kategori
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
