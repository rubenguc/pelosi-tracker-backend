import { getDb } from "../../db/client";
import { politicians } from "../../db/schema";
import { parseHouseXml, normalizeName } from "../../lib/xml";
import { unzipSync, strFromU8 } from "fflate";
import { createSyncRun, finishSyncRun, insertFilings } from "./queries";
import type {  DiscoverResult } from "./types";
import { chunk } from "../../lib/d1";
import { Logger } from "../../lib/logger";

const QUEUE_BATCH_SIZE = 100;

export async function discoverNewFilings(
  env: Env,
  log: Logger,
): Promise<DiscoverResult> {
  const runId = await createSyncRun(env);
  log.info({ runId }, "discovery started");

  const YEAR = new Date().getFullYear();
  const DEFAULT_ZIP_URL = `https://disclosures-clerk.house.gov/public_disc/financial-pdfs/${YEAR}FD.ZIP`;

  try {
    // 1. Download ZIP
    const zipUrl = DEFAULT_ZIP_URL;
    log.debug({ zipUrl }, 'downloading ZIP');
    const res = await fetch(zipUrl);
    if (!res.ok) throw new Error(`ZIP download failed: ${res.status}`);
    const zipBuffer = new Uint8Array(await res.arrayBuffer());
    log.debug({ bytes: zipBuffer.byteLength }, 'ZIP downloaded');


    // 2. Unzip
    const unzipped = unzipSync(zipBuffer);
    const xmlKey = Object.keys(unzipped).find((k) => k.endsWith(".xml"));
    if (!xmlKey) throw new Error("No XML found in ZIP");
    const xmlText = strFromU8(unzipped[xmlKey]);
    log.debug({ xmlKey, chars: xmlText.length }, 'XML extracted');


    // 3. Parse XML
    const members = parseHouseXml(xmlText);
    log.info({ members: members.length, YEAR }, 'XML parsed');


    // 4. Load politicians and build name → id map
    const db = getDb(env);
    const allPoliticians = await db.select().from(politicians).all();
    const nameToId = new Map(
      allPoliticians.map((p) => [normalizeName(p.fullname), p.id]),
    );
    log.debug({ politicians: allPoliticians.length }, 'politicians loaded');


    // 5. Match members against our politicians
    const matched = members
      .map((m) => ({
        member: m,
        politicianId: nameToId.get(normalizeName(m.name)),
      }))
      .filter(
        (x): x is { member: (typeof members)[number]; politicianId: string } =>
          Boolean(x.politicianId),
      );
    log.info({ matched: matched.length }, 'members matched');


    // 6. Preparar filas
    const now = new Date().toISOString();
    const rowsToInsert = matched.map((m) => ({
      id: m.member.filingId,
      politicianId: m.politicianId,
      filingDate: m.member.filingDate,
      pdfUrl: buildPdfUrl(m.member.filingId, YEAR),
      parsed: false,
      parsedAt: null,
      createdAt: now,
    }));

    // 7. Insertar en batches — devuelve solo los IDs realmente insertados
    const insertedIds = await insertFilings(env, rowsToInsert);
    const insertedSet = new Set(insertedIds);
    log.info(
        { candidates: rowsToInsert.length, inserted: insertedIds.length },
        'filings inserted',
      );

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
    log.info({ queued: messagesToQueue.length }, 'filings enqueued');


    await finishSyncRun(env, runId, "success", insertedIds.length);
    log.info({ runId, newFilings: insertedIds.length }, 'discovery completed');

    return {
      syncRunId: runId,
      newFilings: insertedIds.length,
      totalMembers: members.length,
      matchedPoliticians: matched.length,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await finishSyncRun(env, runId, "error", 0, msg);
    log.error({ err, runId }, 'discovery failed');
    throw err;
  }
}

function buildPdfUrl(filingId: string, year: number): string {
  // Los PDFs del House viven en /ptr-pdfs/<year>/<docId>.pdf
  return `https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/${year}/${filingId}.pdf`;
}
