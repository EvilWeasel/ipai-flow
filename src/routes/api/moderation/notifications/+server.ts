import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { listModerationNotifications } from "$lib/server/posts";

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user) return json({ notifications: [] });

  try {
    return json({
      notifications: await listModerationNotifications(locals.user.id),
    });
  } catch {
    return json({ notifications: [] }, { status: 503 });
  }
};
