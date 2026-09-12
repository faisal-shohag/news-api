import { foldForSearch } from '../scrape/v2/normalize';

export interface Searchable {
  id: string;
  title?: string | null;
  description?: string | null;
  category?: string | null;
  firstPublished?: string | null;
}

/**
 * Score one article against a query.
 *
 * Deliberately simple -- no stemming, no index, no dependencies -- but enough
 * that a title match outranks a passing mention in a summary, which is the
 * difference a reader actually notices. Returns 0 for "no match".
 */
export function scoreArticle(article: Searchable, needle: string): number {
  if (!needle) return 0;

  const title = foldForSearch(article.title);
  const description = foldForSearch(article.description);
  const category = foldForSearch(article.category);

  let score = 0;

  if (title === needle) score += 100;
  else if (title.startsWith(needle)) score += 60;
  else if (title.includes(needle)) score += 40;

  if (description.includes(needle)) score += 15;
  if (category.includes(needle)) score += 10;

  if (score === 0) return 0;

  // Nudge every term that appears as a whole word above a mid-word coincidence.
  const words = new Set(title.split(/\s+/));
  if (words.has(needle)) score += 20;

  return score;
}

export interface SearchHit<T> {
  article: T;
  score: number;
}

/**
 * Rank articles by relevance, breaking ties with recency so that two equally
 * relevant stories put the newer one first.
 */
export function rankArticles<T extends Searchable>(articles: T[], query: string): SearchHit<T>[] {
  const needle = foldForSearch(query).trim();
  if (!needle) return [];

  const hits: SearchHit<T>[] = [];

  for (const article of articles) {
    const score = scoreArticle(article, needle);
    if (score > 0) hits.push({ article, score });
  }

  return hits.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const aTime = Date.parse(a.article.firstPublished ?? '') || 0;
    const bTime = Date.parse(b.article.firstPublished ?? '') || 0;
    return bTime - aTime;
  });
}

/**
 * Articles related to a given one, scored by shared topics, then shared
 * category. The source article is never returned as its own relation.
 */
export function findRelated<T extends Searchable>(
  candidates: T[],
  seed: { id: string; category?: string | null; topics?: { name: string | null }[] },
  limit: number,
): T[] {
  const topicNames = new Set(
    (seed.topics ?? []).map((topic) => foldForSearch(topic.name)).filter(Boolean),
  );
  const seedCategory = foldForSearch(seed.category);

  const scored: SearchHit<T>[] = [];

  for (const candidate of candidates) {
    if (candidate.id === seed.id) continue;

    let score = 0;
    const haystack = `${foldForSearch(candidate.title)} ${foldForSearch(candidate.description)}`;

    for (const topic of topicNames) {
      if (haystack.includes(topic)) score += 10;
      if (foldForSearch(candidate.category) === topic) score += 15;
    }

    if (seedCategory && foldForSearch(candidate.category) === seedCategory) score += 5;

    if (score > 0) scored.push({ article: candidate, score });
  }

  return scored
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const aTime = Date.parse(a.article.firstPublished ?? '') || 0;
      const bTime = Date.parse(b.article.firstPublished ?? '') || 0;
      return bTime - aTime;
    })
    .slice(0, limit)
    .map((hit) => hit.article);
}
