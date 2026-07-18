import { cookies } from "next/headers";

const COOKIE = "oc_uid";

/**
 * Returns the anonymous user id from the cookie, creating one if needed.
 * Used inside Server Components / Route Handlers where writing cookies is allowed.
 */
export async function getUserId(): Promise<string> {
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
  const store = await cookies();
  return store.get(COOKIE)?.value ?? null;
}
