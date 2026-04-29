import type { PageServerLoad, Actions } from "./$types";
import { error, fail, redirect } from "@sveltejs/kit";
import { createComment, getComments, getPost, vote } from "$lib/server/posts";
import { moderate } from "$lib/server/ai";

export const load: PageServerLoad = async ({ params, locals }) => {
  const id = Number(params.id);
  if (!Number.isFinite(id)) throw error(400, "invalid id");
  let post;
  let comments;
  try {
    post = await getPost(id, locals.user?.id ?? 0);
    comments = post ? await getComments(id, locals.user?.id ?? 0) : [];
  } catch {
    throw error(503, "database unavailable");
  }
  if (!post) throw error(404, "not found");
  return { post, comments };
};

export const actions: Actions = {
  comment: async ({ request, params, locals }) => {
    if (!locals.user) throw redirect(303, "/login");
    const id = Number(params.id);
    const form = await request.formData();
    const body = String(form.get("body") ?? "").trim();
    const parentRaw = form.get("parent_id");
    const parentId = parentRaw ? Number(parentRaw) : null;
    if (!body || body.length > 10_000) {
      return fail(400, { message: "comment must be 1–10,000 characters" });
    }
    const mod = await moderate(body);
    if (!mod.ok) {
      return fail(400, {
        message: `blocked by moderation: ${mod.reason ?? "unsafe"}`,
      });
    }
    try {
      await createComment({ userId: locals.user.id, postId: id, parentId, body });
    } catch {
      return fail(503, { message: "comment unavailable right now" });
    }
    return { ok: true };
  },
  vote: async ({ request, locals }) => {
    if (!locals.user) throw redirect(303, "/login");
    const form = await request.formData();
    const kind = String(form.get("kind"));
    const targetId = Number(form.get("id"));
    const value = Number(form.get("value"));
    if (
      (kind !== "post" && kind !== "comment") ||
      ![1, -1, 0].includes(value)
    ) {
      return fail(400, { message: "invalid vote" });
    }
    try {
      await vote({
        userId: locals.user.id,
        kind,
        targetId,
        value: value as 1 | -1 | 0,
      });
    } catch {
      return fail(503, { message: "vote unavailable right now" });
    }
    return { ok: true };
  },
};
