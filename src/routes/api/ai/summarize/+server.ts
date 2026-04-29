import type { RequestHandler } from "./$types";
import { error } from "@sveltejs/kit";
import { getPost, setAiSummary } from "$lib/server/posts";
import { streamSummary } from "$lib/server/ai";

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) throw error(401, "login required");
  const { postId } = (await request.json().catch(() => ({}))) as {
    postId?: number;
  };
  if (!postId || !Number.isFinite(postId)) throw error(400, "invalid post id");

  let post;
  try {
    post = await getPost(postId);
  } catch {
    return new Response("Summary unavailable because the database is not reachable.", {
      status: 503,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }
  if (!post) throw error(404, "not found");

  const { textStream, fallback } = streamSummary({
    title: post.title,
    body: post.body,
    url: post.url,
  });

  const encoder = new TextEncoder();
  let summary = "";

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of textStream) {
          summary += chunk;
          controller.enqueue(encoder.encode(chunk));
        }
      } catch {
        if (!summary && fallback) {
          summary = fallback;
          controller.enqueue(encoder.encode(fallback));
        }
      } finally {
        const savedSummary = summary.trim();
        if (savedSummary) {
          await setAiSummary(postId, savedSummary).catch(() => undefined);
        }
        controller.close();
      }
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
};
