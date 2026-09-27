import { getDb, type DbEnv } from '../../db/client';
import { politicians } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { extractText, getDocumentProxy } from 'unpdf';
import { parsePoliticianReport } from '../../pdf/parser';
import { insertTrades } from '../trade/queries';
import { markFilingParsed } from './queries';
import type { QueueMessage } from './types';
import { toIsoDate } from '../../lib/date';

type ProcessorEnv = DbEnv;

export async function processPdfMessage(
  msg: QueueMessage,
  env: ProcessorEnv,
): Promise<{ tradesInserted: number }> {
  const { filingId, politicianId, pdfUrl } = msg;

  // 1. Descargar PDF
  const res = await fetch(pdfUrl);
  if (!res.ok) throw new Error(`PDF download failed: ${res.status} ${pdfUrl}`);
  const buffer = new Uint8Array(await res.arrayBuffer());

  // 2. Extraer texto
  const pdf = await getDocumentProxy(buffer);
  const { text } = await extractText(pdf, { mergePages: true });

  // 3. Parsear
  const report = parsePoliticianReport(text);

  // 4. Guardar trades
  const now = new Date().toISOString();
  const rows = report.trades.map((t) => ({
    filingId,
    politicianId,
    asset: t.asset,
    ticker: t.ticker,
    assetType: t.assetType,
    transactionType: t.transactionType,
    transactionDate: toIsoDate(t.transactionDate),
    notificationDate: toIsoDate(report.signedDate),
    amount: t.amount,
    description: t.description,
    filingStatus: t.filingStatus,
    createdAt: now,
  }));

  await insertTrades(env, rows);
  await markFilingParsed(env, filingId);
  await getDb(env)
    .update(politicians)
    .set({ lastSync: now })
    .where(eq(politicians.id, politicianId))
    .execute();

  return { tradesInserted: rows.length };
}
