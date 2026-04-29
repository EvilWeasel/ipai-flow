import { now, rankScore, supabase, type Comment, type Post } from "./db";

type PostRow = {
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
  users?: { username: string }[] | null;
};

type CommentRow = {
  id: number;
  post_id: number;
  user_id: number;
  parent_id: number | null;
  body: string;
  created_at: number;
  score: number;
  users?: { username: string }[] | null;
};

function mapPost(row: PostRow, userVote?: number | null): Post {
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
    username: row.users?.[0]?.username,
    user_vote: userVote ?? undefined,
  };
}

function mapComment(row: CommentRow, userVote?: number | null): Comment {
  return {
    id: row.id,
    post_id: row.post_id,
    user_id: row.user_id,
    parent_id: row.parent_id,
    body: row.body,
    created_at: row.created_at,
    score: row.score,
    username: row.users?.[0]?.username,
    user_vote: userVote ?? undefined,
  };
}

export async function listPosts(
  opts: { sort?: "hot" | "new" | "top"; userId?: number; limit?: number } = {},
): Promise<Post[]> {
  const limit = opts.limit ?? 50;
  const userId = opts.userId ?? 0;
  const { data, error } = await supabase
    .from("posts")
    .select(
      "id, user_id, title, url, body, tags, created_at, score, comment_count, ai_summary, flagged, users(username)",
    )
    .eq("flagged", 0)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(`Failed to list posts: ${error.message}`);
  const rows = ((data ?? []) as PostRow[]).map((row) => mapPost(row));

  if (userId > 0 && rows.length > 0) {
    const ids = rows.map((p) => p.id);
    const { data: voteRows, error: voteError } = await supabase
      .from("votes")
      .select("target_id, value")
      .eq("user_id", userId)
      .eq("target_kind", "post")
      .in("target_id", ids);
    if (voteError) throw new Error(`Failed to load post votes: ${voteError.message}`);
    const map = new Map<number, number>();
    for (const row of voteRows ?? []) map.set(row.target_id as number, row.value as number);
    for (const post of rows) post.user_vote = map.get(post.id);
  }

  if (opts.sort === "new") {
    return rows.slice(0, limit);
  }
  if (opts.sort === "top") {
    return rows.sort((a, b) => b.score - a.score).slice(0, limit);
  }
  // hot (default)
  return rows
    .map((p) => ({ p, r: rankScore(p.score, p.created_at) }))
    .sort((a, b) => b.r - a.r)
    .slice(0, limit)
    .map((x) => x.p);
}

