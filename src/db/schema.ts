import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const politicians = sqliteTable(
  "politicians",
  {
    id: text("id").primaryKey(),
    fullname: text("fullname").notNull(),
    lastSync: text("last_sync"),
    isAvailableInBot: integer("is_available_in_bot", { mode: "boolean" })
      .default(false)
      .notNull(),
  },
  (table) => [
    index("idx_politicians_fullname").on(table.fullname),
    index("idx_politicians_available").on(table.isAvailableInBot),
  ],
);

export const trades = sqliteTable(
  "trades",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    politicianId: text("politician_id").notNull().references(() => politicians.id, { onDelete: "cascade" }),
    stock: text("stock").notNull(),
    transaction: text("transaction_type", { enum: ["P", "S"] }).notNull(),
    filed: text("filed").notNull(),
    traded: text("traded").notNull(),
    description: text("description").notNull(),
    amount: text("amount").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("idx_trades_politician_id").on(table.politicianId),
    index("idx_trades_filed").on(table.filed),
    index("idx_trades_traded").on(table.traded),
    index("idx_trades_stock").on(table.stock),
  ],
);

export type Politician = typeof politicians.$inferSelect;
export type NewPolitician = typeof politicians.$inferInsert;

export type Trade = typeof trades.$inferSelect;
export type NewTrade = typeof trades.$inferInsert;
