import { describe, expect, it } from 'vitest';

import { bySlug, byTopicId, CATEGORIES, VALID_SLUGS } from '../src/data/categories';

describe('category data', () => {
  // The three legacy maps drifted apart: `catNews` lost `technology` and
  // `bbcBn` lost `india`. A single table makes that impossible, and this test
  // pins it.
  it('gives every category a slug, topic id and title', () => {
    for (const category of CATEGORIES) {
      expect(category.slug, JSON.stringify(category)).toBeTruthy();
      expect(category.topicId, JSON.stringify(category)).toMatch(/^[a-z0-9]+$/);
      expect(category.title, JSON.stringify(category)).toBeTruthy();
    }
  });

  it('keeps the slug and topic lookups in sync', () => {
    expect(bySlug.size).toBe(CATEGORIES.length);
    expect(byTopicId.size).toBe(CATEGORIES.length);
  });

  it('still exposes the categories the old maps knew about', () => {
    for (const slug of [
      'politics',
      'world',
      'economics',
      'health',
      'sports',
      'technology',
      'bangladesh',
      'india',
    ]) {
      expect(VALID_SLUGS, slug).toContain(slug);
      expect(bySlug.get(slug)?.topicId, slug).toBeTruthy();
    }
  });

  it('includes main as a servable slug', () => {
    expect(VALID_SLUGS).toContain('main');
  });
});
