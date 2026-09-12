import { BBC_ORIGIN, SERVICE_PATH, SOURCE_NAME } from '../../config';
import { getIndexed, indexArticles } from '../../lib/cache';
import { AppError } from '../../lib/errors';
import { fetchTextLimited } from '../client';
import { extractPageProps, type ContentBlock } from '../nextData';
import { cleanId, toIso } from './normalize';

const IMAGE_CDN = 'https://ichef.bbci.co.uk/ace/ws';

/**
 * Article bodies nest as block -> model.blocks -> ... -> paragraph, and only
 * `paragraph` leaves carry `model.text`. Descending to the leaves rather than
 * reading a fixed depth means BBC can add wrapper levels without breaking us.
 */
function collectText(node?: ContentBlock | null): string {
  if (!node || typeof node !== 'object') return '';

  if (node.type === 'paragraph' && typeof node.model?.text === 'string') {
    return node.model.text;
  }

  const children = node.model?.blocks ?? node.blocks ?? [];
  return children.map(collectText).filter(Boolean).join('\n');
}

/**
 * `pageData.promo.summary` is a plain string on most articles but a nested
 * block tree on others. Coerce both to text so `description` is always a string
 * or null -- before this, the object form leaked into the JSON response and
 * into the search index as "[object Object]".
 */
function blockText(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value.trim() || null;
  if (typeof value === 'object') return collectText(value as ContentBlock) || null;
  return null;
}

function findChild(block: ContentBlock, type: string): ContentBlock | null {
  return (block.model?.blocks ?? []).find((child) => child.type === type) ?? null;
}

export interface ArticleImage {
  type: 'image';
  url: string;
  width: number | null;
  height: number | null;
  caption: string | null;
  altText: string | null;
  copyrightHolder: string | null;
}

function buildImage(block: ContentBlock): Omit<ArticleImage, 'type'> | null {
  const raw = findChild(block, 'rawImage');
  if (!raw?.model?.locator) return null;

  const { locator, originCode, width, height, copyrightHolder } = raw.model;

  return {
    url: `${IMAGE_CDN}/640/${originCode}/${locator}`,
    width: width ?? null,
    height: height ?? null,
    caption: collectText(findChild(block, 'caption')) || null,
    altText: collectText(findChild(block, 'altText')) || null,
    copyrightHolder: copyrightHolder ?? null,
  };
}

export interface Contributor {
  name: string;
  role: string | null;
}

function buildByline(block: ContentBlock): Contributor[] {
  return (block.model?.blocks ?? [])
    .filter((child) => child.type === 'contributor')
    .map((contributor) => ({
      name: collectText(findChild(contributor, 'name')),
      role: collectText(findChild(contributor, 'role')) || null,
    }))
    .filter((contributor): contributor is Contributor => Boolean(contributor.name));
}

export type BodyBlock =
  { type: 'text'; text: string } | { type: 'subheading'; text: string } | ArticleImage;

/** Flatten the raw block list into a typed body the API can serve directly. */
function buildBody(blocks: ContentBlock[]): BodyBlock[] {
  const body: BodyBlock[] = [];

  for (const block of blocks) {
    switch (block.type) {
      case 'text': {
        const text = collectText(block);
        if (text) body.push({ type: 'text', text });
        break;
      }
      case 'subheadline': {
        const text = collectText(block);
        if (text) body.push({ type: 'subheading', text });
        break;
      }
      case 'image': {
        const image = buildImage(block);
        if (image) body.push({ type: 'image', ...image });
        break;
      }
      default:
        // headline/timestamp/byline are lifted to the top level below; ads,
        // onward-journey promos and podcast promos are dropped on purpose.
        break;
    }
  }

  return body;
}

export function articleUrl(id: string): string {
  return `${BBC_ORIGIN}${SERVICE_PATH}/articles/${id}`;
}

export interface FullArticle {
  id: string;
  title: string | null;
  description: string | null;
  link: string;
  firstPublished: string | null;
  lastPublished: string | null;
  byline: Contributor[];
  topics: { id: string | null; name: string | null }[];
  tags: string[];
  imageUrl: string | null;
  body: BodyBlock[];
  text: string;
  wordCount: number;
  source: string;
}

/**
 * Fetch one article on demand.
 *
 * Prefers the URL already seen in a listing, because some items live under
 * /videos/ or legacy paths rather than /articles/{id}.
 */
export async function scrapeFullArticle(id: string): Promise<FullArticle> {
  const known = getIndexed(id);
  const url = known?.link || articleUrl(id);

  const pageProps = extractPageProps(await fetchTextLimited(url), url);
  const pageData = pageProps.pageData ?? {};
  const blocks = pageData.content?.model?.blocks ?? [];

  // Live blogs and index pages resolve fine but carry no article body. Failing
  // loudly beats returning a hollow article with a null title.
  if (blocks.length === 0) {
    throw new AppError(
      415,
      `"${id}" is a ${pageProps.pageType ?? 'non-article'} page and has no article body.`,
      { pageType: pageProps.pageType ?? null, link: url },
    );
  }

  const headlineBlock = blocks.find((block) => block.type === 'headline');
  const timestampBlock = blocks.find((block) => block.type === 'timestamp');
  const bylineBlock = blocks.find((block) => block.type === 'byline');
  const metadata = pageData.metadata ?? {};

  const body = buildBody(blocks);
  const text = body
    .filter((block): block is Extract<BodyBlock, { text: string }> => 'text' in block)
    .map((block) => block.text)
    .join('\n\n');

  const article: FullArticle = {
    id: cleanId(metadata.id) ?? id,
    title: collectText(headlineBlock) || (pageData.promo?.headlines?.seoHeadline ?? null),
    description: blockText(pageData.promo?.summary) ?? known?.description ?? null,
    link: url,
    firstPublished: toIso(timestampBlock?.model?.firstPublished ?? metadata.firstPublished),
    lastPublished: toIso(timestampBlock?.model?.lastPublished ?? metadata.lastPublished),
    byline: bylineBlock ? buildByline(bylineBlock) : [],
    topics: (metadata.topics ?? []).map((topic) => ({
      id: topic.topicId ?? null,
      name: topic.topicName ?? null,
    })),
    tags: (metadata.tags?.about ?? [])
      .map((tag) => tag.thingLabel)
      .filter((label): label is string => Boolean(label)),
    imageUrl:
      known?.imageUrl ??
      body.find((block): block is ArticleImage => block.type === 'image')?.url ??
      null,
    body,
    text,
    wordCount: text ? text.split(/\s+/).filter(Boolean).length : 0,
    source: SOURCE_NAME,
  };

  // Feed the search index, but only with a titled article -- an untitled entry
  // can never match a query and would just dilute the index.
  if (article.title) {
    indexArticles([
      {
        id: article.id,
        title: article.title,
        description: article.description,
        link: article.link,
        imageUrl: article.imageUrl,
        imageAlt: null,
        category: article.topics[0]?.name ?? known?.category ?? null,
        type: 'article',
        isLive: false,
        firstPublished: article.firstPublished,
        lastPublished: article.lastPublished,
        source: SOURCE_NAME,
      },
    ]);
  }

  return article;
}
