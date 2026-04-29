import type { PageServerLoad } from "./$types";
import { error } from "@sveltejs/kit";
import { getUserByUsername, listUserPosts } from "$lib/server/users";

export const load: PageServerLoad = async ({ params }) => {
  let user;
  try {
    user = await getUserByUsername(params.username);
  } catch {
    throw error(503, "database unavailable");
  }
  if (!user) throw error(404, "user not found");

  try {
    return {
      user,
      posts: await listUserPosts(user),
    };
  } catch {
    throw error(503, "database unavailable");
  }
};
