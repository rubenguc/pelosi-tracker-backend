import { Hono } from 'hono';
import { getTradesByPolitician } from './queries';
import { parsePagination } from '../../lib/paginations/parse';

export const tradeHandlers = new Hono<{ Bindings: Env }>();

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
