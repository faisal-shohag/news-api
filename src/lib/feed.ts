import { SOURCE_NAME } from '../config';
import type { NormalizedArticle } from '../scrape/v2/normalize';

/** Escape the five characters that are not legal as XML text or attributes. */
function escapeXml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export interface FeedOptions {
  title: string;
  description: string;
  /** Absolute URL of this feed, used for the atom:link self reference. */
  feedUrl: string;
  /** Absolute URL of the site the feed describes. */
  siteUrl: string;
}

/**
 * Render articles as RSS 2.0.
 *
 * RSS rather than JSON because the audience for a news API is feed readers and
 * aggregators as much as it is frontends, and it costs one small function.
 */
export function renderRss(articles: NormalizedArticle[], options: FeedOptions): string {
  const items = articles
    .map((article) => {
      const pubDate = article.firstPublished
        ? new Date(article.firstPublished).toUTCString()
        : null;

      return [
        '    <item>',
        `      <title>${escapeXml(article.title)}</title>`,
        article.link ? `      <link>${escapeXml(article.link)}</link>` : '',
        `      <guid isPermaLink="false">${escapeXml(article.id)}</guid>`,
        article.description
          ? `      <description>${escapeXml(article.description)}</description>`
          : '',
        article.category ? `      <category>${escapeXml(article.category)}</category>` : '',
        pubDate ? `      <pubDate>${escapeXml(pubDate)}</pubDate>` : '',
        article.imageUrl
          ? `      <enclosure url="${escapeXml(article.imageUrl)}" type="image/jpeg" />`
          : '',
        '    </item>',
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    `    <title>${escapeXml(options.title)}</title>`,
    `    <link>${escapeXml(options.siteUrl)}</link>`,
    `    <description>${escapeXml(options.description)}</description>`,
    '    <language>bn</language>',
    `    <generator>${escapeXml(SOURCE_NAME)} API</generator>`,
    `    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`,
    `    <atom:link href="${escapeXml(options.feedUrl)}" rel="self" type="application/rss+xml" />`,
    items,
    '  </channel>',
    '</rss>',
    '',
  ].join('\n');
}
