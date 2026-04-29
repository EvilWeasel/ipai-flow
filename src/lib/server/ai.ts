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
    provider: usesPgx ? "pgx" : "openai",
  };
}

function normalizeOpenAIBaseURL(rawBaseURL?: string) {
  if (!rawBaseURL) return undefined;
  return rawBaseURL
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/chat\/completions$/, "");
}

function logAIDecision(
  event: "provider" | "fallback",
  details: Record<string, string | number | boolean | undefined>,
) {
  console.info("[ai]", event, details);
}

function streamAIText(system: string, user: string, max = 300, purpose = "completion") {
  const config = providerConfig();
  if (!config) {
    logAIDecision("fallback", { purpose, reason: "no-provider-config" });
    return null;
  }
  try {
    logAIDecision("provider", {
      purpose,
      provider: config.provider,
      model: config.model,
      baseURL: config.baseURL ? "custom" : "default",
    });
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
        totalMs: 4_000,
        chunkMs: 2_000,
      },
    });
  } catch (err) {
    logAIDecision("fallback", {
      purpose,
      reason: err instanceof Error ? err.message : "provider-init-failed",
    });
    return null;
  }
}

function cleanText(text: string): string {
  return text
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateSentence(text: string, max = 180): string {
  const clean = cleanText(text);
  if (clean.length <= max) return clean;
  const clipped = clean.slice(0, max).replace(/\s+\S*$/, "").trim();
  return `${clipped}...`;
}

function hostname(url: string | null | undefined): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function fallbackSummary(input: {
  title: string;
  body?: string | null;
  url?: string | null;
}): string {
  const title = truncateSentence(input.title, 120);
  const body = cleanText(input.body ?? "");
  const host = hostname(input.url);
  const firstSentence = body.match(/[^.!?]+[.!?]+/)?.[0] ?? body;

  if (firstSentence) {
    const context = truncateSentence(firstSentence, 190).replace(/[.!?]?$/, ".");
    const source = host ? ` The linked source is ${host}.` : "";
    return `This discussion centers on "${title}" and highlights ${context.charAt(0).toLowerCase()}${context.slice(1)}${source}`;
  }

  if (host) {
    return `This link post points IPAI Flow members to ${host} for "${title}", giving the community a concrete item to evaluate and discuss.`;
  }

  return `This post opens a focused IPAI Flow discussion on "${title}", giving members a clear topic for follow-up and shared context.`;
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
}): { prompt: string } {
  return {
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
  const { prompt } = summaryInput(input);
  const fallback = fallbackSummary(input);
  const ai = streamAIText(
    "You summarise community forum posts for the IPAI Flow platform. Write 2-3 concise sentences in neutral, factual English. No emojis, no marketing language.",
    prompt,
    200,
    "summary",
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
  logAIDecision("fallback", { purpose: "summary", reason: "empty-stream" });
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
    "moderation",
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
