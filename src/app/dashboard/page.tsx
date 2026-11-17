"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import { formatRupiah, formatDate } from "@/lib/calculations";
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  ShoppingCart,
  BadgeDollarSign,
  Package,
  Receipt,
  Plus,
  RefreshCw,
  Wallet,
  Coins,
  CreditCard,
  PlusCircle,
  X,
  AlertCircle,
  Wrench,
  CheckCircle2,
} from "lucide-react";

interface ReportSummary {
  omzet: number;
  hpp: number;
  labaKotor: number;
  pengeluaran: number;
  labaBersih: number;
  marginKotor: number;
  marginBersih: number;
  salesCount: number;
  expenseCount: number;
}

interface CashSummary {
  date: string;
  saldoKasir: number;
  sisaSaldoKemarin: number;
  pemasukanHariIni: number;
  omzetTunaiHariIni: number;
  omzetDebitCreditHariIni: number;
  omzetTransferHariIni: number;
  omzetNonTunaiHariIni: number;
  omzetBarangHariIni: number;
  omzetJasaHariIni: number;
  pengeluaranHariIni: number;
  topUpHariIni: number;
  withdrawHariIni: number;
}

interface LowStockProduct {
  id: string;
  sku: string;
  name: string;
  categoryName: string;
  stock: number;
  minStock: number;
  unit: string;
  isService?: boolean;
}

interface RecentSale {
  id: string;
  invoiceNumber: string;
  customerName: string;
  date: string;
  total: number;
  status: string;
  paymentMethod?: string;
}

interface ExpenseCategory {
  id: string;
  name: string;
}

