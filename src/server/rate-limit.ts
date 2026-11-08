// A fixed window per client for the writes on /api (docs/features/security.md): at most `limit`
// requests in a window of `windowMs`, counted in this process. One instance holds the one SQLite
// file, so one memory is the whole truth. The clock is passed in with every call, so the rule is
// tested without waiting; the proxy passes Date.now().
export type RateLimit = {
  limit: number;
  windowMs: number;
  /** Over this many clients, the windows that ended are forgotten on the next call. */
  maxClients?: number;
};

/** Writes per client per minute: ten demo cards, a few payments and an exit fit many times over. */
export const API_WRITE_LIMIT: RateLimit = { limit: 120, windowMs: 60_000 };

export type RateLimitAnswer =
  { ok: true; remaining: number } | { ok: false; retryAfterSeconds: number };

export type RateLimiter = {
  /** Counts one request of `key` at `now` (ms since the epoch) and says whether it may pass. */
  take(key: string, now: number): RateLimitAnswer;
  /** How many clients have a window open (for the tests). */
  size(): number;
};

export function createRateLimiter(rule: RateLimit): RateLimiter {
  const windows = new Map<string, { count: number; startedAt: number }>();
  const maxClients = rule.maxClients ?? 10_000;
  return {
    take(key, now) {
      // A scan from many addresses must not fill the memory: ended windows go when it grows.
      if (windows.size >= maxClients) {
        for (const [client, window] of windows) {
          if (now - window.startedAt >= rule.windowMs) windows.delete(client);
        }
      }
      const current = windows.get(key);
      if (!current || now - current.startedAt >= rule.windowMs) {
        windows.set(key, { count: 1, startedAt: now });
        return { ok: true, remaining: rule.limit - 1 };
      }
      if (current.count >= rule.limit) {
        const endsAt = current.startedAt + rule.windowMs;
        return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((endsAt - now) / 1000)) };
      }
      current.count += 1;
      return { ok: true, remaining: rule.limit - current.count };
    },
    size: () => windows.size,
  };
}
