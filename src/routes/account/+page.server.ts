import type { PageServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) throw redirect(303, "/login");
  return {
    user: {
      id: locals.user.id,
      username: locals.user.username,
      karma: locals.user.karma,
      created_at: locals.user.created_at,
    },
  };
};
