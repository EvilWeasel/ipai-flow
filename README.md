# IPAI Flow

A lightweight, Hacker News–style community discussion platform built for the IPAI community.

> Challenge 4 — a clear, shared, asynchronous space where content can be shared, prioritised and discussed. Stripped down to the essentials.

## Stack

- **SvelteKit** (Svelte 5, runes) + **TypeScript**
- **Tailwind CSS v4** with shadcn-style design tokens
- **shadcn-svelte**–style components (Button, Input, Textarea, Label, Card, Badge) implemented locally with `tailwind-variants` + `bits-ui`
- **Supabase (Postgres)** for a shared online database (free tier available)
- **bcryptjs** + cookie sessions for auth
- **`@sveltejs/adapter-vercel`** for Vercel deployment
- Optional **Vercel AI SDK** integration for streamed summaries / moderation (works fully offline without it)

## Features

- Submit link or text posts
- Threaded comments
- Upvoting with HN-style "hot" ranking + `new` and `top` views
- User accounts with karma (no email required → GDPR-friendly)
- AI-assisted summaries on each post (regenerable)
- AI-assisted moderation on submissions and comments
- Automated **digest** view that bundles the top posts of the last _N_ hours with an AI overview
- Shared online data via Supabase so all users see the same content

## Getting started

```bash
npm install
cp .env.example .env.local   # edit if you want to enable AI locally
npm run dev
```

Open http://localhost:5173.

### Environment

Create `.env.local` for real local secrets. `.env.example` is only a template.

| Variable          | Purpose                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------- |
| `PGX_API_KEY`     | Enable streamed AI summary + moderation through the Vercel AI SDK. Leave blank for offline fallback. |
| `PGX_MODEL`       | Model name (default `gemma-4-26b`).                                                          |
| `PGX_URL_BASE`    | PGX OpenAI-compatible chat completions endpoint.                                              |
| `SUPABASE_URL`    | Supabase project URL.                                                                        |
| `SUPABASE_ANON_KEY` | Supabase anon key for local server-side data access.                                       |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional server-only key. Preferred when deploying this custom server-side auth layer. |

### Production

```bash
npm run build
```

The Vercel adapter emits the deployment output expected by Vercel.

## Project structure

```
src/
  hooks.server.ts            # session cookie → locals.user
  lib/
    components/ui/           # shadcn-style UI primitives
    server/
      db.ts                  # Supabase client + shared types
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

- Data is stored in your Supabase Postgres project (shared across all users).
- No third-party trackers, no external CDNs at runtime.
- AI calls are **opt-in**. Without an API key the app uses a deterministic local extractive summary and heuristic moderation.
- Accounts only require a username + password — no email, no PII collected.

## Initial Design Document

https://stitch.withgoogle.com/projects/14845179408125488378
