import type { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { HttpError } from './errors';
import { fail } from './respond';
import { createLogger } from '../logger';

/**
 * Applies global error handling to a Hono app.
 *
 * - Typed errors (HttpError) → returns their status and message as-is.
 * - Hono's HTTPException → returns its status and message.
 * - Any other error → returns a generic 500 and logs the full error.
 * - Unknown routes → returns a standard 404.
 *
 * Only 500-level errors are logged. 4xx responses are not logged.
 */
export function setupErrorHandling<E extends Env>(app: Hono<{ Bindings: E }>) {
  app.onError((err, c) => {
    // 1. Typed errors from our own code → no logging
    if (err instanceof HttpError) {
      return fail(c, err.code, err.message, err.status as any, err.details);
    }

    // 2. Hono's HTTPException (e.g. from auth middleware) → no logging
    if (err instanceof HTTPException) {
      return fail(c, 'HTTP_ERROR', err.message, err.status);
    }

    // 3. Any other error → generic 500 + full log
    const log = createLogger(c.env);
    log.error({ err }, 'unhandled error');
    return fail(c, 'INTERNAL_ERROR', 'Something went wrong', 500);
  });

  app.notFound((c) => fail(c, 'NOT_FOUND', 'Route not found', 404));
}
