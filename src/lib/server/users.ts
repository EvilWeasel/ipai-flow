import { supabase, type Post, type User } from "./db";

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
};

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
    username,
  };
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

export async function listUserPosts(user: Pick<User, "id" | "username">): Promise<Post[]> {
  const { data, error } = await supabase
    .from("posts")
    .select("id, user_id, title, url, body, tags, created_at, score, comment_count, ai_summary, flagged")
    .eq("user_id", user.id)
    .eq("flagged", 0)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(`Failed to list user posts: ${error.message}`);
  return ((data ?? []) as UserPostRow[]).map((row) => mapUserPost(row, user.username));
}
