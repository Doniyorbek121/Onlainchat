import { cookies } from "next/headers";
import { getCurrentUser } from "./auth";

const COOKIE = "oc_uid";

/**
 * Resolves the effective owner id for the current request:
 *   - the authenticated user's id when signed in, otherwise
 *   - an anonymous, cookie-based id (created on demand).
 * Use inside Route Handlers / Server Components where cookie writes are allowed.
 */
export async function getUserId(): Promise<string> {
  const user = await getCurrentUser();
  if (user) return user.id;

  const store = await cookies();
  let uid = store.get(COOKIE)?.value;
  if (!uid) {
    uid = `u_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
    store.set(COOKIE, uid, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
  }
  return uid;
}

/** Read-only variant for Server Components that cannot mutate cookies. */
export async function peekUserId(): Promise<string | null> {
  const user = await getCurrentUser();
  if (user) return user.id;
  const store = await cookies();
  return store.get(COOKIE)?.value ?? null;
}

/** The anonymous id from the cookie, if any (used to migrate data on login). */
export async function peekAnonId(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE)?.value ?? null;
}
