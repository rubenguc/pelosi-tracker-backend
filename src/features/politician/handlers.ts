import { Hono } from 'hono';
import { getPoliticians } from './queries';
import { parsePagination } from '../../lib/paginations/parse';


export const politicianHandlers = new Hono<{ Bindings: Env }>();


politicianHandlers.get('/', async (c) => {
  const params = parsePagination(c);
  const result = await getPoliticians(c.env, params);
  return c.json(result);
});
