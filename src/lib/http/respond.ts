import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { ApiSuccess, ApiError } from './types';

export function ok<T>(
  c: Context,
  data: T,
  status: ContentfulStatusCode = 200,
) {
  const body: ApiSuccess<T> = { ok: true, data };
  return c.json(body, status);
}

export function fail(
  c: Context,
  code: string,
  message: string,
  status: ContentfulStatusCode = 400,
  details?: unknown,
) {
  const body: ApiError = {
    ok: false,
    error: { code, message, ...(details !== undefined ? { details } : {}) },
  };
  return c.json(body, status);
}
