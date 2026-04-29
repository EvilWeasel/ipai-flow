import type { PageServerLoad, Actions } from "./$types";
import { fail, redirect } from "@sveltejs/kit";
import {
  createSession,
  getUserAuthByUsername,
  setSessionCookie,
  verifyPassword,
} from "$lib/server/auth";

export const load: PageServerLoad = async ({ locals, url }) => {
  if (locals.user) {
    const next = url.searchParams.get("next") ?? "/";
    throw redirect(303, next);
  }
  return { next: url.searchParams.get("next") ?? "/" };
};

export const actions: Actions = {
  default: async ({ request, cookies, url }) => {
    const form = await request.formData();
    const username = String(form.get("username") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const row = await getUserAuthByUsername(username);
    if (!row || !(await verifyPassword(password, row.password_hash))) {
      return fail(400, { message: "invalid username or password", username });
    }
    const sid = await createSession(row.id);
    setSessionCookie(cookies, sid);
    const next = url.searchParams.get("next") ?? "/";
    throw redirect(303, next);
  },
};
