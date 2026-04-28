import type { PageServerLoad, Actions } from "./$types";
import { fail, redirect } from "@sveltejs/kit";
import { createPost } from "$lib/server/posts";
import { moderate, summarize } from "$lib/server/ai";
import { setAiSummary } from "$lib/server/posts";

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
  default: async ({ request, locals }) => {
    if (!locals.user) throw redirect(303, "/login");
    const form = await request.formData();
    const title = String(form.get("title") ?? "").trim();
    const urlRaw = String(form.get("url") ?? "").trim();
    const body = String(form.get("body") ?? "").trim();

    if (title.length < 4 || title.length > 200) {
      return fail(400, {
        message: "title must be 4–200 characters",
        title,
        urlRaw,
        body,
      });
    }
    const url = urlRaw ? normalizeUrl(urlRaw) : null;
    if (urlRaw && !url) {
      return fail(400, { message: "invalid URL", title, urlRaw, body });
    }
    if (!url && !body) {
      return fail(400, {
        message: "provide a URL or text",
        title,
        urlRaw,
        body,
      });
    }
    if (body && body.length > 20_000) {
      return fail(400, { message: "text too long", title, urlRaw, body });
    }

    const mod = await moderate([title, body].filter(Boolean).join("\n\n"));
    if (!mod.ok) {
      return fail(400, {
        message: `blocked by moderation: ${mod.reason ?? "unsafe content"}`,
        title,
        urlRaw,
        body,
      });
    }

    const id = createPost({
      userId: locals.user.id,
      title,
      url,
      body: body || null,
    });

    // Best-effort background-ish summary; don't block on failure.
    try {
      const { summary } = await summarize({ title, body, url });
      if (summary) setAiSummary(id, summary);
    } catch {
      /* ignore */
    }

    throw redirect(303, `/post/${id}`);
  },
};
