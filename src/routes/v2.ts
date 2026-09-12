import { Router, type Request, type Response } from 'express';

import { config, SOURCE_NAME, TOPIC_PAGE_SIZE } from '../config';
import { cacheStats, getOrFetch, indexSize, listIndexed, type CacheResult } from '../lib/cache';
import { renderRss } from '../lib/feed';
import { AppError, badRequest, notFound } from '../lib/errors';
import { asyncHandler } from '../lib/middleware';
import { withCacheHeaders } from '../lib/respond';
import { findRelated, rankArticles } from '../lib/search';
import { getFetchCount } from '../scrape/client';
import { scrapeFullArticle } from '../scrape/v2/article';
import { scrapeHome, scrapeMostRead, scrapeNavCategories } from '../scrape/v2/home';
import { foldForSearch, type NormalizedArticle } from '../scrape/v2/normalize';
import { resolveTopic, scrapeTopicPage, scrapeTopicPages } from '../scrape/v2/topic';

export const v2Router = Router();

const TTL = {
  home: config.listCacheTtlMs,
  topic: config.listCacheTtlMs,
  article: config.articleCacheTtlMs,
  categories: 6 * 60 * 60 * 1000,
};

/**
 * Uniform v2 envelope. Distinct from the v1 `/api` envelope on purpose: v2
 * reports cache provenance (`cachedAt`, `stale`) that v1 has no concept of.
 */
function ok<T>(res: Response, result: CacheResult<T>, extra: Record<string, unknown> = {}): void {
  const count = Array.isArray(result.value) ? result.value.length : undefined;

  res.json({
    success: true,
    ...(count === undefined ? {} : { count }),
    ...(result.stale ? { stale: true } : {}),
    cachedAt: result.cachedAt,
    ...extra,
    data: result.value,
  });
}

/** Parse a bounded positive integer query param, rejecting anything outside it. */
function intParam(
  raw: unknown,
  { name, fallback, min = 1, max }: { name: string; fallback: number; min?: number; max: number },
): number {
  if (raw === undefined || raw === '') return fallback;

  const parsed = Number.parseInt(String(raw), 10);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw badRequest(`"${name}" must be an integer between ${min} and ${max}.`);
  }

  return parsed;
}

/**
 * An unlisted topic id is passed straight through to BBC, so a bogus one only
 * reveals itself as an upstream 404. Translate that into a meaningful API error
 * rather than reporting someone's typo as an upstream failure.
 */
function asUnknownCategory(error: unknown, slug: string): unknown {
  if (error instanceof AppError && error.status === 404) {
    return notFound(`No category matches "${slug}".`);
  }
  return error;
}

const home = () => getOrFetch('v2:home', TTL.home, scrapeHome);

// --- meta --------------------------------------------------------------------

v2Router.get('/health', (_req, res) => {
  res.json({
    success: true,
    status: 'ok',
    uptimeSeconds: Math.round(process.uptime()),
    upstreamFetches: getFetchCount(),
    cache: cacheStats(),
  });
});

v2Router.get(
  '/categories',
  asyncHandler(async (_req, res) => {
    const result = await getOrFetch('v2:categories', TTL.categories, scrapeNavCategories);
    withCacheHeaders(res, config.listCacheTtlSeconds);
    ok(res, result);
  }),
);

// --- homepage ----------------------------------------------------------------

/** Everything on the homepage, flattened, deduped, filterable and paginated. */
v2Router.get(
  '/news',
  asyncHandler(async (req, res) => {
    const limit = intParam(req.query.limit, { name: 'limit', fallback: 50, max: 500 });
    const offset = intParam(req.query.offset, { name: 'offset', fallback: 0, min: 0, max: 10_000 });

    const result = await home();
    let articles: NormalizedArticle[] = result.value.articles;

    const category = req.query.category ? String(req.query.category) : '';
    if (category) {
      const needle = foldForSearch(category);
      articles = articles.filter((article) => foldForSearch(article.category).includes(needle));
    }

    const q = req.query.q ? String(req.query.q) : '';
    if (q) {
      articles = rankArticles(articles, q).map((hit) => hit.article);
    }

    const total = articles.length;
    withCacheHeaders(res, config.listCacheTtlSeconds);
    ok(
      res,
      { ...result, value: articles.slice(offset, offset + limit) },
      {
        total,
        limit,
        offset,
      },
    );
  }),
);