export default function DashboardPage() {
  const [period, setPeriod] = useState<"today" | "week" | "month">("month");
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [cashSummary, setCashSummary] = useState<CashSummary | null>(null);
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
  const [todayDateText, setTodayDateText] = useState("");
  const [loading, setLoading] = useState(true);

  // Quick Action Modals
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [topUpNotes, setTopUpNotes] = useState("");
  const [topUpSubmitting, setTopUpSubmitting] = useState(false);
  const [topUpError, setTopUpError] = useState<string | null>(null);

  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDesc, setExpenseDesc] = useState("");
  const [expenseCatId, setExpenseCatId] = useState("");
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [expenseSubmitting, setExpenseSubmitting] = useState(false);
  const [expenseError, setExpenseError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const now = new Date();
      let startStr = "";
      const endStr = now.toISOString().split("T")[0];

      if (period === "today") {
        startStr = endStr;
      } else if (period === "week") {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        startStr = d.toISOString().split("T")[0];
      } else {
        const d = new Date(now.getFullYear(), now.getMonth(), 1);
        startStr = d.toISOString().split("T")[0];
      }

      // 1. Fetch Cash Summary (Real-time today cash)
      const cashRes = await fetch("/api/cash");
      if (cashRes.ok) {
        const cashData = await cashRes.json();
        setCashSummary(cashData);
      }

      // 2. Fetch report summary
      const repRes = await fetch(`/api/reports?startDate=${startStr}&endDate=${endStr}`);
      if (repRes.ok) {
        const repData = await repRes.json();
        setSummary(repData.summary);
      }

      // 3. Fetch low stock products
      const prodRes = await fetch("/api/products?lowStock=true");
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setLowStockProducts(prodData.products || []);
      }

      // 4. Fetch recent sales
      const salesRes = await fetch("/api/sales");
      if (salesRes.ok) {
        const salesData = await salesRes.json();
        setRecentSales((salesData.sales || []).slice(0, 5));
      }

      // 5. Fetch expense categories for quick modal
      const expCatRes = await fetch("/api/expenses");
      if (expCatRes.ok) {
        const expData = await expCatRes.json();
        const cats = expData.categories || [];
        setExpenseCategories(cats);
        if (cats.length > 0 && !expenseCatId) {
          setExpenseCatId(cats[0].id);
        }
      }
    } catch (e) {
      console.error("Dashboard fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setTodayDateText(
      new Date().toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    );
    fetchDashboardData();
  }, [period]);

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
          notes: topUpNotes.trim() || "Tambah Modal / Kas Operasional",
          type: "TOP_UP",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menambah saldo kas");

      setShowTopUpModal(false);
      setTopUpAmount("");
      setTopUpNotes("");
      fetchDashboardData();
    } catch (err: unknown) {
      setTopUpError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setTopUpSubmitting(false);
    }
  };

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setExpenseSubmitting(true);
    setExpenseError(null);

    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: expenseCatId,
          amount: Number(expenseAmount) || 0,
          description: expenseDesc.trim(),
          date: new Date().toISOString().split("T")[0],
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mencatat pengeluaran");

      setShowExpenseModal(false);
      setExpenseAmount("");
      setExpenseDesc("");
      fetchDashboardData();
    } catch (err: unknown) {
      setExpenseError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setExpenseSubmitting(false);
    }
  };

  return (
    <AppLayout
      title="Dashboard Ringkasan"
      subtitle="Ringkasan kas harian, transaksi penjualan, pergerakan stok, dan laba bengkel"
    >
      {/* ======================================================== */}
      {/* 💵 WIDGET UTAMA: KAS & SALDO KASIR HARI INI               */}
      {/* ======================================================== */}
      <div className="mb-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 p-6 text-white shadow-xl border border-slate-700/80">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-slate-700/60">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                KAS HARI INI
              </span>
              <span className="text-xs text-slate-400">
                {todayDateText || "Hari Ini"}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black mt-1 text-white tracking-tight flex items-center gap-2">
              <span>Arus Kas & Saldo Kasir</span>
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Uang kas di tangan dari sisa hari kemarin, pemasukan hari ini, dan biaya operasional
            </p>
          </div>

          {/* Quick Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setTopUpError(null);
                setShowTopUpModal(true);
              }}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Tambah Saldo Kas</span>
            </button>
            <button
              onClick={() => {
                setExpenseError(null);
                setShowExpenseModal(true);
              }}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/30 transition-all cursor-pointer"
            >
              <Receipt className="w-4 h-4" />
              <span>+ Catat Biaya Operasional</span>
            </button>
            <Link
              href="/penjualan/baru"
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
            >
              <BadgeDollarSign className="w-4 h-4" />
              <span>Kasir POS</span>
            </Link>
          </div>
        </div>

        {/* Big Balance & Breakdown Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
          {/* 1. Saldo Kasir Saat Ini */}
          <div className="bg-slate-800/80 backdrop-blur rounded-xl p-4 border border-blue-500/30 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center justify-between text-xs text-blue-300 font-semibold mb-1">
              <span>SALDO KASIR SAAT INI</span>
              <Wallet className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl lg:text-3xl font-black text-white tracking-tight">
              {formatRupiah(cashSummary?.saldoKasir ?? 0)}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Uang tunai kasir yang seharusnya ada di laci fisik sekarang
            </p>
          </div>

          {/* 2. Sisa Saldo Kemarin (Saldo Awal) */}
          <div className="bg-slate-800/80 backdrop-blur rounded-xl p-4 border border-slate-700/80">
            <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-1">
              <span>SISA HARI SEBELUMNYA</span>
              <Coins className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xl lg:text-2xl font-bold text-amber-300">
              {formatRupiah(cashSummary?.sisaSaldoKemarin ?? 0)}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Saldo awal kasir yang otomatis terbawa dari hari kemarin
            </p>
          </div>

          {/* 3. Pemasukan Hari Ini (Sparepart + Jasa) */}
          <div className="bg-slate-800/80 backdrop-blur rounded-xl p-4 border border-emerald-500/30">
            <div className="flex items-center justify-between text-xs text-emerald-300 font-semibold mb-1">
              <span>PEMASUKAN HARI INI</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl lg:text-2xl font-bold text-emerald-300">
              {formatRupiah(cashSummary?.pemasukanHariIni ?? 0)}
            </div>
            <div className="mt-2 text-[10px] space-y-0.5 text-slate-300">
              <div className="flex justify-between">
                <span>• Sparepart:</span>
                <span className="font-semibold text-white">{formatRupiah(cashSummary?.omzetBarangHariIni ?? 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>• Jasa Servis:</span>
                <span className="font-semibold text-purple-300">{formatRupiah(cashSummary?.omzetJasaHariIni ?? 0)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-700/60 pt-0.5 text-slate-400">
                <span>Tunai: {formatRupiah(cashSummary?.omzetTunaiHariIni ?? 0)}</span>
                <span>Non-Tunai: {formatRupiah(cashSummary?.omzetNonTunaiHariIni ?? 0)}</span>
              </div>
            </div>
          </div>

          {/* 4. Pengeluaran & Top Up Hari Ini */}
          <div className="bg-slate-800/80 backdrop-blur rounded-xl p-4 border border-rose-500/30">
            <div className="flex items-center justify-between text-xs text-rose-300 font-semibold mb-1">
              <span>BIAYA OPERASIONAL</span>
              <Receipt className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-xl lg:text-2xl font-bold text-rose-300">
              {formatRupiah(cashSummary?.pengeluaranHariIni ?? 0)}
            </div>
            <div className="mt-2 text-[10px] space-y-0.5 text-slate-300">
              <div className="flex justify-between">
                <span>• Tambah Modal (Top Up):</span>
                <span className="font-semibold text-blue-300">+{formatRupiah(cashSummary?.topUpHariIni ?? 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>• Biaya Operasional:</span>
                <span className="font-semibold text-rose-300">-{formatRupiah(cashSummary?.pengeluaranHariIni ?? 0)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Waktu (Bulan Ini, 7 Hari, Hari Ini) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center space-x-2 bg-white p-1 rounded-xl border border-slate-200 shadow-xs">
          <button
            onClick={() => setPeriod("today")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              period === "today"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            Hari Ini
          </button>
          <button
            onClick={() => setPeriod("week")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              period === "week"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            7 Hari Terakhir
          </button>
          <button
            onClick={() => setPeriod("month")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              period === "month"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            Bulan Ini
          </button>
          <button
            onClick={fetchDashboardData}
            title="Muat ulang data"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-600" : ""}`} />
          </button>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Menampilkan performa laporan laba rugi periode:{" "}
          <strong className="text-slate-800">
            {period === "today" ? "Hari Ini" : period === "week" ? "7 Hari Terakhir" : "Bulan Ini"}
          </strong>
        </div>
      </div>

      {/* Metric Cards Grid (Laba Rugi & Performa Bisnis) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Omzet Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Omzet
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {formatRupiah(summary?.omzet ?? 0)}
          </div>
          <div className="mt-2 flex items-center text-xs text-slate-500">
            <span className="font-semibold text-blue-600 mr-1">{summary?.salesCount ?? 0}</span>
            <span>transaksi penjualan</span>
          </div>
        </div>

        {/* Laba Kotor Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Laba Kotor
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-indigo-900 tracking-tight">
            {formatRupiah(summary?.labaKotor ?? 0)}
          </div>
          <div className="mt-2 flex items-center text-xs text-indigo-600 font-semibold">
            <span>Margin Kotor: {summary?.marginKotor ?? 0}%</span>
          </div>
        </div>

        {/* Biaya Operasional Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Biaya Operasional
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-rose-900 tracking-tight">
            {formatRupiah(summary?.pengeluaran ?? 0)}
          </div>
          <div className="mt-2 flex items-center text-xs text-slate-500">
            <span className="font-semibold text-rose-600 mr-1">{summary?.expenseCount ?? 0}</span>
            <span>pos pengeluaran tercatat</span>
          </div>
        </div>

        {/* Laba Bersih Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Laba Bersih
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className={`text-2xl font-extrabold tracking-tight ${
            (summary?.labaBersih ?? 0) >= 0 ? "text-emerald-700" : "text-rose-600"
          }`}>
            {formatRupiah(summary?.labaBersih ?? 0)}
          </div>
          <div className="mt-2 flex items-center text-xs text-emerald-700 font-semibold">
            <span>Margin Bersih: {summary?.marginBersih ?? 0}%</span>
          </div>
        </div>
      </div>

      {/* Main Content: Low Stock Alert & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Low Stock Alert Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Peringatan Stok Menipis</h3>
                <p className="text-xs text-slate-400">Sparepart yang harus segera dipesan ulang</p>
              </div>
            </div>
            <Link
              href="/barang"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center space-x-1"
            >
              <span>Lihat Semua</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {lowStockProducts.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <Package className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
              <p className="text-xs font-semibold text-slate-700">Semua Stok Sparepart Aman</p>
              <p className="text-[11px] text-slate-400">Tidak ada barang yang berada di bawah batas minimum.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider">
                    <th className="pb-2.5 font-semibold">SKU / Nama</th>
                    <th className="pb-2.5 font-semibold">Kategori</th>
                    <th className="pb-2.5 font-semibold text-center">Sisa Stok</th>
                    <th className="pb-2.5 font-semibold text-center">Min</th>
                    <th className="pb-2.5 font-semibold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lowStockProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 font-medium text-slate-900">
                        <div>{p.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{p.sku}</div>
                      </td>
                      <td className="py-2.5 text-slate-500">{p.categoryName}</td>
                      <td className="py-2.5 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          {p.stock} {p.unit}
                        </span>
                      </td>
                      <td className="py-2.5 text-center text-slate-500">
                        {p.minStock} {p.unit}
                      </td>
                      <td className="py-2.5 text-right">
                        <Link
                          href={`/pembelian/baru?productId=${p.id}`}
                          className="text-[11px] font-semibold text-blue-600 hover:underline"
                        >
                          Restok
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Sales List */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-800">Transaksi Terbaru</h3>
            <Link
              href="/penjualan"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center space-x-1"
            >
              <span>Riwayat</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentSales.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200 flex-1 flex flex-col items-center justify-center">
              <BadgeDollarSign className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-xs text-slate-500">Belum ada transaksi penjualan</p>
            </div>
          ) : (
            <div className="space-y-3 flex-1">
              {recentSales.map((s) => (
                <div
                  key={s.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-800 font-mono">
                      {s.invoiceNumber}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {s.customerName} • {formatDate(s.date)}
                    </p>
                    {s.paymentMethod && (
                      <span className="inline-block mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                        {s.paymentMethod === "CASH" ? "💵 Tunai" : s.paymentMethod === "DEBIT" ? "💳 Debit" : s.paymentMethod === "CREDIT" ? "💳 Kredit" : "📱 Transfer"}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-emerald-700">
                      {formatRupiah(s.total)}
                    </p>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase">
                      {s.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-slate-100">
            <Link
              href="/laporan"
              className="w-full flex items-center justify-center space-x-1.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
            >
              <span>Buka Laporan Lengkap</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL: TAMBAH SALDO KAS (TOP UP MODAL KASIR)              */}
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
                  <p className="text-[11px] text-slate-400">Suntikan dana modal kasir / top up kas</p>
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
                  placeholder="Contoh: Modal awal kasir / Tambahan uang kembalian"
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
      {/* MODAL: CATAT BIAYA OPERASIONAL CEPAT                      */}
      {/* ======================================================== */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Catat Biaya Operasional</h3>
                  <p className="text-[11px] text-slate-400">Pengeluaran kasir untuk keperluan bengkel</p>
                </div>
              </div>
              <button
                onClick={() => setShowExpenseModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {expenseError && (
              <div className="mt-3 p-3 rounded-lg bg-rose-50 text-rose-700 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{expenseError}</span>
              </div>
            )}

            <form onSubmit={handleExpenseSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kategori Biaya *
                </label>
                <select
                  required
                  value={expenseCatId}
                  onChange={(e) => setExpenseCatId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-rose-500 focus:outline-hidden bg-white"
                >
                  {expenseCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nominal Pengeluaran (Rp) *
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
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Keterangan / Keperluan *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Beli bensin motor operasional / Makan siang mekanik"
                  value={expenseDesc}
                  onChange={(e) => setExpenseDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={expenseSubmitting}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all disabled:opacity-50"
                >
                  {expenseSubmitting ? "Menyimpan..." : "Simpan Biaya"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
