import { createOpenAI } from "@ai-sdk/openai";
import { env } from "$env/dynamic/private";
import { streamText } from "ai";

function providerConfig() {
  const key = env.PGX_API_KEY ?? env.OPENAI_API_KEY;
  if (!key) return null;

  const usesPgx = Boolean(env.PGX_API_KEY);
  const rawBaseURL =
    env.PGX_URL_BASE ??
    env.OPENAI_BASE_URL ??
    (usesPgx ? "https://pgxapi.siller.io/v1/chat/completions" : undefined);
  const model =
    env.PGX_MODEL ?? env.OPENAI_MODEL ?? (usesPgx ? "gemma-4-26b" : "gpt-4o-mini");

  return {
    key,
    model,
    baseURL: normalizeOpenAIBaseURL(rawBaseURL),
  };
}

function normalizeOpenAIBaseURL(rawBaseURL?: string) {
  if (!rawBaseURL) return undefined;
  return rawBaseURL
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/chat\/completions$/, "");
}

function streamAIText(system: string, user: string, max = 300) {
  const config = providerConfig();
  if (!config) return null;
  try {
    const openai = createOpenAI({
      apiKey: config.key,
      ...(config.baseURL ? { baseURL: config.baseURL } : {}),
    });
    return streamText({
      model: openai.chat(config.model),
      system,
      prompt: user,
      temperature: 0.3,
      maxOutputTokens: max,
      maxRetries: 1,
      timeout: {
        totalMs: 20_000,
        chunkMs: 10_000,
      },
    });
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

async function readTextStream(
  textStream: AsyncIterable<string>,
): Promise<string | null> {
  try {
    let text = "";
    for await (const chunk of textStream) text += chunk;
    return text.trim() || null;
  } catch {
    return null;
  }
}

async function* fallbackTextStream(text: string): AsyncIterable<string> {
  if (text) yield text;
}

function summaryInput(input: {
  title: string;
  body?: string | null;
  url?: string | null;
}): { sourceText: string; prompt: string } {
  return {
    sourceText: [input.title, input.body, input.url].filter(Boolean).join("\n\n"),
    prompt: `Title: ${input.title}\n\n${input.body ?? "(link post)"}${
      input.url ? `\nURL: ${input.url}` : ""
    }`,
  };
}

export function streamSummary(input: {
  title: string;
  body?: string | null;
  url?: string | null;
}): {
  textStream: AsyncIterable<string>;
  fallback: string;
  source: "ai" | "fallback";
} {
  const { sourceText, prompt } = summaryInput(input);
  const fallback = fallbackSummary(sourceText);
  const ai = streamAIText(
    "You summarise community forum posts for the IPAI Flow platform. Write 2-3 concise sentences in neutral, factual English. No emojis, no marketing language.",
    prompt,
    200,
  );

  if (!ai) {
    return {
      textStream: fallbackTextStream(fallback),
      fallback,
      source: "fallback",
    };
  }

  return {
    textStream: ai.textStream,
    fallback,
    source: "ai",
  };
}

export async function summarize(input: {
  title: string;
  body?: string | null;
  url?: string | null;
}): Promise<{ summary: string; source: "ai" | "fallback" }> {
  const streamed = streamSummary(input);
  const summary = await readTextStream(streamed.textStream);
  if (summary) return { summary, source: streamed.source };
  return { summary: streamed.fallback, source: "fallback" };
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
  const ai = streamAIText(
    'You moderate forum posts. Reply with exactly "OK" if the content is acceptable for a professional community, or "BLOCK: <short reason>" if it contains harassment, hate speech, illegal content, or spam.',
    text.slice(0, 4000),
    60,
  );
  const moderation = ai ? await readTextStream(ai.textStream) : null;
  if (moderation && moderation.toUpperCase().startsWith("BLOCK")) {
    return {
      ok: false,
      reason: moderation.replace(/^BLOCK:?\s*/i, "").trim() || "blocked",
    };
  }
  return { ok: true };
}
