import type { PageServerLoad, Actions } from "./$types";
import { error, fail, redirect } from "@sveltejs/kit";
import { listPosts, vote } from "$lib/server/posts";

export const load: PageServerLoad = async ({ url, locals }) => {
  const sortParam = url.searchParams.get("sort");
  const sort = sortParam === "new" || sortParam === "top" ? sortParam : "hot";
  const posts = listPosts({ sort, userId: locals.user?.id ?? 0, limit: 50 });
  return { posts, sort };
};

export const actions: Actions = {
  vote: async ({ request, locals }) => {
    if (!locals.user) throw redirect(303, "/login");
    const form = await request.formData();
    const id = Number(form.get("id"));
    const value = Number(form.get("value"));
    if (!Number.isFinite(id) || ![1, -1, 0].includes(value)) {
      return fail(400, { message: "invalid vote" });
    }
    vote({
      userId: locals.user.id,
      kind: "post",
      targetId: id,
      value: value as 1 | -1 | 0,
    });
    return { ok: true };
  },
};
