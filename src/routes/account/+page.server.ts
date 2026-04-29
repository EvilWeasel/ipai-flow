import type { PageServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";
import { listUserPosts } from "$lib/server/users";

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) throw redirect(303, "/login");
  const user = {
    id: locals.user.id,
    username: locals.user.username,
    karma: locals.user.karma,
    created_at: locals.user.created_at,
  };
  return {
    user,
    posts: await listUserPosts(user),
  };
};
