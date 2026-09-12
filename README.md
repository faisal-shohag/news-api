# BBC Bengali News API

A TypeScript + Express service that scrapes [BBC Bengali](https://www.bbc.com/bengali) and serves it as JSON: categories, category listings, article detail, and the "most read" list.

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

| Variable                    | Default       | Meaning                                        |
| --------------------------- | ------------- | ---------------------------------------------- |
| `PORT`                      | `3000`        | Local listen port                              |
| `NODE_ENV`                  | `development` | `production` hides the `/dummy/*` routes       |
| `UPSTREAM_TIMEOUT_MS`       | `10000`       | Timeout for outbound requests to bbc.com       |
| `LIST_CACHE_TTL_SECONDS`    | `120`         | Cache TTL for list endpoints                   |
| `ARTICLE_CACHE_TTL_SECONDS` | `600`         | Cache TTL for `/api/news/:id`                  |
| `CORS_ORIGIN`               | `*`           | `*`, or a comma-separated list of origins      |

## Project structure

```
api/index.ts          Vercel entry point (exports the app)
src/
  app.ts              App assembly: middleware, routers, error handling
  server.ts           Local dev listener
  config.ts           Env parsing (zod)
  routes/bbc.ts       /api/* routes and request validation
  routes/dummy.ts     /dummy/* fixture routes (non-production only)
  scrape/client.ts    Shared axios instance
  scrape/parse.ts     srcset / link / id helpers
  scrape/bbc.ts       The scrapers themselves
  data/categories.ts  Single source of truth for categories
  lib/                cache, errors, response helpers, middleware
public/               Static docs page and images
tests/                Vitest suite + saved BBC HTML fixtures
```

---

## API

Base URL: `http://localhost:3000/api`

Every `/api` response is wrapped in `{ "success": true, ... }` on success and `{ "success": false, "error": "..." }` on failure.

### Rate limits

- **Global:** 300 requests per 15 minutes per IP.
- **`/api/*`:** 15 requests per minute per IP.

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

## Fixture endpoints (`/dummy/*`)

Static sample data for frontend exercises. **Not mounted when `NODE_ENV=production`.** These use a different envelope (`{ status, message, data }`) than the `/api` routes.

- `GET /dummy/news/categories`
- `GET /dummy/news-by-cat/:id`
- `GET /dummy/news-details/:id`

---

## Error handling

| Status | When                                                        |
| ------ | ----------------------------------------------------------- |
| `400`  | Invalid category slug or article id                         |
| `404`  | Article missing, scrape came back empty, or unknown route   |
| `429`  | Rate limit exceeded                                         |
| `502`  | Upstream fetch failed                                       |
| `504`  | Upstream timed out                                          |
| `500`  | Anything else                                               |

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
