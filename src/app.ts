import path from 'node:path';

import compression from 'compression';
import cors from 'cors';
import express, { type Express } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

import { config } from './config';
import { errorHandler, notFoundHandler } from './lib/middleware';
import { bbcRouter } from './routes/bbc';
import { dummyRouter } from './routes/dummy';
import { v2Router } from './routes/v2';

const PUBLIC_DIR = path.join(__dirname, '..', 'public');

const tooMany = (error: string) => ({ success: false, error });

const limiter = (
  windowMs: number,
  limit: number,
  message: string,
  skip?: (req: express.Request) => boolean,
) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: tooMany(message),
    ...(skip ? { skip } : {}),
  });

export function createApp(): Express {
  const app = express();

  // Vercel terminates TLS and forwards the client IP in `x-forwarded-for`.
  // Without this the rate limiter keys every request to the same proxy IP and
  // would throttle all users at once.
  app.set('trust proxy', 1);

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: config.corsOrigin }));
  // A 40-page crawl is a few hundred KB of JSON; it compresses to a fraction.
  app.use(compression());

  if (!config.isTest) {
    app.use(
      limiter(
        15 * 60 * 1000,
        300,
        'Too many requests from this IP, please try again after 15 minutes.',
      ),
    );

    // The deep-crawl route can be 40 upstream fetches for one request, so it
    // gets its own budget well below the general one. Registered first so it
    // wins for that path.
    app.use(
      '/api/v2/category/:slug/all',
      limiter(
        60 * 1000,
        config.crawlRateLimitMax,
        'Deep crawls are limited; please wait a minute and try again.',
      ),
    );

    app.use(
      '/api/v2',
      limiter(60 * 1000, config.v2RateLimitMax, 'Too many requests, please wait a minute.'),
    );

    // v1 keeps its original, much tighter budget. `req.path` is relative to the
    // mount point here, so v2 traffic is excluded rather than double-counted.
    app.use(
      '/api',
      limiter(60 * 1000, 15, 'Too many API requests, please wait a minute and try again.', (req) =>
        req.path.startsWith('/v2'),
      ),
    );
  }

  app.use(express.static(PUBLIC_DIR));

  app.get('/', (_req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
  });

  /**
   * Two engines, side by side and independently versioned:
   *
   *  - `/api/*`    scrapes the rendered DOM with cheerio. Original shapes, kept
   *                stable for existing clients.
   *  - `/api/v2/*` reads the `__NEXT_DATA__` JSON that every BBC page ships.
   *                More durable against markup changes, and carries fields the
   *                DOM never exposed (ISO timestamps, bylines, topics, tags).
   *
   * v2 mounts first so its paths are never captured by a v1 `:id` route.
   */
  app.use('/api/v2', v2Router);
  app.use('/api', bbcRouter);

  // Fixture routes are a development aid, not part of the public API.
  if (!config.isProduction) {
    app.use('/dummy', dummyRouter);
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
