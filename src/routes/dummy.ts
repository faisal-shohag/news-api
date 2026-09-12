import { Router } from 'express';

import dummyData from '../data/dummy.json';

/**
 * Static fixture endpoints used for frontend exercises.
 *
 * Note the envelope here is `{ status, message, data }`, which differs from the
 * `{ success, ... }` shape the `/api` routes use. Existing consumers depend on
 * it, so it is kept as-is. Mounted only outside production -- see `app.ts`.
 */
export const dummyRouter = Router();

const { categories, newsByCategory, newsDetails } = dummyData;

dummyRouter.get('/news/categories', (_req, res) => {
  res.json({
    status: true,
    message: 'successfully fetched all news categories',
    data: categories,
  });
});

dummyRouter.get('/news-by-cat/:id', (req, res) => {
  const data = (newsByCategory as Record<string, unknown[]>)[req.params.id] ?? [];
  res.json({
    status: true,
    message: 'successfully fetched all news by category',
    data,
  });
});

dummyRouter.get('/news-details/:id', (req, res) => {
  const data = (newsDetails as Record<string, unknown>)[req.params.id];

  if (!data) {
    res.status(404).json({ status: false, message: 'News not found' });
    return;
  }

  res.json({
    status: true,
    message: 'successfully fetched a news details',
    data,
  });
});
