import { eq, asc } from 'drizzle-orm';
import { getDb } from '../../db/client';
import { politicians } from '../../db/schema';
import type { Politician, NewPolitician } from '../../db/schema';
import { paginate } from '../../lib/paginations/paginate';
import { PaginatedResult, PaginationParams } from '../../lib/paginations/types';


export async function insertPolitician(
  env: Env,
  data: NewPolitician,
): Promise<void> {
  await getDb(env).insert(politicians).values(data).onConflictDoNothing().execute();
}

export async function updatePoliticianLastSync(
  env: Env,
  id: string,
  lastSync: string,
): Promise<void> {
  await getDb(env)
    .update(politicians)
    .set({ lastSync })
    .where(eq(politicians.id, id))
    .execute();
}

export async function getPoliticians(env: Env,   params: PaginationParams): Promise<PaginatedResult<Politician>> {
  return paginate<Politician>(getDb(env), politicians, {
    params,
    orderBy: asc(politicians.fullname),
  });
}

export async function getPoliticianById(
  env: Env,
  id: string,
): Promise<Politician | undefined> {
  return getDb(env)
    .select()
    .from(politicians)
    .where(eq(politicians.id, id))
    .get();
}

export async function upsertPolitician(
  env: Env,
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
