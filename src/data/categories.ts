/**
 * Single source of truth for BBC Bengali categories.
 *
 * This replaces the three hand-maintained maps that used to live in
 * `utils/datamap.js` (`bbcBn`, `newsCat`, `catNews`). Those had drifted in both
 * directions -- `catNews` was missing `technology` and `bbcBn` was missing
 * `india` -- which broke `/api/categories/:id` for both slugs. Every row here
 * carries all three fields, so a category can no longer exist in one lookup and
 * be absent from another.
 */

export interface Category {
  /** Human-facing slug used in our own URLs, e.g. `technology`. */
  slug: string;
  /** BBC topic id, without any leading slash, e.g. `c8y94k95v52t`. */
  topicId: string;
  /** Bengali display name. */
  title: string;
}

/** Slug of the homepage feed. Not a topic page, so it is not a `Category`. */
export const MAIN_SLUG = 'main';

/** Bengali display name for the homepage feed. */
export const MAIN_TITLE = 'মূলপাতা';

export const CATEGORIES: readonly Category[] = [
  { slug: 'politics', topicId: 'cqywj91rkg6t', title: 'রাজনীতি' },
  { slug: 'world', topicId: 'c907347rezkt', title: 'বিশ্ব' },
  { slug: 'economics', topicId: 'cjgn7233zk5t', title: 'অর্থনীতি' },
  { slug: 'health', topicId: 'cg7265yyxn1t', title: 'স্বাস্থ্য' },
  { slug: 'sports', topicId: 'cdr56g57y01t', title: 'খেলা' },
  { slug: 'technology', topicId: 'c8y94k95v52t', title: 'প্রযুক্তি' },
  { slug: 'bangladesh', topicId: 'c2dwq2nd40xt', title: 'বাংলাদেশ' },
  { slug: 'india', topicId: 'cdr56gv542vt', title: 'ভারত' },
];

export const bySlug: ReadonlyMap<string, Category> = new Map(
  CATEGORIES.map((category) => [category.slug, category]),
);

export const byTopicId: ReadonlyMap<string, Category> = new Map(
  CATEGORIES.map((category) => [category.topicId, category]),
);

/** Every slug a client may pass to `/api/categories/:id`, including `main`. */
export const VALID_SLUGS: readonly string[] = [MAIN_SLUG, ...CATEGORIES.map((c) => c.slug)];

/** Display title for any valid slug. */
export function titleForSlug(slug: string): string {
  return slug === MAIN_SLUG ? MAIN_TITLE : (bySlug.get(slug)?.title ?? slug);
}
