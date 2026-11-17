"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import { formatRupiah, formatDateTime } from "@/lib/calculations";
import {
  BadgeDollarSign,
  Search,
  Plus,
  Minus,
  Trash2,
  ArrowLeft,
  CheckCircle2,
  Printer,
  AlertCircle,
  Coins,
  Package,
  Wrench,
  CreditCard,
  Building,
  Sparkles,
  X,
} from "lucide-react";

interface Product {
  id: string;
  sku: string;
  name: string;
  categoryId?: string;
  categoryName: string;
  unit: string;
  stock: number;
  sellPrice: number;
  averageBuyPrice: number;
  isService?: boolean;
}

interface CartItem {
  product: Product;
  quantity: number;
  sellPrice: number;
  discount: number;
  subtotal: number;
}

export default function KasirPenjualanBaruPage() {
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "GOODS" | "SERVICE">("ALL");
  const [categories, setCategories] = useState<string[]>([]);

  // Cart & Transaction
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("Pelanggan Umum");
  const [notes, setNotes] = useState("");
  const [transDiscount, setTransDiscount] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "DEBIT" | "CREDIT" | "TRANSFER">("CASH");
  const [cardReference, setCardReference] = useState("");
  const [cashGiven, setCashGiven] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal Custom / Quick Service
  const [showQuickServiceModal, setShowQuickServiceModal] = useState(false);
  const [quickServiceName, setQuickServiceName] = useState("");
  const [quickServicePrice, setQuickServicePrice] = useState("");

  // Success Receipt Modal
  const [completedSale, setCompletedSale] = useState<{
    invoiceNumber: string;
    customerName: string;
    total: number;
    paymentMethod: string;
    cardReference?: string;
    cashGiven: number;
    change: number;
    date: string;
    items: Array<{ name: string; qty: number; price: number; subtotal: number; isService?: boolean }>;
  } | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/products");
        if (res.ok) {
          const data = await res.json();
          const prods: Product[] = data.products || [];
          setProducts(prods);

          const cats = Array.from(new Set(prods.map((p) => p.categoryName))).filter(Boolean);
          setCategories(cats);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const addToCart = (prod: Product) => {
    setErrorMsg(null);
    if (!prod.isService && prod.stock <= 0) {
      setErrorMsg(`Stok ${prod.name} habis (0 ${prod.unit})`);
      return;
    }

    setCart((prev) => {
      const existingIdx = prev.findIndex((item) => item.product.id === prod.id);
      if (existingIdx >= 0) {
        const item = prev[existingIdx];
        if (!prod.isService && item.quantity + 1 > prod.stock) {
          setErrorMsg(`Stok maksimal untuk ${prod.name} adalah ${prod.stock} ${prod.unit}`);
          return prev;
        }
        const copy = [...prev];
        const newQty = item.quantity + 1;
        copy[existingIdx] = {
          ...item,
          quantity: newQty,
          subtotal: newQty * item.sellPrice - item.discount,
        };
        return copy;
      } else {
        return [
          ...prev,
          {
            product: prod,
            quantity: 1,
            sellPrice: prod.sellPrice,
            discount: 0,
            subtotal: prod.sellPrice,
          },
        ];
      }
    });
  };

  const updateQuantity = (index: number, newQty: number) => {
    setErrorMsg(null);
    setCart((prev) => {
      const copy = [...prev];
      const item = copy[index];

      if (newQty <= 0) {
        return prev.filter((_, i) => i !== index);
      }

      if (!item.product.isService && newQty > item.product.stock) {
        setErrorMsg(`Stok tidak mencukupi. Maksimal ${item.product.stock} ${item.product.unit}`);
        return prev;
      }

      copy[index] = {
        ...item,
        quantity: newQty,
        subtotal: newQty * item.sellPrice - item.discount,
      };
      return copy;
    });
  };

  const removeFromCart = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  // Add custom / quick service directly to cart
  const handleAddQuickService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickServiceName.trim() || !quickServicePrice) return;

    const price = Number(quickServicePrice) || 0;
    const tempId = `temp-jasa-${Date.now()}`;
    const customServiceProd: Product = {
      id: tempId,
      sku: `JS-CUST-${Date.now().toString().slice(-4)}`,
      name: quickServiceName.trim(),
      categoryName: "Jasa Servis",
      unit: "Jasa",
      stock: 9999,
      sellPrice: price,
      averageBuyPrice: 0,
      isService: true,
    };

    setCart((prev) => [
      ...prev,
      {
        product: customServiceProd,
        quantity: 1,
        sellPrice: price,
        discount: 0,
        subtotal: price,
      },
    ]);

    setShowQuickServiceModal(false);
    setQuickServiceName("");
    setQuickServicePrice("");
  };

  const cartSubtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const discountTotal = Number(transDiscount) || 0;
  const grandTotal = Math.max(0, cartSubtotal - discountTotal);
  const cashNum = Number(cashGiven) || 0;
  const change = paymentMethod === "CASH" ? Math.max(0, cashNum - grandTotal) : 0;

  const handleCheckout = async () => {
    setErrorMsg(null);

    if (cart.length === 0) {
      setErrorMsg("Pilih minimal satu barang atau jasa untuk checkout");
      return;
    }

    if (paymentMethod === "CASH" && cashNum > 0 && cashNum < grandTotal) {
      setErrorMsg("Uang pembayaran kurang dari total tagihan");
      return;
    }

    setSubmitting(true);

    try {
      // First: if any item is a custom ad-hoc service (starts with temp-jasa-),
      // ensure it's registered in database or handled
      const preparedItems = [];
      for (const item of cart) {
        let prodId = item.product.id;
        if (prodId.startsWith("temp-jasa-")) {
          // Find or create default Jasa category
          const regRes = await fetch("/api/products", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sku: item.product.sku,
              name: item.product.name,
              categoryId: categories.length > 0 ? products[0]?.categoryId : undefined,
              sellPrice: item.sellPrice,
              isService: true,
              unit: "Jasa",
            }),
          });
          const regData = await regRes.json();
          if (regData.product) {
            prodId = regData.product.id;
          }
        }
        preparedItems.push({
          productId: prodId,
          quantity: item.quantity,
          sellPrice: item.sellPrice,
          discount: item.discount,
        });
      }

      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: customerName.trim() || "Pelanggan Umum",
          discount: discountTotal,
          paymentMethod,
          cardReference: cardReference.trim() || null,
          cashGiven: paymentMethod === "CASH" ? (cashNum > 0 ? cashNum : grandTotal) : grandTotal,
          change: paymentMethod === "CASH" ? change : 0,
          notes,
          items: preparedItems,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal memproses transaksi");
      }

      // Show completed receipt modal
      setCompletedSale({
        invoiceNumber: data.sale.invoiceNumber,
        customerName: data.sale.customerName,
        total: grandTotal,
        paymentMethod,
        cardReference: cardReference.trim() || undefined,
        cashGiven: paymentMethod === "CASH" ? (cashNum > 0 ? cashNum : grandTotal) : grandTotal,
        change: paymentMethod === "CASH" ? change : 0,
        date: formatDateTime(new Date()),
        items: cart.map((c) => ({
          name: c.product.name,
          qty: c.quantity,
          price: c.sellPrice,
          subtotal: c.subtotal,
          isService: c.product.isService,
        })),
      });

      // Clear cart
      setCart([]);
      setCashGiven("");
      setCardReference("");
      setTransDiscount("0");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case "DEBIT":
        return "KARTU DEBIT (EDC)";
      case "CREDIT":
        return "KARTU KREDIT (EDC)";
      case "TRANSFER":
        return "TRANSFER / QRIS";
      default:
        return "TUNAI (CASH)";
    }
  };

  const printReceipt = () => {
    if (!completedSale) return;
    const printWindow = window.open("", "_blank", "width=400,height=600");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Struk - ${completedSale.invoiceNumber}</title>
          <style>
            body { font-family: monospace; font-size: 12px; margin: 15px; color: #111; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .bold { font-weight: bold; }
            .divider { border-bottom: 1px dashed #444; margin: 8px 0; }
            table { width: 100%; font-size: 11px; }
            td { vertical-align: top; }
          </style>
        </head>
        <body>
          <div class="text-center bold" style="font-size: 15px;">BENGKEL MOTOR SAHABAT</div>
          <div class="text-center">Jl. Raya Otomotif No. 123, Jakarta</div>
          <div class="text-center">Telp: 0812-3456-7890</div>
          <div class="divider"></div>
          <div>No: ${completedSale.invoiceNumber}</div>
          <div>Tgl: ${completedSale.date}</div>
          <div>Pelanggan: ${completedSale.customerName}</div>
          <div>Pembayaran: ${getPaymentMethodLabel(completedSale.paymentMethod)}</div>
          ${completedSale.cardReference ? `<div>Ref/Approval: ${completedSale.cardReference}</div>` : ""}
          <div class="divider"></div>
          <table>
            ${completedSale.items
              .map(
                (it) => `
              <tr><td colspan="2" class="bold">${it.isService ? "[JASA] " : ""}${it.name}</td></tr>
              <tr>
                <td>${it.qty} x ${formatRupiah(it.price)}</td>
                <td class="text-right">${formatRupiah(it.subtotal)}</td>
              </tr>
            `
              )
              .join("")}
          </table>
          <div class="divider"></div>
          <table>
            <tr class="bold" style="font-size: 13px;">
              <td>TOTAL</td>
              <td class="text-right">${formatRupiah(completedSale.total)}</td>
            </tr>
            <tr>
              <td>Bayar (${getPaymentMethodLabel(completedSale.paymentMethod)})</td>
              <td class="text-right">${formatRupiah(completedSale.cashGiven)}</td>
            </tr>
            ${
              completedSale.paymentMethod === "CASH"
                ? `
            <tr>
              <td>Kembalian</td>
              <td class="text-right">${formatRupiah(completedSale.change)}</td>
            </tr>`
                : ""
            }
          </table>
          <div class="divider"></div>
          <div class="text-center" style="font-size: 10px; margin-top: 10px;">
            Terima kasih atas kunjungan Anda.<br/>Garansi servis & suku cadang asli.
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCat = !selectedCat || p.categoryName === selectedCat;
    const matchesType =
      typeFilter === "ALL" ||
      (typeFilter === "SERVICE" && p.isService) ||
      (typeFilter === "GOODS" && !p.isService);
    return matchesSearch && matchesCat && matchesType;
  });

  return (
    <AppLayout
      title="POS Kasir Penjualan"
      subtitle="Antarmuka kasir cepat untuk transaksi sparepart dan jasa servis motor"
    >
      <div className="mb-4 flex items-center justify-between">
        <Link
          href="/penjualan"
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali ke Riwayat Penjualan</span>
        </Link>

        {/* Quick Add Custom Service Button */}
        <button
          type="button"
          onClick={() => setShowQuickServiceModal(true)}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold transition-all cursor-pointer"
        >
          <Wrench className="w-3.5 h-3.5" />
          <span>+ Tambah Jasa Cepat</span>
        </button>
      </div>

      {errorMsg && (
        <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* POS Two-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Product Catalog (7 cols) */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          {/* Filter Bar: Search, Category & Type Switcher */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari SKU atau nama sparepart / jasa..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <select
                value={selectedCat}
                onChange={(e) => setSelectedCat(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Semua Kategori</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Type Filter Buttons */}
            <div className="flex items-center space-x-2 border-t border-slate-100 pt-2 text-xs">
              <span className="text-slate-400 font-medium">Tipe:</span>
              <button
                type="button"
                onClick={() => setTypeFilter("ALL")}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  typeFilter === "ALL"
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter("GOODS")}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer flex items-center space-x-1 ${
                  typeFilter === "GOODS"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <Package className="w-3 h-3" />
                <span>Sparepart (Barang)</span>
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter("SERVICE")}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer flex items-center space-x-1 ${
                  typeFilter === "SERVICE"
                    ? "bg-purple-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <Wrench className="w-3 h-3" />
                <span>Jasa Servis</span>
              </button>
            </div>
          </div>

          {/* Product Items Grid */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex-1">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Katalog Item ({filteredProducts.length})
              </h3>
            </div>

            {loading ? (
              <div className="py-20 text-center text-xs text-slate-400">
                Memuat barang...
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="py-20 text-center text-xs text-slate-400">
                Tidak ada item yang cocok dengan pencarian.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {filteredProducts.map((p) => {
                  const isOutOfStock = !p.isService && p.stock <= 0;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={isOutOfStock}
                      onClick={() => addToCart(p)}
                      className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                        isOutOfStock
                          ? "bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed"
                          : p.isService
                          ? "bg-white border-purple-200 hover:border-purple-500 hover:shadow-md active:scale-98"
                          : "bg-white border-slate-200 hover:border-emerald-500 hover:shadow-md active:scale-98"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-mono text-[10px] font-bold text-slate-500 truncate">
                            {p.sku}
                          </span>
                          {p.isService ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-0.5">
                              <Wrench className="w-2.5 h-2.5" />
                              <span>Jasa</span>
                            </span>
                          ) : (
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                isOutOfStock
                                  ? "bg-rose-100 text-rose-700"
                                  : "bg-emerald-50 text-emerald-700"
                              }`}
                            >
                              Stok: {p.stock}
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-slate-900 text-xs leading-snug line-clamp-2">
                          {p.name}
                        </h4>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className={`font-extrabold text-xs ${p.isService ? "text-purple-700" : "text-emerald-700"}`}>
                          {formatRupiah(p.sellPrice)}
                        </span>
                        <span
                          className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs ${
                            p.isService
                              ? "bg-purple-50 text-purple-600"
                              : "bg-emerald-50 text-emerald-600"
                          }`}
                        >
                          +
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Cashier Cart Drawer (5 cols) */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center space-x-2">
                <BadgeDollarSign className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm">Keranjang Transaksi</h3>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                {cart.length} item
              </span>
            </div>

            {/* Customer Name */}
            <div className="mb-3">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Nama Pelanggan / No. Polisi
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Contoh: Budi (B 1234 XYZ)"
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            {/* Cart Items List */}
            <div className="flex-1 max-h-64 overflow-y-auto divide-y divide-slate-100 mb-4 pr-1">
              {cart.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  Keranjang masih kosong. Klik barang atau jasa di sebelah kiri.
                </div>
              ) : (
                cart.map((item, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex-1 pr-2">
                      <div className="flex items-center gap-1.5">
                        {item.product.isService && (
                          <span className="text-[9px] font-bold px-1 py-0.2 bg-purple-100 text-purple-700 rounded">
                            JASA
                          </span>
                        )}
                        <p className="font-semibold text-slate-900 leading-tight">
                          {item.product.name}
                        </p>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {formatRupiah(item.sellPrice)} / {item.product.unit}
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      {/* Quantity Controller */}
                      <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                        <button
                          type="button"
                          onClick={() => updateQuantity(idx, item.quantity - 1)}
                          className="px-2 py-1 text-slate-600 hover:bg-slate-200 cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 text-xs font-bold text-slate-900">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(idx, item.quantity + 1)}
                          className="px-2 py-1 text-slate-600 hover:bg-slate-200 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <span className="font-bold text-slate-900 w-20 text-right">
                        {formatRupiah(item.subtotal)}
                      </span>

                      <button
                        type="button"
                        onClick={() => removeFromCart(idx)}
                        className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Calculations & Payment Methods */}
            <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal Item:</span>
                <span className="font-semibold text-slate-800">{formatRupiah(cartSubtotal)}</span>
              </div>

              <div className="flex justify-between items-center text-slate-600">
                <span>Diskon Transaksi (Rp):</span>
                <input
                  type="number"
                  min="0"
                  value={transDiscount}
                  onChange={(e) => setTransDiscount(e.target.value)}
                  className="w-28 text-right px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-slate-900">
                <span className="font-bold text-sm">TOTAL TAGIHAN:</span>
                <span className="text-xl font-extrabold text-emerald-700">
                  {formatRupiah(grandTotal)}
                </span>
              </div>

              {/* ======================================================== */}
              {/* PILIHAN METODE PEMBAYARAN: TUNAI, DEBIT, KREDIT, TRANSFER*/}
              {/* ======================================================== */}
              <div className="pt-3 border-t border-slate-200">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Metode Pembayaran
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("CASH")}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                      paymentMethod === "CASH"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <Coins className="w-3.5 h-3.5" />
                    <span>💵 Tunai (Cash)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod("DEBIT");
                      setCashGiven(grandTotal.toString());
                    }}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                      paymentMethod === "DEBIT"
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>💳 Kartu Debit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod("CREDIT");
                      setCashGiven(grandTotal.toString());
                    }}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                      paymentMethod === "CREDIT"
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>💳 Kartu Kredit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod("TRANSFER");
                      setCashGiven(grandTotal.toString());
                    }}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                      paymentMethod === "TRANSFER"
                        ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <Building className="w-3.5 h-3.5" />
                    <span>📱 Transfer / QRIS</span>
                  </button>
                </div>
              </div>

              {/* Conditional Inputs Based on Payment Method */}
              {paymentMethod === "CASH" ? (
                <div className="pt-2 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-700">Uang Diterima (Rp):</span>
                    <input
                      type="number"
                      min="0"
                      placeholder={grandTotal.toString()}
                      value={cashGiven}
                      onChange={(e) => setCashGiven(e.target.value)}
                      className="w-36 text-right px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>

                  {/* Quick Cash Chips */}
                  <div className="flex items-center justify-end gap-1 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setCashGiven(grandTotal.toString())}
                      className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600"
                    >
                      Uang Pas
                    </button>
                    {[50000, 100000, 200000].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setCashGiven(val.toString())}
                        className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600"
                      >
                        {formatRupiah(val)}
                      </button>
                    ))}
                  </div>

                  <div className="flex justify-between items-center text-slate-700 pt-1">
                    <span className="font-semibold">Kembalian:</span>
                    <span className="font-extrabold text-sm text-blue-700">
                      {formatRupiah(change)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="pt-2">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    No. Approval EDC / Ref Kartu / Bank (Opsional)
                  </label>
                  <input
                    type="text"
                    value={cardReference}
                    onChange={(e) => setCardReference(e.target.value)}
                    placeholder="Contoh: EDC BCA #88921 / 4 digit kartu"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                  <div className="text-[11px] text-blue-600 font-semibold mt-1">
                    ✓ Dibayar pas sesuai total: {formatRupiah(grandTotal)}
                  </div>
                </div>
              )}

              {/* Submit Checkout Button */}
              <button
                type="button"
                onClick={handleCheckout}
                disabled={submitting || cart.length === 0}
                className="w-full mt-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm shadow-md transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                <Coins className="w-4 h-4" />
                <span>{submitting ? "Memproses Transaksi..." : `Selesaikan & Bayar (${getPaymentMethodLabel(paymentMethod)})`}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL: TAMBAH JASA CEPAT (AD-HOC SERVICE TO CART)        */}
      {/* ======================================================== */}
      {showQuickServiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Tambah Jasa Servis Cepat</h3>
                  <p className="text-[11px] text-slate-400">Jasa tanpa stok (ongkos kerja/pasang)</p>
                </div>
              </div>
              <button
                onClick={() => setShowQuickServiceModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddQuickService} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Jasa / Servis *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Jasa Ganti Oli / Pasang Rem / Tune Up"
                  value={quickServiceName}
                  onChange={(e) => setQuickServiceName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Biaya / Tarif Jasa (Rp) *
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs text-slate-400 font-bold">
                    Rp
                  </span>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="Contoh: 15000"
                    value={quickServicePrice}
                    onChange={(e) => setQuickServicePrice(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Quick Price Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {[10000, 15000, 25000, 35000, 50000].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setQuickServicePrice(val.toString())}
                    className="px-2 py-1 rounded text-[11px] bg-purple-50 text-purple-700 hover:bg-purple-100 font-medium"
                  >
                    +{formatRupiah(val)}
                  </button>
                ))}
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowQuickServiceModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all"
                >
                  + Masukkan ke Keranjang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Receipt Modal */}
      {completedSale && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <h3 className="font-bold text-slate-900 text-base">Transaksi Berhasil!</h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              {completedSale.invoiceNumber}
            </p>

            <div className="my-4 p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs text-left space-y-1.5">
              <div className="flex justify-between text-slate-600">
                <span>Pelanggan:</span>
                <span className="font-semibold text-slate-900">{completedSale.customerName}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Metode Bayar:</span>
                <span className="font-bold text-blue-700">{getPaymentMethodLabel(completedSale.paymentMethod)}</span>
              </div>
              {completedSale.cardReference && (
                <div className="flex justify-between text-slate-600">
                  <span>Ref / EDC:</span>
                  <span className="font-mono text-slate-700">{completedSale.cardReference}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Total Belanja:</span>
                <span className="font-bold text-slate-900">{formatRupiah(completedSale.total)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Uang Diterima:</span>
                <span>{formatRupiah(completedSale.cashGiven)}</span>
              </div>
              {completedSale.paymentMethod === "CASH" && (
                <div className="flex justify-between font-bold text-emerald-700 pt-1 border-t border-slate-200">
                  <span>Kembalian:</span>
                  <span>{formatRupiah(completedSale.change)}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={printReceipt}
                className="w-full flex items-center justify-center space-x-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Struk Transaksi</span>
              </button>

              <button
                type="button"
                onClick={() => setCompletedSale(null)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Transaksi Baru
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
