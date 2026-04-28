import type { RequestHandler } from "./$types";
import { json, error } from "@sveltejs/kit";
import { getPost, setAiSummary } from "$lib/server/posts";
import { summarize } from "$lib/server/ai";

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) throw error(401, "login required");
  const { postId } = (await request.json()) as { postId?: number };
  if (!postId || !Number.isFinite(postId)) throw error(400, "invalid post id");
  const post = await getPost(postId);
  if (!post) throw error(404, "not found");
  const { summary, source } = await summarize({
    title: post.title,
    body: post.body,
    url: post.url,
  });
  if (summary) await setAiSummary(postId, summary);
  return json({ summary, source });
};
