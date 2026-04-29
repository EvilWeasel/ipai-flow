import type { PageServerLoad } from "./$types";
import { getDigest, getTrendingTags } from "$lib/server/posts";
import type { Post } from "$lib/server/db";

const ALLOWED_WINDOWS = [24, 24 * 7, 24 * 30] as const;

function normalizeWindow(raw: string | null): (typeof ALLOWED_WINDOWS)[number] {
  const hours = Number(raw ?? "24");
  return ALLOWED_WINDOWS.includes(hours as (typeof ALLOWED_WINDOWS)[number])
    ? (hours as (typeof ALLOWED_WINDOWS)[number])
    : 24;
}

function windowLabel(hours: number): string {
  if (hours === 24) return "last 24 hours";
  if (hours === 24 * 7) return "last 7 days";
  return "last 30 days";
}

function buildDigestIntro(posts: Post[], trendingTags: string[], hours: number): string {
  if (posts.length === 0) return "";

  const topPost = posts[0];
  const mostDiscussed = [...posts].sort((a, b) => b.comment_count - a.comment_count)[0];
  const themes = trendingTags.slice(0, 3).map((tag) => `#${tag}`);
  const themeText =
    themes.length > 0
      ? `Top themes are ${themes.join(", ")}`
      : "The conversation is spread across several emerging themes";
  const discussionText =
    mostDiscussed.comment_count > 0
      ? `"${mostDiscussed.title}" is the most discussed thread with ${mostDiscussed.comment_count} comments`
      : `"${topPost.title}" is currently the strongest signal thread`;

  return `${themeText} across ${posts.length} active posts in the ${windowLabel(hours)}. ${discussionText}, while "${topPost.title}" leads by score.`;
}

export const load: PageServerLoad = async ({ url }) => {
  const window = normalizeWindow(url.searchParams.get("hours"));
  let posts;
  let trendingTags;
  try {
    posts = await getDigest(window);
    trendingTags = await getTrendingTags(window);
  } catch {
    return {
      posts: [],
      hours: window,
      windows: ALLOWED_WINDOWS,
      intro: "",
      trendingTags: [],
      mostDiscussed: [],
      highestSignal: [],
      dbError: "Digest is unavailable because the database is not reachable.",
    };
  }

  const intro = buildDigestIntro(posts, trendingTags, window);
  const mostDiscussed = [...posts]
    .sort((a, b) => b.comment_count - a.comment_count || b.score - a.score)
    .slice(0, 3);
  const highestSignal = [...posts]
    .sort((a, b) => b.score - a.score || b.comment_count - a.comment_count)
    .slice(0, 3);

  return {
    posts,
    hours: window,
    windows: ALLOWED_WINDOWS,
    intro,
    trendingTags,
    mostDiscussed,
    highestSignal,
    dbError: "",
  };
};
