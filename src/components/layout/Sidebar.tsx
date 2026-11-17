"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Tags,
  Truck,
  ShoppingCart,
  BadgeDollarSign,
  Boxes,
  ClipboardCheck,
  Receipt,
  FileBarChart2,
  Users,
  Settings,
  LogOut,
  Wrench,
  X,
} from "lucide-react";

interface SidebarProps {
  user?: {
    name: string;
    email: string;
    role: "OWNER" | "OPERATOR";
  } | null;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ user, isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      router.push("/login");
    }
  };

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Master Barang", href: "/barang", icon: Package },
    { name: "Kategori Barang", href: "/kategori", icon: Tags },
    { name: "Data Supplier", href: "/supplier", icon: Truck },
    { name: "Pembelian / Masuk", href: "/pembelian", icon: ShoppingCart },
    { name: "Penjualan / POS", href: "/penjualan", icon: BadgeDollarSign },
    { name: "Stok & Kartu Stok", href: "/stok", icon: Boxes },
    { name: "Stok Opname", href: "/stok-opname", icon: ClipboardCheck },
    { name: "Biaya Operasional", href: "/pengeluaran", icon: Receipt },
    { name: "Laporan & Laba Rugi", href: "/laporan", icon: FileBarChart2 },
  ];

  if (user?.role === "OWNER") {
    navItems.push({ name: "Kelola Pengguna", href: "/pengguna", icon: Users });
    navItems.push({ name: "Pengaturan Toko", href: "/pengaturan", icon: Settings });
  }

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 text-slate-200 flex flex-col shrink-0 border-r border-slate-800 h-screen transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 shrink-0">
              <Wrench className="w-5 h-5" />
            </div>
            <div className="truncate">
              <h1 className="font-bold text-white text-base leading-tight truncate">Bengkel Motor</h1>
              <p className="text-xs text-blue-400 font-medium truncate">Sistem Inventory MVP</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Tutup navigasi"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Badge */}
        {user && (
          <div className="px-5 py-3 border-b border-slate-800/80 bg-slate-800/40">
            <div className="flex items-center justify-between">
              <div className="truncate pr-2">
                <p className="text-xs font-semibold text-white truncate">{user.name}</p>
                <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                  user.role === "OWNER"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                }`}
              >
                {user.role === "OWNER" ? "Pemilik" : "Operator"}
              </span>
            </div>
          </div>
        )}

        {/* Navigation List */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-600 text-white shadow-xs font-semibold"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer / Logout */}
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar (Logout)</span>
          </button>
        </div>
      </aside>
    </>
  );
}
