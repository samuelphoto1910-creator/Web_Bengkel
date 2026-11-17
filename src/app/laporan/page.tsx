"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { formatRupiah, formatDate } from "@/lib/calculations";
import {
  FileBarChart2,
  FileSpreadsheet,
  FileText,
  DollarSign,
  TrendingUp,
  Receipt,
  Wallet,
  Calendar,
  RefreshCw,
  Award,
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

interface TopProduct {
  sku: string;
  name: string;
  qty: number;
  subtotal: number;
  profit: number;
}

interface ExpenseCategoryTotal {
  category: string;
  amount: number;
}

interface DailyTrend {
  date: string;
  omzet: number;
  hpp: number;
  grossProfit: number;
  expense: number;
  netProfit: number;
}

export default function LaporanPage() {
  const [periodPreset, setPeriodPreset] = useState<"today" | "week" | "month" | "lastMonth" | "custom">("month");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [expenseBreakdown, setExpenseBreakdown] = useState<ExpenseCategoryTotal[]>([]);
  const [dailyTrends, setDailyTrends] = useState<DailyTrend[]>([]);
  const [loading, setLoading] = useState(true);

  // Set default dates on load
  useEffect(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const end = now.toISOString().split("T")[0];
    setStartDate(start);
    setEndDate(end);
  }, []);

  const handlePresetChange = (preset: "today" | "week" | "month" | "lastMonth" | "custom") => {
    setPeriodPreset(preset);
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    if (preset === "today") {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === "week") {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setStartDate(d.toISOString().split("T")[0]);
      setEndDate(todayStr);
    } else if (preset === "month") {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(d.toISOString().split("T")[0]);
      setEndDate(todayStr);
    } else if (preset === "lastMonth") {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      setStartDate(firstDay.toISOString().split("T")[0]);
      setEndDate(lastDay.toISOString().split("T")[0]);
    }
  };

  const fetchReport = async () => {
    if (!startDate || !endDate) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/reports?startDate=${startDate}&endDate=${endDate}`);
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary);
        setTopProducts(data.topSellingProducts || []);
        setExpenseBreakdown(data.expenseBreakdown || []);
        setDailyTrends(data.dailyTrends || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (startDate && endDate) {
      fetchReport();
    }
  }, [startDate, endDate]);

  const excelUrl = `/api/export/excel?type=report&startDate=${startDate}&endDate=${endDate}`;
  const pdfUrl = `/api/export/pdf?startDate=${startDate}&endDate=${endDate}`;

  return (
    <AppLayout
      title="Laporan Laba Rugi Operasional"
      subtitle="Analisis omzet, HPP Moving Average, margin kotor, biaya operasional, dan laba bersih bengkel"
    >
      {/* Top Filter & Export Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4 mb-6">
        <div className="flex flex-col sm:flex-row flex-wrap sm:items-center gap-2 sm:gap-3">
          {/* Preset Buttons */}
          <div className="bg-white p-1 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-1 overflow-x-auto max-w-full">
            <button
              onClick={() => handlePresetChange("today")}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap ${
                periodPreset === "today"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Hari Ini
            </button>
            <button
              onClick={() => handlePresetChange("week")}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap ${
                periodPreset === "week"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              7 Hari
            </button>
            <button
              onClick={() => handlePresetChange("month")}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap ${
                periodPreset === "month"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Bulan Ini
            </button>
            <button
              onClick={() => handlePresetChange("lastMonth")}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap ${
                periodPreset === "lastMonth"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Bulan Lalu
            </button>
          </div>

          {/* Date Picker Input */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 bg-white px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs text-xs overflow-x-auto">
            <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setPeriodPreset("custom");
                setStartDate(e.target.value);
              }}
              className="font-medium text-slate-800 focus:outline-hidden text-xs max-w-[125px] sm:max-w-none"
            />
            <span className="text-slate-400 text-xs">s/d</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setPeriodPreset("custom");
                setEndDate(e.target.value);
              }}
              className="font-medium text-slate-800 focus:outline-hidden text-xs max-w-[125px] sm:max-w-none"
            />
          </div>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <a
            href={excelUrl}
            className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-xs transition-colors whitespace-nowrap"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Unduh Excel</span>
          </a>

          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors whitespace-nowrap"
          >
            <FileText className="w-4 h-4" />
            <span>Cetak PDF</span>
          </a>
        </div>
      </div>

      {/* KPI 4 Cards Financial Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Omzet Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Omzet Penjualan (A)
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {formatRupiah(summary?.omzet ?? 0)}
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Dari {summary?.salesCount ?? 0} transaksi kasir
          </p>
        </div>

        {/* HPP Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total HPP (B)
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-800 tracking-tight">
            {formatRupiah(summary?.hpp ?? 0)}
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Snapshot Moving Average barang terjual
          </p>
        </div>

        {/* Laba Kotor Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Laba Kotor (A - B)
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-indigo-900 tracking-tight">
            {formatRupiah(summary?.labaKotor ?? 0)}
          </div>
          <div className="mt-2 text-[11px] font-bold text-indigo-600">
            Margin Kotor: {summary?.marginKotor ?? 0}%
          </div>
        </div>

        {/* Laba Bersih Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Laba Bersih Operasional
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`text-2xl font-extrabold tracking-tight ${
              (summary?.labaBersih ?? 0) >= 0 ? "text-emerald-700" : "text-rose-600"
            }`}
          >
            {formatRupiah(summary?.labaBersih ?? 0)}
          </div>
          <div className="mt-2 text-[11px] font-bold text-emerald-700">
            Margin Bersih: {summary?.marginBersih ?? 0}%
          </div>
        </div>
      </div>

      {/* Summary Formula Details Card */}
      <div className="bg-slate-900 text-slate-200 rounded-2xl p-6 mb-6 shadow-sm">
        <h3 className="text-sm font-bold text-white mb-4">Rincian Perhitungan Laba Rugi</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-xs divide-y md:divide-y-0 md:divide-x divide-slate-800">
          <div>
            <p className="text-slate-400">Total Omzet (Penjualan)</p>
            <p className="text-base font-bold text-white mt-1">
              {formatRupiah(summary?.omzet ?? 0)}
            </p>
          </div>
          <div className="pt-3 md:pt-0 md:pl-4">
            <p className="text-slate-400">Dikurangi HPP Barang</p>
            <p className="text-base font-bold text-rose-400 mt-1">
              - {formatRupiah(summary?.hpp ?? 0)}
            </p>
          </div>
          <div className="pt-3 md:pt-0 md:pl-4">
            <p className="text-slate-400">Laba Kotor (Gross Profit)</p>
            <p className="text-base font-bold text-indigo-300 mt-1">
              = {formatRupiah(summary?.labaKotor ?? 0)}
            </p>
          </div>
          <div className="pt-3 md:pt-0 md:pl-4">
            <p className="text-slate-400">Biaya Operasional (Beban)</p>
            <p className="text-base font-bold text-rose-400 mt-1">
              - {formatRupiah(summary?.pengeluaran ?? 0)}
            </p>
          </div>
          <div className="pt-3 md:pt-0 md:pl-4">
            <p className="text-slate-400">Laba Bersih Operasional</p>
            <p className="text-base font-extrabold text-emerald-400 mt-1">
              = {formatRupiah(summary?.labaBersih ?? 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Top Selling Products & Expense Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        {/* Top Selling Products (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
          <div className="flex items-center space-x-2 mb-4 pb-2 border-b border-slate-100">
            <Award className="w-5 h-5 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-800">
              Suku Cadang & Barang Terlaris (Kontribusi Laba)
            </h3>
          </div>

          {topProducts.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Belum ada penjualan pada periode ini.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 uppercase font-semibold">
                    <th className="py-2.5 px-3">Barang</th>
                    <th className="py-2.5 px-3 text-center">Terjual</th>
                    <th className="py-2.5 px-3 text-right">Omzet</th>
                    <th className="py-2.5 px-3 text-right">Laba Kotor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {topProducts.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-3">
                        <p className="font-semibold text-slate-900">{item.name}</p>
                        <p className="font-mono text-[10px] text-slate-400">{item.sku}</p>
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-blue-600">
                        {item.qty}
                      </td>
                      <td className="py-2.5 px-3 text-right">{formatRupiah(item.subtotal)}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                        {formatRupiah(item.profit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Expense Breakdown (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
          <div className="flex items-center space-x-2 mb-4 pb-2 border-b border-slate-100">
            <Receipt className="w-5 h-5 text-rose-500" />
            <h3 className="text-sm font-bold text-slate-800">
              Rincian Biaya Operasional per Kategori
            </h3>
          </div>

          {expenseBreakdown.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Tidak ada pengeluaran pada periode ini.
            </div>
          ) : (
            <div className="space-y-3">
              {expenseBreakdown.map((exp, idx) => {
                const totalExp = summary?.pengeluaran || 1;
                const pct = Math.round((exp.amount / totalExp) * 100);
                return (
                  <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="font-semibold text-slate-800">{exp.category}</span>
                      <span className="font-bold text-rose-700">{formatRupiah(exp.amount)}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-rose-500 h-1.5 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">{pct}% dari total biaya</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Daily Performance Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">Performa Harian (Audit Trail)</h3>
          <span className="text-xs text-slate-400">{dailyTrends.length} hari beraktivitas</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Tanggal</th>
                <th className="py-3 px-4 text-right">Omzet Penjualan</th>
                <th className="py-3 px-4 text-right">HPP</th>
                <th className="py-3 px-4 text-right">Laba Kotor</th>
                <th className="py-3 px-4 text-right">Pengeluaran</th>
                <th className="py-3 px-4 text-right">Laba Bersih</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {dailyTrends.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Tidak ada aktivitas keuangan harian pada periode terpilih.
                  </td>
                </tr>
              ) : (
                dailyTrends.map((d, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-semibold text-slate-900">{formatDate(d.date)}</td>
                    <td className="py-3 px-4 text-right font-medium">{formatRupiah(d.omzet)}</td>
                    <td className="py-3 px-4 text-right text-slate-500">{formatRupiah(d.hpp)}</td>
                    <td className="py-3 px-4 text-right font-semibold text-indigo-700">
                      {formatRupiah(d.grossProfit)}
                    </td>
                    <td className="py-3 px-4 text-right text-rose-600">
                      {formatRupiah(d.expense)}
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-bold ${
                        d.netProfit >= 0 ? "text-emerald-700" : "text-rose-600"
                      }`}
                    >
                      {formatRupiah(d.netProfit)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
