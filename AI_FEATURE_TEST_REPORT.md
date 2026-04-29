# AI Feature Test Report

Date: 2026-04-29
App tested: local SvelteKit dev server at `http://127.0.0.1:5174`

## Scope

Tested the AI-backed pitch paths:

- Post AI summary generation/regeneration via `/api/ai/summarize`
- Submit moderation via the `/submit` form action
- Comment moderation via the `/post/[id]?/comment` form action
- First-paint rendering of saved AI summaries on post detail pages

DevTools MCP was connected first as requested. It showed an existing local app page at `http://localhost:5173/post/26`, but the selected tab was not the app tab and the available DevTools tools did not expose tab selection or navigation. Console/network reads from the selected tab had no useful app output, so the functional testing used the local dev server, HTTP requests through the real SvelteKit routes, and captured server logs.

## Backend Selection

The app is configured to prefer PGX:

- `PGX_API_KEY` present
- `PGX_MODEL=gemma-4-26b`
- `PGX_URL_BASE` points at an OpenAI-compatible `/v1/chat/completions` endpoint

Server logs now make backend decisions explicit:

- `[ai] provider { purpose: "summary", provider: "pgx", model: "gemma-4-26b", baseURL: "custom" }`
- `[ai] provider-complete { purpose: "summary", provider: "pgx", chunks: 38 }`
- `[ai] provider { purpose: "moderation", provider: "pgx", model: "gemma-4-26b", baseURL: "custom" }`
- `[ai] provider-complete { purpose: "moderation", provider: "pgx", chunks: 1 }`

## Findings Before Fixes

1. Summary generation attempted PGX but returned an empty HTTP 200 body after about 4.5s.
   - The server logged `provider: pgx`, but the UI would show summary unavailable.
   - Direct PGX streaming and non-streaming curl tests worked, so the issue was the app integration path, not PGX availability.

2. The summary route did not emit fallback text when a provider stream ended empty without throwing.
   - This produced a bad user-visible failure mode: HTTP 200 with no summary.

3. Submit/comment moderation could approve through fallback when the provider failed.
   - That made it hard to distinguish “PGX approved this” from “AI was unavailable and the app allowed it.”

4. Saved summaries were present in server data but rendered as “No summary yet” on first SSR paint.
   - Hydration would eventually correct this, but it looked broken in the initial HTML and is risky for a pitch.

## Fixes Applied

- Replaced the AI SDK summary/moderation transport with a direct OpenAI-compatible chat-completions client in `src/lib/server/ai.ts`.
- Kept streaming for summaries, using PGX SSE chunks directly.
- Switched moderation to non-streaming PGX calls for faster, simpler verdict parsing.
- Added provider completion/error logging with chunk counts.
- Changed moderation behavior so configured-provider failures become `pending` instead of silent local approval.
- Fixed `/api/ai/summarize` to emit fallback text if a stream ends empty.
- Fixed post detail rendering so existing saved summaries are visible on first SSR paint.

## Verification After Fixes

Summary regeneration:

- Route: `POST /api/ai/summarize`
- Result: streamed PGX summary text
- Time: about 1.4-1.8s in local tests
- Logs: `provider: pgx`, `provider-complete`, 23-38 chunks
- No fallback event for the successful tests

Submit moderation and background summary:

- Route: `POST /submit`
- Result: post created at `/post/29`
- Logs: moderation completed through PGX with 1 chunk; summary completed through PGX with 35 chunks
- No fallback event for the successful normal-content test

Comment moderation:

- Route: `POST /post/29?/comment`
- Result: approved comment persisted
- Logs: moderation completed through PGX with 1 chunk
- No fallback event for the successful normal-content test

Saved summary display:

- Route: `GET /post/29`
- Result: SSR HTML includes the saved summary text and the button label is `Regenerate`
- No “No summary yet” or “Summary unavailable” text for the tested saved-summary post

Static verification:

- `npm run check` passes with 0 errors and 0 warnings.

## Remaining Risk

PGX can hang on some clearly unsafe moderation inputs. The app now times out and marks those submissions `pending` instead of approving them without AI. For the pitch path with normal professional IPAI content, summary generation, submit moderation, and comment moderation all worked through PGX after the fixes.

Recommendation for the pitch: demo normal community posts/comments and summary regeneration. Avoid adversarial safety-red-team content live unless you want to show the pending-review behavior.
