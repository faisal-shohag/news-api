export const BBC_ORIGIN = 'https://www.bbc.com';

export interface SrcsetEntry {
  resolution: string;
  url: string;
}

export interface ArticleImage {
  alt: string | null;
  srcset: SrcsetEntry[];
}

/**
 * Parse an HTML `srcset` attribute into `{ resolution, url }` pairs.
 *
 * When `baseSrc` is given it is prepended as the `base` resolution, matching the
 * shape the API has always returned. Malformed entries (no URL) are skipped
 * rather than emitted as `{ resolution: undefined, url: '' }`.
 */
export function parseSrcset(raw?: string, baseSrc?: string): SrcsetEntry[] {
  const entries: SrcsetEntry[] = [];

  if (baseSrc) {
    entries.push({ resolution: 'base', url: baseSrc });
  }

  if (raw) {
    for (const candidate of raw.split(',')) {
      const [url, resolution] = candidate.trim().split(/\s+/);
      if (url) {
        entries.push({ resolution: resolution ?? 'base', url });
      }
    }
  }

  return entries;
}

/**
 * Take the last path segment of a link and use it as the article/topic id.
 *
 * Returns `null` for a missing or unusable href. The old code did
 * `link.split('/')` without a guard in one of its five copies, which threw a
 * TypeError on any `<a>` without an `href`.
 */
export function idFromLink(href?: string | null): string | null {
  if (!href) return null;

  const withoutQuery = href.split(/[?#]/)[0] ?? '';
  const segments = withoutQuery.split('/').filter(Boolean);
  const last = segments[segments.length - 1];

  return last ?? null;
}

/**
 * Turn a possibly-relative BBC href into an absolute URL.
 *
 * Applied to every endpoint so that category articles return absolute links
 * like the main feed and popular list already did.
 */
export function absolutize(href?: string | null): string | null {
  if (!href) return null;
  if (/^https?:\/\//i.test(href)) return href;
  return `${BBC_ORIGIN}${href.startsWith('/') ? '' : '/'}${href}`;
}
