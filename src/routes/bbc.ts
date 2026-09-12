import { Router } from 'express';
import { z } from 'zod';

import { config } from '../config';
import { bySlug, MAIN_SLUG, titleForSlug, VALID_SLUGS } from '../data/categories';
import { cached } from '../lib/cache';
import { badRequest, notFound } from '../lib/errors';
import { asyncHandler } from '../lib/middleware';
import { ok, withCacheHeaders } from '../lib/respond';
import {
  scrapeArticle,
  scrapeCategories,
  scrapeCategory,
  scrapeFeed,
  scrapePopular,
} from '../scrape/bbc';

export const bbcRouter = Router();

/**
 * The feed and popular endpoints have always answered 404 when a scrape came
 * back empty, which doubles as a canary for BBC changing their markup. Kept so
 * existing clients see the same contract.
 */
function assertNotEmpty(articles: unknown[], message: string): void {
  if (articles.length === 0) throw notFound(message);
}

/**
 * Article ids are interpolated into an upstream URL, so they are constrained to
 * the shape BBC actually uses. Without this, `..%2F..` walks to arbitrary
 * bbc.com paths.
 */
const articleIdSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9-]+$/i, 'Article id may only contain letters, digits and hyphens');

const categorySlugSchema = z.string().refine((slug) => VALID_SLUGS.includes(slug), {
  message: 'Unknown category',
});

bbcRouter.get(
  '/categories',
  asyncHandler(async (_req, res) => {
    const categories = await cached('categories', config.listCacheTtlMs, scrapeCategories);

    withCacheHeaders(res, config.listCacheTtlSeconds);
    ok(res, {
      count: categories.length,
      categories,
      scrapedAt: new Date().toISOString(),
    });
  }),
);

/** Main feed. Restored -- it was commented out while the docs still promised it. */
bbcRouter.get(
  '/news',
  asyncHandler(async (_req, res) => {
    const articles = await cached('feed', config.listCacheTtlMs, scrapeFeed);
    assertNotEmpty(articles, 'No articles found');

    withCacheHeaders(res, config.listCacheTtlSeconds);
    ok(res, {
      categoryId: MAIN_SLUG,
      categoryName: titleForSlug(MAIN_SLUG),
      count: articles.length,
      articles,
    });
  }),
);

bbcRouter.get(
  '/categories/:id',
  asyncHandler(async (req, res) => {
    const parsed = categorySlugSchema.safeParse(req.params.id);

    // Previously an unknown slug either produced a TypeError-as-500 or a fetch
    // of `.../bengali/undefined`. Both are now a plain 400.
    if (!parsed.success) {
      throw badRequest('Unknown category', { validCategories: VALID_SLUGS });
    }

    const slug = parsed.data;

    if (slug === MAIN_SLUG) {
      const articles = await cached('feed', config.listCacheTtlMs, scrapeFeed);
      assertNotEmpty(articles, 'No articles found');

      withCacheHeaders(res, config.listCacheTtlSeconds);
      ok(res, {
        categoryId: MAIN_SLUG,
        categoryName: titleForSlug(MAIN_SLUG),
        count: articles.length,
        articles,
      });
      return;
    }

    // Safe: `slug` passed `VALID_SLUGS` and is not `main`.
    const category = bySlug.get(slug)!;
    const articles = await cached(`category:${slug}`, config.listCacheTtlMs, () =>
      scrapeCategory(category),
    );

    withCacheHeaders(res, config.listCacheTtlSeconds);
    ok(res, {
      categoryId: category.slug,
      categoryName: category.title,
      count: articles.length,
      articles,
    });
  }),
);

bbcRouter.get(
  '/news/:id',
  asyncHandler(async (req, res) => {
    const parsed = articleIdSchema.safeParse(req.params.id);

    if (!parsed.success) {
      throw badRequest('Invalid article id');
    }

    const articleId = parsed.data;
    const article = await cached(`article:${articleId}`, config.articleCacheTtlMs, () =>
      scrapeArticle(articleId),
    );

    withCacheHeaders(res, config.articleCacheTtlSeconds);
    ok(res, { article });
  }),
);

bbcRouter.get(
  '/popular',
  asyncHandler(async (_req, res) => {
    const articles = await cached('popular', config.listCacheTtlMs, scrapePopular);
    assertNotEmpty(articles, 'No popular articles found');

    withCacheHeaders(res, config.listCacheTtlSeconds);
    ok(res, {
      count: articles.length,
      articles,
      scrapedAt: new Date().toISOString(),
    });
  }),
);
