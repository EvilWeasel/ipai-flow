import type { PageServerLoad, Actions } from "./$types";
import { error, fail, redirect } from "@sveltejs/kit";
import { createComment, getComments, getPost, vote } from "$lib/server/posts";
import { localModerationBlock } from "$lib/server/ai";
import { moderateCommentInBackground, runInBackground } from "$lib/server/moderation-jobs";
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
  comment: async ({ request, params, locals, getClientAddress, platform }) => {
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
        message: "comment must be 1-10,000 characters",
        body,
        parentId,
      });
    }

    const localBlock = localModerationBlock(body);
    if (localBlock) {
      return fail(400, {
        ok: false,
        moderationStatus: "blocked",
        message:
          localBlock === "profanity is not allowed"
            ? "You cannot post that comment because it contains profanity."
            : `blocked by moderation: ${localBlock}`,
        body,
        parentId,
      });
    }

    const post = await getPost(id, locals.user.id);
    if (!post) return fail(404, { message: "post not found", body, parentId });
    if (post.moderation_status !== "approved") {
      return fail(400, { message: "comments open after post moderation finishes", body, parentId });
    }

    let commentId: number;
    try {
      commentId = await createComment({
        userId: locals.user.id,
        username: locals.user.username,
        postId: id,
        parentId,
        body,
        moderationStatus: "pending",
        moderationReason: "AI moderation pending",
      });
    } catch (err) {
      console.error("[comment] create failed", err instanceof Error ? err.message : err);
      return fail(503, {
        message: "comment unavailable right now",
        body,
        parentId,
      });
    }

    runInBackground(platform, "comment", () =>
      moderateCommentInBackground({ commentId, body }),
    );

    return {
      ok: true,
      moderationStatus: "pending",
      message: "Comment saved and pending AI moderation.",
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
