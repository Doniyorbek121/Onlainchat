import {
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { cookies } from "next/headers";
import {
  createUser,
  createSession,
  getSessionUser,
  deleteSession,
  getUserAuthByLogin,
  userExists,
  getUserByEmail,
  updateUserPassword,
  createPasswordReset,
  getValidPasswordReset,
  deletePasswordReset,
  deleteUserSessions,
} from "./db";
import type { User } from "./types";

const SESSION_COOKIE = "oc_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
const RESET_TTL_MS = 1000 * 60 * 60; // 1 hour

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

// ---------------------------------------------------------------------------
// Password hashing (scrypt — no native deps)
// ---------------------------------------------------------------------------

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const hashBuf = Buffer.from(hash, "hex");
  const testBuf = scryptSync(password, salt, 64);
  return hashBuf.length === testBuf.length && timingSafeEqual(hashBuf, testBuf);
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface RegisterInput {
  username: string;
  email: string;
  password: string;
  displayName?: string;
}

export type AuthResult =
  | { ok: true; user: User; token: string }
  | { ok: false; error: string };

export async function registerUser(input: RegisterInput): Promise<AuthResult> {
  const username = input.username.trim();
  const email = input.email.trim().toLowerCase();
  const password = input.password;

  if (!USERNAME_RE.test(username)) {
    return {
      ok: false,
      error: "Username must be 3–20 letters, numbers or underscores.",
    };
  }
  if (!EMAIL_RE.test(email)) {
    return { ok: false, error: "Please enter a valid email address." };
  }
  if (password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }
  if (await userExists(username, email)) {
    return { ok: false, error: "That username or email is already taken." };
  }

  const user = await createUser({
    username,
    email,
    displayName: (input.displayName || username).trim().slice(0, 40),
    passwordHash: hashPassword(password),
  });
  const token = await createSession(user.id, SESSION_TTL_MS);
  return { ok: true, user, token };
}

export async function loginUser(
  login: string,
  password: string
): Promise<AuthResult> {
  const record = await getUserAuthByLogin(login.trim());
  if (!record || !verifyPassword(password, record.passwordHash)) {
    return { ok: false, error: "Incorrect email/username or password." };
  }
  const token = await createSession(record.user.id, SESSION_TTL_MS);
  return { ok: true, user: record.user, token };
}

// ---------------------------------------------------------------------------
// Password reset
// ---------------------------------------------------------------------------

/**
 * Creates a single-use password reset token for the given email, if a matching
 * account exists. Returns the raw token (to embed in a link) and the user, or
 * null when no account matches. Callers must not reveal which case occurred.
 */
export async function requestPasswordReset(
  email: string
): Promise<{ token: string; user: User } | null> {
  const user = await getUserByEmail(email.trim().toLowerCase());
  if (!user) return null;
  const token = randomBytes(32).toString("hex");
  await createPasswordReset(user.id, sha256(token), RESET_TTL_MS);
  return { token, user };
}

export type ResetResult = { ok: true } | { ok: false; error: string };

/**
 * Consumes a reset token and sets a new password. On success the token is
 * deleted and every existing session for the user is invalidated.
 */
export async function resetPassword(
  token: string,
  newPassword: string
): Promise<ResetResult> {
  if (!token || newPassword.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }
  const hash = sha256(token.trim());
  const record = await getValidPasswordReset(hash);
  if (!record) {
    return { ok: false, error: "This reset link is invalid or has expired." };
  }
  await updateUserPassword(record.userId, hashPassword(newPassword));
  await deletePasswordReset(hash);
  await deleteUserSessions(record.userId); // force re-login everywhere
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Cookie helpers
// ---------------------------------------------------------------------------

export async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_MS / 1000,
    path: "/",
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await deleteSession(token);
  store.delete(SESSION_COOKIE);
}

/** Returns the authenticated user for the current request, or null. */
export async function getCurrentUser(): Promise<User | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return getSessionUser(token);
}
