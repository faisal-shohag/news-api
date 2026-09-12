import axios from 'axios';

import { config } from '../config';

/**
 * One shared client for every bbc.com fetch.
 *
 * Replaces the identical `{ timeout, headers: { 'User-Agent': ... } }` literal
 * that was copy-pasted into all five handlers.
 */
export const httpClient = axios.create({
  timeout: config.upstreamTimeoutMs,
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; NewsCrawler/1.0)',
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
