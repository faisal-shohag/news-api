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
} as const;
