import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { now, supabase, type User } from "./db";
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

function must<T>(value: T, message: string): T {
  if (value == null) throw new Error(message);
  return value;
}

export async function createSession(userId: number): Promise<string> {
  const id = randomBytes(32).toString("hex");
  const expiresAt = now() + SESSION_TTL_DAYS * 86400;
  const { error } = await supabase
    .from("sessions")
    .insert({ id, user_id: userId, expires_at: expiresAt });
  if (error) throw new Error(`Failed to create session: ${error.message}`);
  return id;
}

export async function getUserBySession(sessionId: string): Promise<User | null> {
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("user_id, expires_at")
    .eq("id", sessionId)
    .maybeSingle();
  if (sessionError) {
    throw new Error(`Failed to load session: ${sessionError.message}`);
  }
  if (!session) return null;
  if (session.expires_at < now()) {
    await deleteSession(sessionId);
    return null;
  }

  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id, username, karma, created_at")
    .eq("id", session.user_id)
    .maybeSingle();
  if (userError) {
    throw new Error(`Failed to load user: ${userError.message}`);
  }
  return (user as User | null) ?? null;
}

export async function deleteSession(sessionId: string): Promise<void> {
  const { error } = await supabase.from("sessions").delete().eq("id", sessionId);
  if (error) throw new Error(`Failed to delete session: ${error.message}`);
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

export async function getUserAuthByUsername(
  username: string,
): Promise<{ id: number; password_hash: string } | null> {
  const { data, error } = await supabase
    .from("users")
    .select("id, password_hash")
    .eq("username", username)
    .maybeSingle();
  if (error) throw new Error(`Failed to load user auth: ${error.message}`);
  return (data as { id: number; password_hash: string } | null) ?? null;
}

export async function usernameExists(username: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("username", username)
    .maybeSingle();
  if (error) throw new Error(`Failed to check username: ${error.message}`);
  return Boolean(data);
}

export async function createUser(input: {
  username: string;
  password_hash: string;
}): Promise<number> {
  const { data, error } = await supabase
    .from("users")
    .insert({
      username: input.username,
      password_hash: input.password_hash,
      created_at: now(),
      karma: 0,
    })
    .select("id")
    .single();
  if (error) throw new Error(`Failed to create user: ${error.message}`);
  return must(data?.id, "Missing inserted user id");
}