export async function getPost(id: number, userId = 0): Promise<Post | null> {
  const { data, error } = await supabase
    .from("posts")
    .select(
      "id, user_id, title, url, body, tags, created_at, score, comment_count, ai_summary, flagged, users(username)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Failed to get post: ${error.message}`);
  if (!data) return null;
  const post = mapPost(data as PostRow);
  if (userId > 0) {
    const { data: voteRow, error: voteError } = await supabase
      .from("votes")
      .select("value")
      .eq("user_id", userId)
      .eq("target_kind", "post")
      .eq("target_id", id)
      .maybeSingle();
    if (voteError) throw new Error(`Failed to get post vote: ${voteError.message}`);
    post.user_vote = (voteRow?.value as number | undefined) ?? undefined;
  }
  return post;
}

export async function getComments(postId: number, userId = 0): Promise<Comment[]> {
  const { data, error } = await supabase
    .from("comments")
    .select("id, post_id, user_id, parent_id, body, created_at, score, users(username)")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Failed to load comments: ${error.message}`);
  const comments = ((data ?? []) as CommentRow[]).map((row) => mapComment(row));
  if (userId > 0 && comments.length > 0) {
    const ids = comments.map((c) => c.id);
    const { data: voteRows, error: voteError } = await supabase
      .from("votes")
      .select("target_id, value")
      .eq("user_id", userId)
      .eq("target_kind", "comment")
      .in("target_id", ids);
    if (voteError) {
      throw new Error(`Failed to load comment votes: ${voteError.message}`);
    }
    const voteMap = new Map<number, number>();
    for (const row of voteRows ?? []) voteMap.set(row.target_id as number, row.value as number);
    for (const comment of comments) comment.user_vote = voteMap.get(comment.id);
  }
  return comments;
}

export async function createPost(input: {
  userId: number;
  title: string;
  url: string | null;
  body: string | null;
  tags: string | null;
}): Promise<number> {
  const createdAt = now();
  const { data, error } = await supabase
    .from("posts")
    .insert({
      user_id: input.userId,
      title: input.title,
      url: input.url,
      body: input.body,
      tags: input.tags,
      created_at: createdAt,
      score: 1,
      comment_count: 0,
      flagged: 0,
    })
    .select("id")
    .single();
  if (error) throw new Error(`Failed to create post: ${error.message}`);
  const postId = data.id as number;

  const { error: voteError } = await supabase.from("votes").insert({
    user_id: input.userId,
    target_kind: "post",
    target_id: postId,
    value: 1,
    created_at: createdAt,
  });
  if (voteError) throw new Error(`Failed to create initial post vote: ${voteError.message}`);
  return postId;
}

export function parseTags(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((t) => t.trim().replace(/^#/, ""))
    .filter((t) => /^[a-zA-Z0-9_-]{1,32}$/.test(t))
    .slice(0, 5);
}

export function normalizeTagsInput(raw: string): string | null {
  const tags = parseTags(raw);
  return tags.length ? tags.join(",") : null;
}

export async function createComment(input: {
  userId: number;
  postId: number;
  parentId: number | null;
  body: string;
}): Promise<number> {
  const createdAt = now();
  const { data, error } = await supabase
    .from("comments")
    .insert({
      post_id: input.postId,
      user_id: input.userId,
      parent_id: input.parentId,
      body: input.body,
      created_at: createdAt,
      score: 1,
    })
    .select("id")
    .single();
  if (error) throw new Error(`Failed to create comment: ${error.message}`);
  const id = data.id as number;

  const { data: postRow, error: postError } = await supabase
    .from("posts")
    .select("comment_count")
    .eq("id", input.postId)
    .single();
  if (postError) throw new Error(`Failed to load comment_count: ${postError.message}`);
  const { error: postUpdateError } = await supabase
    .from("posts")
    .update({ comment_count: (postRow.comment_count as number) + 1 })
    .eq("id", input.postId);
  if (postUpdateError) {
    throw new Error(`Failed to update comment_count: ${postUpdateError.message}`);
  }

  const { error: voteError } = await supabase.from("votes").insert({
    user_id: input.userId,
    target_kind: "comment",
    target_id: id,
    value: 1,
    created_at: createdAt,
  });
  if (voteError) throw new Error(`Failed to create initial comment vote: ${voteError.message}`);
  return id;
}

export async function vote(input: {
  userId: number;
  kind: "post" | "comment";
  targetId: number;
  value: 1 | -1 | 0;
}): Promise<void> {
  const { data: existing, error: existingError } = await supabase
    .from("votes")
    .select("value")
    .eq("user_id", input.userId)
    .eq("target_kind", input.kind)
    .eq("target_id", input.targetId)
    .maybeSingle();
  if (existingError) throw new Error(`Failed to read existing vote: ${existingError.message}`);

  const oldValue = (existing?.value as number | undefined) ?? 0;
  const newValue = input.value;
  const delta = newValue - oldValue;
  if (delta === 0) return;

  if (newValue === 0) {
    const { error } = await supabase
      .from("votes")
      .delete()
      .eq("user_id", input.userId)
      .eq("target_kind", input.kind)
      .eq("target_id", input.targetId);
    if (error) throw new Error(`Failed to delete vote: ${error.message}`);
  } else if (existing) {
    const { error } = await supabase
      .from("votes")
      .update({ value: newValue, created_at: now() })
      .eq("user_id", input.userId)
      .eq("target_kind", input.kind)
      .eq("target_id", input.targetId);
    if (error) throw new Error(`Failed to update vote: ${error.message}`);
  } else {
    const { error } = await supabase.from("votes").insert({
      user_id: input.userId,
      target_kind: input.kind,
      target_id: input.targetId,
      value: newValue,
      created_at: now(),
    });
    if (error) throw new Error(`Failed to insert vote: ${error.message}`);
  }

  const table = input.kind === "post" ? "posts" : "comments";
  const { data: targetRow, error: targetError } = await supabase
    .from(table)
    .select("score, user_id")
    .eq("id", input.targetId)
    .single();
  if (targetError) throw new Error(`Failed to load target row: ${targetError.message}`);

  const { error: scoreError } = await supabase
    .from(table)
    .update({ score: (targetRow.score as number) + delta })
    .eq("id", input.targetId);
  if (scoreError) throw new Error(`Failed to update score: ${scoreError.message}`);

  if ((targetRow.user_id as number) !== input.userId) {
    const { data: authorRow, error: authorError } = await supabase
      .from("users")
      .select("karma")
      .eq("id", targetRow.user_id as number)
      .single();
    if (authorError) throw new Error(`Failed to load author karma: ${authorError.message}`);
    const { error: karmaError } = await supabase
      .from("users")
      .update({ karma: (authorRow.karma as number) + delta })
      .eq("id", targetRow.user_id as number);
    if (karmaError) throw new Error(`Failed to update author karma: ${karmaError.message}`);
  }
}

export async function setAiSummary(postId: number, summary: string): Promise<void> {
  const { error } = await supabase
    .from("posts")
    .update({ ai_summary: summary })
    .eq("id", postId);
  if (error) throw new Error(`Failed to save AI summary: ${error.message}`);
}

export async function flagPost(postId: number): Promise<void> {
  const { error } = await supabase.from("posts").update({ flagged: 1 }).eq("id", postId);
  if (error) throw new Error(`Failed to flag post: ${error.message}`);
}

export async function getTrendingTags(hours: number, limit = 8): Promise<string[]> {
  const since = now() - hours * 3600;
  const { data, error } = await supabase
    .from("posts")
    .select("tags")
    .eq("flagged", 0)
    .gte("created_at", since)
    .not("tags", "is", null);
  if (error) throw new Error(`Failed to load trending tags: ${error.message}`);
  const rows = (data ?? []) as { tags: string }[];
  const counts = new Map<string, number>();
  for (const row of rows) {
    for (const tag of parseTags(row.tags)) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([t]) => t);
}

export async function getDigest(hours: number): Promise<Post[]> {
  const since = now() - hours * 3600;
  const { data, error } = await supabase
    .from("posts")
    .select(
      "id, user_id, title, url, body, tags, created_at, score, comment_count, ai_summary, flagged, users(username)",
    )
    .eq("flagged", 0)
    .gte("created_at", since)
    .order("score", { ascending: false })
    .order("comment_count", { ascending: false })
    .limit(10);
  if (error) throw new Error(`Failed to get digest posts: ${error.message}`);
  return ((data ?? []) as PostRow[]).map((row) => mapPost(row, null));
}
