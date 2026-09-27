import { Hono } from 'hono';
import type { DbEnv } from '../../db/client';
import { getTradesByPolitician } from './queries';
import { parsePagination } from '../../lib/paginations/parse';

type Bindings = DbEnv & {
  ENV: string;
};

export const tradeHandlers = new Hono<{ Bindings: Bindings }>();

// GET /trades?politicianId=...&page=1&limit=20
tradeHandlers.get('/', async (c) => {
  const politicianId = c.req.query('politicianId');

  if (!politicianId) {
    return c.json(
      { error: 'Query param "politicianId" is required' },
      400,
    );
  }

  const params = parsePagination(c);
  const result = await getTradesByPolitician(c.env, politicianId, params);
  return c.json(result);
});
