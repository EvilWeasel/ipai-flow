import { supabase, type Post, type User } from "./db";
import type { ModerationStatus } from "./ai";

type UserPostRow = {
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
  moderation_status?: ModerationStatus | null;
  moderation_reason?: string | null;
};

function statusFromPostRow(row: Pick<UserPostRow, "flagged" | "moderation_status">): ModerationStatus {
  if (row.moderation_status) return row.moderation_status;
  if (row.flagged === 2) return "blocked";
  if (row.flagged === 1) return "pending";
  return "approved";
}

function mapUserPost(row: UserPostRow, username: string): Post {
  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    url: row.url,
    body: row.body,
    tags: row.tags,
    created_at: row.created_at,
    score: row.score,
    comment_count: row.comment_count,
    ai_summary: row.ai_summary,
    flagged: row.flagged,
    moderation_status: statusFromPostRow(row),
    moderation_reason: row.moderation_reason ?? null,
    username,
  };
}

function isMissingModerationColumn(error: { message?: string; code?: string } | null | undefined): boolean {
  const message = error?.message?.toLowerCase() ?? "";
  return (
    error?.code === "PGRST204" ||
    (message.includes("moderation_status") && message.includes("column"))
  );
}

export async function getUserByUsername(username: string): Promise<User | null> {
  const { data, error } = await supabase
    .from("users")
    .select("id, username, karma, created_at")
    .eq("username", username)
    .maybeSingle();
  if (error) throw new Error(`Failed to get user: ${error.message}`);
  return (data as User | null) ?? null;
}

function isPublicPost(row: UserPostRow): boolean {
  return row.flagged === 0 && statusFromPostRow(row) === "approved";
}

export async function listUserPosts(
  user: Pick<User, "id" | "username">,
  viewerId = 0,
): Promise<Post[]> {
  const initial = await supabase
    .from("posts")
    .select("id, user_id, title, url, body, tags, created_at, score, comment_count, ai_summary, flagged, moderation_status, moderation_reason")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);
  let data: unknown = initial.data;
  let error = initial.error;
  if (isMissingModerationColumn(error)) {
    const legacy = await supabase
      .from("posts")
      .select("id, user_id, title, url, body, tags, created_at, score, comment_count, ai_summary, flagged")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    data = legacy.data;
    error = legacy.error;
  }
  if (error) throw new Error(`Failed to list user posts: ${error.message}`);
  return ((data ?? []) as UserPostRow[])
    .filter((row) => viewerId === user.id || isPublicPost(row))
    .map((row) => mapUserPost(row, user.username));
}
