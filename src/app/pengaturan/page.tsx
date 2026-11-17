"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { Settings, Save, CheckCircle2, AlertCircle, Database, Store } from "lucide-react";

export default function PengaturanPage() {
  const [storeName, setStoreName] = useState("Bengkel Motor Sahabat");
  const [phone, setPhone] = useState("0812-3456-7890");
  const [address, setAddress] = useState("Jl. Raya Otomotif No. 123, Jakarta");
  const [receiptFooter, setReceiptFooter] = useState(
    "Terima kasih atas kunjungan Anda. Garansi servis 7 hari."
  );

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          if (data.setting) {
            setStoreName(data.setting.storeName);
            setPhone(data.setting.phone);
            setAddress(data.setting.address);
            setReceiptFooter(data.setting.receiptFooter);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeName,
          phone,
          address,
          receiptFooter,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan pengaturan");

      setSuccessMsg("Informasi bengkel berhasil diperbarui!");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout
      title="Pengaturan Toko & Profil Bengkel"
      subtitle="Kelola identitas bengkel, kontak, alamat pada kop laporan PDF dan struk penjualan"
    >
      {successMsg && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Form (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
          <div className="flex items-center space-x-2 pb-4 border-b border-slate-100 mb-5">
            <Store className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-800">Profil Identitas Bengkel</h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Nama Bengkel / Toko *
              </label>
              <input
                type="text"
                required
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="Contoh: Bengkel Motor Sahabat"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Akan muncul pada header laporan PDF dan struk kasir
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Nomor Telepon / WhatsApp *
                </label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Contoh: 0812-3456-7890"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Catatan Kaki Struk (Receipt Footer)
                </label>
                <input
                  type="text"
                  value={receiptFooter}
                  onChange={(e) => setReceiptFooter(e.target.value)}
                  placeholder="Pesan terima kasih / garansi..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Alamat Lengkap Bengkel *
              </label>
              <textarea
                required
                rows={3}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Jl. Raya Otomotif No. 123, Kelurahan, Kecamatan, Kota"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center space-x-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-md transition-colors cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{submitting ? "Menyimpan..." : "Simpan Pengaturan"}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Database & Architecture Card (1 col) */}
        <div className="bg-slate-900 text-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 text-blue-400 mb-3">
              <Database className="w-5 h-5" />
              <h4 className="text-sm font-bold text-white">Konfigurasi Database & Hosting</h4>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Aplikasi ini dikonfigurasi menggunakan:
            </p>

            <ul className="text-xs space-y-2 text-slate-300">
              <li className="flex items-center space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                <span><strong>Framework:</strong> Next.js 16 (App Router) + TypeScript</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span><strong>Database:</strong> Supabase PostgreSQL (Managed)</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                <span><strong>ORM:</strong> Prisma ORM</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                <span><strong>Deployment:</strong> Vercel (Free Tier)</span>
              </li>
            </ul>

            <div className="mt-5 p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-[11px] text-slate-300 space-y-1">
              <p className="font-semibold text-white">Petunjuk Sambungan Supabase:</p>
              <p>Isi variabel lingkungan pada file <code>.env</code>:</p>
              <p className="font-mono text-[10px] text-blue-300 break-all">
                DATABASE_URL=&quot;postgresql://...&quot;
              </p>
              <p className="mt-2 text-slate-400">
                Jalankan migrasi skema dengan perintah:
              </p>
              <code className="block bg-slate-950 p-2 rounded text-emerald-400 font-mono text-[10px]">
                npm run db:push<br/>
                npm run db:seed
              </code>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
