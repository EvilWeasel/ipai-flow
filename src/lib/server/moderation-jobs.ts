import { moderate, summarize } from "./ai";
import { setAiSummary, updateCommentModeration, updatePostModeration } from "./posts";

type WaitUntilPlatform = {
  context?: {
    waitUntil?: (promise: Promise<unknown>) => void;
  };
};

function isProviderTimeout(verdict: Awaited<ReturnType<typeof moderate>>): boolean {
  return verdict.status === "pending" && verdict.reason === "AI moderation unavailable";
}

async function moderateWithRetry(text: string) {
  let verdict = await moderate(text);
  for (const delayMs of [750, 2_000]) {
    if (!isProviderTimeout(verdict)) return verdict;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    verdict = await moderate(text);
  }
  return verdict;
}

export function runInBackground(
  platform: unknown,
  label: string,
  task: () => Promise<void>,
): void {
  const guarded = task().catch((err) => {
    console.error("[moderation]", label, err instanceof Error ? err.message : err);
  });
  const waitUntil = (platform as WaitUntilPlatform | undefined)?.context?.waitUntil;
  if (waitUntil) {
    waitUntil(guarded);
    return;
  }
  void guarded;
}

export async function moderatePostInBackground(input: {
  postId: number;
  title: string;
  url: string | null;
  body: string | null;
}): Promise<void> {
  const verdict = await moderateWithRetry(
    [input.title, input.url, input.body].filter(Boolean).join("\n\n"),
  );
  await updatePostModeration(input.postId, verdict.status, verdict.reason ?? null);

  if (verdict.status !== "approved") return;

  try {
    const { summary } = await summarize({
      title: input.title,
      url: input.url,
      body: input.body,
    });
    if (summary) await setAiSummary(input.postId, summary);
  } catch (err) {
    console.info("[ai] summary background failed", {
      postId: input.postId,
      reason: err instanceof Error ? err.message : "summary-failed",
    });
  }
}

export async function moderateCommentInBackground(input: {
  commentId: number;
  body: string;
}): Promise<void> {
  const verdict = await moderateWithRetry(input.body);
  await updateCommentModeration(input.commentId, verdict.status, verdict.reason ?? null);
}
