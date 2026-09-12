interface Entry<T> {
  value: T;
  expiresAt: number;
}

const MAX_ENTRIES = 200;

const store = new Map<string, Entry<unknown>>();

/** Number of upstream fetches avoided. Exposed for tests and logging. */
export const stats = { hits: 0, misses: 0 };

function evictOldest(): void {
  const oldest = store.keys().next();
  if (!oldest.done) store.delete(oldest.value);
}

/**
 * Memoise an async producer for `ttlMs`.
 *
 * The service scrapes bbc.com on every request, so without this each client hit
 * is one outbound fetch. On Vercel this only survives within a warm instance,
 * which is why callers also set `Cache-Control` (see `withCacheHeaders`).
 *
 * Concurrent callers for the same key share one in-flight promise, so a burst
 * of requests on a cold key still produces a single upstream fetch. A rejected
 * promise is evicted so failures are not cached.
 */
export async function cached<T>(key: string, ttlMs: number, produce: () => Promise<T>): Promise<T> {
  const hit = store.get(key) as Entry<Promise<T> | T> | undefined;

  if (hit && hit.expiresAt > Date.now()) {
    stats.hits += 1;
    return await hit.value;
  }

  stats.misses += 1;

  const pending = produce();
  store.set(key, { value: pending, expiresAt: Date.now() + ttlMs });

  if (store.size > MAX_ENTRIES) evictOldest();

  try {
    return await pending;
  } catch (error) {
    store.delete(key);
    throw error;
  }
}

/** Test helper: drop everything. */
export function clearCache(): void {
  store.clear();
  stats.hits = 0;
  stats.misses = 0;
}
