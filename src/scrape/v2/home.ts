import { BBC_ORIGIN, SERVICE_PATH } from '../../config';
import { CATEGORIES } from '../../data/categories';
import { indexArticles } from '../../lib/cache';
import { fetchTextLimited } from '../client';
import { extractPageProps, type NavItem, type PageProps } from '../nextData';
import {
  absoluteUrl,
  dedupeById,
  normalizeSummary,
  toIso,
  type NormalizedArticle,
} from './normalize';

export const HOME_URL = `${BBC_ORIGIN}${SERVICE_PATH}`;

async function loadHome(): Promise<PageProps> {
  return extractPageProps(await fetchTextLimited(HOME_URL), HOME_URL);
}

export interface Section {
  title: string | null;
  curationId: string | null;
  curationType: string | null;
  link: string | null;
  count: number;
  articles: NormalizedArticle[];
}

export interface HomeResult {
  sections: Section[];
  articles: NormalizedArticle[];
}

/**
 * Homepage scrape. Returns each curation the site publishes ("প্রধান খবর",
 * "বাংলাদেশ", ...) with its articles, plus one flat deduped list across them.
 */
export async function scrapeHome(): Promise<HomeResult> {
  const pageProps = await loadHome();
  const curations = pageProps.pageData?.curations ?? [];

  const sections: Section[] = [];

  for (const curation of curations) {
    const articles = (curation.summaries ?? [])
      .map((summary) => normalizeSummary(summary, curation.title ?? null))
      .filter((a): a is NormalizedArticle => a !== null);

    if (articles.length === 0) continue;

    sections.push({
      title: curation.title ?? null,
      curationId: curation.curationId ?? null,
      curationType: curation.curationType ?? null,
      link: absoluteUrl(curation.link),
      count: articles.length,
      articles,
    });
  }

  const articles = dedupeById(sections.flatMap((section) => section.articles));
  indexArticles(articles);

  return { sections, articles };
}

export interface MostReadArticle extends NormalizedArticle {
  rank: number | null;
}

/** The ranked "সর্বাধিক পঠিত" list, which rides along inside a homepage curation. */
export async function scrapeMostRead(): Promise<{
  generated: string | null;
  articles: MostReadArticle[];
}> {
  const pageProps = await loadHome();
  const curations = pageProps.pageData?.curations ?? [];
  const holder = curations.find((curation) => curation.mostRead?.items?.length);
  const items = holder?.mostRead?.items ?? [];

  const articles = items
    .map((item) => {
      const base = normalizeSummary(
        { ...item, link: item.href, description: null },
        holder?.title ?? null,
      );
      if (!base) return null;
      return {
        ...base,
        rank: item.rank ?? null,
        firstPublished: toIso(item.timestamp) ?? base.firstPublished,
      };
    })
    .filter((a): a is MostReadArticle => a !== null)
    .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));

  indexArticles(articles);

  return { generated: toIso(holder?.mostRead?.generated), articles };
}

export interface NavCategory {
  slug: string;
  title: string | null;
  topicId: string | null;
  url: string | null;
  /** False for nav entries that are not topic pages (e.g. the homepage link). */
  scrapable: boolean;
}

/**
 * Category list straight from the site nav, enriched with our own ASCII slugs
 * where we have one. Nav entries we have no alias for still come through, keyed
 * by their raw BBC topic id -- the site has more topics than our table lists,
 * and /api/v2/category/:slug accepts a bare topic id too.
 */
export async function scrapeNavCategories(): Promise<NavCategory[]> {
  const pageProps = await loadHome();

  const flat: NavItem[] = [];
  for (const item of pageProps.navItems ?? []) {
    flat.push(item);
    for (const sub of item.subItems ?? []) flat.push(sub);
  }

  const byTopicId = new Map(CATEGORIES.map((category) => [category.topicId, category]));
  const seen = new Set<string>();
  const categories: NavCategory[] = [];

  for (const item of flat) {
    const topicId = item.url?.match(/\/topics\/([A-Za-z0-9]+)/)?.[1] ?? null;
    const known = topicId ? byTopicId.get(topicId) : undefined;
    const slug = known?.slug ?? topicId ?? item.url;
    if (!slug || seen.has(slug)) continue;

    seen.add(slug);
    categories.push({
      slug,
      title: item.title ?? known?.title ?? null,
      topicId,
      url: absoluteUrl(item.url),
      scrapable: Boolean(topicId),
    });
  }

  return categories;
}
