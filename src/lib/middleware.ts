import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from 'express';
import { AxiosError } from 'axios';

import { AppError } from './errors';

/** Wrap an async handler so a rejected promise reaches the error middleware. */
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}

/** JSON 404 for unmatched routes. Express used to answer these with HTML. */
export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.path}`,
  });
};

function describe(error: unknown): { status: number; message: string; details?: unknown } {
  if (error instanceof AppError) {
    return { status: error.status, message: error.message, details: error.details };
  }

  if (error instanceof AxiosError) {
    const upstreamStatus = error.response?.status;

    if (upstreamStatus === 404) {
      return { status: 404, message: 'The requested page does not exist upstream' };
    }
    if (error.code === 'ECONNABORTED') {
      return { status: 504, message: 'The upstream source timed out' };
    }
    return { status: 502, message: 'Failed to fetch data from the upstream source' };
  }

  return { status: 500, message: 'Internal server error' };
}

/**
 * Single place that turns a thrown error into a response.
 *
 * Client-facing messages are deliberately generic -- the previous handlers
 * echoed `error.message` from axios, leaking upstream URLs and internals. The
 * real error is logged instead.
 */
export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  const { status, message, details } = describe(error);

  if (status >= 500) {
    console.error(`[${req.method} ${req.originalUrl}]`, error);
  } else {
    console.warn(`[${req.method} ${req.originalUrl}] ${status} ${message}`);
  }

  res.status(status).json({
    success: false,
    error: message,
    ...(details ? { details } : {}),
  });
};
