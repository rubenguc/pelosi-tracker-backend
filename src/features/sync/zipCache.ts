export type ZipCheckResult =
  | { changed: false; lastModified: string }
  | { changed: true; lastModified: string; zipBuffer: Uint8Array };

/**
 * Checks if the ZIP at the given URL changed since `previousLastModified`.
 *
 * - Issues a HEAD request to read the Last-Modified header.
 * - If it matches the previous value, returns { changed: false }.
 * - Otherwise downloads the ZIP and returns { changed: true, zipBuffer }.
 *
 * If the server does not send Last-Modified, always downloads.
 */
export async function fetchZipIfChanged(
  zipUrl: string,
  previousLastModified: string | null,
): Promise<ZipCheckResult> {
  // 1. HEAD request to read headers only
  const head = await fetch(zipUrl, { method: 'HEAD' });
  if (!head.ok) {
    throw new Error(`HEAD ${zipUrl} failed: ${head.status}`);
  }

  const lastModified = head.headers.get('last-modified');

  // 2. No Last-Modified → always download
  if (!lastModified) {
    const full = await fetch(zipUrl);
    if (!full.ok) throw new Error(`GET ${zipUrl} failed: ${full.status}`);
    return {
      changed: true,
      lastModified: new Date().toISOString(),
      zipBuffer: new Uint8Array(await full.arrayBuffer()),
    };
  }

  // 3. Unchanged → skip download
  if (previousLastModified && previousLastModified === lastModified) {
    return { changed: false, lastModified };
  }

  // 4. Changed → download
  const full = await fetch(zipUrl);
  if (!full.ok) throw new Error(`GET ${zipUrl} failed: ${full.status}`);

  return {
    changed: true,
    lastModified,
    zipBuffer: new Uint8Array(await full.arrayBuffer()),
  };
}
