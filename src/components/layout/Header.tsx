"use client";

import { useEffect, useState } from "react";
import { Calendar, Menu } from "lucide-react";
import { formatDate } from "@/lib/calculations";

interface HeaderProps {
  title: string;
  subtitle?: string;
  user?: {
    name: string;
    role: string;
  } | null;
  onOpenSidebar?: () => void;
}

export default function Header({ title, subtitle, user, onOpenSidebar }: HeaderProps) {
  const [todayStr, setTodayStr] = useState<string>("");

  useEffect(() => {
    setTodayStr(formatDate(new Date()));
  }, []);

  return (
    <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between shadow-xs sticky top-0 z-20">
      <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
        {/* Mobile Hamburger Menu Toggle */}
        <button
          onClick={onOpenSidebar}
          className="lg:hidden p-2 -ml-1 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
          aria-label="Buka menu navigasi"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <h1 className="text-base sm:text-lg md:text-xl font-bold text-slate-800 truncate leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 truncate hidden sm:block">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-4 shrink-0">
        {/* Date badge */}
        {todayStr && (
          <div className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>{todayStr}</span>
          </div>
        )}

        {/* User preview */}
        {user && (
          <div className="flex items-center space-x-2 pl-2 sm:pl-3 border-l border-slate-200 text-xs">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
              {user.name.charAt(0)}
            </div>
            <div className="hidden sm:block">
              <p className="font-semibold text-slate-800 leading-tight truncate max-w-[120px]">{user.name}</p>
              <p className="text-[10px] text-slate-500 capitalize">{user.role.toLowerCase()}</p>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
