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

export type Politician = typeof politicians.$inferSelect;
export type NewPolitician = typeof politicians.$inferInsert;
