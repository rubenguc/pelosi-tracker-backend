import { eq, asc } from 'drizzle-orm';
import { getDb, type DbEnv } from '../../db/client';
import { politicians } from '../../db/schema';
import type { Politician, NewPolitician } from '../../db/schema';
import { paginate } from '../../lib/paginations/paginate';
import { PaginatedResult, PaginationParams } from '../../lib/paginations/types';

/**
 * Insert a new politician (idempotent - ignores if exists)
 */
export async function insertPolitician(
  env: DbEnv,
  data: NewPolitician,
): Promise<void> {
  await getDb(env).insert(politicians).values(data).onConflictDoNothing().execute();
}

/**
 * Update last_sync for a politician
 */
export async function updatePoliticianLastSync(
  env: DbEnv,
  id: string,
  lastSync: string,
): Promise<void> {
  await getDb(env)
    .update(politicians)
    .set({ lastSync })
    .where(eq(politicians.id, id))
    .execute();
}

/**
 * Get all politicians ordered by fullname
 */
export async function getPoliticians(env: DbEnv,   params: PaginationParams): Promise<PaginatedResult<Politician>> {
  return paginate<Politician>(getDb(env), politicians, {
    params,
    orderBy: asc(politicians.fullname),
  });
}

/**
 * Get politician by ID
 */
export async function getPoliticianById(
  env: DbEnv,
  id: string,
): Promise<Politician | undefined> {
  return getDb(env)
    .select()
    .from(politicians)
    .where(eq(politicians.id, id))
    .get();
}

/**
 * Upsert politician - insert or update last_sync
 */
export async function upsertPolitician(
  env: DbEnv,
  data: NewPolitician,
): Promise<void> {
  await getDb(env)
    .insert(politicians)
    .values(data)
    .onConflictDoUpdate({
      target: politicians.id,
      set: { lastSync: data.lastSync, fullname: data.fullname },
    })
    .execute();
}
