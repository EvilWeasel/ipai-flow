import { createClient } from "@supabase/supabase-js";
import { env } from '$env/dynamic/private';

const SUPABASE_URL = env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY =
  env.SUPABASE_ANON_KEY ?? env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_KEY = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error(
    "Missing Supabase env vars. Set SUPABASE_URL/SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local.",
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export type User = {
  id: number;
  username: string;
  karma: number;
  created_at: number;
};
export type Post = {
  id: number;
  user_id: number;
  title: string;
  url: string | null;
  body: string | null;
  tags: string | null;
  created_at: number;
  score: number;
  comment_count: number;
  ai_summary: string | null;
  flagged: number;
  username?: string;
  user_vote?: number;
};
export type Comment = {
  id: number;
  post_id: number;
  user_id: number;
  parent_id: number | null;
  body: string;
  created_at: number;
  score: number;
  username?: string;
  user_vote?: number;
};

export function now(): number {
  return Math.floor(Date.now() / 1000);
}

// HN-style ranking: (score - 1) / (age_hours + 2)^1.8
export function rankScore(score: number, createdAt: number): number {
  const ageHours = (now() - createdAt) / 3600;
  return (score - 1) / Math.pow(ageHours + 2, 1.8);
}
