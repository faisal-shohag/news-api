import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../src/app';
import { clearCache, stats } from '../src/lib/cache';
import { VALID_SLUGS } from '../src/data/categories';
import { httpClient } from '../src/scrape/client';
import { ARTICLE_ID, stubUpstream } from './helpers';

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

describe('GET /api/categories', () => {
  it('only advertises categories that /api/categories/:id can serve', async () => {
    const res = await request(app).get('/api/categories').expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.count).toBeGreaterThan(1);

    for (const category of res.body.categories) {
      expect(VALID_SLUGS, category.id).toContain(category.id);
    }
  });
});

describe('GET /api/categories/:id', () => {
  // Regression: `catNews` was missing `technology`, so `catNews[id].title`
  // threw a TypeError and the client saw a misleading 500.
  it('serves technology with articles', async () => {
    const res = await request(app).get('/api/categories/technology').expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.categoryId).toBe('technology');
    expect(res.body.categoryName).toBe('প্রযুক্তি');
    expect(res.body.count).toBeGreaterThan(0);
    expect(res.body.articles.length).toBe(res.body.count);
  });

  // Regression: `bbcBn` was missing `india`, so the URL became
  // `https://www.bbc.com/bengali/undefined`.
  it('serves india with articles', async () => {
    const res = await request(app).get('/api/categories/india').expect(200);

    expect(res.body.categoryId).toBe('india');
    expect(res.body.count).toBeGreaterThan(0);
    expect(upstream).toHaveBeenCalledWith('https://www.bbc.com/bengali/topics/cdr56gv542vt');
  });

  it('builds topic URLs without a double slash', async () => {
    await request(app).get('/api/categories/technology').expect(200);

    const url = upstream.mock.calls[0]?.[0] ?? '';
    expect(url).toBe('https://www.bbc.com/bengali/topics/c8y94k95v52t');
    expect(url.replace('https://', '')).not.toContain('//');
  });

  it('returns absolute article links, like the other endpoints', async () => {
    const res = await request(app).get('/api/categories/technology').expect(200);

    for (const article of res.body.articles) {
      expect(article.link, article.title).toMatch(/^https:\/\/www\.bbc\.com\//);
    }
  });

  it('serves main from the homepage feed', async () => {
    const res = await request(app).get('/api/categories/main').expect(200);

    expect(res.body.categoryId).toBe('main');
    expect(res.body.count).toBeGreaterThan(0);
    expect(res.body.articles[0]).toHaveProperty('description');
  });

  // Previously either a 500 (TypeError) or a pointless fetch of
  // `.../bengali/undefined`.
  it('rejects an unknown category with 400, not 500', async () => {
    const res = await request(app).get('/api/categories/not-a-real-category').expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.details.validCategories).toContain('technology');
    expect(upstream).not.toHaveBeenCalled();
  });
});

describe('GET /api/news', () => {
  it('is restored and returns the main feed', async () => {
    const res = await request(app).get('/api/news').expect(200);

    expect(res.body.categoryId).toBe('main');
    expect(res.body.count).toBeGreaterThan(0);
  });
});

describe('GET /api/news/:id', () => {
  it('returns article content', async () => {
    const res = await request(app)
      .get('/api/news/' + ARTICLE_ID)
      .expect(200);

    expect(res.body.article.id).toBe(ARTICLE_ID);
    expect(res.body.article.title).toBeTruthy();
    expect(res.body.article.content.length).toBeGreaterThan(0);
  });

  it('rejects path traversal in the id without fetching anything', async () => {
    for (const id of ['..%2F..%2Fetc', 'a%2Fb', 'a%20b', 'a.b']) {
      const res = await request(app).get('/api/news/' + id);
      expect(res.status, id).toBeGreaterThanOrEqual(400);
      expect(res.status, id).toBeLessThan(500);
    }

    expect(upstream).not.toHaveBeenCalled();
  });
});

describe('GET /api/popular', () => {
  it('returns a ranked list', async () => {
    const res = await request(app).get('/api/popular').expect(200);

    expect(res.body.count).toBeGreaterThan(0);
    expect(res.body.articles[0].rank).toBe(1);
    expect(res.body.articles[0].link).toMatch(/^https:\/\//);
  });
});

describe('caching', () => {
  it('serves a repeat request without a second upstream fetch', async () => {
    await request(app).get('/api/popular').expect(200);
    await request(app).get('/api/popular').expect(200);

    expect(upstream).toHaveBeenCalledTimes(1);
    expect(stats.hits).toBe(1);
  });
});

describe('error handling', () => {
  it('answers unknown routes with JSON, not HTML', async () => {
    const res = await request(app).get('/api/nonexistent').expect(404);

    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body.success).toBe(false);
  });

  it('does not leak upstream error detail to the client', async () => {
    upstream.mockRejectedValueOnce(
      new Error('connect ECONNREFUSED 10.0.0.1:443 at https://internal/secret'),
    );

    const res = await request(app).get('/api/popular');
    const body = JSON.stringify(res.body);

    expect(res.status).toBeGreaterThanOrEqual(500);
    expect(body).not.toContain('ECONNREFUSED');
    expect(body).not.toContain('internal/secret');
  });
});

describe('dummy routes', () => {
  it('keeps its own envelope', async () => {
    const res = await request(app).get('/dummy/news/categories').expect(200);

    expect(res.body.status).toBe(true);
    expect(res.body.data.length).toBe(6);
  });

  it('404s an unknown news id', async () => {
    await request(app).get('/dummy/news-details/999999').expect(404);
  });
});
