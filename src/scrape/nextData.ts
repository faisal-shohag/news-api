import { AppError } from '../lib/errors';

/**
 * Every BBC Bangla page ships its own data as JSON inside a
 * `<script id="__NEXT_DATA__">` tag.
 *
 * Reading that is much more durable than scraping the rendered DOM: BBC's class
 * names are hashed and their markup changes without notice, whereas the JSON
 * payload is the contract their own frontend consumes. It also carries fields
 * the DOM simply does not expose -- real ISO timestamps, summaries, bylines,
 * topic ids and tags.
 */

const NEXT_DATA_RE = /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/;

/**
 * A parse failure is the canary for BBC changing their page shape. It is
 * reported as 502 rather than silently degrading into an empty result set,
 * because an empty list looks like "no news today" to a client.
 */
export class ParseError extends AppError {
  constructor(message: string) {
    super(502, message);
    this.name = 'ParseError';
  }
}

export interface Summary {
  id?: string;
  title?: string;
  description?: string | null;
  link?: string;
  href?: string;
  imageUrl?: string | null;
  imageAlt?: string | null;
  type?: string;
  isLive?: boolean;
  firstPublished?: string | number | null;
  lastPublished?: string | number | null;
  rank?: number;
  timestamp?: number | string | null;
}

export interface Curation {
  title?: string | null;
  curationId?: string | null;
  curationType?: string | null;
  link?: string | null;
  summaries?: Summary[];
  mostRead?: { generated?: string | number | null; items?: Summary[] };
}

export interface NavItem {
  title?: string;
  url?: string;
  subItems?: NavItem[];
}

export interface PageProps {
  pageType?: string;
  navItems?: NavItem[];
  pageData?: {
    title?: string | null;
    description?: string | null;
    curations?: Curation[];
    activePage?: number;
    pageCount?: number;
    content?: { model?: { blocks?: ContentBlock[] } };
    metadata?: ArticleMetadata;
    // `summary` is a plain string on most articles but a nested block tree on
    // some, so it is read through `blockText()` rather than used directly.
    promo?: { summary?: unknown; headlines?: { seoHeadline?: string | null } };
  };
}

export interface ContentBlock {
  type?: string;
  model?: {
    text?: string;
    blocks?: ContentBlock[];
    locator?: string;
    originCode?: string;
    width?: number;
    height?: number;
    copyrightHolder?: string;
    firstPublished?: string | number | null;
    lastPublished?: string | number | null;
  };
  blocks?: ContentBlock[];
}

export interface ArticleMetadata {
  id?: string;
  firstPublished?: string | number | null;
  lastPublished?: string | number | null;
  topics?: { topicId?: string; topicName?: string }[];
  tags?: { about?: { thingLabel?: string }[] };
}

/** Pull `props.pageProps` out of a fetched HTML document. */
export function extractPageProps(html: string, url: string): PageProps {
  const match = NEXT_DATA_RE.exec(html);
  if (!match?.[1]) {
    throw new ParseError(
      'No __NEXT_DATA__ block found; the upstream page structure may have changed.',
    );
  }

  let parsed: { props?: { pageProps?: PageProps } };
  try {
    parsed = JSON.parse(match[1]);
  } catch {
    throw new ParseError(`__NEXT_DATA__ was not valid JSON for ${url}`);
  }

  const pageProps = parsed?.props?.pageProps;
  if (!pageProps) {
    throw new ParseError('__NEXT_DATA__ contained no props.pageProps.');
  }

  return pageProps;
}
