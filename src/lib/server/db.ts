import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Missing Supabase env vars. Set SUPABASE_URL and SUPABASE_ANON_KEY.",
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
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
