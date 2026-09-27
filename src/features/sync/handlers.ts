import { Hono } from 'hono';
import { discoverNewFilings } from './discovery';
import { getRecentSyncRuns } from './queries';

export const syncHandlers = new Hono<{ Bindings: Env }>();

syncHandlers.post('/discover', async (c) => {
  const result = await discoverNewFilings(c.env);
  return c.json(result);
});

syncHandlers.get('/runs', async (c) => {
  const runs = await getRecentSyncRuns(c.env, 20);
  return c.json({ data: runs });
});
