type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export function rateLimit(input: {
  scope: string;
  identifier: string;
  limit: number;
  windowMs: number;
}): boolean {
  const now = Date.now();
  const key = `${input.scope}:${input.identifier}`;
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + input.windowMs });
    return true;
  }

  if (current.count >= input.limit) return false;
  current.count += 1;
  return true;
}

