import { now, rankScore, supabase, type Comment, type Post } from "./db";
import type { ModerationStatus } from "./ai";

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
  moderation_status?: ModerationStatus | null;
  moderation_reason?: string | null;
  users?: UserRelation | null;
};

type CommentRow = {
  id: number;
  post_id: number;
  user_id: number;
  parent_id: number | null;
  body: string;
  created_at: number;
  score: number;
  moderation_status?: ModerationStatus | null;
  moderation_reason?: string | null;
  users?: UserRelation | null;
};

type UserRelation = { username: string } | { username: string }[];

type LegacyPendingComment = {
  id: number;
  post_id: number;
  user_id: number;
  parent_id: number | null;
  body: string;
  created_at: number;
  username: string;
};

let nextLegacyPendingCommentId = -1;
const legacyPendingComments = new Map<number, LegacyPendingComment>();
const legacyBlockedCommentNotifications = new Map<number, ModerationNotification[]>();

const POST_SELECT =
  "id, user_id, title, url, body, tags, created_at, score, comment_count, ai_summary, flagged, moderation_status, moderation_reason, users(username)";
const LEGACY_POST_SELECT =
  "id, user_id, title, url, body, tags, created_at, score, comment_count, ai_summary, flagged, users(username)";

function statusFromPostRow(row: Pick<PostRow, "flagged" | "moderation_status">): ModerationStatus {
  if (row.moderation_status) return row.moderation_status;
  if (row.flagged === 2) return "blocked";
  if (row.flagged === 1) return "pending";
  return "approved";
}

function postFlagForStatus(status: ModerationStatus): number {
  if (status === "approved") return 0;
  if (status === "blocked") return 2;
  return 1;
}

function relationUsername(users: UserRelation | null | undefined, userId: number): string {
  const user = Array.isArray(users) ? users[0] : users;
  const username = user?.username?.trim();
  return username || `member-${userId}`;
}

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
    moderation_status: statusFromPostRow(row),
    moderation_reason: row.moderation_reason ?? null,
    username: relationUsername(row.users, row.user_id),
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
    moderation_status: row.moderation_status ?? "approved",
    moderation_reason: row.moderation_reason ?? null,
    username: relationUsername(row.users, row.user_id),
    user_vote: userVote ?? undefined,
  };
}

function mapLegacyPendingComment(row: LegacyPendingComment): Comment {
  return {
    id: row.id,
    post_id: row.post_id,
    user_id: row.user_id,
    parent_id: row.parent_id,
    body: row.body,
    created_at: row.created_at,
    score: 0,
    moderation_status: "pending",
    moderation_reason: "AI moderation pending",
    username: row.username,
  };
}

function isMissingModerationColumn(error: { message?: string; code?: string } | null | undefined): boolean {
  const message = error?.message?.toLowerCase() ?? "";
  return (
    error?.code === "PGRST204" ||
    (message.includes("moderation_status") && message.includes("column"))
  );
}

function isApprovedPost(row: PostRow): boolean {
  return row.flagged === 0 && statusFromPostRow(row) === "approved";
}

function canViewPost(row: PostRow, userId: number): boolean {
  return isApprovedPost(row) || (userId > 0 && row.user_id === userId);
}

