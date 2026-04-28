import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { db, now, type User } from "./db";
import type { Cookies } from "@sveltejs/kit";

const SESSION_COOKIE = "ipai_session";
const SESSION_TTL_DAYS = 30;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function createSession(userId: number): string {
  const id = randomBytes(32).toString("hex");
  const expiresAt = now() + SESSION_TTL_DAYS * 86400;
  db.prepare(
    "INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)",
  ).run(id, userId, expiresAt);
  return id;
}

export function getUserBySession(sessionId: string): User | null {
  const row = db
    .prepare(
      `SELECT u.id, u.username, u.karma, u.created_at, s.expires_at
			 FROM sessions s JOIN users u ON u.id = s.user_id
			 WHERE s.id = ?`,
    )
    .get(sessionId) as (User & { expires_at: number }) | undefined;
  if (!row) return null;
  if (row.expires_at < now()) {
    db.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
    return null;
  }
  return {
    id: row.id,
    username: row.username,
    karma: row.karma,
    created_at: row.created_at,
  };
}

export function deleteSession(sessionId: string): void {
  db.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
}

export function setSessionCookie(cookies: Cookies, sessionId: string): void {
  cookies.set(SESSION_COOKIE, sessionId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_DAYS * 86400,
  });
}

export function clearSessionCookie(cookies: Cookies): void {
  cookies.delete(SESSION_COOKIE, { path: "/" });
}

export function getSessionCookie(cookies: Cookies): string | undefined {
  return cookies.get(SESSION_COOKIE);
}

export function isValidUsername(username: string): boolean {
  return /^[a-zA-Z0-9_-]{3,32}$/.test(username);
}
