import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyTokenEdge, COOKIE_NAME } from "@/lib/auth-edge";

// Paths that require OWNER role
const OWNER_ONLY_PATHS = ["/pengguna", "/pengaturan"];

// Paths that require any authenticated user (OWNER or OPERATOR)
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/barang",
  "/kategori",
  "/supplier",
  "/pembelian",
  "/penjualan",
  "/stok",
  "/stok-opname",
  "/pengeluaran",
  "/laporan",
  "/pengguna",
  "/pengaturan",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if accessing login page with active session
  if (pathname === "/login") {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    if (token) {
      const user = await verifyTokenEdge(token);
      if (user) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
    return NextResponse.next();
  }

  // Check if route matches any protected prefix
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (isProtected) {
    const token = request.cookies.get(COOKIE_NAME)?.value;

    if (!token) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }

    const user = await verifyTokenEdge(token);
    if (!user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Role check for OWNER only paths
    const isOwnerOnly = OWNER_ONLY_PATHS.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );

    if (isOwnerOnly && user.role !== "OWNER") {
      const dashboardUrl = new URL("/dashboard", request.url);
      dashboardUrl.searchParams.set("error", "unauthorized_role");
      return NextResponse.redirect(dashboardUrl);
    }
  }

  return NextResponse.next();
}

export default proxy;

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
