import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

async function AuthRedirect() {
  const session = await getSession();
  if (session) {
    redirect("/dashboard");
  } else {
    redirect("/login");
  }
  return null;
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      }
    >
      <AuthRedirect />
    </Suspense>
  );
}
