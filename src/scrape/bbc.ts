import * as cheerio from 'cheerio';
import type { CheerioAPI } from 'cheerio';

import { byTopicId, type Category, MAIN_SLUG, MAIN_TITLE } from '../data/categories';
import { notFound } from '../lib/errors';
import { fetchHtml } from './client';
import { absolutize, BBC_ORIGIN, idFromLink, parseSrcset, type ArticleImage } from './parse';

const BENGALI_HOME = `${BBC_ORIGIN}/bengali`;

export interface FeedArticle {
  id: string;
  title: string;
  link: string | null;
  description: string;
  time: string;
  image: ArticleImage;
  scrapedAt: string;
}

export interface CategoryArticle {
  id: string;
  title: string;
  link: string | null;
  time: string;
  datetime: string | null;
  image: ArticleImage;
}

export interface PopularArticle {
  rank: number;
  id: string;
  title: string;
  link: string | null;
  scrapedAt: string;
}

export interface ArticleDetail {
  id: string;
  title: string;
  url: string;
  timestamp: string;
  content: string[];
  images: { url: string | null; caption: string }[];
  scrapedAt: string;
}

export interface CategoryListing {
  id: string;
  title: string;
}

/** URL of a category's topic page. */
export function categoryUrl(category: Category): string {
  return `${BENGALI_HOME}/topics/${category.topicId}`;
}

/** URL of an article, given the id form used by our own `/api/news/:id`. */
export function articleUrl(articleId: string): string {
  return articleId.startsWith('news-')
    ? `${BENGALI_HOME}/${articleId}`
    : `${BENGALI_HOME}/articles/${articleId}`;
}

function load(html: string): CheerioAPI {
  return cheerio.load(html);
}

/** Homepage feed, served as the `main` category. */
export async function scrapeFeed(): Promise<FeedArticle[]> {
  const $ = load(await fetchHtml(BENGALI_HOME));
  const articles: FeedArticle[] = [];

  $('main ul li').each((_index, element) => {
    const item = $(element);
    const anchor = item.find('h3 a');
    const title = anchor.text().trim();
    const href = anchor.attr('href');
    const id = idFromLink(href);

    if (!title || !id) return;

    const picture = item.find('source');
    const img = item.find('img');

    articles.push({
      id,
      title,
      link: absolutize(href),
      description: item.find('p.promo-paragraph').text().trim(),
      time: item.find('time.promo-timestamp').text().trim(),
      image: {
        alt: img.attr('alt') ?? null,
        srcset: parseSrcset(picture.attr('srcset'), img.attr('src')),
      },
      scrapedAt: new Date().toISOString(),
    });
  });

  return articles;
}

/** Articles listed on a category's topic page. */
export async function scrapeCategory(category: Category): Promise<CategoryArticle[]> {
  const $ = load(await fetchHtml(categoryUrl(category)));
  const articles: CategoryArticle[] = [];

  $('div[data-testid="curation-grid-normal"] li').each((_index, element) => {
    const item = $(element);
    const anchor = item.find('h2 a');
    const title = anchor.text().trim();
    const href = anchor.attr('href');
    const id = idFromLink(href);

    // The old code called `link.split('/')` here with no guard, so a heading
    // without an anchor threw and surfaced as a 500.
    if (!title || !id) return;

    const timestamp = item.find('time.promo-timestamp');
    const img = item.find('img');

    articles.push({
      id,
      title,
      link: absolutize(href),
      time: timestamp.text().trim(),
      datetime: timestamp.attr('datetime') ?? null,
      image: {
        alt: img.attr('alt') ?? null,
        srcset: parseSrcset(img.attr('srcset'), img.attr('src')),
      },
    });
  });

  return articles;
}

/** The "most read" list. */
export async function scrapePopular(): Promise<PopularArticle[]> {
  const $ = load(await fetchHtml(`${BENGALI_HOME}/popular/read`));
  const articles: PopularArticle[] = [];

  $('main ol a').each((index, element) => {
    const anchor = $(element);
    const title = anchor.text().trim();
    const href = anchor.attr('href');
    const id = idFromLink(href);

    if (!title || !id) return;

    articles.push({
      rank: index + 1,
      id,
      title,
      link: absolutize(href),
      scrapedAt: new Date().toISOString(),
    });
  });

  return articles;
}

/** Full text of a single article. Throws a 404 `AppError` if the page has no title. */
export async function scrapeArticle(articleId: string): Promise<ArticleDetail> {
  const url = articleUrl(articleId);
  const $ = load(await fetchHtml(url));

  const title = $('main h1').text().trim();
  if (!title) throw notFound('Article not found');

  const content: string[] = [];
  $('main div[dir="ltr"] p').each((_index, element) => {
    const text = $(element).text().trim();
    if (text) content.push(text);
  });

  const images: ArticleDetail['images'] = [];
  $('main figure img').each((_index, element) => {
    const img = $(element);
    const caption = img.parent().next('p').text().trim();
    images.push({
      url: img.attr('src') ?? null,
      caption: caption || 'No caption available',
    });
  });

  return {
    id: articleId,
    title,
    url,
    timestamp: $('main div[dir="ltr"] time').first().text().trim(),
    content,
    images,
    scrapedAt: new Date().toISOString(),
  };
}

/**
 * Categories advertised in the site navigation, filtered to the ones we can
 * actually serve.
 *
 * The filter is the important part: `/api/categories` must never return an id
 * that `/api/categories/:id` cannot handle. Because both sides now read from
 * `CATEGORIES`, that invariant holds by construction.
 */
export async function scrapeCategories(): Promise<CategoryListing[]> {
  const $ = load(await fetchHtml(BENGALI_HOME));

  const listings: CategoryListing[] = [{ id: MAIN_SLUG, title: MAIN_TITLE }];
  const seen = new Set<string>([MAIN_SLUG]);

  const collect = (selector: string) => {
    $(selector).each((_index, element) => {
      const anchor = $(element);
      const topicId = idFromLink(anchor.attr('href'));
      if (!topicId) return;

      const category = byTopicId.get(topicId);
      if (!category || seen.has(category.slug)) return;

      seen.add(category.slug);
      listings.push({ id: category.slug, title: anchor.text().trim() || category.title });
    });
  };

  collect('header nav div[data-e2e="dropdown-nav"] ul li a');
  collect('section h2 a');

  return listings;
}
