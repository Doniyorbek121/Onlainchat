import { NextRequest, NextResponse } from "next/server";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const CSRF_COOKIE = "oc_csrf";

function newToken(): string {
  return `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, "");
}

/**
 * CSRF protection via the double-submit-cookie pattern, plus a same-origin
 * check. A non-httpOnly `oc_csrf` cookie is established on first visit; the
 * client echoes it back in the `x-csrf-token` header on every mutating request.
 * A cross-site attacker can neither read the cookie value nor set the custom
 * header, so forged state-changing requests are rejected.
 */
export function middleware(req: NextRequest) {
  const existing = req.cookies.get(CSRF_COOKIE)?.value;
  const res = NextResponse.next();

  // Ensure a token cookie exists for the browser to read.
  if (!existing) {
    res.cookies.set(CSRF_COOKIE, newToken(), {
      httpOnly: false, // must be readable by client JS
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  // Enforce on mutating API requests only.
  const isApi = req.nextUrl.pathname.startsWith("/api/");
  if (isApi && !SAFE_METHODS.has(req.method)) {
    // Same-origin check (browsers always send Origin on unsafe requests).
    const origin = req.headers.get("origin");
    const host = req.headers.get("host");
    let originOk = true;
    if (origin) {
      try {
        originOk = new URL(origin).host === host;
      } catch {
        originOk = false;
      }
    }

    const header = req.headers.get("x-csrf-token");
    if (!originOk || !existing || !header || header !== existing) {
      return NextResponse.json(
        { error: "Invalid or missing CSRF token." },
        { status: 403 }
      );
    }
  }

  return res;
}

export const config = {
  // Run on everything except Next internals and static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
