import { env } from "$env/dynamic/private";
import { Filter } from "bad-words";

export type ModerationStatus = "approved" | "pending" | "blocked";

export type ModerationVerdict = {
  ok: boolean;
  status: ModerationStatus;
  reason?: string;
  source: "local" | "ai" | "fallback";
};

const profanityFilter = new Filter();

const PROFANITY_PATTERNS = [
  /\bf+[\W_]*[u*]+[\W_]*c+[\W_]*k+(?:e[rd]?|ing)?\b/i,
  /\bb+[\W_]*i+[\W_]*t+[\W_]*c+[\W_]*h+(?:e[sd]?|ing)?\b/i,
  /\ba+[\W_]*s+[\W_]*s+[\W_]*h+[\W_]*o+[\W_]*l+[\W_]*e+s?\b/i,
  /\bc+[\W_]*u+[\W_]*n+[\W_]*t+s?\b/i,
];

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
    endpoint: `${normalizeOpenAIBaseURL(rawBaseURL) ?? "https://api.openai.com/v1"}/chat/completions`,
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
  event: "provider" | "provider-error" | "provider-complete" | "fallback",
  details: Record<string, string | number | boolean | undefined>,
) {
  console.info("[ai]", event, details);
}

function providerHeaders(config: NonNullable<ReturnType<typeof providerConfig>>) {
  return {
    authorization: `Bearer ${config.key}`,
    "content-type": "application/json",
  };
}

