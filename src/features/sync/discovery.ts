import { getDb, type DbEnv } from '../../db/client';
import { politicians } from '../../db/schema';
import { parseHouseXml, normalizeName } from '../../lib/xml';
import { unzipSync, strFromU8 } from 'fflate';
import {
  createSyncRun,
  finishSyncRun,
  findExistingFilingIds,
  insertFilings,
} from './queries';
import type { QueueMessage, DiscoverResult } from './types';
import { chunk } from '../../lib/d1';

type SyncEnv = DbEnv & {
  PDF_QUEUE: Queue<QueueMessage>;
};

const QUEUE_BATCH_SIZE = 100;

export async function discoverNewFilings(env: SyncEnv): Promise<DiscoverResult> {
  const runId = await createSyncRun(env);
  const YEAR = new Date().getFullYear();
    const DEFAULT_ZIP_URL =
      `https://disclosures-clerk.house.gov/public_disc/financial-pdfs/${YEAR}FD.ZIP`;

    try {
      // 1. Descargar ZIP
      const zipUrl = DEFAULT_ZIP_URL;
      const res = await fetch(zipUrl);
      if (!res.ok) throw new Error(`ZIP download failed: ${res.status}`);
      const zipBuffer = new Uint8Array(await res.arrayBuffer());

      // 2. Descomprimir
      const unzipped = unzipSync(zipBuffer);
      const xmlKey = Object.keys(unzipped).find((k) => k.endsWith('.xml'));
      if (!xmlKey) throw new Error('No XML found in ZIP');
      const xmlText = strFromU8(unzipped[xmlKey]);

      // 3. Parsear XML
      const members = parseHouseXml(xmlText);
      const year = extractYearFromZipUrl(zipUrl);

      // 4. Cargar políticos y mapear nombre → id
      const db = getDb(env);
      const allPoliticians = await db.select().from(politicians).all();
      const nameToId = new Map(
        allPoliticians.map((p) => [normalizeName(p.fullname), p.id]),
      );

      // 5. Filtrar members que matchean nuestros políticos
      const matched = members
        .map((m) => ({
          member: m,
          politicianId: nameToId.get(normalizeName(m.name)),
        }))
        .filter(
          (x): x is { member: (typeof members)[number]; politicianId: string } =>
            Boolean(x.politicianId),
        );

      // 6. Preparar filas
      const now = new Date().toISOString();
      const rowsToInsert = matched.map((m) => ({
        id: m.member.filingId,
        politicianId: m.politicianId,
        filingDate: m.member.filingDate,
        pdfUrl: buildPdfUrl(m.member.filingId),
        parsed: false,
        parsedAt: null,
        createdAt: now,
      }));

      // 7. Insertar en batches — devuelve solo los IDs realmente insertados
      const insertedIds = await insertFilings(env, rowsToInsert);
      const insertedSet = new Set(insertedIds);

      // 8. Encolar solo los nuevos
      const messagesToQueue = rowsToInsert
        .filter((r) => insertedSet.has(r.id))
        .map((r) => ({
          body: {
            filingId: r.id,
            politicianId: r.politicianId,
            pdfUrl: r.pdfUrl,
          },
        }));

      for (const batch of chunk(messagesToQueue, QUEUE_BATCH_SIZE)) {
        await env.PDF_QUEUE.sendBatch(batch);
      }

      await finishSyncRun(env, runId, 'success', insertedIds.length);

      return {
        syncRunId: runId,
        newFilings: insertedIds.length,
        totalMembers: members.length,
        matchedPoliticians: matched.length,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await finishSyncRun(env, runId, 'error', 0, msg);
      throw err;
    }
}


function extractYearFromZipUrl(zipUrl: string): number {
  const match = zipUrl.match(/(\d{4})FD\.ZIP/i);
  return match ? parseInt(match[1], 10) : new Date().getFullYear();
}

function buildPdfUrl(filingId: string): string {
  const YEAR = new Date().getFullYear();

  // Los PDFs del House viven en /ptr-pdfs/<year>/<docId>.pdf
  // El año se puede derivar del ZIP (2026) o del filingDate.
  // Simplificación: usamos el año actual del ZIP.
  return `https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/${YEAR}/${filingId}.pdf`;
}
