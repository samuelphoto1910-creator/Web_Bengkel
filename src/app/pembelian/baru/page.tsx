"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import { formatRupiah, calculateMovingAverageHPP } from "@/lib/calculations";
import {
  ShoppingCart,
  Plus,
  Trash2,
  ArrowLeft,
  Save,
  AlertCircle,
  Calculator,
} from "lucide-react";

interface Supplier {
  id: string;
  name: string;
}

interface Product {
  id: string;
  sku: string;
  name: string;
  unit: string;
  stock: number;
  averageBuyPrice: number;
}

interface PurchaseItemInput {
  productId: string;
  productName: string;
  unit: string;
  currentStock: number;
  currentHpp: number;
  quantity: number;
  buyPrice: number;
  subtotal: number;
}

export default function CatatPembelianBaruPage() {
  const router = useRouter();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [supplierId, setSupplierId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [date, setDate] = useState("");
  const [discount, setDiscount] = useState("0");
  const [additionalFee, setAdditionalFee] = useState("0");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<PurchaseItemInput[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setDate(new Date().toISOString().split("T")[0]);
    async function loadData() {
      try {
        const [supRes, prodRes] = await Promise.all([
          fetch("/api/suppliers"),
          fetch("/api/products"),
        ]);
        if (supRes.ok) {
          const supData = await supRes.json();
          setSuppliers(supData.suppliers || []);
          if (supData.suppliers?.length > 0) {
            setSupplierId(supData.suppliers[0].id);
          }
        }
        if (prodRes.ok) {
          const prodData = await prodRes.json();
          setProducts(prodData.products || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleAddItem = () => {
    if (products.length === 0) return;
    const first = products[0];
    const initialPrice = first.averageBuyPrice > 0 ? first.averageBuyPrice : 0;
    setItems((prev) => [
      ...prev,
      {
        productId: first.id,
        productName: first.name,
        unit: first.unit,
        currentStock: first.stock,
        currentHpp: first.averageBuyPrice,
        quantity: 1,
        buyPrice: initialPrice,
        subtotal: initialPrice * 1,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProductChange = (index: number, newProductId: string) => {
    const selected = products.find((p) => p.id === newProductId);
    if (!selected) return;

    setItems((prev) => {
      const copy = [...prev];
      const buyPrice = selected.averageBuyPrice > 0 ? selected.averageBuyPrice : copy[index].buyPrice;
      copy[index] = {
        ...copy[index],
        productId: selected.id,
        productName: selected.name,
        unit: selected.unit,
        currentStock: selected.stock,
        currentHpp: selected.averageBuyPrice,
        buyPrice: buyPrice,
        subtotal: copy[index].quantity * buyPrice,
      };
      return copy;
    });
  };

  const handleQtyChange = (index: number, val: number) => {
    const q = Math.max(1, val);
    setItems((prev) => {
      const copy = [...prev];
      copy[index].quantity = q;
      copy[index].subtotal = q * copy[index].buyPrice;
      return copy;
    });
  };

  const handlePriceChange = (index: number, val: number) => {
    const p = Math.max(0, val);
    setItems((prev) => {
      const copy = [...prev];
      copy[index].buyPrice = p;
      copy[index].subtotal = copy[index].quantity * p;
      return copy;
    });
  };

  const subtotalSum = items.reduce((sum, item) => sum + item.subtotal, 0);
  const discNum = Number(discount) || 0;
  const feeNum = Number(additionalFee) || 0;
  const grandTotal = Math.max(0, subtotalSum - discNum + feeNum);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!supplierId) {
      setErrorMsg("Pilih supplier terlebih dahulu");
      return;
    }

    if (items.length === 0) {
      setErrorMsg("Tambahkan minimal satu barang pembelian");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceNumber: invoiceNumber.trim() || undefined,
          supplierId,
          date,
          discount: discNum,
          additionalFee: feeNum,
          notes,
          items: items.map((it) => ({
            productId: it.productId,
            quantity: it.quantity,
            buyPrice: it.buyPrice,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal menyimpan pembelian");
      }

      router.push("/pembelian");
      router.refresh();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout
      title="Catat Pembelian Baru"
      subtitle="Input faktur barang masuk dari distributor, otomatis memperbarui stok dan Moving Weighted Average HPP"
    >
      <div className="mb-4">
        <Link
          href="/pembelian"
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali ke Daftar Pembelian</span>
        </Link>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header Information Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-4 pb-3 border-b border-slate-100">
            Informasi Faktur & Supplier
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Supplier / Distributor <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                <option value="">Pilih Supplier</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Nomor Faktur / Nota (Opsional)
              </label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="Kosongkan untuk auto-generate (PB-xxxx)"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono uppercase focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Tanggal Transaksi <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Item Rows Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Rincian Barang Masuk</h3>
              <p className="text-xs text-slate-500">Pilih barang, kuantitas beli, dan harga per unit</p>
            </div>
            <button
              type="button"
              onClick={handleAddItem}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Baris Barang</span>
            </button>
          </div>

          {items.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              Belum ada barang ditambahkan. Klik &quot;Tambah Baris Barang&quot; di atas untuk memilih barang.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                    <th className="py-2.5 px-3 w-5/12">Barang</th>
                    <th className="py-2.5 px-3 text-center w-2/12">Kuantitas</th>
                    <th className="py-2.5 px-3 text-right w-2/12">Harga Beli Satuan (Rp)</th>
                    <th className="py-2.5 px-3 text-right w-2/12">Subtotal</th>
                    <th className="py-2.5 px-3 text-center w-1/12">Hapus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, idx) => {
                    const newHppCalc = calculateMovingAverageHPP(
                      item.currentStock,
                      item.currentHpp,
                      item.quantity,
                      item.buyPrice
                    );

                    return (
                      <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-3">
                          <select
                            value={item.productId}
                            onChange={(e) => handleProductChange(idx, e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                          >
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                [{p.sku}] {p.name}
                              </option>
                            ))}
                          </select>
                          <div className="mt-1 flex items-center space-x-2 text-[11px] text-slate-500">
                            <span>Stok saat ini: <strong>{item.currentStock} {item.unit}</strong></span>
                            <span>•</span>
                            <span>HPP lama: <strong>{formatRupiah(item.currentHpp)}</strong></span>
                            <span>•</span>
                            <span className="text-blue-600 font-semibold">
                              Est. HPP baru: {formatRupiah(newHppCalc)}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleQtyChange(idx, parseInt(e.target.value) || 1)}
                              className="w-20 text-center px-2 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                            />
                            <span className="text-slate-500 text-xs">{item.unit}</span>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-right">
                          <input
                            type="number"
                            min="0"
                            value={item.buyPrice}
                            onChange={(e) => handlePriceChange(idx, parseFloat(e.target.value) || 0)}
                            className="w-32 text-right px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                          />
                        </td>

                        <td className="py-3 px-3 text-right font-bold text-slate-900 text-xs">
                          {formatRupiah(item.subtotal)}
                        </td>

                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Calculation & Summary Footer */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Catatan Faktur (Opsional)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Nomor resi, surat jalan, atau keterangan tambahan..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-3 text-xs">
            <div className="flex justify-between items-center text-slate-600">
              <span>Subtotal Item:</span>
              <span className="font-semibold text-slate-900">{formatRupiah(subtotalSum)}</span>
            </div>

            <div className="flex justify-between items-center text-slate-600">
              <span>Potongan Diskon (Rp):</span>
              <input
                type="number"
                min="0"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className="w-32 text-right px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div className="flex justify-between items-center text-slate-600">
              <span>Biaya Tambahan / Ongkir (Rp):</span>
              <input
                type="number"
                min="0"
                value={additionalFee}
                onChange={(e) => setAdditionalFee(e.target.value)}
                className="w-32 text-right px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-between items-center text-slate-900">
              <span className="text-sm font-bold">Grand Total Pembelian:</span>
              <span className="text-xl font-extrabold text-blue-700">
                {formatRupiah(grandTotal)}
              </span>
            </div>

            <button
              type="submit"
              disabled={submitting || items.length === 0}
              className="w-full mt-4 flex items-center justify-center space-x-2 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-md transition-colors cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{submitting ? "Memproses Transaksi..." : "Simpan & Posting Pembelian"}</span>
            </button>
          </div>
        </div>
      </form>
    </AppLayout>
  );
}
