import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import crypto from "crypto";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: "OWNER" | "OPERATOR";
}

const SECRET = process.env.AUTH_SECRET || "bengkel-motor-inventory-secret-key-production-dev-2026";
export const COOKIE_NAME = "bengkel_session";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Signs a session payload using HMAC-SHA256
 */
export function signToken(payload: SessionUser): string {
  const data = JSON.stringify({
    ...payload,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days expiry
  });
  const encoded = Buffer.from(data).toString("base64url");
  const signature = crypto
    .createHmac("sha256", SECRET)
    .update(encoded)
    .digest("base64url");
  return `${encoded}.${signature}`;
}

/**
 * Verifies a token with timing-safe comparison to prevent timing attacks
 */
export function verifyToken(token: string): SessionUser | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [encoded, signature] = parts;
    if (!encoded || !signature) return null;

    const expectedSignature = crypto
      .createHmac("sha256", SECRET)
      .update(encoded)
      .digest("base64url");

    // Timing-safe comparison against timing attacks
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSignature);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    const json = Buffer.from(encoded, "base64url").toString("utf-8");
    const data = JSON.parse(json);

    if (data.exp && Date.now() > data.exp) {
      return null; // Expired
    }

    return {
      id: data.id,
      name: data.name,
      email: data.email,
      role: data.role,
    };
  } catch {
    return null;
  }
}

/**
 * Retrieves the current session user from cookies
 */
export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

/**
 * Sets secure HTTP-only session cookie
 */
export async function setSessionCookie(user: SessionUser) {
  const token = signToken(user);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
}

/**
 * Clears the session cookie
 */
export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Validates request authentication on the server. Returns session or null.
 */
export async function authenticateUser(req?: Request): Promise<SessionUser | null> {
  if (req) {
    const cookieHeader = req.headers.get("cookie") || "";
    const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
    if (match && match[1]) {
      return verifyToken(match[1]);
    }
  }
  return getSession();
}

/**
 * Checks if user is authenticated and has OWNER role.
 */
export async function requireOwner(req?: Request): Promise<SessionUser> {
  const user = await authenticateUser(req);
  if (!user) {
    throw new Error("UNAUTHORIZED: Silakan login terlebih dahulu");
  }
  if (user.role !== "OWNER") {
    throw new Error("FORBIDDEN: Hanya Pemilik (Owner) yang memiliki hak akses ini");
  }
  return user;
}
