import { config } from '../config';
import type { NormalizedArticle } from '../scrape/v2/normalize';

interface Entry<T> {
  value: T;
  cachedAt: number;
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
  const now = Date.now();
  store.set(key, { value: pending, cachedAt: now, expiresAt: now + ttlMs });

  if (store.size > MAX_ENTRIES) evictOldest();

  try {
    return await pending;
  } catch (error) {
    store.delete(key);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// /api/v2 cache
// ---------------------------------------------------------------------------

export interface CacheResult<T> {
  value: T;
  /** When the underlying scrape ran. */
  cachedAt: string;
  /** True when the value is past its TTL and only served because a refresh failed. */
  stale: boolean;
}

const v2Store = new Map<string, Entry<unknown>>();
const inFlight = new Map<string, Promise<CacheResult<unknown>>>();

/** Move a key to the end of the Map's insertion order, making it most-recent. */
function touch(key: string, entry: Entry<unknown>): void {
  v2Store.delete(key);
  v2Store.set(key, entry);
}

function evictLru(): void {
  while (v2Store.size > config.cacheMaxEntries) {
    const oldest = v2Store.keys().next();
    if (oldest.done) break;
    v2Store.delete(oldest.value);
  }
}

/**
 * TTL cache with the two properties a scrape-on-request API needs:
 *
 *  1. Single-flight -- concurrent misses on one key share a single upstream
 *     fetch rather than stampeding BBC.
 *  2. Stale-if-error -- when a refresh fails but an expired value is still
 *     around, serve it (flagged `stale: true`) instead of failing the request.
 *     A news API that briefly serves five-minute-old headlines is far more
 *     useful than one that 502s because BBC hiccuped.
 */
export async function getOrFetch<T>(
  key: string,
  ttlMs: number,
  produce: () => Promise<T>,
): Promise<CacheResult<T>> {
  const entry = v2Store.get(key) as Entry<T> | undefined;

  if (entry && entry.expiresAt > Date.now()) {
    stats.hits += 1;
    touch(key, entry);
    return { value: entry.value, cachedAt: new Date(entry.cachedAt).toISOString(), stale: false };
  }

  const existing = inFlight.get(key);
  if (existing) return existing as Promise<CacheResult<T>>;

  stats.misses += 1;

  const task = (async (): Promise<CacheResult<T>> => {
    try {
      const value = await produce();
      const cachedAt = Date.now();
      const fresh: Entry<T> = { value, cachedAt, expiresAt: cachedAt + ttlMs };
      v2Store.set(key, fresh);
      evictLru();
      return { value, cachedAt: new Date(cachedAt).toISOString(), stale: false };
    } catch (error) {
      if (entry) {
        console.warn(`[cache] serving stale "${key}" after error:`, (error as Error).message);
        return {
          value: entry.value,
          cachedAt: new Date(entry.cachedAt).toISOString(),
          stale: true,
        };
      }
      throw error;
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, task as Promise<CacheResult<unknown>>);
  return task;
}

// ---------------------------------------------------------------------------
// Article index
// ---------------------------------------------------------------------------

/**
 * Every article seen by any v2 scrape, keyed by id.
 *
 * This is what `/api/v2/search` queries. BBC's own search path is disallowed by
 * their robots.txt, so it is deliberately never proxied -- the API searches only
 * what it has already fetched for other reasons.
 */
const articleIndex = new Map<string, NormalizedArticle>();

export function indexArticles(articles: NormalizedArticle[]): void {
  for (const article of articles) {
    if (!article?.id) continue;
    const existing = articleIndex.get(article.id);
    // Merge rather than replace: topic listings often lack the image or summary
    // that the homepage carried for the same story.
    const merged = existing ? { ...existing, ...article } : article;
    articleIndex.delete(article.id);
    articleIndex.set(article.id, merged);
  }

  while (articleIndex.size > config.cacheMaxIndexed) {
    const oldest = articleIndex.keys().next();
    if (oldest.done) break;
    articleIndex.delete(oldest.value);
  }
}

export function getIndexed(id: string): NormalizedArticle | null {
  return articleIndex.get(id) ?? null;
}

export function listIndexed(): NormalizedArticle[] {
  return [...articleIndex.values()];
}

export function indexSize(): number {
  return articleIndex.size;
}

// ---------------------------------------------------------------------------

export function cacheStats() {
  return {
    entries: store.size,
    v2Entries: v2Store.size,
    inFlight: inFlight.size,
    indexed: articleIndex.size,
    hits: stats.hits,
    misses: stats.misses,
  };
}

/** Drop every cached response and the article index. */
export function clearCache(): void {
  store.clear();
  v2Store.clear();
  inFlight.clear();
  articleIndex.clear();
  stats.hits = 0;
  stats.misses = 0;
}
