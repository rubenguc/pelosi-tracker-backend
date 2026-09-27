export const D1_MAX_VARS = 100;

/**
 * Calcula el tamaño máximo de batch para un INSERT con N columnas.
 * Deja un margen de seguridad para no pegar justo en el límite.
 */
export function batchSizeForColumns(columns: number, margin = 1): number {
  return Math.max(1, Math.floor(D1_MAX_VARS / columns) - margin);
}

/**
 * Divide un array en chunks de tamaño `size`.
 */
export function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}
