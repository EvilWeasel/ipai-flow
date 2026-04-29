import type { Actions } from "./$types";
import { redirect } from "@sveltejs/kit";
import {
  clearSessionCookie,
  deleteSession,
  getSessionCookie,
} from "$lib/server/auth";

export const actions: Actions = {
  default: async ({ cookies }) => {
    const sid = getSessionCookie(cookies);
    if (sid) await deleteSession(sid);
    clearSessionCookie(cookies);
    throw redirect(303, "/");
  },
};
