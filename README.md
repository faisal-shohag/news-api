# BBC Bengali News API

A TypeScript + Express service that turns [BBC Bengali](https://www.bbc.com/bengali) into JSON.

There are **two engines side by side**, and both are live:

|                  | `/api/*` (v1)                         | `/api/v2/*`                                   |
| ---------------- | ------------------------------------- | --------------------------------------------- |
| How it reads BBC | Scrapes the rendered DOM with cheerio | Reads the `__NEXT_DATA__` JSON the page ships |
| Durability       | Breaks when BBC changes markup        | Survives markup changes                       |
| Timestamps       | Display strings (`"৩ এপ্রিল ২০২৫"`)   | Real ISO 8601                                 |
| Article body     | Array of paragraph strings            | Typed blocks: text, subheading, image         |
| Also gives you   | —                                     | Summaries, bylines, topics, tags, word count  |
| Endpoints        | 5                                     | 12, incl. search, RSS, deep crawl, related    |

**v1 is unchanged and stays supported** -- existing clients keep working exactly as before. New work should use v2.

Responses are cached in-process and at the CDN edge, and the API is rate limited.

---

## Requirements

- Node.js 20 or newer

## Installation

```bash
git clone https://github.com/faisal-shohag/news-api.git
cd news-api
npm install
npm run dev
```

The server runs on `http://localhost:3000`.

## Scripts

| Script              | What it does                                   |
| ------------------- | ---------------------------------------------- |
| `npm run dev`       | Watch mode via `tsx`                           |
| `npm run build`     | Compile TypeScript to `dist/`                  |
| `npm start`         | Run the compiled server                        |
| `npm test`          | Vitest suite (fixture-based, no network calls) |
| `npm run typecheck` | `tsc --noEmit`                                 |
| `npm run lint`      | ESLint                                         |
| `npm run format`    | Prettier                                       |

## Configuration

All settings are optional and have defaults. Copy `.env.example` to `.env` to override.

| Variable                    | Default       | Meaning                                   |
| --------------------------- | ------------- | ----------------------------------------- |
| `PORT`                      | `3000`        | Local listen port                         |
| `NODE_ENV`                  | `development` | `production` hides the `/dummy/*` routes  |
| `UPSTREAM_TIMEOUT_MS`       | `10000`       | Timeout for outbound requests to bbc.com  |
| `LIST_CACHE_TTL_SECONDS`    | `120`         | Cache TTL for list endpoints              |
| `ARTICLE_CACHE_TTL_SECONDS` | `600`         | Cache TTL for `/api/news/:id`             |
| `CORS_ORIGIN`               | `*`           | `*`, or a comma-separated list of origins |

These apply to the v2 engine only:

| Variable               | Default | Meaning                                                     |
| ---------------------- | ------- | ----------------------------------------------------------- |
| `MAX_CONCURRENCY`      | `4`     | Max simultaneous outbound requests to bbc.com               |
| `UPSTREAM_RETRIES`     | `1`     | Extra attempts after a failure; only 5xx and network errors |
| `MAX_TOPIC_PAGES`      | `40`    | Hard ceiling on a deep crawl                                |
| `DEFAULT_CRAWL_PAGES`  | `5`     | Pages crawled when `?pages=` is omitted                     |
| `CACHE_MAX_ENTRIES`    | `500`   | Cached responses before LRU eviction                        |
| `CACHE_MAX_INDEXED`    | `5000`  | Articles held in the search index                           |
| `V2_RATE_LIMIT_MAX`    | `120`   | Requests per minute per IP on `/api/v2`                     |
| `CRAWL_RATE_LIMIT_MAX` | `10`    | Requests per minute per IP on the deep-crawl route          |

## Project structure

```
api/index.ts          Vercel entry point (exports the app)
src/
  app.ts              App assembly: middleware, routers, error handling
  server.ts           Local dev listener
  config.ts           Env parsing (zod)
  routes/bbc.ts       /api/* routes (v1, cheerio engine)
  routes/v2.ts        /api/v2/* routes (v2, __NEXT_DATA__ engine)
  routes/dummy.ts     /dummy/* fixture routes (non-production only)
  scrape/client.ts    Shared axios instance + limited, retrying fetch
  scrape/parse.ts     srcset / link / id helpers (v1)
  scrape/bbc.ts       The v1 scrapers
  scrape/nextData.ts  __NEXT_DATA__ extraction and its types
  scrape/v2/          The v2 scrapers: home, topic, article, normalize
  data/categories.ts  Single source of truth for categories
  lib/cache.ts        v1 memo + v2 single-flight/stale-if-error cache + article index
  lib/limit.ts        Concurrency limiter
  lib/search.ts       Relevance ranking and related-article scoring
  lib/feed.ts         RSS 2.0 rendering
  lib/                errors, response helpers, middleware
public/               Static docs page and images
tests/                Vitest suite + saved BBC HTML fixtures
```

---

## API

Base URL: `http://localhost:3000/api`

Every `/api` response is wrapped in `{ "success": true, ... }` on success and `{ "success": false, "error": "..." }` on failure.

### Rate limits

- **Global:** 300 requests per 15 minutes per IP.
- **`/api/*` (v1):** 15 requests per minute per IP.
- **`/api/v2/*`:** 120 requests per minute per IP.
- **`/api/v2/category/:slug/all`:** 10 requests per minute per IP -- one such request can be 40 upstream fetches.

Exceeding a limit returns `429` with:

```json
{ "success": false, "error": "Too many API requests, please wait a minute and try again." }
```

Standard `RateLimit-*` headers are sent on every response. Limits are disabled when `NODE_ENV=test`.

### Caching

List endpoints send `Cache-Control: public, s-maxage=120, stale-while-revalidate=600`; article detail uses 600s. On Vercel this means most traffic is served by the CDN and never reaches the function. A warm instance additionally memoises scrapes in process.

---

### `GET /api/categories`

Categories from the BBC Bengali navigation, filtered to those this API can serve — an id returned here is always accepted by `/api/categories/:id`.

```json
{
  "success": true,
  "count": 9,
  "categories": [
    { "id": "main", "title": "মূলপাতা" },
    { "id": "politics", "title": "রাজনীতি" }
  ],
  "scrapedAt": "2026-09-12T12:00:00.000Z"
}
```

Valid ids: `main`, `politics`, `world`, `economics`, `health`, `sports`, `technology`, `bangladesh`, `india`.

### `GET /api/news`

The homepage feed. Identical to `GET /api/categories/main`.

```json
{
  "success": true,
  "categoryId": "main",
  "categoryName": "মূলপাতা",
  "count": 38,
  "articles": [
    {
      "id": "c1n2m3",
      "title": "Sample News Title",
      "link": "https://www.bbc.com/bengali/articles/c1n2m3",
      "description": "Short description",
      "time": "৩ এপ্রিল ২০২৫",
      "image": {
        "alt": "Image description",
        "srcset": [
          { "resolution": "base", "url": "https://example.com/image.jpg" },
          { "resolution": "480w", "url": "https://example.com/image-480.jpg" }
        ]
      },
      "scrapedAt": "2026-09-12T12:00:00.000Z"
    }
  ]
}
```

Returns `404` if the scrape comes back empty, which usually means BBC changed their markup.

### `GET /api/categories/:id`

Articles in one category. `:id` must be one of the valid ids above; anything else returns `400` with the valid list in `details.validCategories`.

```json
{
  "success": true,
  "categoryId": "technology",
  "categoryName": "প্রযুক্তি",
  "count": 24,
  "articles": [
    {
      "id": "c4g5k85k2jro",
      "title": "Category Article",
      "link": "https://www.bbc.com/bengali/articles/c4g5k85k2jro",
      "time": "৩ এপ্রিল ২০২৫",
      "datetime": "2025-04-03T10:00:00Z",
      "image": { "alt": "Image alt text", "srcset": [] }
    }
  ]
}
```

`id=main` returns the feed shape above (with `description` instead of `datetime`). This difference is historical; clients depend on it, so it is preserved.

### `GET /api/news/:id`

Full text of one article. `:id` must match `^[a-z0-9-]+$` — anything else is rejected with `400` before any outbound request.

```json
{
  "success": true,
  "article": {
    "id": "c1n2m3",
    "title": "Detailed Article Title",
    "url": "https://www.bbc.com/bengali/articles/c1n2m3",
    "timestamp": "৩ এপ্রিল ২০২৫",
    "content": ["Paragraph 1", "Paragraph 2"],
    "images": [{ "url": "https://example.com/image.jpg", "caption": "Image caption" }],
    "scrapedAt": "2026-09-12T12:00:00.000Z"
  }
}
```

### `GET /api/popular`

The "most read" list, ranked.

```json
{
  "success": true,
  "count": 5,
  "articles": [
    {
      "rank": 1,
      "id": "c7x8y9",
      "title": "Most Popular Article",
      "link": "https://www.bbc.com/bengali/articles/c7x8y9",
      "scrapedAt": "2026-09-12T12:00:00.000Z"
    }
  ]
}
```

---

---

# API v2 (`/api/v2`)

Same source, different engine. v2 reads the `__NEXT_DATA__` JSON blob that every BBC Bengali page embeds for its own frontend, rather than scraping the rendered HTML. That matters twice over: BBC's class names are hashed and change without notice, and the JSON carries fields the DOM never exposes.

### Envelope

Every v2 response reports where the data came from:

```json
{
  "success": true,
  "count": 24,
  "cachedAt": "2026-09-12T05:13:19.801Z",
  "stale": true,
  "data": []
}
```

`stale: true` is present only when the cached copy is past its TTL and a refresh failed. Serving slightly old headlines beats failing the request, so the value is returned anyway and flagged. The field is omitted entirely when the data is fresh.

### `GET /api/v2/news`

The whole homepage, flattened and deduped.

| Query      | Default | Meaning                              |
| ---------- | ------- | ------------------------------------ |
| `limit`    | `50`    | 1-500                                |
| `offset`   | `0`     | For paging                           |
| `category` | —       | Substring match on the curation name |
| `q`        | —       | Relevance-ranked filter              |

```json
{
  "success": true,
  "count": 2,
  "total": 68,
  "limit": 2,
  "offset": 0,
  "cachedAt": "2026-09-12T05:13:19.801Z",
  "data": [
    {
      "id": "crerx7dlz7xo",
      "title": "...",
      "description": "...",
      "link": "https://www.bbc.com/bengali/articles/crerx7dlz7xo",
      "imageUrl": "https://ichef.bbci.co.uk/...",
      "imageAlt": "...",
      "category": "প্রধান খবর",
      "type": "article",
      "isLive": false,
      "firstPublished": "2026-09-12T03:36:30.871Z",
      "lastPublished": "2026-09-12T03:36:30.871Z",
      "source": "BBC Bangla"
    }
  ]
}
```

### `GET /api/v2/news/sections`

The homepage grouped the way BBC curates it. Each section carries `title`, `curationId`, `curationType`, `link`, `count` and its `articles`.

### `GET /api/v2/news/latest?limit=20`

Lead stories only -- the first curation.

### `GET /api/v2/news/most-read`

The ranked "সর্বাধিক পঠিত" list. Each article gains a `rank`; the response carries `generated`.

### `GET /api/v2/categories`

Categories read from the site navigation. Entries we have no ASCII alias for still appear, keyed by their raw BBC topic id, with `scrapable` saying whether `/api/v2/category/:slug` can serve them.

### `GET /api/v2/category/:slug`

One page of a topic listing, 24 articles per page upstream.

`:slug` accepts three forms: an ASCII alias (`technology`), the Bengali nav title (`প্রযুক্তি`), or a raw BBC topic id (`c8y94k95v52t`). Unknown topic ids are passed through to BBC, so a genuine typo comes back as `404 No category matches "..."`.

Query: `page` (1..40), `limit` (1..24). Response adds `slug`, `topicId`, `title`, `page`, `pageCount`.

### `GET /api/v2/category/:slug/all?pages=5`

Pages 1..n in a single call, deduped. Page one is fetched first because it reports the real `pageCount`, so asking for more pages than exist costs nothing. Fetches queue through the shared concurrency limiter rather than flooding upstream.

Capped at `MAX_TOPIC_PAGES` (40) and rate limited separately -- this is the expensive route.

Response adds `pagesCrawled` alongside `pageCount`.

### `GET /api/v2/article/:id`

The full article. `:id` must be alphanumeric, validated before any outbound request.

```json
{
  "success": true,
  "cachedAt": "2026-09-12T05:13:19.801Z",
  "data": {
    "id": "crerx7dlz7xo",
    "title": "...",
    "description": "...",
    "link": "https://www.bbc.com/bengali/articles/crerx7dlz7xo",
    "firstPublished": "2026-09-12T03:36:30.871Z",
    "lastPublished": "2026-09-12T03:36:30.871Z",
    "byline": [{ "name": "গ্রেস এলিজা গডউন", "role": "৯/১১ মেমোরিয়াল নিউইয়র্ক" }],
    "topics": [{ "id": "c6vzykzx879t", "name": "ডোনাল্ড ট্রাম্প" }],
    "tags": ["ডোনাল্ড ট্রাম্প", "যুক্তরাষ্ট্র"],
    "imageUrl": "https://ichef.bbci.co.uk/...",
    "body": [
      { "type": "text", "text": "..." },
      { "type": "subheading", "text": "..." },
      {
        "type": "image",
        "url": "https://ichef.bbci.co.uk/ace/ws/640/...",
        "width": 1024,
        "height": 576,
        "caption": "...",
        "altText": "...",
        "copyrightHolder": "Getty Images"
      }
    ],
    "text": "Every text and subheading block joined, for when you just want the prose.",
    "wordCount": 816,
    "source": "BBC Bangla"
  }
}
```

A live blog or index page resolves upstream but has no article body; those return `415` naming the actual `pageType`, rather than a hollow article with a null title.

### `GET /api/v2/article/:id/related?limit=10`

Other articles scored by shared topics, then shared category. Drawn from what this process has already scraped, so results improve as the index warms.

### `GET /api/v2/search?q=...&limit=50`

Relevance-ranked search over the local index. Each hit carries its `score`.

Ranking is deliberately simple -- no stemming, no index, no dependencies -- but a title match outranks a passing mention in a summary, and ties break on recency. The index is warmed from the homepage first, so a cold server answers rather than returning an empty result that looks like "no matches".

**BBC's own `/search` path is disallowed by their robots.txt and is never proxied.** This searches only what the API already fetched for other reasons.

### `GET /api/v2/feed.xml?limit=50`

RSS 2.0 over the homepage, or over one category with `?category=technology`. Served as `application/rss+xml`, ready for any feed reader.

### `GET /api/v2/health`

Uptime, total upstream fetches, and cache counters (entries, in-flight, indexed, hits, misses).

---

## Fixture endpoints (`/dummy/*`)

Static sample data for frontend exercises. **Not mounted when `NODE_ENV=production`.** These use a different envelope (`{ status, message, data }`) than the `/api` routes.

- `GET /dummy/news/categories`
- `GET /dummy/news-by-cat/:id`
- `GET /dummy/news-details/:id`

---

## Error handling

| Status | When                                                          |
| ------ | ------------------------------------------------------------- |
| `400`  | Invalid category slug, article id, or query parameter         |
| `404`  | Article missing, scrape came back empty, or unknown route     |
| `415`  | v2 only: the id is a live blog or index page, not an article  |
| `429`  | Rate limit exceeded                                           |
| `502`  | Upstream fetch failed, or `__NEXT_DATA__` could not be parsed |
| `504`  | Upstream timed out                                            |
| `500`  | Anything else                                                 |

Client-facing messages are deliberately generic; the underlying error is logged server-side rather than returned.

## Testing

```bash
npm test
```

Tests run against saved BBC HTML in `tests/fixtures/` with the axios client stubbed, so the suite is offline and deterministic. To refresh the fixtures, re-download the four pages listed in `tests/helpers.ts` plus one article, and update `tests/fixtures/article-id.txt`.

## Deployment

Deploys to Vercel as a serverless function. `vercel.json` rewrites all non-static traffic to `api/index.ts`, which exports the Express app; `public/` is served by Vercel's CDN.

```bash
vercel --prod
```

Note that in-process caching only survives within a warm instance — the `Cache-Control` headers are what carry caching across cold starts.

## Notes

This scraper targets `https://www.bbc.com/bengali`. Ensure compliance with BBC's terms of service and `robots.txt`.

## Contributing

Issues and pull requests welcome.
