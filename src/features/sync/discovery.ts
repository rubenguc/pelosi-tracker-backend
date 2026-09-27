// src/features/sync/discovery.ts
import { getDb } from '../../db/client';
import { politicians } from '../../db/schema';
import { parseHouseXml, normalizeName } from '../../lib/xml';
import { unzipSync, strFromU8 } from 'fflate';
import { chunk } from '../../lib/d1';
import { toIsoDate } from '../../lib/date';
import type { Logger } from '../../lib/logger';
import { getCurrentZip, getPdfUrl } from './houseUrls';
import { fetchZipIfChanged } from './zipCache';
import {
  createSyncRun,
  finishSyncRun,
  insertFilings,
  getZipLastModified,
  setZipLastModified,
} from './queries';
import type { DiscoverResult } from './types';

const QUEUE_BATCH_SIZE = 100;

export async function discoverNewFilings(
  env: Env,
  log: Logger,
): Promise<DiscoverResult> {
  const runId = await createSyncRun(env);
  const { year, zipUrl } = getCurrentZip();

  log.info({ runId, year, zipUrl }, 'discovery started');

  try {
    // 1. Read the previous Last-Modified from the DB
    const previous = await getZipLastModified(env);
    log.debug({ previous }, 'checking ZIP cache');

    // 2. Check if the ZIP changed since the last run
    const check = await fetchZipIfChanged(zipUrl, previous);

    // 3. Early exit if nothing changed
    if (!check.changed) {
      log.info({ lastModified: check.lastModified }, 'ZIP unchanged, skipping');
      await finishSyncRun(env, runId, 'success', 0);
      return {
        syncRunId: runId,
        newFilings: 0,
        totalMembers: 0,
        matchedPoliticians: 0,
      };
    }

    log.info({ lastModified: check.lastModified }, 'ZIP changed, processing');

    // 4. Persist the new Last-Modified so the next run can skip
    await setZipLastModified(env, check.lastModified);

    // 5. Unzip the buffer returned by fetchZipIfChanged
    const unzipped = unzipSync(check.zipBuffer);
    const xmlKey = Object.keys(unzipped).find((k) => k.endsWith('.xml'));
    if (!xmlKey) throw new Error('No XML found in ZIP');
    const xmlText = strFromU8(unzipped[xmlKey]);
    log.debug({ xmlKey, chars: xmlText.length }, 'XML extracted');

    // 6. Parse the XML (only PTR filings are kept)
    const members = parseHouseXml(xmlText);
    if (members.length === 0) {
      throw new Error('XML parsed but no members found (corrupted ZIP?)');
    }
    log.info({ members: members.length, year }, 'XML parsed');

    // 7. Load politicians and build a name → id map
    const db = getDb(env);
    const allPoliticians = await db.select().from(politicians).all();
    const nameToId = new Map(
      allPoliticians.map((p) => [normalizeName(p.fullname), p.id]),
    );
    log.debug({ politicians: allPoliticians.length }, 'politicians loaded');

    // 8. Match XML members against our politicians
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

    // 9. Build rows to insert
    const now = new Date().toISOString();
    const rowsToInsert = matched.map((m) => ({
      id: m.member.filingId,
      politicianId: m.politicianId,
      filingDate: toIsoDate(m.member.filingDate) ?? m.member.filingDate,
      pdfUrl: getPdfUrl(m.member.filingId, year),
      parsed: false,
      parsedAt: null,
      createdAt: now,
    }));

    // 10. Insert in batches — returns only the actually inserted IDs
    const insertedIds = await insertFilings(env, rowsToInsert);
    const insertedSet = new Set(insertedIds);
    log.info(
      { candidates: rowsToInsert.length, inserted: insertedIds.length },
      'filings inserted',
    );

    // 11. Enqueue only the new filings
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

    await finishSyncRun(env, runId, 'success', insertedIds.length);
    log.info(
      { runId, newFilings: insertedIds.length },
      'discovery completed',
    );

    return {
      syncRunId: runId,
      newFilings: insertedIds.length,
      totalMembers: members.length,
      matchedPoliticians: matched.length,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await finishSyncRun(env, runId, 'error', 0, msg);
    log.error({ err, runId }, 'discovery failed');
    throw err;
  }
}
