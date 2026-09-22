import { ParsedReport, ParsedTrade } from "./types";

function cleanPdfText(raw: string): string {
  let text = raw.replace(/\x00/g, "");

  // 1. Unir amounts partidos entre líneas: "$50,001 -\n$100,000" → "$50,001 - $100,000"
  text = text.replace(/(\$[\d,]+)\s*-\s*\n\s*(\$[\d,]+)/g, "$1 - $2");

  // 2. Unir assets partidos:
  //    Línea que no termina en "]" ni en ":" ni en "."
  //    seguida de línea que empieza con mayúscula y contiene "[XX]"
  text = text.replace(
    /([A-Za-z0-9,\.\s-]+)\n([A-Z][A-Za-z0-9,\.\s-]*\([A-Z]+\)\s*\[[A-Z]+\])/g,
    "$1 $2",
  );

  // 3. Normalizar saltos y espacios
  return text
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 0)
    .join("\n");
}

export function parsePoliticianReport(rawText: string): ParsedReport {
  const text = cleanPdfText(rawText);

  // --- Filing ID ---
  const filingIdMatch = text.match(/Filing ID #\s*(\d+)/i);
  const filingId = filingIdMatch ? filingIdMatch[1] : null;

  // --- Firma ---
  const signedMatch = text.match(
    /Digitally Signed:\s*(.+?)\s*,\s*(\d{2}\/\d{2}\/\d{4})/i,
  );
  const signedBy = signedMatch ? signedMatch[1].trim() : null;
  const signedDate = signedMatch ? signedMatch[2] : null;

  // --- Acotar a la sección de transacciones ---
  const txStart = text.search(/ID\s*Owner\s*Asset/i);
  const txEnd = text.search(/\*\s*For the complete list/i);

  let txText =
    txStart !== -1 && txEnd !== -1 && txEnd > txStart
      ? text.slice(txStart, txEnd)
      : text;

  // --- Eliminar headers repetidos y artefactos ---
  txText = txText
    .replace(
      /ID\s*Owner\s*Asset\s*Transaction\s*Type\s*Date\s*Notification\s*Date\s*Amount\s*Cap\.?\s*Gains\s*>\s*\$?200\??/gi,
      "",
    )
    .replace(/Filing ID #\d+/gi, "")
    .replace(/^\s*\d{1,2}\/\d{1,2}\/\d{2,4}\.?\s*$/gm, "");

  // --- Aplanar a una sola línea ---
  const flat = txText.replace(/\n/g, " ").replace(/\s+/g, " ").trim();

  // --- Dividir por "SP " ---
  const blocks = flat
    .split(/(?=\bSP\s)/)
    .map((b) => b.trim())
    .filter((b) => b.startsWith("SP "));

  const trades: ParsedTrade[] = [];

  for (const block of blocks) {
    // --- 1. Encontrar el sufijo del asset: (TICKER) [TYPE] ---
    const tickerMatch = block.match(/\([A-Z\.]+\)\s*\[[A-Z]+\]/);
    if (!tickerMatch) continue;

    const tickerIndex = tickerMatch.index!;
    const tickerEnd = tickerIndex + tickerMatch[0].length;

    // --- 2. Transaction type + fechas + amount ---
    const txMatch = block.match(
      /\b(P|S(?:\s*\(partial\))?|E)\s+(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})\s+(\$[\d,]+(?:\.\d+)?)(?:\s*-\s*(\$[\d,]+(?:\.\d+)?))?/,
    );
    if (!txMatch) continue;

    const transactionType = txMatch[1].replace(/\s+/g, " ").trim();
    const transactionDate = txMatch[2];
    const notificationDate = txMatch[3];
    const amountFirst = txMatch[4];        // ej: "$250,001" o "$50,001"
    const amountSecond = txMatch[5] ?? null; // ej: "$500,000" o null

    const txIndex = txMatch.index!;
    const txEndIdx = txIndex + txMatch[0].length;

    // --- 3. Reconstruir el ASSET ---
    const assetStart = block.indexOf("SP ") + 3;

    let asset: string;
    if (tickerIndex > txIndex) {
      // CASO B: el ticker está después del tx → asset partido
      const assetPart1 = block.slice(assetStart, txIndex).trim();
      const assetPart2 = block.slice(txEndIdx, tickerEnd).trim();
      asset = `${assetPart1} ${assetPart2}`.replace(/\s+/g, " ").trim();
    } else {
      // CASO A: el ticker está antes del tx → asset completo antes del tipo
      const assetEnd = block.indexOf(txMatch[0]);
      asset = block.slice(assetStart, assetEnd).replace(/\s+/g, " ").trim();
    }

    // --- 4. Reconstruir el AMOUNT ---
    let amount: string;
    if (amountSecond) {
      // El regex ya capturó el rango completo
      amount = `${amountFirst} - ${amountSecond}`;
    } else if (tickerIndex > txIndex) {
      // CASO B: el amount está partido, la segunda mitad está después del ticker
      const afterTicker = block.slice(tickerEnd);
      const secondMatch = afterTicker.match(/\$[\d,]+(?:\.\d+)?/);
      amount = secondMatch
        ? `${amountFirst} - ${secondMatch[0]}`
        : amountFirst;
    } else {
      // CASO A sin rango: solo un monto (ej. "$15.00")
      amount = amountFirst;
    }

    // --- 5. Filing status ---
    const statusMatch = block.match(
      /(?:F\s*S|FILING STATUS|Filing Status):\s*([A-Za-z]+)/i,
    );
    const filingStatus = statusMatch ? statusMatch[1].trim() : "New";

    // --- 6. Description ---
    const descMatch = block.match(
      /(?:D|DESCRIPTION|Description):\s*([\s\S]*?)(?=\s*SP\s|$)/i,
    );
    const description = descMatch
      ? descMatch[1].replace(/\s+/g, " ").trim()
      : "";

    const tickerMatch2 = asset.match(/\(([A-Z\.]+)\)\s*\[([A-Z]+)\]/);
    const ticker = tickerMatch2 ? tickerMatch2[1] : null;
    const assetType = tickerMatch2 ? tickerMatch2[2] : null;

    trades.push({
      asset,
      ticker,
      assetType,
      transactionType,
      transactionDate,
      notificationDate,
      amount,
      description,
      filingStatus,
    });
  }

  return { filingId, signedBy, signedDate, trades };
}
