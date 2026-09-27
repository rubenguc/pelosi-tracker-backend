export type QueueMessage = {
  filingId: string;
  politicianId: string;
  pdfUrl: string;
};

export type DiscoverResult = {
  syncRunId: number;
  newFilings: number;
  totalMembers: number;
  matchedPoliticians: number;
};
