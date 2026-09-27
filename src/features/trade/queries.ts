import { asc, desc, eq } from 'drizzle-orm';
import { getDb } from '../../db/client';
import { trades } from '../../db/schema';
import type { NewTrade } from '../../db/schema';
import { batchSizeForColumns, chunk } from '../../lib/d1';
import { PaginatedResult, PaginationParams } from '../../lib/paginations/types';
import { Trade } from './types';
import { paginate } from '../../lib/paginations/paginate';

const TRADES_COLUMNS = 13;
const TRADES_BATCH_SIZE = batchSizeForColumns(TRADES_COLUMNS);

export async function insertTrades(
  env: Env,
  rows: NewTrade[],
): Promise<void> {
  if (rows.length === 0) return;

  const db = getDb(env);

  for (const batch of chunk(rows, TRADES_BATCH_SIZE)) {
    await db.insert(trades).values(batch).execute();
  }
}

export async function getTradesByPolitician(
  env: Env,
  politicianId: string,
  params: PaginationParams,
): Promise<PaginatedResult<Trade>> {
  return paginate<Trade>(getDb(env), trades, {
    params,
    where: eq(trades.politicianId, politicianId),
    orderBy: [desc(trades.notificationDate), desc(trades.transactionDate), asc(trades.ticker)],
  });
}
