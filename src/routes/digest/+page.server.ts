import type { PageServerLoad } from "./$types";
import { getDigest, getTrendingTags } from "$lib/server/posts";
import { summarize } from "$lib/server/ai";

export const load: PageServerLoad = async ({ url }) => {
  const hours = Number(url.searchParams.get("hours") ?? "24");
  const window =
    Number.isFinite(hours) && hours > 0 && hours <= 24 * 30 ? hours : 24;
  let posts;
  let trendingTags;
  try {
    posts = await getDigest(window);
    trendingTags = await getTrendingTags(window);
  } catch {
    return {
      posts: [],
      hours: window,
      intro: "",
      trendingTags: [],
      dbError: "Digest is unavailable because the database is not reachable.",
    };
  }

  let intro = "";
  if (posts.length > 0) {
    const titles = posts
      .slice(0, 10)
      .map((p, i) => `${i + 1}. ${p.title}`)
      .join("\n");
    const r = await summarize({
      title: `IPAI Community digest — last ${window} hours`,
      body: `Top posts:\n${titles}`,
    }).catch(() => ({ summary: "" }));
    intro = r.summary;
  }

  return { posts, hours: window, intro, trendingTags, dbError: "" };
};
