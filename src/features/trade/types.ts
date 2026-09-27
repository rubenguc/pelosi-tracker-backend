/**
 * Trade feature types
 * Represents a stock trade filed by a politician via Periodic Transaction Reports (FilingType P)
 */

export type TransactionType = "P" | "S";

export interface Trade {
  /** Auto-incrementing primary key */
  id: number;
  /** Foreign key to politicians table */
  politicianId: string;
  /** Stock ticker symbol (e.g., "AAPL", "MSFT") */
  stock: string;
  /** Transaction type: P = Purchase, S = Sale */
  transaction: TransactionType;
  /** Date the trade was filed (ISO string) */
  filed: string;
  /** Date the trade was executed (ISO string) */
  traded: string;
  /** Description of the trade (e.g., "Apple Inc. - Common Stock") */
  description: string;
  /** Amount range as reported (e.g., "$1,001 - $15,000") */
  amount: string;
  /** Timestamp when record was created (ISO string) */
  createdAt: string;
}

/**
 * Raw transaction data from House Clerk XML for a trade entry
 */
export interface HouseClerkTransaction {
  /** The politician's DocID from the filing */
  DocID: string;
  /** Transaction type: P or S */
  Transaction: string;
  /** Asset name/ticker */
  Asset: string;
  /** Transaction date (traded) */
  TransDate: string;
  /** Filing date */
  FilingDate: string;
  /** Description of the asset */
  Description: string;
  /** Amount range */
  Amount: string;
  /** Owner (Self, Spouse, Joint, etc.) */
  Owner: string;
  /** Ticker symbol if available */
  Ticker?: string;
}

/**
 * Input for creating a new trade (without auto-generated fields)
 */
export interface CreateTradeInput {
  politicianId: string;
  stock: string;
  transaction: TransactionType;
  filed: string;
  traded: string;
  description: string;
  amount: string;
}