/** The homepage grouped the way BBC curates it, for clients that want sections. */
v2Router.get(
  '/news/sections',
  asyncHandler(async (_req, res) => {
    const result = await home();
    withCacheHeaders(res, config.listCacheTtlSeconds);
    ok(res, { ...result, value: result.value.sections });
  }),
);

/** Lead stories only -- the top curation. */
v2Router.get(
  '/news/latest',
  asyncHandler(async (req, res) => {
    const limit = intParam(req.query.limit, { name: 'limit', fallback: 20, max: 100 });
    const result = await home();
    const lead = result.value.sections[0];

    withCacheHeaders(res, config.listCacheTtlSeconds);
    ok(
      res,
      { ...result, value: (lead?.articles ?? []).slice(0, limit) },
      { section: lead?.title ?? null },
    );
  }),
);

v2Router.get(
  '/news/most-read',
  asyncHandler(async (_req, res) => {
    const result = await getOrFetch('v2:most-read', TTL.home, scrapeMostRead);
    withCacheHeaders(res, config.listCacheTtlSeconds);
    ok(res, { ...result, value: result.value.articles }, { generated: result.value.generated });
  }),
);

// --- search ------------------------------------------------------------------

/**
 * Ranked search over everything this process has scraped so far.
 *
 * BBC's own /search path is disallowed by their robots.txt, so it is never
 * proxied. The homepage is warmed first so a cold server still answers rather
 * than returning an empty result that looks like "no matches".
 */
v2Router.get(
  '/search',
  asyncHandler(async (req, res) => {
    const q = String(req.query.q ?? '').trim();
    if (!q) throw badRequest('Query parameter "q" is required.');

    const limit = intParam(req.query.limit, { name: 'limit', fallback: 50, max: 500 });

    if (indexSize() === 0) await home();

    const hits = rankArticles(listIndexed(), q);

    withCacheHeaders(res, 60);
    res.json({
      success: true,
      query: q,
      total: hits.length,
      count: Math.min(hits.length, limit),
      indexed: indexSize(),
      note: 'Searches the locally scraped index only; BBC search is not proxied.',
      data: hits.slice(0, limit).map((hit) => ({ ...hit.article, score: hit.score })),
    });
  }),
);

// --- categories --------------------------------------------------------------

/**
 * Deep crawl, pages 1..n. Registered before `/category/:slug` so the literal
 * `/all` suffix wins. This is the expensive route -- see the tighter rate limit
 * on it in app.ts.
 */
v2Router.get(
  '/category/:slug/all',
  asyncHandler(async (req, res) => {
    const slug = String(req.params.slug);
    const topic = resolveTopic(slug);
    if (!topic) throw notFound(`No category matches "${slug}".`);

    const pages = intParam(req.query.pages, {
      name: 'pages',
      fallback: config.defaultCrawlPages,
      max: config.maxTopicPages,
    });

    try {
      const result = await getOrFetch(`v2:topic:${topic.topicId}:all:${pages}`, TTL.topic, () =>
        scrapeTopicPages(topic, pages),
      );

      withCacheHeaders(res, config.listCacheTtlSeconds);
      ok(
        res,
        { ...result, value: result.value.articles },
        {
          slug: topic.slug,
          topicId: topic.topicId,
          title: result.value.title,
          pagesCrawled: result.value.pagesCrawled,
          pageCount: result.value.pageCount,
        },
      );
    } catch (error) {
      throw asUnknownCategory(error, slug);
    }
  }),
);

