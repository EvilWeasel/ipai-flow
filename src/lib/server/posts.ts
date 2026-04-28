import { db, now, rankScore, type Comment, type Post } from "./db";

export function listPosts(
  opts: { sort?: "hot" | "new" | "top"; userId?: number; limit?: number } = {},
): Post[] {
  const limit = opts.limit ?? 50;
  const userId = opts.userId ?? 0;
  const rows = db
    .prepare(
      `SELECT p.*, u.username,
			        (SELECT v.value FROM votes v WHERE v.user_id = ? AND v.target_kind='post' AND v.target_id = p.id) AS user_vote
			 FROM posts p JOIN users u ON u.id = p.user_id
			 WHERE p.flagged = 0
			 ORDER BY p.created_at DESC
			 LIMIT 500`,
    )
    .all(userId) as Post[];

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

export function getPost(id: number, userId = 0): Post | null {
  const row = db
    .prepare(
      `SELECT p.*, u.username,
			        (SELECT v.value FROM votes v WHERE v.user_id = ? AND v.target_kind='post' AND v.target_id = p.id) AS user_vote
			 FROM posts p JOIN users u ON u.id = p.user_id
			 WHERE p.id = ?`,
    )
    .get(userId, id) as Post | undefined;
  return row ?? null;
}

export function getComments(postId: number, userId = 0): Comment[] {
  return db
    .prepare(
      `SELECT c.*, u.username,
			        (SELECT v.value FROM votes v WHERE v.user_id = ? AND v.target_kind='comment' AND v.target_id = c.id) AS user_vote
			 FROM comments c JOIN users u ON u.id = c.user_id
			 WHERE c.post_id = ?
			 ORDER BY c.created_at ASC`,
    )
    .all(userId, postId) as Comment[];
}

export function createPost(input: {
  userId: number;
  title: string;
  url: string | null;
  body: string | null;
  tags: string | null;
}): number {
  const stmt = db.prepare(
    `INSERT INTO posts (user_id, title, url, body, tags, created_at, score)
		 VALUES (?, ?, ?, ?, ?, ?, 1)`,
  );
  const result = stmt.run(
    input.userId,
    input.title,
    input.url,
    input.body,
    input.tags,
    now(),
  );
  const postId = Number(result.lastInsertRowid);
  db.prepare(
    `INSERT INTO votes (user_id, target_kind, target_id, value, created_at) VALUES (?, 'post', ?, 1, ?)`,
  ).run(input.userId, postId, now());
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

export function createComment(input: {
  userId: number;
  postId: number;
  parentId: number | null;
  body: string;
}): number {
  const stmt = db.prepare(
    `INSERT INTO comments (post_id, user_id, parent_id, body, created_at, score)
		 VALUES (?, ?, ?, ?, ?, 1)`,
  );
  const result = stmt.run(
    input.postId,
    input.userId,
    input.parentId,
    input.body,
    now(),
  );
  const id = Number(result.lastInsertRowid);
  db.prepare(
    "UPDATE posts SET comment_count = comment_count + 1 WHERE id = ?",
  ).run(input.postId);
  db.prepare(
    `INSERT INTO votes (user_id, target_kind, target_id, value, created_at) VALUES (?, 'comment', ?, 1, ?)`,
  ).run(input.userId, id, now());
  return id;
}

export function vote(input: {
  userId: number;
  kind: "post" | "comment";
  targetId: number;
  value: 1 | -1 | 0;
}): void {
  const existing = db
    .prepare(
      `SELECT value FROM votes WHERE user_id = ? AND target_kind = ? AND target_id = ?`,
    )
    .get(input.userId, input.kind, input.targetId) as
    | { value: number }
    | undefined;

  const oldValue = existing?.value ?? 0;
  const newValue = input.value;
  const delta = newValue - oldValue;
  if (delta === 0) return;

  const tx = db.transaction(() => {
    if (newValue === 0) {
      db.prepare(
        `DELETE FROM votes WHERE user_id = ? AND target_kind = ? AND target_id = ?`,
      ).run(input.userId, input.kind, input.targetId);
    } else if (existing) {
      db.prepare(
        `UPDATE votes SET value = ?, created_at = ? WHERE user_id = ? AND target_kind = ? AND target_id = ?`,
      ).run(newValue, now(), input.userId, input.kind, input.targetId);
    } else {
      db.prepare(
        `INSERT INTO votes (user_id, target_kind, target_id, value, created_at) VALUES (?, ?, ?, ?, ?)`,
      ).run(input.userId, input.kind, input.targetId, newValue, now());
    }

    const table = input.kind === "post" ? "posts" : "comments";
    db.prepare(`UPDATE ${table} SET score = score + ? WHERE id = ?`).run(
      delta,
      input.targetId,
    );
    // karma: author gains delta
    const authorRow = db
      .prepare(`SELECT user_id FROM ${table} WHERE id = ?`)
      .get(input.targetId) as { user_id: number } | undefined;
    if (authorRow && authorRow.user_id !== input.userId) {
      db.prepare(`UPDATE users SET karma = karma + ? WHERE id = ?`).run(
        delta,
        authorRow.user_id,
      );
    }
  });
  tx();
}

export function setAiSummary(postId: number, summary: string): void {
  db.prepare("UPDATE posts SET ai_summary = ? WHERE id = ?").run(
    summary,
    postId,
  );
}

export function flagPost(postId: number): void {
  db.prepare("UPDATE posts SET flagged = 1 WHERE id = ?").run(postId);
}

export function getTrendingTags(hours: number, limit = 8): string[] {
  const since = now() - hours * 3600;
  const rows = db
    .prepare(
      `SELECT tags FROM posts WHERE flagged = 0 AND created_at >= ? AND tags IS NOT NULL AND tags != ''`,
    )
    .all(since) as { tags: string }[];
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

export function getDigest(hours: number): Post[] {
  const since = now() - hours * 3600;
  return db
    .prepare(
      `SELECT p.*, u.username, NULL AS user_vote
			 FROM posts p JOIN users u ON u.id = p.user_id
			 WHERE p.flagged = 0 AND p.created_at >= ?
			 ORDER BY p.score DESC, p.comment_count DESC
			 LIMIT 10`,
    )
    .all(since) as Post[];
}
