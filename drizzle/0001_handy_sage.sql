CREATE TABLE `filings` (
	`id` text PRIMARY KEY NOT NULL,
	`politician_id` text NOT NULL,
	`filing_date` text NOT NULL,
	`pdf_url` text NOT NULL,
	`parsed` integer DEFAULT false NOT NULL,
	`parsed_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`politician_id`) REFERENCES `politicians`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_filings_politician` ON `filings` (`politician_id`);--> statement-breakpoint
CREATE INDEX `idx_filings_parsed` ON `filings` (`parsed`);--> statement-breakpoint
CREATE INDEX `idx_filings_date` ON `filings` (`filing_date`);--> statement-breakpoint
CREATE TABLE `sync_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`started_at` text NOT NULL,
	`finished_at` text,
	`status` text NOT NULL,
	`new_filings` integer DEFAULT 0,
	`error_message` text
);
--> statement-breakpoint
CREATE TABLE `trades` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`filing_id` text NOT NULL,
	`politician_id` text NOT NULL,
	`asset` text NOT NULL,
	`ticker` text,
	`asset_type` text,
	`transaction_type` text NOT NULL,
	`transaction_date` text NOT NULL,
	`notification_date` text,
	`amount` text,
	`description` text,
	`filing_status` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`filing_id`) REFERENCES `filings`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`politician_id`) REFERENCES `politicians`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_trades_politician` ON `trades` (`politician_id`);--> statement-breakpoint
CREATE INDEX `idx_trades_filing` ON `trades` (`filing_id`);--> statement-breakpoint
CREATE INDEX `idx_trades_ticker` ON `trades` (`ticker`);--> statement-breakpoint
CREATE INDEX `idx_trades_date` ON `trades` (`transaction_date`);--> statement-breakpoint
DROP INDEX `idx_politicians_fullname`;--> statement-breakpoint
DROP INDEX `idx_politicians_available`;