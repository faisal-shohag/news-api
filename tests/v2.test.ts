import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../src/app';
import { clearCache, getOrFetch, indexSize } from '../src/lib/cache';
import { findRelated, rankArticles, scoreArticle } from '../src/lib/search';
import { renderRss } from '../src/lib/feed';
import { extractPageProps } from '../src/scrape/nextData';
import { httpClient } from '../src/scrape/client';
import { cleanId, idFromLink, toIso } from '../src/scrape/v2/normalize';
import { resolveTopic, topicUrl } from '../src/scrape/v2/topic';
import { ARTICLE_ID, fixture, stubUpstream } from './helpers';

const app = createApp();
let upstream: ReturnType<typeof stubUpstream>;

beforeEach(() => {
  clearCache();
  upstream = stubUpstream();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.spyOn(httpClient, 'get').mockImplementation(upstream as any);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('__NEXT_DATA__ parsing', () => {
  it('reads pageProps out of a real BBC page', () => {
    const props = extractPageProps(fixture('home.html'), 'https://www.bbc.com/bengali');
    expect(props.pageData?.curations?.length).toBeGreaterThan(0);
  });

  // A missing blob means BBC changed their page shape. That must surface, not
  // degrade into an empty article list that looks like "no news today".
  it('throws 502 rather than returning nothing when the blob is gone', () => {
    expect(() => extractPageProps('<html><body>nope</body></html>', 'x')).toThrowError(
      /__NEXT_DATA__/,
    );
  });

  it('throws when the blob is not valid JSON', () => {
    const broken = '<script id="__NEXT_DATA__" type="application/json">{oops</script>';
    expect(() => extractPageProps(broken, 'x')).toThrowError(/not valid JSON/);
  });
});

describe('normalize', () => {
  it('collapses all three timestamp forms to ISO or null', () => {
    expect(toIso('')).toBeNull();
    expect(toIso(null)).toBeNull();
    expect(toIso('not a date')).toBeNull();
    expect(toIso(1_700_000_000_000)).toBe('2023-11-14T22:13:20.000Z');
    expect(toIso('2025-04-03T10:00:00Z')).toBe('2025-04-03T10:00:00.000Z');
  });

  it('reduces a URN id to its final segment', () => {
    expect(cleanId('urn:bbc:optimo:asset:c4gr0d80pdmo')).toBe('c4gr0d80pdmo');
    expect(cleanId('c4gr0d80pdmo')).toBe('c4gr0d80pdmo');
    expect(cleanId(null)).toBeNull();
  });

  it('pulls ids from article and video links alike', () => {
    expect(idFromLink('/bengali/articles/cddvy709v28o')).toBe('cddvy709v28o');
    expect(idFromLink('/bengali/videos/cddvy709v28o')).toBe('cddvy709v28o');
    expect(idFromLink('/bengali/articles/cddvy709v28o?at_medium=rss')).toBe('cddvy709v28o');
    expect(idFromLink(null)).toBeNull();
  });
});

describe('topic resolution', () => {
  it('accepts a slug, a Bengali title, or a raw topic id', () => {
    expect(resolveTopic('technology')?.topicId).toBe('c8y94k95v52t');
    expect(resolveTopic('প্রযুক্তি')?.slug).toBe('technology');
    expect(resolveTopic('c8y94k95v52t')?.slug).toBe('technology');
  });

  it('lets an unlisted topic id through, since BBC has more topics than we list', () => {
    expect(resolveTopic('cabcdefghijk')).toEqual({
      slug: 'cabcdefghijk',
      topicId: 'cabcdefghijk',
      title: null,
    });
  });

  it('rejects something that is neither', () => {
    expect(resolveTopic('not a topic')).toBeNull();
    expect(resolveTopic('')).toBeNull();
  });

  it('omits ?page= for page one', () => {
    expect(topicUrl('abc')).toBe('https://www.bbc.com/bengali/topics/abc');
    expect(topicUrl('abc', 3)).toBe('https://www.bbc.com/bengali/topics/abc?page=3');
  });
});

describe('search ranking', () => {
  const article = (over: Record<string, unknown>) => ({
    id: 'x',
    title: '',
    description: '',
    category: null,
    firstPublished: null,
    ...over,
  });

  it('ranks a title match above a description-only mention', () => {
    const inTitle = scoreArticle(article({ title: 'trump wins' }), 'trump');
    const inBody = scoreArticle(article({ description: 'something about trump' }), 'trump');
    expect(inTitle).toBeGreaterThan(inBody);
  });

  it('scores zero when nothing matches', () => {
    expect(scoreArticle(article({ title: 'weather' }), 'trump')).toBe(0);
  });

  it('breaks ties on recency', () => {
    const older = article({ id: 'a', title: 'trump', firstPublished: '2020-01-01T00:00:00Z' });
    const newer = article({ id: 'b', title: 'trump', firstPublished: '2025-01-01T00:00:00Z' });
    const ranked = rankArticles([older, newer], 'trump');
    expect(ranked[0]?.article.id).toBe('b');
  });

  it('never returns the seed article as its own relation', () => {
    const seed = { id: 'a', category: 'Sports', topics: [{ name: 'Cricket' }] };
    const pool = [
      article({ id: 'a', title: 'cricket match', category: 'Sports' }),
      article({ id: 'b', title: 'cricket final', category: 'Sports' }),
    ];
    const related = findRelated(pool, seed, 10);
    expect(related.map((r) => r.id)).toEqual(['b']);
  });
});

describe('RSS rendering', () => {
  const base = {
    id: 'a',
    title: 'x',
    description: null,
    link: null,
    imageUrl: null,
    imageAlt: null,
    category: null,
    type: 'article',
    isLive: false,
    firstPublished: null,
    lastPublished: null,
    source: 'BBC Bangla',
  };

  it('escapes characters that would break the XML', () => {
    const xml = renderRss([{ ...base, title: 'Fish & <chips> "quoted"' }], {
      title: 'T',
      description: 'D',
      feedUrl: 'http://localhost/feed.xml',
      siteUrl: 'http://x',
    });

    expect(xml).toContain('Fish &amp; &lt;chips&gt; &quot;quoted&quot;');
    expect(xml).not.toContain('<chips>');
  });

  it('emits a pubDate only when the article has one', () => {
    const withDate = renderRss([{ ...base, firstPublished: '2025-04-03T10:00:00Z' }], {
      title: 'T',
      description: 'D',
      feedUrl: 'f',
      siteUrl: 's',
    });
    expect(withDate).toContain('<pubDate>');

    const withoutDate = renderRss([base], {
      title: 'T',
      description: 'D',
      feedUrl: 'f',
      siteUrl: 's',
    });
    expect(withoutDate).not.toContain('<pubDate>');
  });
});

describe('cache', () => {
  it('shares one upstream fetch between concurrent misses', async () => {
    let calls = 0;
    const produce = async () => {
      calls += 1;
      await new Promise((r) => setTimeout(r, 10));
      return 'value';
    };

    const results = await Promise.all([
      getOrFetch('k', 1000, produce),
      getOrFetch('k', 1000, produce),
      getOrFetch('k', 1000, produce),
    ]);

    expect(calls).toBe(1);
    expect(results.every((r) => r.value === 'value')).toBe(true);
  });

  // A news API that briefly serves slightly old headlines beats one that 502s.
  it('serves the previous value, flagged stale, when a refresh fails', async () => {
    const first = await getOrFetch('k', 1, async () => 'good');
    expect(first.stale).toBe(false);

    await new Promise((r) => setTimeout(r, 5));

    const second = await getOrFetch('k', 1, async () => {
      throw new Error('upstream down');
    });

    expect(second.value).toBe('good');
    expect(second.stale).toBe(true);
  });

  it('propagates the error when there is nothing stale to fall back on', async () => {
    await expect(
      getOrFetch('cold', 1000, async () => {
        throw new Error('upstream down');
      }),
    ).rejects.toThrow('upstream down');
  });
});

describe('GET /api/v2/news', () => {
  it('returns homepage articles with cache provenance', async () => {
    const res = await request(app).get('/api/v2/news?limit=5').expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(5);
    expect(res.body.total).toBeGreaterThan(5);
    expect(res.body.cachedAt).toBeTruthy();
    expect(res.body.stale).toBeUndefined();
  });

  // The DOM scraper cannot produce these at all; this is the point of v2.
  it('carries fields the cheerio engine never had', async () => {
    const res = await request(app).get('/api/v2/news?limit=50').expect(200);

    const withDate = res.body.data.filter(
      (a: { firstPublished: string | null }) => a.firstPublished,
    );
    expect(withDate.length).toBeGreaterThan(0);
    expect(withDate[0].firstPublished).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('paginates', async () => {
    const first = await request(app).get('/api/v2/news?limit=3&offset=0').expect(200);
    const second = await request(app).get('/api/v2/news?limit=3&offset=3').expect(200);

    expect(first.body.data[0].id).not.toBe(second.body.data[0].id);
  });

  it('rejects an out-of-range limit', async () => {
    const res = await request(app).get('/api/v2/news?limit=9999').expect(400);
    expect(res.body.error).toMatch(/between/);
  });
});

describe('GET /api/v2/news/sections', () => {
  it('preserves the site’s own grouping', async () => {
    const res = await request(app).get('/api/v2/news/sections').expect(200);

    expect(res.body.count).toBeGreaterThan(0);
    expect(res.body.data[0]).toHaveProperty('title');
    expect(res.body.data[0].articles.length).toBe(res.body.data[0].count);
  });
});

describe('GET /api/v2/news/most-read', () => {
  it('returns a rank-ordered list', async () => {
    const res = await request(app).get('/api/v2/news/most-read').expect(200);

    expect(res.body.count).toBeGreaterThan(0);
    const ranks = res.body.data.map((a: { rank: number }) => a.rank);
    expect([...ranks].sort((a, b) => a - b)).toEqual(ranks);
  });
});

describe('GET /api/v2/category/:slug', () => {
  it('serves a topic page', async () => {
    const res = await request(app).get('/api/v2/category/technology').expect(200);

    expect(res.body.topicId).toBe('c8y94k95v52t');
    expect(res.body.count).toBeGreaterThan(0);
    expect(res.body.pageCount).toBeGreaterThan(0);
  });

  it('accepts the Bengali title as the slug', async () => {
    const res = await request(app).get(`/api/v2/category/${encodeURIComponent('প্রযুক্তি')}`);
    expect(res.status).toBe(200);
    expect(res.body.slug).toBe('technology');
  });

  it('404s a slug that is not a category at all', async () => {
    const res = await request(app).get('/api/v2/category/not%20a%20topic').expect(404);
    expect(res.body.error).toMatch(/No category matches/);
    expect(upstream).not.toHaveBeenCalled();
  });
});

describe('GET /api/v2/article/:id', () => {
  it('returns a structured body, byline and topics', async () => {
    const res = await request(app).get(`/api/v2/article/${ARTICLE_ID}`).expect(200);

    const article = res.body.data;
    expect(article.title).toBeTruthy();
    expect(article.wordCount).toBeGreaterThan(0);
    expect(article.body.some((b: { type: string }) => b.type === 'text')).toBe(true);
    expect(article.byline.length).toBeGreaterThan(0);
    expect(article.topics.length).toBeGreaterThan(0);
    expect(article.firstPublished).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  // Live data caught this: `promo.summary` is a plain string on most articles
  // but a nested block tree on others, which leaked an object into the JSON and
  // "[object Object]" into the search index.
  it('always returns description as a string or null, never an object', async () => {
    const res = await request(app).get(`/api/v2/article/${ARTICLE_ID}`).expect(200);

    const { description } = res.body.data;
    expect(description === null || typeof description === 'string').toBe(true);
    expect(JSON.stringify(description)).not.toContain('blocks');
  });

  it('rejects a non-alphanumeric id before fetching', async () => {
    await request(app).get('/api/v2/article/a%2Fb').expect(400);
    expect(upstream).not.toHaveBeenCalled();
  });
});

describe('GET /api/v2/search', () => {
  it('requires q', async () => {
    await request(app).get('/api/v2/search').expect(400);
  });

  it('warms the index from the homepage so a cold server still answers', async () => {
    expect(indexSize()).toBe(0);

    const res = await request(app).get('/api/v2/search?q=%E0%A6%AC').expect(200);

    expect(res.body.indexed).toBeGreaterThan(0);
    expect(res.body.note).toMatch(/not proxied/);
  });

  it('returns hits in descending score order', async () => {
    const res = await request(app).get('/api/v2/search?q=%E0%A6%AC').expect(200);
    const scores = res.body.data.map((a: { score: number }) => a.score);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
  });
});

describe('GET /api/v2/feed.xml', () => {
  it('serves valid-looking RSS with the right content type', async () => {
    const res = await request(app).get('/api/v2/feed.xml?limit=5').expect(200);

    expect(res.headers['content-type']).toMatch(/application\/rss\+xml/);
    expect(res.text).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/);
    expect(res.text).toContain('<rss version="2.0"');
    expect((res.text.match(/<item>/g) ?? []).length).toBe(5);
  });

  it('can scope the feed to a category', async () => {
    const res = await request(app).get('/api/v2/feed.xml?category=technology').expect(200);
    expect(res.text).toContain('<item>');
  });
});

describe('GET /api/v2/health', () => {
  it('reports cache and upstream counters', async () => {
    await request(app).get('/api/v2/news?limit=1').expect(200);
    const res = await request(app).get('/api/v2/health').expect(200);

    expect(res.body.status).toBe('ok');
    expect(res.body.upstreamFetches).toBeGreaterThan(0);
    expect(res.body.cache.indexed).toBeGreaterThan(0);
  });
});

describe('engine isolation', () => {
  // The whole point of mounting two engines: adding v2 must not disturb v1.
  it('keeps the v1 envelope on /api and the v2 envelope on /api/v2', async () => {
    const v1 = await request(app).get('/api/popular').expect(200);
    const v2 = await request(app).get('/api/v2/news/most-read').expect(200);

    expect(v1.body).toHaveProperty('articles');
    expect(v1.body).not.toHaveProperty('cachedAt');

    expect(v2.body).toHaveProperty('data');
    expect(v2.body).toHaveProperty('cachedAt');
  });

  it('does not let a v1 :id route swallow a v2 path', async () => {
    const res = await request(app).get('/api/v2/news/sections').expect(200);
    expect(res.body.data[0]).toHaveProperty('curationId');
  });
});
