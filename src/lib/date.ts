export function toIsoDate(mmDdYyyy: string | null | undefined): string | null {
  if (!mmDdYyyy) return null;

  const m = mmDdYyyy.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;

  const [, mm, dd, yyyy] = m;
  const month = mm.padStart(2, '0');
  const day = dd.padStart(2, '0');
  return `${yyyy}-${month}-${day}`;
}