export async function listPosts(
  opts: { sort?: "hot" | "new" | "top"; userId?: number; limit?: number } = {},
): Promise<Post[]> {
  const limit = opts.limit ?? 50;
  const userId = opts.userId ?? 0;
  const initial = await supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("moderation_status", "approved")
    .eq("flagged", 0)
    .order("created_at", { ascending: false })
    .limit(500);
  let data: unknown = initial.data;
  let error = initial.error;
  if (isMissingModerationColumn(error)) {
    const legacy = await supabase
      .from("posts")
      .select(LEGACY_POST_SELECT)
      .eq("flagged", 0)
      .order("created_at", { ascending: false })
      .limit(500);
    data = legacy.data;
    error = legacy.error;
  }
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
  const initial = await supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("id", id)
    .maybeSingle();
  let data: unknown = initial.data;
  let error = initial.error;
  if (isMissingModerationColumn(error)) {
    const legacy = await supabase
      .from("posts")
      .select(LEGACY_POST_SELECT)
      .eq("id", id)
      .maybeSingle();
    data = legacy.data;
    error = legacy.error;
  }
  if (error) throw new Error(`Failed to get post: ${error.message}`);
  if (!data) return null;
  const row = data as PostRow;
  if (!canViewPost(row, userId)) return null;
  const post = mapPost(row);
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
  let query = supabase
    .from("comments")
    .select(
      "id, post_id, user_id, parent_id, body, created_at, score, moderation_status, moderation_reason, users(username)",
    )
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (userId > 0) {
    query = query.or(`moderation_status.eq.approved,and(moderation_status.eq.pending,user_id.eq.${userId})`);
  } else {
    query = query.eq("moderation_status", "approved");
  }

  const { data, error } = await query;
  if (isMissingModerationColumn(error)) {
    const { data: legacyData, error: legacyError } = await supabase
      .from("comments")
      .select("id, post_id, user_id, parent_id, body, created_at, score, users(username)")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });
    if (legacyError) throw new Error(`Failed to load comments: ${legacyError.message}`);
    const pending = userId > 0
      ? [...legacyPendingComments.values()]
          .filter((comment) => comment.post_id === postId && comment.user_id === userId)
          .map((comment) => mapLegacyPendingComment(comment))
      : [];
    const approved = ((legacyData ?? []) as CommentRow[]).map((row) =>
      mapComment({ ...row, moderation_status: "approved" }),
    );
    return loadCommentVotes([...approved, ...pending], userId);
  }
  if (error) throw new Error(`Failed to load comments: ${error.message}`);
  const comments = ((data ?? []) as CommentRow[]).map((row) => mapComment(row));
  return loadCommentVotes(comments, userId);
}

async function loadCommentVotes(comments: Comment[], userId: number): Promise<Comment[]> {
  const votableComments = comments.filter((c) => c.moderation_status === "approved");
  if (userId > 0 && votableComments.length > 0) {
    const ids = votableComments.map((c) => c.id);
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
    for (const comment of votableComments) comment.user_vote = voteMap.get(comment.id);
  }
  return comments;
}

