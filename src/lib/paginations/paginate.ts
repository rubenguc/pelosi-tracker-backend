import { count, and, type SQL } from 'drizzle-orm';
import type { SQLiteTable } from 'drizzle-orm/sqlite-core';
import type { Db } from '../../db/client';
import type { PaginationParams, PaginatedResult } from './types';

type PaginateOptions = {
  /** Filtros WHERE (opcional). Puede ser un SQL suelto o un array que se combina con AND. */
  where?: SQL | SQL[];
  /** Orden (opcional). Si no se pasa, SQLite devuelve en orden físico. */
  orderBy?: SQL;
  /** Parámetros de paginación. Requerido. */
  params: PaginationParams;
};

/**
 * Ejecuta una query paginada con filtros y orden opcionales.
 *
 * @example
 *   // Sin filtros
 *   await paginate(db, politicians, { params });
 *
 *   // Con orden
 *   await paginate(db, politicians, {
 *     params,
 *     orderBy: asc(politicians.fullname),
 *   });
 *
 *   // Con filtro
 *   await paginate(db, trades, {
 *     params,
 *     where: eq(trades.politicianId, id),
 *     orderBy: desc(trades.transactionDate),
 *   });
 *
 *   // Con múltiples filtros (se combinan con AND)
 *   await paginate(db, trades, {
 *     params,
 *     where: [
 *       eq(trades.politicianId, id),
 *       eq(trades.ticker, 'AAPL'),
 *     ],
 *     orderBy: desc(trades.transactionDate),
 *   });
 */
export async function paginate<T>(
  db: Db,
  table: SQLiteTable,
  opts: PaginateOptions,
): Promise<PaginatedResult<T>> {
  const { where, orderBy, params } = opts;

  // 1. Normalizar where a un solo SQL (o undefined)
  const whereClause = normalizeWhere(where);

  // 2. Count
  const countQuery = db.select({ value: count() }).from(table);
  if (whereClause) countQuery.where(whereClause);
  const [totalRow] = await countQuery;
  const total = totalRow?.value ?? 0;

  // 3. Data
  const dataQuery = db.select().from(table);
  if (whereClause) dataQuery.where(whereClause);
  if (orderBy) dataQuery.orderBy(orderBy);
  const data = (await dataQuery.limit(params.limit).offset(params.offset)) as T[];

  // 4. Metadata
  return buildPaginatedResult(data, total, params);
}

function normalizeWhere(where?: SQL | SQL[]): SQL | undefined {
  if (!where) return undefined;
  if (Array.isArray(where)) {
    const valid = where.filter((w): w is SQL => w !== undefined);
    if (valid.length === 0) return undefined;
    if (valid.length === 1) return valid[0];
    return and(...valid);
  }
  return where;
}

function buildPaginatedResult<T>(
  data: T[],
  total: number,
  params: PaginationParams,
): PaginatedResult<T> {
  const totalPages = total === 0 ? 1 : Math.ceil(total / params.limit);
  return {
    data,
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages,
      hasNext: params.page < totalPages,
      hasPrev: params.page > 1,
    },
  };
}
