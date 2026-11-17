"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import { formatRupiah } from "@/lib/calculations";
import {
  Package,
  Search,
  Plus,
  FileSpreadsheet,
  Edit,
  ArrowRightLeft,
  AlertTriangle,
  X,
  Check,
  Filter,
  Trash2,
} from "lucide-react";

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  sku: string;
  name: string;
  categoryId: string;
  categoryName: string;
  unit: string;
  lastBuyPrice: number;
  averageBuyPrice: number;
  sellPrice: number;
  stock: number;
  minStock: number;
  assetValue: number;
  isLowStock: boolean;
  status: "ACTIVE" | "INACTIVE";
}

export default function BarangPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ACTIVE");
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editStatus, setEditStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [formSku, setFormSku] = useState("");
  const [formName, setFormName] = useState("");
  const [formCategoryId, setFormCategoryId] = useState("");
  const [formUnit, setFormUnit] = useState("Pcs");
  const [formBuyPrice, setFormBuyPrice] = useState("");
  const [formSellPrice, setFormSellPrice] = useState("");
  const [formInitialStock, setFormInitialStock] = useState("");
  const [formMinStock, setFormMinStock] = useState("5");

  const fetchData = async () => {
    setLoading(true);
    try {
      const catRes = await fetch("/api/categories");
      if (catRes.ok) {
        const catData = await catRes.json();
        setCategories(catData.categories || []);
      }

      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (selectedCategory) params.append("categoryId", selectedCategory);
      if (lowStockFilter) params.append("lowStock", "true");
      if (statusFilter) params.append("status", statusFilter);

      const prodRes = await fetch(`/api/products?${params.toString()}`);
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setProducts(prodData.products || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, selectedCategory, lowStockFilter, statusFilter]);

  const resetForm = () => {
    setFormSku("");
    setFormName("");
    setFormCategoryId(categories[0]?.id || "");
    setFormUnit("Pcs");
    setFormBuyPrice("");
    setFormSellPrice("");
    setFormInitialStock("");
    setFormMinStock("5");
    setErrorMsg(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    if (categories.length > 0 && !formCategoryId) {
      setFormCategoryId(categories[0].id);
    }
    setShowAddModal(true);
  };

  const handleOpenEdit = (prod: Product) => {
    setEditingProduct(prod);
    setFormSku(prod.sku);
    setFormName(prod.name);
    setFormCategoryId(prod.categoryId);
    setFormUnit(prod.unit);
    setFormSellPrice(prod.sellPrice.toString());
    setFormMinStock(prod.minStock.toString());
    setEditStatus(prod.status);
    setErrorMsg(null);
  };

  const handleSubmitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: formSku,
          name: formName,
          categoryId: formCategoryId,
          unit: formUnit,
          buyPrice: Number(formBuyPrice) || 0,
          sellPrice: Number(formSellPrice) || 0,
          initialStock: Number(formInitialStock) || 0,
          minStock: Number(formMinStock) || 5,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal menambah barang");
      }

      setShowAddModal(false);
      resetForm();
      fetchData();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingProduct.id,
          sku: formSku,
          name: formName,
          categoryId: formCategoryId,
          unit: formUnit,
          sellPrice: Number(formSellPrice) || 0,
          minStock: Number(formMinStock) || 5,
          status: editStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal memperbarui barang");
      }

      setEditingProduct(null);
      fetchData();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async (prod: Product) => {
    const isConfirm = window.confirm(
      `Hapus / nonaktifkan barang:\n[${prod.sku}] ${prod.name}?\n\n- Jika sudah ada riwayat transaksi/penjualan, barang akan otomatis diarsipkan (nonaktif) agar pembukuan masa lalu tidak rusak.\n- Jika barang baru dan belum pernah ada transaksi, barang akan dihapus permanen.`
    );
    if (!isConfirm) return;

    try {
      const res = await fetch(`/api/products?id=${prod.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memproses penghapusan");
      alert(data.message || "Barang berhasil diproses");
      fetchData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Terjadi kesalahan saat menghapus barang");
    }
  };

  const totalAssetValue = products.reduce((sum, p) => sum + p.assetValue, 0);

  return (
    <AppLayout
      title="Master Data Barang"
      subtitle="Pengelolaan katalog sparepart, stok berjalan, HPP Moving Average, dan harga jual"
    >
      {/* Top Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 flex-1 max-w-2xl">
          {/* Search Box */}
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari SKU atau nama sparepart..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-xs"
            />
          </div>

          <div className="flex items-center space-x-2">
            {/* Category Dropdown Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="flex-1 sm:flex-initial px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-medium shadow-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex-1 sm:flex-initial px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-medium shadow-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="ACTIVE">Status: Aktif</option>
              <option value="ALL">Status: Semua</option>
              <option value="INACTIVE">Status: Nonaktif (Arsip)</option>
            </select>

            {/* Low Stock Filter */}
            <button
              onClick={() => setLowStockFilter(!lowStockFilter)}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer whitespace-nowrap ${
                lowStockFilter
                  ? "bg-rose-50 border-rose-300 text-rose-700 shadow-xs"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
              <span>Stok Menipis</span>
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-2 flex-wrap sm:flex-nowrap">
          {/* Export Excel Button */}
          <a
            href="/api/export/excel?type=products"
            className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-xs transition-colors whitespace-nowrap"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Ekspor Excel</span>
          </a>

          {/* Add Product Button */}
          <button
            onClick={handleOpenAdd}
            className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Barang</span>
          </button>
        </div>
      </div>

      {/* Summary Banner */}
      <div className="bg-slate-900 text-slate-200 p-4 rounded-2xl mb-6 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center space-x-6">
          <div>
            <p className="text-[11px] text-slate-400 uppercase font-semibold">Total Item</p>
            <p className="text-lg font-bold text-white">{products.length} SKU</p>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <p className="text-[11px] text-slate-400 uppercase font-semibold">Total Nilai Persediaan (Aset)</p>
            <p className="text-lg font-bold text-emerald-400">{formatRupiah(totalAssetValue)}</p>
          </div>
        </div>
        <div className="text-xs text-slate-400">
          *Metode HPP dihitung otomatis dengan <strong className="text-slate-200">Moving Weighted Average</strong>
        </div>
      </div>

      {/* Product Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-3.5 px-4">SKU</th>
                <th className="py-3.5 px-4">Nama Barang</th>
                <th className="py-3.5 px-4">Kategori</th>
                <th className="py-3.5 px-4 text-center">Stok</th>
                <th className="py-3.5 px-4 text-right">HPP (Rata-rata)</th>
                <th className="py-3.5 px-4 text-right">Harga Jual</th>
                <th className="py-3.5 px-4 text-right">Nilai Aset</th>
                <th className="py-3.5 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Memuat data barang...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Tidak ada barang ditemukan. Klik &quot;Tambah Barang&quot; untuk memasukkan barang baru.
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">
                      {p.sku}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-900">
                      <div className="flex items-center space-x-2">
                        <span>{p.name}</span>
                        {p.status === "INACTIVE" && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-600">
                            Nonaktif (Arsip)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
                        {p.categoryName}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full font-bold text-xs ${
                          p.stock <= p.minStock
                            ? "bg-rose-100 text-rose-700 border border-rose-200"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {p.stock} {p.unit}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium text-slate-600">
                      {formatRupiah(p.averageBuyPrice)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                      {formatRupiah(p.sellPrice)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-emerald-700">
                      {formatRupiah(p.assetValue)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          onClick={() => handleOpenEdit(p)}
                          title="Edit Barang"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <Link
                          href={`/stok?productId=${p.id}`}
                          title="Lihat Kartu Stok"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => handleDeleteProduct(p)}
                          title="Hapus / Nonaktifkan Barang"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah Barang */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Tambah Barang Baru</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="my-3 p-3 rounded-lg bg-rose-50 text-rose-700 text-xs border border-rose-200">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmitAdd} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Kode SKU <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value.toUpperCase())}
                    placeholder="Contoh: OLI-MPX2-08"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg uppercase font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Kategori <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={formCategoryId}
                    onChange={(e) => setFormCategoryId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Barang <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Contoh: Oli Mesin MPX 2 Matic 0.8L"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Satuan</label>
                  <select
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="Pcs">Pcs</option>
                    <option value="Botol">Botol</option>
                    <option value="Set">Set</option>
                    <option value="Liter">Liter</option>
                    <option value="Box">Box</option>
                    <option value="Dus">Dus</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Stok Awal</label>
                  <input
                    type="number"
                    min="0"
                    value={formInitialStock}
                    onChange={(e) => setFormInitialStock(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Min. Stok Alert</label>
                  <input
                    type="number"
                    min="1"
                    value={formMinStock}
                    onChange={(e) => setFormMinStock(e.target.value)}
                    placeholder="5"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Harga Beli Awal (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    value={formBuyPrice}
                    onChange={(e) => setFormBuyPrice(e.target.value)}
                    placeholder="45000"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Harga Jual (Rp) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formSellPrice}
                    onChange={(e) => setFormSellPrice(e.target.value)}
                    placeholder="55000"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
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
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "Menyimpan..." : "Simpan Barang"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Barang */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Edit Barang</h3>
              <button
                onClick={() => setEditingProduct(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="my-3 p-3 rounded-lg bg-rose-50 text-rose-700 text-xs border border-rose-200">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmitEdit} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kode SKU</label>
                  <input
                    type="text"
                    required
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kategori</label>
                  <select
                    value={formCategoryId}
                    onChange={(e) => setFormCategoryId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Barang</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Satuan</label>
                  <input
                    type="text"
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Harga Jual (Rp)</label>
                  <input
                    type="number"
                    value={formSellPrice}
                    onChange={(e) => setFormSellPrice(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Min. Stok</label>
                  <input
                    type="number"
                    value={formMinStock}
                    onChange={(e) => setFormMinStock(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Status Ketersediaan</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as "ACTIVE" | "INACTIVE")}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium"
                >
                  <option value="ACTIVE">Aktif (Tersedia untuk dijual di Kasir)</option>
                  <option value="INACTIVE">Nonaktif (Diarsipkan / Tidak Dijual)</option>
                </select>
              </div>

              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-800 text-[11px]">
                *Stok berjalan ({editingProduct.stock} {editingProduct.unit}) dan HPP ({formatRupiah(editingProduct.averageBuyPrice)}) hanya dapat diubah melalui transaksi Pembelian atau Penyesuaian Stok untuk menjaga integritas kartu stok.
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "Menyimpan..." : "Perbarui Data"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
