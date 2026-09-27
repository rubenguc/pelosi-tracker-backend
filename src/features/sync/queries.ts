// src/features/sync/queries.ts
import { eq, and, inArray } from 'drizzle-orm';
import { getDb, type DbEnv } from '../../db/client';
import { filings, syncRuns } from '../../db/schema';
import type { Filing, NewFiling, SyncRun } from '../../db/schema';
import { batchSizeForColumns, chunk } from '../../lib/d1';

export async function createSyncRun(env: DbEnv): Promise<number> {
  const [row] = await getDb(env)
    .insert(syncRuns)
    .values({ startedAt: new Date().toISOString(), status: 'running' })
    .returning({ id: syncRuns.id });
  return row.id;
}

export async function finishSyncRun(
  env: DbEnv,
  id: number,
  status: 'success' | 'error',
  newFilings: number,
  errorMessage?: string,
): Promise<void> {
  await getDb(env)
    .update(syncRuns)
    .set({
      finishedAt: new Date().toISOString(),
      status,
      newFilings,
      errorMessage: errorMessage ?? null,
    })
    .where(eq(syncRuns.id, id))
    .execute();
}

const D1_IN_CLAUSE_LIMIT = 100;

export async function findExistingFilingIds(
  env: DbEnv,
  ids: string[],
): Promise<Set<string>> {
  if (ids.length === 0) return new Set();

  const db = getDb(env);
  const existing = new Set<string>();

  // Dividir en chunks de 100
  for (let i = 0; i < ids.length; i += D1_IN_CLAUSE_LIMIT) {
    const chunk = ids.slice(i, i + D1_IN_CLAUSE_LIMIT);
    const rows = await db
      .select({ id: filings.id })
      .from(filings)
      .where(inArray(filings.id, chunk))
      .all();

    for (const row of rows) existing.add(row.id);
  }

  return existing;
}

const FILINGS_COLUMNS = 7;
const FILINGS_BATCH_SIZE = batchSizeForColumns(FILINGS_COLUMNS);
// = floor(100 / 7) - 1 = 13

export async function insertFilings(
  env: DbEnv,
  rows: NewFiling[],
): Promise<string[]> {
  if (rows.length === 0) return [];

  const db = getDb(env);
  const inserted: string[] = [];

  for (const batch of chunk(rows, FILINGS_BATCH_SIZE)) {
    const result = await db
      .insert(filings)
      .values(batch)
      .onConflictDoNothing()
      .returning({ id: filings.id })
      .all();

    for (const r of result) inserted.push(r.id);
  }

  return inserted;
}

export async function markFilingParsed(
  env: DbEnv,
  filingId: string,
): Promise<void> {
  await getDb(env)
    .update(filings)
    .set({ parsed: true, parsedAt: new Date().toISOString() })
    .where(eq(filings.id, filingId))
    .execute();
}

export async function getRecentSyncRuns(
  env: DbEnv,
  limit = 10,
): Promise<SyncRun[]> {
  return getDb(env)
    .select()
    .from(syncRuns)
    .orderBy(syncRuns.id)
    .limit(limit)
    .all();
}
