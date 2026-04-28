/**
 * Lightweight AI helper. If OPENAI_API_KEY is set, calls OpenAI's
 * chat completions API. Otherwise falls back to a deterministic
 * extractive summary so the app still works fully offline / GDPR-only.
 */

const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const BASE_URL = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";

async function callOpenAI(
  system: string,
  user: string,
  max = 300,
): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.3,
        max_tokens: max,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return data.choices?.[0]?.message?.content?.trim() ?? null;
  } catch {
    return null;
  }
}

function fallbackSummary(text: string, maxSentences = 3): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return "";
  const sentences = clean.match(/[^.!?]+[.!?]+/g) ?? [clean];
  return sentences.slice(0, maxSentences).join(" ").trim();
}

export async function summarize(input: {
  title: string;
  body?: string | null;
  url?: string | null;
}): Promise<{ summary: string; source: "ai" | "fallback" }> {
  const sourceText = [input.title, input.body, input.url]
    .filter(Boolean)
    .join("\n\n");
  const ai = await callOpenAI(
    "You summarise community forum posts for the IPAI Flow platform. Write 2-3 concise sentences in neutral, factual English. No emojis, no marketing language.",
    `Title: ${input.title}\n\n${input.body ?? "(link post)"}${input.url ? `\nURL: ${input.url}` : ""}`,
    200,
  );
  if (ai) return { summary: ai, source: "ai" };
  return { summary: fallbackSummary(sourceText), source: "fallback" };
}

export async function moderate(
  text: string,
): Promise<{ ok: boolean; reason?: string }> {
  // Simple offline heuristic + optional AI check.
  const lower = text.toLowerCase();
  const banned = ["<script", "javascript:", "onerror="];
  for (const term of banned) {
    if (lower.includes(term)) return { ok: false, reason: "unsafe content" };
  }
  if (text.length > 20_000) return { ok: false, reason: "too long" };
  const ai = await callOpenAI(
    'You moderate forum posts. Reply with exactly "OK" if the content is acceptable for a professional community, or "BLOCK: <short reason>" if it contains harassment, hate speech, illegal content, or spam.',
    text.slice(0, 4000),
    60,
  );
  if (ai && ai.toUpperCase().startsWith("BLOCK")) {
    return {
      ok: false,
      reason: ai.replace(/^BLOCK:?\s*/i, "").trim() || "blocked",
    };
  }
  return { ok: true };
}
