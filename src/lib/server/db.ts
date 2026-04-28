import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const DB_PATH = process.env.DATABASE_FILE ?? "data/ipai-flow.db";

mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	username TEXT NOT NULL UNIQUE,
	password_hash TEXT NOT NULL,
	created_at INTEGER NOT NULL,
	karma INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sessions (
	id TEXT PRIMARY KEY,
	user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS posts (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	title TEXT NOT NULL,
	url TEXT,
	body TEXT,
	tags TEXT,
	created_at INTEGER NOT NULL,
	score INTEGER NOT NULL DEFAULT 1,
	comment_count INTEGER NOT NULL DEFAULT 0,
	ai_summary TEXT,
	flagged INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);

CREATE TABLE IF NOT EXISTS comments (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
	user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
	body TEXT NOT NULL,
	created_at INTEGER NOT NULL,
	score INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);

CREATE TABLE IF NOT EXISTS votes (
	user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	target_kind TEXT NOT NULL,
	target_id INTEGER NOT NULL,
	value INTEGER NOT NULL,
	created_at INTEGER NOT NULL,
	PRIMARY KEY (user_id, target_kind, target_id)
);
`);

// Backwards-compat: add `tags` to existing databases that pre-date the column.
const postCols = db.prepare("PRAGMA table_info(posts)").all() as {
  name: string;
}[];
if (!postCols.some((c) => c.name === "tags")) {
  db.exec("ALTER TABLE posts ADD COLUMN tags TEXT");
}

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
