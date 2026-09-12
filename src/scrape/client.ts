import axios, { AxiosError } from 'axios';

import { config } from '../config';
import { createLimiter } from '../lib/limit';

/**
 * One shared client for every bbc.com fetch.
 *
 * Replaces the identical `{ timeout, headers: { 'User-Agent': ... } }` literal
 * that was copy-pasted into all five handlers.
 *
 * The `/api/v2` engine needs the `__NEXT_DATA__` payload, which BBC only serves
 * to an ordinary browser User-Agent, so that is what we send.
 */
export const httpClient = axios.create({
  timeout: config.upstreamTimeoutMs,
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml',
    'Accept-Language': 'bn,en;q=0.8',
  },
  // We parse the HTML ourselves; let axios hand it over untouched.
  responseType: 'text',
  transformResponse: [(data: unknown) => data],
});

/** Fetch a page and return its HTML. */
export async function fetchHtml(url: string): Promise<string> {
  const response = await httpClient.get<string>(url);
  return response.data;
}

const limit = createLimiter(config.maxConcurrency);

let fetchCount = 0;
/** Total upstream fetches this process has made. Surfaced by /api/v2/health. */
export const getFetchCount = () => fetchCount;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetch through the shared concurrency gate, retrying on 5xx and network
 * failures with a short backoff. 4xx is never retried -- it will not improve.
 */
export function fetchTextLimited(url: string): Promise<string> {
  return limit(async () => {
    let lastError: unknown;

    for (let attempt = 0; attempt <= config.upstreamRetries; attempt += 1) {
      try {
        fetchCount += 1;
        return await fetchHtml(url);
      } catch (error) {
        lastError = error;
        const status = error instanceof AxiosError ? error.response?.status : undefined;
        const retryable = status === undefined || status >= 500;
        if (!retryable || attempt === config.upstreamRetries) break;
        await sleep(300 * 2 ** attempt);
      }
    }

    throw lastError;
  });
}
