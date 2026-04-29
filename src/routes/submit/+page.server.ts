import type { PageServerLoad, Actions } from "./$types";
import { fail, redirect } from "@sveltejs/kit";
import { createPost, normalizeTagsInput } from "$lib/server/posts";
import { moderate, summarize } from "$lib/server/ai";
import { setAiSummary } from "$lib/server/posts";
import { rateLimit } from "$lib/server/rate-limit";

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) throw redirect(303, "/login?next=/submit");
  return {};
};

function normalizeUrl(input: string): string | null {
  if (!input) return null;
  try {
    const u = new URL(input);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

export const actions: Actions = {
  default: async ({ request, locals, getClientAddress }) => {
    if (!locals.user) throw redirect(303, "/login");
    if (
      !rateLimit({
        scope: "submit",
        identifier: `${locals.user.id}:${getClientAddress()}`,
        limit: 10,
        windowMs: 60_000,
      })
    ) {
      return fail(429, { message: "too many submissions; please wait a moment" });
    }
    const form = await request.formData();
    const title = String(form.get("title") ?? "").trim();
    const urlRaw = String(form.get("url") ?? "").trim();
    const body = String(form.get("body") ?? "").trim();
    const tagsRaw = String(form.get("tags") ?? "").trim();

    if (title.length < 4 || title.length > 200) {
      return fail(400, {
        message: "title must be 4–200 characters",
        title,
        urlRaw,
        body,
        tagsRaw,
      });
    }
    const url = urlRaw ? normalizeUrl(urlRaw) : null;
    if (urlRaw && !url) {
      return fail(400, { message: "invalid URL", title, urlRaw, body, tagsRaw });
    }
    if (!url && !body) {
      return fail(400, {
        message: "provide a URL or text",
        title,
        urlRaw,
        body,
        tagsRaw,
      });
    }
    if (body && body.length > 20_000) {
      return fail(400, { message: "text too long", title, urlRaw, body, tagsRaw });
    }

    const mod = await moderate([title, body].filter(Boolean).join("\n\n"));
    if (!mod.ok) {
      return fail(400, {
        message: `blocked by moderation: ${mod.reason ?? "unsafe content"}`,
        title,
        urlRaw,
        body,
        tagsRaw,
      });
    }

    let id;
    try {
      id = await createPost({
        userId: locals.user.id,
        title,
        url,
        body: body || null,
        tags: normalizeTagsInput(tagsRaw),
      });
    } catch {
      return fail(503, {
        message: "submission unavailable because the database is not reachable",
        title,
        urlRaw,
        body,
        tagsRaw,
      });
    }

    // Best-effort background-ish summary; don't block on failure.
    try {
      const { summary } = await summarize({ title, body, url });
      if (summary) await setAiSummary(id, summary);
    } catch {
      /* ignore */
    }

    throw redirect(303, `/post/${id}`);
  },
};
