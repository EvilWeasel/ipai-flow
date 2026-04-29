import type { PageServerLoad, Actions } from "./$types";
import { fail, redirect } from "@sveltejs/kit";
import { createPost, normalizeTagsInput } from "$lib/server/posts";
import { localModerationBlock } from "$lib/server/ai";
import { moderatePostInBackground, runInBackground } from "$lib/server/moderation-jobs";
import { rateLimit } from "$lib/server/rate-limit";

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) throw redirect(303, "/login?next=/submit");
  return {};
};

function normalizeUrl(input: string): string | null {
  if (!input) return null;
  try {
    const u = new URL(input);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

function basicPostProblem(input: {
  title: string;
  urlRaw: string;
  body: string;
  tagsRaw: string;
}): string | null {
  if (input.title.length < 4 || input.title.length > 200) return "title must be 4-200 characters";
  if (/^https?:\/\//i.test(input.title)) return "title should describe the submission, not repeat the URL";
  if (!normalizeUrl(input.urlRaw)) return "enter a valid http or https URL";
  if (input.body && input.body.length > 20_000) return "text too long";
  if (/(.)\1{24,}/.test(`${input.title}\n${input.body}`)) return "content looks malformed";
  return localModerationBlock([input.title, input.body, input.tagsRaw].filter(Boolean).join("\n\n"));
}

export const actions: Actions = {
  default: async ({ request, locals, getClientAddress, platform }) => {
    if (!locals.user) throw redirect(303, "/login");
    if (
      !rateLimit({
        scope: "submit",
        identifier: `${locals.user.id}:${getClientAddress()}`,
        limit: 10,
        windowMs: 60_000,
      })
    ) {
      return fail(429, { message: "too many submissions; please wait a moment" });
    }
    const form = await request.formData();
    const title = String(form.get("title") ?? "").trim();
    const urlRaw = String(form.get("url") ?? "").trim();
    const body = String(form.get("body") ?? "").trim();
    const tagsRaw = String(form.get("tags") ?? "").trim();

    const basicProblem = basicPostProblem({ title, urlRaw, body, tagsRaw });
    if (basicProblem) {
      return fail(400, {
        moderationStatus: "blocked",
        message:
          basicProblem === "profanity is not allowed"
            ? "You cannot post that content because it contains profanity."
            : basicProblem,
        title,
        urlRaw,
        body,
        tagsRaw,
      });
    }
    const url = normalizeUrl(urlRaw);

    let id;
    try {
      id = await createPost({
        userId: locals.user.id,
        title,
        url,
        body: body || null,
        tags: normalizeTagsInput(tagsRaw),
        moderationStatus: "pending",
        moderationReason: "AI moderation pending",
      });
    } catch {
      return fail(503, {
        message: "submission unavailable because the database is not reachable",
        title,
        urlRaw,
        body,
        tagsRaw,
      });
    }

    runInBackground(platform, "post", () =>
      moderatePostInBackground({ postId: id, title, body: body || null, url }),
    );

    throw redirect(303, `/post/${id}`);
  },
};
