# IPAI Flow

A lightweight, Hacker News–style community discussion platform built for the IPAI community.

> Challenge 4 — a clear, shared, asynchronous space where content can be shared, prioritised and discussed. Stripped down to the essentials.

## Stack

- **SvelteKit** (Svelte 5, runes) + **TypeScript**
- **Tailwind CSS v4** with shadcn-style design tokens
- **shadcn-svelte**–style components (Button, Input, Textarea, Label, Card, Badge) implemented locally with `tailwind-variants` + `bits-ui`
- **better-sqlite3** for a single-file, self-hosted database (no external services needed)
- **bcryptjs** + cookie sessions for auth
- **`@sveltejs/adapter-node`** for self-hosting
- Optional **OpenAI-compatible** endpoint for summaries / moderation (works fully offline without it)

## Features

- Submit link or text posts
- Threaded comments
- Upvoting with HN-style "hot" ranking + `new` and `top` views
- User accounts with karma (no email required → GDPR-friendly)
- AI-assisted summaries on each post (regenerable)
- AI-assisted moderation on submissions and comments
- Automated **digest** view that bundles the top posts of the last _N_ hours with an AI overview
- 100% self-hosted, single SQLite file

## Getting started

```bash
npm install
cp .env.example .env   # edit if you want to enable AI
npm run dev
```

Open http://localhost:5173.

### Environment

| Variable          | Purpose                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------- |
| `OPENAI_API_KEY`  | Enable AI summary + moderation. Leave blank for offline fallback.                           |
| `OPENAI_MODEL`    | Model name (default `gpt-4o-mini`).                                                         |
| `OPENAI_BASE_URL` | OpenAI-compatible endpoint (defaults to OpenAI; works with self-hosted Ollama, vLLM, etc.). |
| `DATABASE_FILE`   | SQLite file path (default `data/ipai-flow.db`).                                             |

### Production

```bash
npm run build
node build
```

The Node adapter produces a portable server in `build/`. Place behind any reverse proxy.

## Project structure

```
src/
  hooks.server.ts            # session cookie → locals.user
  lib/
    components/ui/           # shadcn-style UI primitives
    server/
      db.ts                  # SQLite + schema
      auth.ts                # password hashing + sessions
      posts.ts               # data access (posts, comments, votes)
      ai.ts                  # summarise + moderate (with offline fallback)
    utils.ts
  routes/
    +layout.svelte           # top nav, theme
    +page.svelte             # feed (hot/new/top)
    submit/                  # new post
    post/[id]/               # detail + comments
    digest/                  # automated community digest
    login/  register/  logout/
    api/ai/summarize/        # POST → regenerate summary
```

## GDPR & self-hosting notes

- Single SQLite file in `data/` — easy to back up, delete, or move.
- No third-party trackers, no external CDNs at runtime.
- AI calls are **opt-in**. Without an API key the app uses a deterministic local extractive summary and heuristic moderation.
- Accounts only require a username + password — no email, no PII collected.

## Initial Design Document

https://stitch.withgoogle.com/projects/14845179408125488378
