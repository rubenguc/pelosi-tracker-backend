import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const politicians = sqliteTable('politicians', {
  id: text('id').primaryKey(),
  fullname: text('fullname').notNull(),
  lastSync: text('last_sync'),
  isAvailableInBot: integer('is_available_in_bot', { mode: 'boolean' })
    .default(false)
    .notNull(),
});

export const filings = sqliteTable(
  'filings',
  {
    id: text('id').primaryKey(),
    politicianId: text('politician_id')
      .notNull()
      .references(() => politicians.id),
    filingDate: text('filing_date').notNull(),
    pdfUrl: text('pdf_url').notNull(),
    parsed: integer('parsed', { mode: 'boolean' }).default(false).notNull(),
    parsedAt: text('parsed_at'),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    index('idx_filings_politician').on(table.politicianId),
    index('idx_filings_parsed').on(table.parsed),
    index('idx_filings_date').on(table.filingDate),
  ],
);

export const trades = sqliteTable(
  'trades',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    filingId: text('filing_id')
      .notNull()
      .references(() => filings.id),
    politicianId: text('politician_id')
      .notNull()
      .references(() => politicians.id),
    asset: text('asset').notNull(),
    ticker: text('ticker'),
    assetType: text('asset_type'),
    transactionType: text('transaction_type').notNull(),
    transactionDate: text('transaction_date').notNull(),
    notificationDate: text('notification_date'),
    amount: text('amount'),
    description: text('description'),
    filingStatus: text('filing_status'),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    index('idx_trades_politician').on(table.politicianId),
    index('idx_trades_filing').on(table.filingId),
    index('idx_trades_ticker').on(table.ticker),
    index('idx_trades_date').on(table.transactionDate),
  ],
);

export const syncRuns = sqliteTable('sync_runs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  startedAt: text('started_at').notNull(),
  finishedAt: text('finished_at'),
  status: text('status').notNull(),               // 'running' | 'success' | 'error'
  newFilings: integer('new_filings').default(0),
  errorMessage: text('error_message'),
});

export type Politician = typeof politicians.$inferSelect;
export type NewPolitician = typeof politicians.$inferInsert;
export type Filing = typeof filings.$inferSelect;
export type NewFiling = typeof filings.$inferInsert;
export type Trade = typeof trades.$inferSelect;
export type NewTrade = typeof trades.$inferInsert;
export type SyncRun = typeof syncRuns.$inferSelect;
