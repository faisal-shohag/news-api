/**
 * Error carrying an HTTP status and a message that is safe to show a client.
 *
 * The old handlers echoed raw `error.message` from axios straight back to the
 * caller, leaking upstream URLs and internal failure detail. Anything not
 * wrapped in an `AppError` is now reported as a generic 500 and logged
 * server-side instead.
 */
export class AppError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.details = details;
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new AppError(400, message, details);

export const notFound = (message = 'Resource not found') => new AppError(404, message);

export const upstreamError = (message = 'Failed to fetch data from the upstream source') =>
  new AppError(502, message);