function providerMessages(system: string, user: string) {
  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

async function* streamOpenAICompatibleText(config: NonNullable<ReturnType<typeof providerConfig>>, input: {
  system: string;
  user: string;
  max: number;
  purpose: string;
}): AsyncIterable<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  let chunks = 0;

  try {
    const response = await fetch(config.endpoint, {
      method: "POST",
      signal: controller.signal,
      headers: providerHeaders(config),
      body: JSON.stringify({
        model: config.model,
        messages: providerMessages(input.system, input.user),
        temperature: 0.3,
        max_tokens: input.max,
        stream: true,
      }),
    });

    if (!response.ok) {
      const message = await response.text().catch(() => "");
      throw new Error(`provider-http-${response.status}${message ? `: ${message.slice(0, 240)}` : ""}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("provider-empty-body");

    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data:")) continue;
        const data = trimmed.slice(5).trim();
        if (data === "[DONE]") {
          logAIDecision("provider-complete", {
            purpose: input.purpose,
            provider: config.provider,
            chunks,
          });
          return;
        }
        try {
          const parsed = JSON.parse(data) as {
            choices?: Array<{ delta?: { content?: string }; message?: { content?: string } }>;
          };
          const text = parsed.choices?.[0]?.delta?.content ?? parsed.choices?.[0]?.message?.content ?? "";
          if (text) {
            chunks += 1;
            yield text;
          }
        } catch (err) {
          throw new Error(`provider-stream-parse-failed: ${err instanceof Error ? err.message : "invalid-json"}`);
        }
      }
    }

    logAIDecision("provider-complete", {
      purpose: input.purpose,
      provider: config.provider,
      chunks,
    });
  } catch (err) {
    logAIDecision("provider-error", {
      purpose: input.purpose,
      provider: config.provider,
      reason: err instanceof Error ? err.message : "provider-stream-failed",
    });
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

async function completeAIText(system: string, user: string, max = 300, purpose = "completion") {
  const config = providerConfig();
  if (!config) {
    logAIDecision("fallback", { purpose, reason: "no-provider-config" });
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    logAIDecision("provider", {
      purpose,
      provider: config.provider,
      model: config.model,
      baseURL: config.baseURL ? "custom" : "default",
    });
    const response = await fetch(config.endpoint, {
      method: "POST",
      signal: controller.signal,
      headers: providerHeaders(config),
      body: JSON.stringify({
        model: config.model,
        messages: providerMessages(system, user),
        temperature: 0.1,
        max_tokens: max,
        stream: false,
      }),
    });

    if (!response.ok) {
      const message = await response.text().catch(() => "");
      throw new Error(`provider-http-${response.status}${message ? `: ${message.slice(0, 240)}` : ""}`);
    }

    const parsed = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { completion_tokens?: number };
    };
    const text = parsed.choices?.[0]?.message?.content?.trim() ?? "";
    logAIDecision("provider-complete", {
      purpose,
      provider: config.provider,
      chunks: text ? 1 : 0,
    });
    return text || null;
  } catch (err) {
    logAIDecision("provider-error", {
      purpose,
      provider: config.provider,
      reason: err instanceof Error ? err.message : "provider-request-failed",
    });
    return null;
  } finally {
    clearTimeout(timeout);
  }
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
    return { textStream: streamOpenAICompatibleText(config, { system, user, max, purpose }) };
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

function containsProfanity(text: string): boolean {
  if (!text.trim()) return false;
  if (profanityFilter.isProfane(text)) return true;
  return PROFANITY_PATTERNS.some((pattern) => pattern.test(text));
}

const URL_CONTEXT_TIMEOUT_MS = 2_500;
const URL_CONTEXT_MAX_BYTES = 120_000;
const URL_CONTEXT_MAX_CHARS = 4_000;

function safeHttpUrl(url: string | null | undefined): URL | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed;
  } catch {
    return null;
  }
}

function htmlToPlainText(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

async function readResponseText(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return "";

  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < URL_CONTEXT_MAX_BYTES) {
    const { value, done } = await reader.read();
    if (done || !value) break;
    const remaining = URL_CONTEXT_MAX_BYTES - total;
    chunks.push(value.byteLength > remaining ? value.slice(0, remaining) : value);
    total += Math.min(value.byteLength, remaining);
  }
  try {
    await reader.cancel();
  } catch {
    /* ignore */
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

export async function fetchUrlContext(url: string | null | undefined): Promise<string | null> {
  const safeUrl = safeHttpUrl(url);
  if (!safeUrl) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), URL_CONTEXT_TIMEOUT_MS);
  try {
    const response = await fetch(safeUrl, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        accept: "text/html,text/plain;q=0.9,*/*;q=0.1",
        "user-agent": "IPAIFlowBot/1.0 (+https://ipaiflow.local)",
      },
    });
    if (!response.ok) return null;

    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    if (
      contentType &&
      !contentType.includes("text/html") &&
      !contentType.includes("text/plain") &&
      !contentType.includes("application/xhtml+xml")
    ) {
      return null;
    }

    const raw = await readResponseText(response);
    const text = contentType.includes("text/plain") ? raw : htmlToPlainText(raw);
    const clean = cleanText(text);
    return clean ? clean.slice(0, URL_CONTEXT_MAX_CHARS) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
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
  urlContext?: string | null;
}): string {
  const title = truncateSentence(input.title, 120);
  const body = cleanText(input.body ?? "");
  const urlContext = cleanText(input.urlContext ?? "");
  const host = hostname(input.url);
  const contextText = body || urlContext;
  const firstSentence = contextText.match(/[^.!?]+[.!?]+/)?.[0] ?? contextText;

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
  urlContext?: string | null;
}): { prompt: string } {
  return {
    prompt: `Title: ${input.title}\n\n${input.body ?? "(link post)"}${
      input.url ? `\nURL: ${input.url}` : ""
    }${input.urlContext ? `\n\nFetched URL context:\n${input.urlContext}` : ""}`,
  };
}

export function streamSummary(input: {
  title: string;
  body?: string | null;
  url?: string | null;
  urlContext?: string | null;
}): {
  textStream: AsyncIterable<string>;
  fallback: string;
  source: "ai" | "fallback";
} {
  if (input.url && input.urlContext === undefined) {
    return {
      textStream: streamSummaryWithFetchedContext(input),
      fallback: fallbackSummary(input),
      source: providerConfig() ? "ai" : "fallback",
    };
  }

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

async function* streamSummaryWithFetchedContext(input: {
  title: string;
  body?: string | null;
  url?: string | null;
}): AsyncIterable<string> {
  const urlContext = await fetchUrlContext(input.url);
  const streamed = streamSummary({ ...input, urlContext });
  yield* streamed.textStream;
}

export async function summarize(input: {
  title: string;
  body?: string | null;
  url?: string | null;
}): Promise<{ summary: string; source: "ai" | "fallback" }> {
  const urlContext = await fetchUrlContext(input.url);
  const streamed = streamSummary({ ...input, urlContext });
  const summary = await readTextStream(streamed.textStream);
  if (summary) return { summary, source: streamed.source };
  logAIDecision("fallback", { purpose: "summary", reason: "empty-stream" });
  return { summary: streamed.fallback, source: "fallback" };
}

export function localModerationBlock(text: string): string | null {
  // Fast deterministic checks before optional AI moderation.
  if (containsProfanity(text)) return "profanity is not allowed";
  const lower = text.toLowerCase();
  const banned = ["<script", "javascript:", "onerror=", "onclick=", "data:text/html"];
  for (const term of banned) {
    if (lower.includes(term)) return "unsafe content";
  }
  if (text.length > 20_000) return "too long";
  return null;
}

export async function moderate(text: string): Promise<ModerationVerdict> {
  const localBlock = localModerationBlock(text);
  if (localBlock) {
    return { ok: false, status: "blocked", reason: localBlock, source: "local" };
  }

  const hasProvider = Boolean(providerConfig());
  const moderation = await completeAIText(
    'You moderate forum posts and comments for a professional community. Reply with exactly one of: "APPROVED", "PENDING: <short reason>", or "BLOCKED: <short reason>". Block harassment, hate speech, illegal content, exploit payloads, and spam. Use pending only when the content needs human review but is not clearly blockable.',
    text.slice(0, 4000),
    60,
    "moderation",
  );
  if (!moderation) {
    if (hasProvider) {
      return {
        ok: true,
        status: "pending",
        reason: "AI moderation unavailable",
        source: "fallback",
      };
    }
    return { ok: true, status: "approved", source: "fallback" };
  }

  const normalized = moderation.trim();
  if (/^BLOCK(?:ED)?\b/i.test(normalized)) {
    return {
      ok: false,
      status: "blocked",
      reason: normalized.replace(/^BLOCK(?:ED)?:?\s*/i, "").trim() || "blocked",
      source: "ai",
    };
  }
  if (/^PENDING\b/i.test(normalized)) {
    return {
      ok: true,
      status: "pending",
      reason: normalized.replace(/^PENDING:?\s*/i, "").trim() || "needs review",
      source: "ai",
    };
  }
  return { ok: true, status: "approved", source: "ai" };
}
