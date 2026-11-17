export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: "OWNER" | "OPERATOR";
}

export const COOKIE_NAME = "bengkel_session";
const SECRET = process.env.AUTH_SECRET || "bengkel-motor-inventory-secret-key-production-dev-2026";

function base64UrlToUint8Array(str: string): Uint8Array {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Edge-compatible token verification using Web Crypto API.
 * Performs constant-time HMAC verification.
 */
export async function verifyTokenEdge(token: string): Promise<SessionUser | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [encoded, signature] = parts;
    if (!encoded || !signature) return null;

    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const sigBytes = base64UrlToUint8Array(signature);
    const dataBytes = enc.encode(encoded);

    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes as unknown as BufferSource,
      dataBytes as unknown as BufferSource
    );
    if (!isValid) {
      return null;
    }

    const json = new TextDecoder().decode(base64UrlToUint8Array(encoded));
    const data = JSON.parse(json);

    if (data.exp && Date.now() > data.exp) {
      return null;
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
