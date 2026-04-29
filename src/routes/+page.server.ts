import type { PageServerLoad, Actions } from "./$types";
import { fail, redirect } from "@sveltejs/kit";
import { listPosts, vote } from "$lib/server/posts";
import { rateLimit } from "$lib/server/rate-limit";

export const load: PageServerLoad = async ({ url, locals }) => {
  const sortParam = url.searchParams.get("sort");
  const sort = sortParam === "new" || sortParam === "top" ? sortParam : "hot";
  const limitRaw = Number(url.searchParams.get("limit") ?? 50);
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 && limitRaw <= 500 ? limitRaw : 50;
  try {
    const posts = await listPosts({ sort, userId: locals.user?.id ?? 0, limit });
    return { posts, sort, limit, dbError: "" };
  } catch {
    return {
      posts: [],
      sort,
      limit,
      dbError: "Posts are unavailable because the database is not reachable.",
    };
  }
};

export const actions: Actions = {
  vote: async ({ request, locals, getClientAddress }) => {
    if (!locals.user) throw redirect(303, "/login");
    if (
      !rateLimit({
        scope: "feed-vote",
        identifier: `${locals.user.id}:${getClientAddress()}`,
        limit: 60,
        windowMs: 60_000,
      })
    ) {
      return fail(429, { message: "too many votes; please wait a moment" });
    }
    const form = await request.formData();
    const id = Number(form.get("id"));
    const value = Number(form.get("value"));
    if (!Number.isFinite(id) || ![1, -1, 0].includes(value)) {
      return fail(400, { message: "invalid vote" });
    }
    try {
      await vote({
        userId: locals.user.id,
        kind: "post",
        targetId: id,
        value: value as 1 | -1 | 0,
      });
    } catch {
      return fail(503, { message: "vote unavailable right now" });
    }
    return { ok: true };
  },
};
