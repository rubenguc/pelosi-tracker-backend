import { Hono } from 'hono';
import type { DbEnv } from '../../db/client';
import { discoverNewFilings } from './discovery';
import { getRecentSyncRuns } from './queries';
import type { QueueMessage } from './types';
import { processPdfMessage } from './processor';

type Bindings = DbEnv & {
  PDF_QUEUE: Queue<QueueMessage>;
  ENV: string;
};

export const syncHandlers = new Hono<{ Bindings: Bindings }>();

// POST /sync/discover → dispara discovery manualmente
syncHandlers.post('/discover', async (c) => {
  const result = await discoverNewFilings(c.env);
  return c.json(result);
});

// GET /sync/runs → lista los últimos sync runs
syncHandlers.get('/runs', async (c) => {
  const runs = await getRecentSyncRuns(c.env, 20);
  return c.json({ data: runs });
});


// Solo en local: procesar un mensaje directamente sin Queue
syncHandlers.post('/process-one', async (c) => {
  if (c.env.ENV !== 'local') {
    return c.json({ error: 'Not available' }, 404);
  }

  const body = await c.req.json<QueueMessage>();
  const result = await processPdfMessage(body, c.env);
  return c.json(result);
});
