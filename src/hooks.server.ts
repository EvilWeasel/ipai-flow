import type { Handle } from "@sveltejs/kit";
import { getSessionCookie, getUserBySession } from "$lib/server/auth";

export const handle: Handle = async ({ event, resolve }) => {
  const sid = getSessionCookie(event.cookies);
  if (sid) {
    const user = await getUserBySession(sid).catch(() => null);
    if (user) {
      event.locals.user = user;
      event.locals.sessionId = sid;
    }
  }
  return resolve(event);
};
