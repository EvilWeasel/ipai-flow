import type { PageServerLoad, Actions } from "./$types";
import { error, fail, redirect } from "@sveltejs/kit";
import { createComment, getComments, getPost, vote } from "$lib/server/posts";
import { moderate } from "$lib/server/ai";
import { rateLimit } from "$lib/server/rate-limit";

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
  comment: async ({ request, params, locals, getClientAddress }) => {
    if (!locals.user) throw redirect(303, "/login");
    if (
      !rateLimit({
        scope: "comment",
        identifier: `${locals.user.id}:${getClientAddress()}`,
        limit: 20,
        windowMs: 60_000,
      })
    ) {
      return fail(429, { message: "too many comments; please wait a moment" });
    }
    const id = Number(params.id);
    const form = await request.formData();
    const body = String(form.get("body") ?? "").trim();
    const parentRaw = form.get("parent_id");
    const parentId = parentRaw ? Number(parentRaw) : null;
    if (!body || body.length > 10_000) {
      return fail(400, {
        message: "comment must be 1–10,000 characters",
        body,
        parentId,
      });
    }
    const mod = await moderate(body);
    if (mod.status === "blocked") {
      return fail(400, {
        ok: false,
        moderationStatus: mod.status,
        message: `blocked by moderation: ${mod.reason ?? "unsafe"}`,
        body,
        parentId,
      });
    }
    try {
      await createComment({
        userId: locals.user.id,
        postId: id,
        parentId,
        body,
        moderationStatus: mod.status,
        moderationReason: mod.reason ?? null,
      });
    } catch {
      return fail(503, {
        message: "comment unavailable right now",
        body,
        parentId,
      });
    }
    return {
      ok: true,
      moderationStatus: mod.status,
      message:
        mod.status === "pending"
          ? "Comment saved and pending moderation."
          : "Comment posted after AI moderation.",
    };
  },
  vote: async ({ request, locals, getClientAddress }) => {
    if (!locals.user) throw redirect(303, "/login");
    if (
      !rateLimit({
        scope: "detail-vote",
        identifier: `${locals.user.id}:${getClientAddress()}`,
        limit: 60,
        windowMs: 60_000,
      })
    ) {
      return fail(429, { message: "too many votes; please wait a moment" });
    }
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
