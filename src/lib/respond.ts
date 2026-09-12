import type { Response } from 'express';

import { config } from '../config';

/** Envelope used by every `/api/*` endpoint. */
export function ok<T extends Record<string, unknown>>(res: Response, payload: T): Response {
  return res.json({ success: true, ...payload });
}

/**
 * Ask Vercel's CDN to serve this response for `ttlSeconds` and to keep serving
 * a stale copy while it revalidates. This is what keeps most traffic from ever
 * reaching the function -- the in-process cache only helps a warm instance.
 */
export function withCacheHeaders(res: Response, ttlSeconds: number): Response {
  if (config.isTest) return res;
  return res.set(
    'Cache-Control',
    `public, s-maxage=${ttlSeconds}, stale-while-revalidate=${ttlSeconds * 5}`,
  );
}
