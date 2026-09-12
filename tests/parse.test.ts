import { describe, expect, it } from 'vitest';

import { absolutize, idFromLink, parseSrcset } from '../src/scrape/parse';

describe('idFromLink', () => {
  it('takes the last path segment', () => {
    expect(idFromLink('/bengali/articles/c1n2m3')).toBe('c1n2m3');
    expect(idFromLink('https://www.bbc.com/bengali/news-12345678')).toBe('news-12345678');
  });

  it('ignores query strings and fragments', () => {
    expect(idFromLink('/bengali/articles/c1n2m3?at_medium=rss')).toBe('c1n2m3');
    expect(idFromLink('/bengali/articles/c1n2m3#top')).toBe('c1n2m3');
  });

  it('tolerates a trailing slash', () => {
    expect(idFromLink('/bengali/articles/c1n2m3/')).toBe('c1n2m3');
  });

  // The old code did `link.split('/')` unguarded here and threw a TypeError,
  // which surfaced to the client as a misleading 500.
  it('returns null instead of throwing on a missing href', () => {
    expect(idFromLink(undefined)).toBeNull();
    expect(idFromLink(null)).toBeNull();
    expect(idFromLink('')).toBeNull();
  });
});

describe('absolutize', () => {
  it('leaves absolute URLs alone', () => {
    expect(absolutize('https://www.bbc.com/bengali/x')).toBe('https://www.bbc.com/bengali/x');
  });

  it('prefixes the BBC origin onto relative hrefs', () => {
    expect(absolutize('/bengali/x')).toBe('https://www.bbc.com/bengali/x');
    expect(absolutize('bengali/x')).toBe('https://www.bbc.com/bengali/x');
  });

  it('returns null for a missing href', () => {
    expect(absolutize(undefined)).toBeNull();
  });
});

describe('parseSrcset', () => {
  it('puts the base image first and parses each candidate', () => {
    expect(
      parseSrcset('https://a/240.jpg 240w, https://a/480.jpg 480w', 'https://a/base.jpg'),
    ).toEqual([
      { resolution: 'base', url: 'https://a/base.jpg' },
      { resolution: '240w', url: 'https://a/240.jpg' },
      { resolution: '480w', url: 'https://a/480.jpg' },
    ]);
  });

  it('handles a srcset with no base image', () => {
    expect(parseSrcset('https://a/240.jpg 240w')).toEqual([
      { resolution: '240w', url: 'https://a/240.jpg' },
    ]);
  });

  it('handles a base image with no srcset', () => {
    expect(parseSrcset(undefined, 'https://a/base.jpg')).toEqual([
      { resolution: 'base', url: 'https://a/base.jpg' },
    ]);
  });

  it('returns an empty array when neither is present', () => {
    expect(parseSrcset(undefined, undefined)).toEqual([]);
  });

  it('skips malformed candidates rather than emitting empty URLs', () => {
    expect(parseSrcset('  ,  , https://a/1.jpg 1w')).toEqual([
      { resolution: '1w', url: 'https://a/1.jpg' },
    ]);
  });
});