v2Router.get(
  '/category/:slug',
  asyncHandler(async (req, res) => {
    const slug = String(req.params.slug);
    const topic = resolveTopic(slug);
    if (!topic) throw notFound(`No category matches "${slug}".`);

    const page = intParam(req.query.page, { name: 'page', fallback: 1, max: config.maxTopicPages });
    const limit = intParam(req.query.limit, {
      name: 'limit',
      fallback: TOPIC_PAGE_SIZE,
      max: TOPIC_PAGE_SIZE,
    });

    try {
      const result = await getOrFetch(`v2:topic:${topic.topicId}:${page}`, TTL.topic, () =>
        scrapeTopicPage(topic, page),
      );

      withCacheHeaders(res, config.listCacheTtlSeconds);
      ok(
        res,
        { ...result, value: result.value.articles.slice(0, limit) },
        {
          slug: topic.slug,
          topicId: topic.topicId,
          title: result.value.title,
          page: result.value.page,
          pageCount: result.value.pageCount,
        },
      );
    } catch (error) {
      throw asUnknownCategory(error, slug);
    }
  }),
);

// --- articles ----------------------------------------------------------------

const ARTICLE_ID = /^[A-Za-z0-9]+$/;

function assertArticleId(raw: string): string {
  if (!ARTICLE_ID.test(raw)) throw badRequest('Article id must be alphanumeric.');
  return raw;
}

const fetchArticle = (id: string) =>
  getOrFetch(`v2:article:${id}`, TTL.article, () => scrapeFullArticle(id));

/** Stories related to one article, drawn from what has been scraped so far. */
v2Router.get(
  '/article/:id/related',
  asyncHandler(async (req, res) => {
    const id = assertArticleId(String(req.params.id));
    const limit = intParam(req.query.limit, { name: 'limit', fallback: 10, max: 50 });

    const { value: article } = await fetchArticle(id);
    if (indexSize() <= 1) await home();

    const related = findRelated(listIndexed(), article, limit);

    withCacheHeaders(res, config.listCacheTtlSeconds);
    res.json({
      success: true,
      count: related.length,
      articleId: article.id,
      data: related,
    });
  }),
);

v2Router.get(
  '/article/:id',
  asyncHandler(async (req, res) => {
    const id = assertArticleId(String(req.params.id));

    try {
      const result = await fetchArticle(id);
      withCacheHeaders(res, config.articleCacheTtlSeconds);
      ok(res, result);
    } catch (error) {
      if (error instanceof AppError && error.status === 404) {
        throw notFound(`No article found with id "${id}".`);
      }
      throw error;
    }
  }),
);

// --- feed --------------------------------------------------------------------

function selfUrl(req: Request): string {
  return `${req.protocol}://${req.get('host') ?? 'localhost'}${req.originalUrl}`;
}

/** RSS 2.0 over the homepage, or over one category with `?category=`. */
v2Router.get(
  '/feed.xml',
  asyncHandler(async (req, res) => {
    const limit = intParam(req.query.limit, { name: 'limit', fallback: 50, max: 200 });
    const categoryParam = req.query.category ? String(req.query.category) : '';

    let articles: NormalizedArticle[];
    let title = `${SOURCE_NAME} — সর্বশেষ`;

    if (categoryParam) {
      const topic = resolveTopic(categoryParam);
      if (!topic) throw notFound(`No category matches "${categoryParam}".`);

      const result = await getOrFetch(`v2:topic:${topic.topicId}:1`, TTL.topic, () =>
        scrapeTopicPage(topic, 1),
      );
      articles = result.value.articles;
      title = `${SOURCE_NAME} — ${result.value.title ?? topic.slug}`;
    } else {
      articles = (await home()).value.articles;
    }

    const xml = renderRss(articles.slice(0, limit), {
      title,
      description: `News from ${SOURCE_NAME}, served by news-api.`,
      feedUrl: selfUrl(req),
      siteUrl: 'https://www.bbc.com/bengali',
    });

    withCacheHeaders(res, config.listCacheTtlSeconds);
    res.type('application/rss+xml').send(xml);
  }),
);
