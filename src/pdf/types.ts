
export type ParsedTrade = {
  asset: string;
  ticker: string | null;
  assetType: string | null;
  transactionType: string;
  transactionDate: string;
  notificationDate: string | null;
  amount: string;
  description: string;
  filingStatus: string;
};

export type ParsedReport = {
  filingId: string | null;
  signedBy: string | null;
  signedDate: string | null;
  trades: ParsedTrade[];
};
