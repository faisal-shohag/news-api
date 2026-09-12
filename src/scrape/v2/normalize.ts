import { BBC_ORIGIN, SOURCE_NAME } from '../../config';
import type { Summary } from '../nextData';

/** Make any BBC link absolute. Upstream mixes absolute and root-relative hrefs. */
export function absoluteUrl(link?: string | null): string | null {
  if (!link) return null;
  if (/^https?:\/\//i.test(link)) return link;
  return `${BBC_ORIGIN}${link.startsWith('/') ? '' : '/'}${link}`;
}

/**
 * Timestamps arrive three ways: `''` on homepage summaries, an ISO string, or a
 * millisecond epoch number in article metadata. Collapse all of them to an ISO
 * string or `null` so clients never have to type-check a date field.
 */
export function toIso(value?: string | number | null): string | null {
  if (value === null || value === undefined || value === '') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Derive a stable id from an article URL, e.g. /bengali/articles/cddvy709v28o */
export function idFromLink(link?: string | null): string | null {
  if (!link) return null;

  const clean = (link.split('?')[0] ?? '').replace(/\/$/, '');
  const match = clean.match(/\/(?:articles|videos)\/([A-Za-z0-9]+)$/);
  if (match?.[1]) return match[1];

  return clean.split('/').pop() || null;
}

/**
 * Ids arrive bare (`cddvy709v28o`) or as a URN
 * (`urn:bbc:optimo:asset:c4gr0d80pdmo`, which is how most-read entries come).
 * Keep the final segment so every id works directly against /api/v2/article/:id.
 */
export function cleanId(rawId?: string | null): string | null {
  if (!rawId) return null;
  return String(rawId).split(':').pop()?.trim() || null;
}

/** The uniform article shape every v2 list endpoint returns. */
export interface NormalizedArticle {
  id: string;
  title: string;
  description: string | null;
  link: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  category: string | null;
  type: string;
  isLive: boolean;
  firstPublished: string | null;
  lastPublished: string | null;
  source: string;
}

/** BBC `summary` object to our uniform article shape. */
export function normalizeSummary(
  summary: Summary | null | undefined,
  category: string | null = null,
): NormalizedArticle | null {
  if (!summary?.title) return null;

  const link = absoluteUrl(summary.link ?? summary.href);
  const id = cleanId(summary.id) ?? idFromLink(link);
  if (!id) return null;

  return {
    id,
    title: summary.title,
    description: summary.description ?? null,
    link,
    imageUrl: summary.imageUrl ?? null,
    imageAlt: summary.imageAlt ?? null,
    category,
    type: summary.type ?? 'article',
    isLive: Boolean(summary.isLive),
    firstPublished: toIso(summary.firstPublished),
    lastPublished: toIso(summary.lastPublished),
    source: SOURCE_NAME,
  };
}

/** Drop duplicates by id, keeping the first occurrence (earlier = more prominent). */
export function dedupeById<T extends { id: string }>(articles: (T | null)[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];

  for (const article of articles) {
    if (!article || seen.has(article.id)) continue;
    seen.add(article.id);
    out.push(article);
  }

  return out;
}

/** Fold text to a comparable form. NFC matters for Bengali input. */
export function foldForSearch(text: unknown): string {
  return String(text ?? '')
    .normalize('NFC')
    .toLowerCase();
}
