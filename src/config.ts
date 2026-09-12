import 'dotenv/config';
import { z } from 'zod';

const numberFromEnv = (fallback: number) =>
  z
    .string()
    .optional()
    .transform((value) => (value === undefined || value === '' ? fallback : Number(value)))
    .pipe(z.number().int().positive());

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: numberFromEnv(3000),
  /** Timeout for outbound requests to bbc.com, in ms. */
  UPSTREAM_TIMEOUT_MS: numberFromEnv(10_000),
  /** In-process cache TTL for list endpoints, in seconds. */
  LIST_CACHE_TTL_SECONDS: numberFromEnv(120),
  /** In-process cache TTL for single-article endpoints, in seconds. */
  ARTICLE_CACHE_TTL_SECONDS: numberFromEnv(600),
  /** Comma-separated allowed origins, or `*` for a fully open public API. */
  CORS_ORIGIN: z.string().default('*'),

  // --- /api/v2 engine -------------------------------------------------------
  /** Max simultaneous outbound requests to bbc.com across the whole process. */
  MAX_CONCURRENCY: numberFromEnv(4),
  /** Extra attempts after the first failure. Only 5xx and network errors retry. */
  UPSTREAM_RETRIES: numberFromEnv(1),
  /** How many topic pages a single deep-crawl request may fetch. */
  MAX_TOPIC_PAGES: numberFromEnv(40),
  /** Pages crawled when `?pages=` is omitted. */
  DEFAULT_CRAWL_PAGES: numberFromEnv(5),
  /** Cap on cached responses; the least recently used entry is evicted first. */
  CACHE_MAX_ENTRIES: numberFromEnv(500),
  /** Cap on the in-memory article index that powers /api/v2/search. */
  CACHE_MAX_INDEXED: numberFromEnv(5000),
  /** Requests per minute per IP, applied to /api/v2. */
  V2_RATE_LIMIT_MAX: numberFromEnv(120),
  /**
   * Requests per minute per IP for the deep-crawl route. One such request can
   * be 40 upstream fetches, so it gets its own far tighter budget.
   */
  CRAWL_RATE_LIMIT_MAX: numberFromEnv(10),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment configuration');
}

const env = parsed.data;

export const config = {
  nodeEnv: env.NODE_ENV,
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
  port: env.PORT,
  upstreamTimeoutMs: env.UPSTREAM_TIMEOUT_MS,
  listCacheTtlMs: env.LIST_CACHE_TTL_SECONDS * 1000,
  articleCacheTtlMs: env.ARTICLE_CACHE_TTL_SECONDS * 1000,
  listCacheTtlSeconds: env.LIST_CACHE_TTL_SECONDS,
  articleCacheTtlSeconds: env.ARTICLE_CACHE_TTL_SECONDS,
  corsOrigin: env.CORS_ORIGIN === '*' ? '*' : env.CORS_ORIGIN.split(',').map((o) => o.trim()),

  maxConcurrency: env.MAX_CONCURRENCY,
  upstreamRetries: env.UPSTREAM_RETRIES,
  maxTopicPages: env.MAX_TOPIC_PAGES,
  defaultCrawlPages: env.DEFAULT_CRAWL_PAGES,
  cacheMaxEntries: env.CACHE_MAX_ENTRIES,
  cacheMaxIndexed: env.CACHE_MAX_INDEXED,
  v2RateLimitMax: env.V2_RATE_LIMIT_MAX,
  crawlRateLimitMax: env.CRAWL_RATE_LIMIT_MAX,
} as const;

/** Topic listings are 24 items per page upstream. */
export const TOPIC_PAGE_SIZE = 24;

export const BBC_ORIGIN = 'https://www.bbc.com';
export const SERVICE_PATH = '/bengali';
export const SOURCE_NAME = 'BBC Bangla';