export async function createPost(input: {
  userId: number;
  title: string;
  url: string | null;
  body: string | null;
  tags: string | null;
  moderationStatus?: ModerationStatus;
  moderationReason?: string | null;
}): Promise<number> {
  const createdAt = now();
  const moderationStatus = input.moderationStatus ?? "approved";
  const initial = await supabase
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
      flagged: postFlagForStatus(moderationStatus),
      moderation_status: moderationStatus,
      moderation_reason: input.moderationReason ?? null,
    })
    .select("id")
    .single();
  let data: unknown = initial.data;
  let error = initial.error;
  if (isMissingModerationColumn(error)) {
    const legacy = await supabase
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
        flagged: postFlagForStatus(moderationStatus),
      })
      .select("id")
      .single();
    data = legacy.data;
    error = legacy.error;
  }
  if (error) throw new Error(`Failed to create post: ${error.message}`);
  if (!data) throw new Error("Failed to create post: empty insert response");
  const postId = (data as { id: number }).id;

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
  username?: string;
  postId: number;
  parentId: number | null;
  body: string;
  moderationStatus?: ModerationStatus;
  moderationReason?: string | null;
}): Promise<number> {
  const createdAt = now();
  const moderationStatus = input.moderationStatus ?? "approved";
  const { data, error } = await supabase
    .from("comments")
    .insert({
      post_id: input.postId,
      user_id: input.userId,
      parent_id: input.parentId,
      body: input.body,
      created_at: createdAt,
      score: moderationStatus === "approved" ? 1 : 0,
      moderation_status: moderationStatus,
      moderation_reason: input.moderationReason ?? null,
    })
    .select("id")
    .single();
  if (isMissingModerationColumn(error) && moderationStatus === "approved") {
    return createLegacyApprovedComment(input, createdAt);
  }
  if (isMissingModerationColumn(error) && moderationStatus === "pending") {
    return createLegacyPendingComment(input, createdAt);
  }
  if (error) throw new Error(`Failed to create comment: ${error.message}`);
  const id = data.id as number;

  if (moderationStatus !== "approved") return id;

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

function createLegacyPendingComment(
  input: {
    userId: number;
    username?: string;
    postId: number;
    parentId: number | null;
    body: string;
  },
  createdAt: number,
): number {
  const id = nextLegacyPendingCommentId--;
  legacyPendingComments.set(id, {
    id,
    post_id: input.postId,
    user_id: input.userId,
    parent_id: input.parentId,
    body: input.body,
    created_at: createdAt,
    username: input.username ?? `member-${input.userId}`,
  });
  return id;
}

export async function updatePostModeration(
  postId: number,
  status: ModerationStatus,
  reason: string | null = null,
): Promise<void> {
  const update = {
    moderation_status: status,
    moderation_reason: status === "approved" ? null : reason,
    flagged: postFlagForStatus(status),
  };
  const { error } = await supabase.from("posts").update(update).eq("id", postId);
  if (isMissingModerationColumn(error)) {
    const legacy = await supabase
      .from("posts")
      .update({ flagged: postFlagForStatus(status) })
      .eq("id", postId);
    if (legacy.error) throw new Error(`Failed to update post moderation: ${legacy.error.message}`);
    return;
  }
  if (error) throw new Error(`Failed to update post moderation: ${error.message}`);
}

export async function updateCommentModeration(
  commentId: number,
  status: ModerationStatus,
  reason: string | null = null,
): Promise<void> {
  if (commentId < 0) {
    const pending = legacyPendingComments.get(commentId);
    if (!pending) return;
    if (status === "approved") {
      await createLegacyApprovedComment(
        {
          userId: pending.user_id,
          postId: pending.post_id,
          parentId: pending.parent_id,
          body: pending.body,
        },
        now(),
      );
      legacyPendingComments.delete(commentId);
      return;
    }
    if (status === "blocked") {
      legacyPendingComments.delete(commentId);
      const notification: ModerationNotification = {
        id: `legacy-comment:${commentId}`,
        kind: "comment",
        targetId: commentId,
        postId: pending.post_id,
        message: "One of your comments was removed by moderation.",
        created_at: now(),
      };
      legacyBlockedCommentNotifications.set(pending.user_id, [
        notification,
        ...(legacyBlockedCommentNotifications.get(pending.user_id) ?? []),
      ].slice(0, 20));
    }
    return;
  }

  const { data: existing, error: existingError } = await supabase
    .from("comments")
    .select("post_id, user_id, score, moderation_status")
    .eq("id", commentId)
    .maybeSingle();
  if (existingError) throw new Error(`Failed to load comment moderation: ${existingError.message}`);
  if (!existing) return;

  const previousStatus = (existing.moderation_status as ModerationStatus | undefined) ?? "approved";
  if (previousStatus === status && status !== "pending") return;

  const { error } = await supabase
    .from("comments")
    .update({
      moderation_status: status,
      moderation_reason: status === "approved" ? null : reason,
      score: status === "approved" ? 1 : 0,
    })
    .eq("id", commentId);
  if (error) throw new Error(`Failed to update comment moderation: ${error.message}`);

  if (status !== "approved" || previousStatus === "approved") return;

  const postId = existing.post_id as number;
  const userId = existing.user_id as number;
  const { data: postRow, error: postError } = await supabase
    .from("posts")
    .select("comment_count")
    .eq("id", postId)
    .single();
  if (postError) throw new Error(`Failed to load comment_count: ${postError.message}`);
  const { error: postUpdateError } = await supabase
    .from("posts")
    .update({ comment_count: (postRow.comment_count as number) + 1 })
    .eq("id", postId);
  if (postUpdateError) {
    throw new Error(`Failed to update comment_count: ${postUpdateError.message}`);
  }

  const { error: voteError } = await supabase.from("votes").upsert({
    user_id: userId,
    target_kind: "comment",
    target_id: commentId,
    value: 1,
    created_at: now(),
  });
  if (voteError) throw new Error(`Failed to create initial comment vote: ${voteError.message}`);
}

export type ModerationNotification = {
  id: string;
  kind: "post" | "comment";
  targetId: number;
  postId: number;
  message: string;
  created_at: number;
};

export async function listModerationNotifications(userId: number): Promise<ModerationNotification[]> {
  const since = now() - 24 * 60 * 60;
  const notifications: ModerationNotification[] = [
    ...(legacyBlockedCommentNotifications.get(userId) ?? []).filter(
      (notification) => notification.created_at >= since,
    ),
  ];

  const initialPosts = await supabase
    .from("posts")
    .select("id, title, created_at, moderation_reason, moderation_status, flagged")
    .eq("user_id", userId)
    .eq("moderation_status", "blocked")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(20);
  let postRows: unknown = initialPosts.data;
  let postError = initialPosts.error;
  if (isMissingModerationColumn(postError)) {
    const legacy = await supabase
      .from("posts")
      .select("id, title, created_at, flagged")
      .eq("user_id", userId)
      .eq("flagged", 2)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(20);
    postRows = legacy.data;
    postError = legacy.error;
  }
  if (postError) throw new Error(`Failed to load post moderation notifications: ${postError.message}`);
  for (const row of (postRows ?? []) as Array<{
    id: number;
    title: string;
    created_at: number;
    moderation_reason?: string | null;
  }>) {
    notifications.push({
      id: `post:${row.id}`,
      kind: "post",
      targetId: row.id,
      postId: row.id,
      message: `Your post "${row.title}" was removed by moderation.`,
      created_at: row.created_at,
    });
  }

  const { data: commentRows, error: commentError } = await supabase
    .from("comments")
    .select("id, post_id, created_at, moderation_reason")
    .eq("user_id", userId)
    .eq("moderation_status", "blocked")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(20);
  if (isMissingModerationColumn(commentError)) {
    return notifications.sort((a, b) => b.created_at - a.created_at);
  }
  if (commentError) {
    throw new Error(`Failed to load comment moderation notifications: ${commentError.message}`);
  }
  for (const row of (commentRows ?? []) as Array<{
    id: number;
    post_id: number;
    created_at: number;
    moderation_reason?: string | null;
  }>) {
    notifications.push({
      id: `comment:${row.id}`,
      kind: "comment",
      targetId: row.id,
      postId: row.post_id,
      message: "One of your comments was removed by moderation.",
      created_at: row.created_at,
    });
  }

  return notifications.sort((a, b) => b.created_at - a.created_at);
}

async function createLegacyApprovedComment(
  input: {
    userId: number;
    postId: number;
    parentId: number | null;
    body: string;
  },
  createdAt: number,
): Promise<number> {
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
  if (input.kind === "post") {
    const initialPost = await supabase
      .from("posts")
      .select("flagged, moderation_status")
      .eq("id", input.targetId)
      .single();
    let postRow: unknown = initialPost.data;
    let postError = initialPost.error;
    if (isMissingModerationColumn(postError)) {
      const legacy = await supabase
        .from("posts")
        .select("flagged")
        .eq("id", input.targetId)
        .single();
      postRow = legacy.data;
      postError = legacy.error;
    }
    if (postError) throw new Error(`Failed to load post moderation: ${postError.message}`);
    if (!isApprovedPost(postRow as PostRow)) {
      throw new Error("Cannot vote on a post pending moderation");
    }
  } else {
    const { data: commentRow, error: commentError } = await supabase
      .from("comments")
      .select("moderation_status")
      .eq("id", input.targetId)
      .single();
    if (isMissingModerationColumn(commentError)) {
      // Existing deployments without the moderation columns only contain public comments.
    } else {
    if (commentError) throw new Error(`Failed to load comment moderation: ${commentError.message}`);
    if ((commentRow.moderation_status as ModerationStatus | undefined) !== "approved") {
      throw new Error("Cannot vote on a comment pending moderation");
    }
    }
  }

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
  const initial = await supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("moderation_status", "approved")
    .eq("flagged", 0)
    .gte("created_at", since)
    .order("score", { ascending: false })
    .order("comment_count", { ascending: false })
    .limit(10);
  let data: unknown = initial.data;
  let error = initial.error;
  if (isMissingModerationColumn(error)) {
    const legacy = await supabase
      .from("posts")
      .select(LEGACY_POST_SELECT)
      .eq("flagged", 0)
      .gte("created_at", since)
      .order("score", { ascending: false })
      .order("comment_count", { ascending: false })
      .limit(10);
    data = legacy.data;
    error = legacy.error;
  }
  if (error) throw new Error(`Failed to get digest posts: ${error.message}`);
  return ((data ?? []) as PostRow[]).map((row) => mapPost(row, null));
}
