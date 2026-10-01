import { NextResponse } from "next/server";
import crypto from "crypto";

function getBearerToken(request: Request) {
  const header = request.headers.get("authorization") || "";
  if (!header.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim() || null;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

function firestoreStringValue(value: any): string | null {
  return typeof value?.stringValue === "string" ? value.stringValue : null;
}

/**
 * ImageKit client-side upload auth (official algorithm):
 * signature = HMAC-SHA1(privateKey, token + expire)
 * expire    = Unix timestamp in seconds, must be < 1 hour from now
 * token must be unique per upload request
 */
function createImageKitUploadAuth(privateKey: string) {
  // High-entropy unique token per call (avoid reuse collisions)
  const token = `${crypto.randomUUID()}-${Date.now()}-${crypto.randomBytes(8).toString("hex")}`;
  const expire = Math.floor(Date.now() / 1000) + 40 * 60; // 40 minutes
  const signature = crypto
    .createHmac("sha1", privateKey)
    .update(token + String(expire))
    .digest("hex");
  return { token, expire, signature };
}

async function handleAuth(request: Request) {
  const token = getBearerToken(request);
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const publicKey = process.env.IMAGEKIT_PUBLIC_KEY;
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;

  if (!token || !projectId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  if (!publicKey || !privateKey) {
    return NextResponse.json(
      {
        error:
          "ImageKit server configuration is incomplete. Set IMAGEKIT_PUBLIC_KEY and IMAGEKIT_PRIVATE_KEY in Netlify.",
      },
      { status: 500 }
    );
  }

  const payload = decodeJwtPayload(token);
  const uid =
    typeof payload?.user_id === "string"
      ? payload.user_id
      : typeof payload?.sub === "string"
        ? payload.sub
        : null;
  if (!uid) {
    return NextResponse.json({ error: "Invalid Firebase authentication token." }, { status: 401 });
  }

  try {
    const profileResponse = await fetch(
      `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/users/${encodeURIComponent(uid)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }
    );

    if (!profileResponse.ok) {
      return NextResponse.json({ error: "Unable to verify Synnera account." }, { status: 401 });
    }

    const profile = await profileResponse.json();
    const role = String(firestoreStringValue(profile?.fields?.role) || "").toLowerCase();
    const email = typeof payload?.email === "string" ? payload.email : "";
    const status = String(firestoreStringValue(profile?.fields?.status) || "ACTIVE").toUpperCase();

    // Admin: design uploads. Employee: production verification photos.
    const allowed =
      role === "admin" ||
      email === "admin@synnera.com" ||
      (role === "employee" && status !== "INACTIVE");

    if (!allowed) {
      return NextResponse.json(
        { error: "Upload access required. Admin or active employee only." },
        { status: 403 }
      );
    }

    const auth = createImageKitUploadAuth(privateKey.trim());

    const res = NextResponse.json({
      token: auth.token,
      expire: auth.expire,
      signature: auth.signature,
      publicKey: publicKey.trim(),
    });
    // Prevent any CDN/browser caching of one-time ImageKit tokens
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
    res.headers.set("Pragma", "no-cache");
    return res;
  } catch (error) {
    console.error("ImageKit authentication error:", error);
    return NextResponse.json(
      { error: "Unable to create ImageKit upload authorization." },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  return handleAuth(request);
}

export async function POST(request: Request) {
  return handleAuth(request);
}
