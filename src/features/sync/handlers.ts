import { Hono } from 'hono';
import { discoverNewFilings } from './discovery';
import { getRecentSyncRuns } from './queries';
import { createLogger } from '../../lib/logger';
import { ok } from '../../lib/http/respond';

export const syncHandlers = new Hono<{ Bindings: Env }>();

syncHandlers.post('/discover', async (c) => {
  const log = createLogger(c.env);
  const result = await discoverNewFilings(c.env, log);
  return ok(c, result);
});

syncHandlers.get('/runs', async (c) => {
  const runs = await getRecentSyncRuns(c.env, 20);
  return ok(c, { items: runs });
});
