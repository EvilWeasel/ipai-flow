import type { PageServerLoad, Actions } from "./$types";
import { fail, redirect } from "@sveltejs/kit";
import {
  createUser,
  createSession,
  hashPassword,
  isValidUsername,
  setSessionCookie,
  usernameExists,
} from "$lib/server/auth";
import { rateLimit } from "$lib/server/rate-limit";

export const load: PageServerLoad = async ({ locals }) => {
  if (locals.user) throw redirect(303, "/");
  return {};
};

export const actions: Actions = {
  default: async ({ request, cookies, getClientAddress }) => {
    if (
      !rateLimit({
        scope: "register",
        identifier: getClientAddress(),
        limit: 5,
        windowMs: 10 * 60_000,
      })
    ) {
      return fail(429, { message: "too many registration attempts; please wait a few minutes" });
    }
    const form = await request.formData();
    const username = String(form.get("username") ?? "").trim();
    const password = String(form.get("password") ?? "");
    if (!isValidUsername(username)) {
      return fail(400, {
        message: "username must be 3–32 chars: letters, numbers, _ or -",
        username,
      });
    }
    if (password.length < 8 || password.length > 200) {
      return fail(400, {
        message: "password must be at least 8 characters",
        username,
      });
    }
    const existing = await usernameExists(username);
    if (existing) {
      return fail(400, { message: "username already taken", username });
    }
    const hash = await hashPassword(password);
    const userId = await createUser({ username, password_hash: hash });
    const sid = await createSession(userId);
    setSessionCookie(cookies, sid);
    throw redirect(303, "/");
  },
};
