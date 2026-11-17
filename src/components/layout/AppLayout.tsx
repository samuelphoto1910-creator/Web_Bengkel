"use client";

import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

interface AppLayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

interface UserInfo {
  id: string;
  name: string;
  email: string;
  role: "OWNER" | "OPERATOR";
}

export default function AppLayout({ title, subtitle, children }: AppLayoutProps) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    // Fetch active session
    fetch("/api/auth/me")
      .then((res) => {
        if (res.status === 401) {
          window.location.href = "/login";
          return null;
        }
        return res.ok ? res.json() : null;
      })
      .then((data) => {
        if (data?.user) {
          setUser(data.user);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="flex min-h-screen bg-slate-50 w-full overflow-x-hidden">
      <Sidebar
        user={user}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0 w-full">
        <Header
          title={title}
          subtitle={subtitle}
          user={user}
          onOpenSidebar={() => setIsSidebarOpen(true)}
        />
        <main className="flex-1 p-3.5 sm:p-5 md:p-6 overflow-y-auto min-w-0 w-full max-w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
