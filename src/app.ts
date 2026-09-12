import path from 'node:path';

import cors from 'cors';
import express, { type Express } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

import { config } from './config';
import { errorHandler, notFoundHandler } from './lib/middleware';
import { bbcRouter } from './routes/bbc';
import { dummyRouter } from './routes/dummy';

const PUBLIC_DIR = path.join(__dirname, '..', 'public');

const tooMany = (error: string) => ({ success: false, error });

export function createApp(): Express {
  const app = express();

  // Vercel terminates TLS and forwards the client IP in `x-forwarded-for`.
  // Without this the rate limiter keys every request to the same proxy IP and
  // would throttle all users at once.
  app.set('trust proxy', 1);

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: config.corsOrigin }));

  if (!config.isTest) {
    app.use(
      rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: 300,
        standardHeaders: true,
        legacyHeaders: false,
        message: tooMany('Too many requests from this IP, please try again after 15 minutes.'),
      }),
    );

    app.use(
      '/api',
      rateLimit({
        windowMs: 60 * 1000,
        limit: 15,
        standardHeaders: true,
        legacyHeaders: false,
        message: tooMany('Too many API requests, please wait a minute and try again.'),
      }),
    );
  }

  app.use(express.static(PUBLIC_DIR));

  app.get('/', (_req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
  });

  app.use('/api', bbcRouter);

  // Fixture routes are a development aid, not part of the public API.
  if (!config.isProduction) {
    app.use('/dummy', dummyRouter);
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
