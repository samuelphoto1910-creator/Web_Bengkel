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
  Wallet,
  Coins,
  TrendingUp,
  PlusCircle,
  Clock,
  ArrowDownCircle,
  ArrowUpCircle,
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

interface CashMutationItem {
  id: string;
  date: string;
  type: "TOP_UP" | "WITHDRAW";
  amount: number;
  notes: string;
  userName: string;
}

interface CashSummary {
  saldoKasir: number;
  sisaSaldoKemarin: number;
  pemasukanHariIni: number;
  pengeluaranHariIni: number;
  topUpHariIni: number;
  mutations: CashMutationItem[];
}

export default function PengeluaranPage() {
  const [activeTab, setActiveTab] = useState<"EXPENSES" | "MUTATIONS">("EXPENSES");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [cashSummary, setCashSummary] = useState<CashSummary | null>(null);
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

  // Modal Top Up Saldo Kas
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [topUpNotes, setTopUpNotes] = useState("");
  const [topUpSubmitting, setTopUpSubmitting] = useState(false);
  const [topUpError, setTopUpError] = useState<string | null>(null);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      // 1. Fetch expenses
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

      // 2. Fetch cash summary
      const cashRes = await fetch("/api/cash");
      if (cashRes.ok) {
        const cashData = await cashRes.json();
        setCashSummary(cashData);
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

  const handleTopUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTopUpSubmitting(true);
    setTopUpError(null);

    try {
      const res = await fetch("/api/cash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(topUpAmount) || 0,
          notes: topUpNotes.trim() || "Tambah Saldo Kas Operasional",
          type: "TOP_UP",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menambah saldo kas");

      setShowTopUpModal(false);
      setTopUpAmount("");
      setTopUpNotes("");
      fetchExpenses();
    } catch (err: unknown) {
      setTopUpError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setTopUpSubmitting(false);
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
      title="Biaya Operasional & Kas"
      subtitle="Kelola pengeluaran operasional bengkel (listrik, bensin, konsumsi) dan pantau saldo kasir"
    >
      {/* ======================================================== */}
      {/* TOP CASH SUMMARY WIDGET                                   */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Saldo Kasir Saat Ini */}
        <div className="bg-white rounded-2xl p-4 border border-blue-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-blue-700 font-bold mb-1">
            <span>SALDO KASIR SAAT INI</span>
            <Wallet className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {formatRupiah(cashSummary?.saldoKasir ?? 0)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Uang tunai fisik di laci saat ini</p>
        </div>

        {/* Sisa Saldo Kemarin */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold mb-1">
            <span>SISA HARI KEMARIN</span>
            <Coins className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold text-amber-700">
            {formatRupiah(cashSummary?.sisaSaldoKemarin ?? 0)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Saldo awal otomatis dari hari kemarin</p>
        </div>

        {/* Pengeluaran Hari Ini */}
        <div className="bg-white rounded-2xl p-4 border border-rose-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-rose-600 font-bold mb-1">
            <span>PENGELUARAN HARI INI</span>
            <Receipt className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-xl font-bold text-rose-700">
            {formatRupiah(cashSummary?.pengeluaranHariIni ?? 0)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Total biaya operasional keluar hari ini</p>
        </div>

        {/* Pemasukan Hari Ini */}
        <div className="bg-white rounded-2xl p-4 border border-emerald-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-emerald-600 font-bold mb-1">
            <span>PEMASUKAN HARI INI</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-emerald-700">
            {formatRupiah(cashSummary?.pemasukanHariIni ?? 0)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Dari nota penjualan & jasa hari ini</p>
        </div>
      </div>

      {/* Top Bar: Tabs & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        {/* Navigation Tabs */}
        <div className="flex items-center space-x-2 bg-white p-1 rounded-xl border border-slate-200 shadow-xs">
          <button
            onClick={() => setActiveTab("EXPENSES")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeTab === "EXPENSES"
                ? "bg-rose-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Biaya Operasional</span>
          </button>
          <button
            onClick={() => setActiveTab("MUTATIONS")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeTab === "MUTATIONS"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Riwayat Mutasi Saldo Kas</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2 flex-wrap sm:flex-nowrap">
          <button
            onClick={() => {
              setTopUpError(null);
              setShowTopUpModal(true);
            }}
            className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Tambah Saldo Kas</span>
          </button>

          <button
            onClick={() => setShowAddCatModal(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <FolderPlus className="w-4 h-4 text-slate-500" />
            <span>Kategori Biaya</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Pengeluaran</span>
          </button>
        </div>
      </div>

      {activeTab === "EXPENSES" ? (
        <>
          {/* Filter Card for Expenses */}
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
        </>
      ) : (
        /* Tab 2: Riwayat Mutasi Saldo Kas (Top-up & Adjustments) */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Riwayat Tambahan Modal & Mutasi Kas Hari Ini
              </h3>
              <p className="text-[11px] text-slate-500">
                Pencatatan uang masuk modal kasir untuk operasional
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/60 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                  <th className="py-3.5 px-5">Waktu</th>
                  <th className="py-3.5 px-5">Tipe</th>
                  <th className="py-3.5 px-5">Keterangan</th>
                  <th className="py-3.5 px-5 text-right">Nominal (Rp)</th>
                  <th className="py-3.5 px-5">Dicatat Oleh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {!cashSummary?.mutations || cashSummary.mutations.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      Belum ada mutasi tambah saldo kas hari ini.
                    </td>
                  </tr>
                ) : (
                  cashSummary.mutations.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-5 text-slate-600 whitespace-nowrap">
                        {formatDate(m.date)}
                      </td>
                      <td className="py-3.5 px-5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            m.type === "TOP_UP"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {m.type === "TOP_UP" ? "➕ Tambah Saldo" : "➖ Tarik Kas"}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 font-medium text-slate-900">{m.notes}</td>
                      <td className="py-3.5 px-5 text-right font-extrabold text-blue-700">
                        +{formatRupiah(m.amount)}
                      </td>
                      <td className="py-3.5 px-5 text-slate-500">{m.userName}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: TAMBAH SALDO KAS (TOP UP)                          */}
      {/* ======================================================== */}
      {showTopUpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <PlusCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Tambah Saldo Kas Operasional</h3>
                  <p className="text-[11px] text-slate-400">Modal kasir / tambahan dana operasional</p>
                </div>
              </div>
              <button
                onClick={() => setShowTopUpModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {topUpError && (
              <div className="mt-3 p-3 rounded-lg bg-rose-50 text-rose-700 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{topUpError}</span>
              </div>
            )}

            <form onSubmit={handleTopUpSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nominal Tambah Saldo (Rp) *
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs text-slate-400 font-bold">
                    Rp
                  </span>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="Contoh: 200000"
                    value={topUpAmount}
                    onChange={(e) => setTopUpAmount(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Quick Nominal Chips */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {[50000, 100000, 200000, 500000, 1000000].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setTopUpAmount(val.toString())}
                    className="px-2.5 py-1 rounded-md text-[11px] bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 font-medium transition-colors"
                  >
                    +{formatRupiah(val)}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Keterangan / Sumber Dana
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Modal awal kasir / Suntikan dana pemilik"
                  value={topUpNotes}
                  onChange={(e) => setTopUpNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTopUpModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={topUpSubmitting}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all disabled:opacity-50"
                >
                  {topUpSubmitting ? "Menyimpan..." : "Simpan Saldo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: TAMBAH BIAYA OPERASIONAL                           */}
      {/* ======================================================== */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Catat Biaya Operasional</h3>
                  <p className="text-[11px] text-slate-400">Pengeluaran untuk kebutuhan bengkel</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mt-3 p-3 rounded-lg bg-rose-50 text-rose-700 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmitExpense} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kategori Biaya *
                </label>
                <select
                  required
                  value={formCatId}
                  onChange={(e) => setFormCatId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nominal Biaya (Rp) *
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs text-slate-400 font-bold">
                    Rp
                  </span>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="Contoh: 50000"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tanggal Pengeluaran
                </label>
                <input
                  type="date"
                  required
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Keterangan / Keperluan *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Makan siang mekanik / Beli sabun colek & lap"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all disabled:opacity-50"
                >
                  {submitting ? "Menyimpan..." : "Simpan Pengeluaran"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: TAMBAH KATEGORI BIAYA                              */}
      {/* ======================================================== */}
      {showAddCatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">Tambah Kategori Biaya</h3>
              <button
                onClick={() => setShowAddCatModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitNewCategory} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Kategori Biaya *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Utilitas (Listrik/Air), Konsumsi, Sewa"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCatModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all"
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
