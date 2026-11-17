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
  ArrowDownRight,
  ShoppingCart,
  BadgeDollarSign,
  Package,
  Receipt,
  Plus,
  RefreshCw,
  Wallet,
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

interface LowStockProduct {
  id: string;
  sku: string;
  name: string;
  categoryName: string;
  stock: number;
  minStock: number;
  unit: string;
}

interface RecentSale {
  id: string;
  invoiceNumber: string;
  customerName: string;
  date: string;
  total: number;
  status: string;
}

export default function DashboardPage() {
  const [period, setPeriod] = useState<"today" | "week" | "month">("month");
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
  const [loading, setLoading] = useState(true);

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

      // Fetch report summary
      const repRes = await fetch(`/api/reports?startDate=${startStr}&endDate=${endStr}`);
      if (repRes.ok) {
        const repData = await repRes.json();
        setSummary(repData.summary);
      }

      // Fetch low stock products
      const prodRes = await fetch("/api/products?lowStock=true");
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setLowStockProducts(prodData.products || []);
      }

      // Fetch recent sales
      const salesRes = await fetch("/api/sales");
      if (salesRes.ok) {
        const salesData = await salesRes.json();
        setRecentSales((salesData.sales || []).slice(0, 5));
      }
    } catch (e) {
      console.error("Dashboard fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [period]);

  return (
    <AppLayout
      title="Dashboard Ringkasan"
      subtitle="Ringkasan transaksi, pergerakan stok, dan performa keuangan bengkel"
    >
      {/* Quick Action Bar & Filter */}
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

        {/* Action Shortcuts */}
        <div className="flex items-center space-x-2">
          <Link
            href="/penjualan/baru"
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <BadgeDollarSign className="w-4 h-4" />
            <span>Kasir / Jual</span>
          </Link>
          <Link
            href="/pembelian/baru"
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Catat Beli</span>
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid */}
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
            <span>pos pengeluaran</span>
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
                <h3 className="font-bold text-slate-800 text-sm">Peringatan Stok Menipis</h3>
                <p className="text-xs text-slate-500">Barang yang berada pada atau di bawah batas minimum</p>
              </div>
            </div>
            <Link
              href="/barang?lowStock=true"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              Lihat Semua
            </Link>
          </div>

          {lowStockProducts.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
              Semua persediaan barang berada dalam kondisi aman (di atas batas minimum).
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider font-semibold">
                    <th className="pb-3">SKU</th>
                    <th className="pb-3">Nama Barang</th>
                    <th className="pb-3 text-center">Sisa Stok</th>
                    <th className="pb-3 text-center">Batas Min</th>
                    <th className="pb-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {lowStockProducts.slice(0, 5).map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 font-mono text-[11px] font-semibold text-slate-600">
                        {p.sku}
                      </td>
                      <td className="py-3 font-medium text-slate-900">{p.name}</td>
                      <td className="py-3 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700">
                          {p.stock} {p.unit}
                        </span>
                      </td>
                      <td className="py-3 text-center text-slate-500">
                        {p.minStock} {p.unit}
                      </td>
                      <td className="py-3 text-right">
                        <Link
                          href="/pembelian/baru"
                          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 font-semibold text-[11px] transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Beli</span>
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
            <h3 className="font-bold text-slate-800 text-sm">Penjualan Terakhir</h3>
            <Link
              href="/penjualan"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              Riwayat
            </Link>
          </div>

          {recentSales.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-xs text-slate-400 py-6">
              Belum ada transaksi penjualan
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
                    <p className="text-[11px] text-slate-500">{s.customerName} • {formatDate(s.date)}</p>
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
    </AppLayout>
  );
}
