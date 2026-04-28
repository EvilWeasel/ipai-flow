import type { PageServerLoad } from "./$types";
import { getDigest } from "$lib/server/posts";
import { summarize } from "$lib/server/ai";

export const load: PageServerLoad = async ({ url }) => {
  const hours = Number(url.searchParams.get("hours") ?? "168"); // default last week
  const window =
    Number.isFinite(hours) && hours > 0 && hours <= 24 * 30 ? hours : 168;
  const posts = getDigest(window);

  let intro = "";
  if (posts.length > 0) {
    const titles = posts
      .slice(0, 10)
      .map((p, i) => `${i + 1}. ${p.title}`)
      .join("\n");
    const r = await summarize({
      title: `IPAI Flow digest — last ${window} hours`,
      body: `Top posts:\n${titles}`,
    });
    intro = r.summary;
  }

  return { posts, hours: window, intro };
};
