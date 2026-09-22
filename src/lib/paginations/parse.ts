import type { Context } from 'hono';
import type { PaginationParams } from './types';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export function parsePagination(c: Context): PaginationParams {
  const rawPage = c.req.query('page');
  const rawLimit = c.req.query('limit');

  const page = clampInt(rawPage, 1, Number.MAX_SAFE_INTEGER, 1);
  const limit = clampInt(rawLimit, 1, MAX_LIMIT, DEFAULT_LIMIT);

  return {
    page,
    limit,
    offset: (page - 1) * limit,
  };
}

function clampInt(
  value: string | undefined,
  min: number,
  max: number,
  fallback: number,
): number {
  if (value === undefined) return fallback;
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}
