import { readFileSync } from 'node:fs';
import path from 'node:path';

import { vi } from 'vitest';

const FIXTURES = path.join(__dirname, 'fixtures');

export const fixture = (name: string): string => readFileSync(path.join(FIXTURES, name), 'utf8');

export const ARTICLE_ID = fixture('article-id.txt').trim();

/** Map of upstream URL pattern to fixture file. */
const ROUTES: [RegExp, string][] = [
  [/\/bengali\/popular\/read$/, 'popular.html'],
  [/\/bengali\/topics\/c8y94k95v52t$/, 'category-technology.html'],
  [/\/bengali\/topics\/cdr56gv542vt$/, 'category-india.html'],
  [/\/bengali\/articles\//, 'article.html'],
  [/\/bengali$/, 'home.html'],
];

/**
 * Replace the shared axios client's `get` with a fixture lookup, so tests never
 * touch the network. The returned spy lets callers assert how many upstream
 * fetches actually happened, which is what the cache test checks.
 */
export function stubUpstream() {
  return vi.fn(async (url: string) => {
    const match = ROUTES.find(([pattern]) => pattern.test(url));

    if (!match) {
      const error: Error & { response?: { status: number } } = new Error(`404 for ${url}`);
      error.response = { status: 404 };
      throw error;
    }

    return { status: 200, data: fixture(match[1]) };
  });
}
