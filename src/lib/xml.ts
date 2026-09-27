export type HouseMember = {
  name: string;
  filingId: string;
  filingDate: string;
  stateDst: string;
  filingType: string;
};


export function parseHouseXml(xml: string): HouseMember[] {
  const members: HouseMember[] = [];
  const memberRegex = /<Member>([\s\S]*?)<\/Member>/g;
  let match: RegExpExecArray | null;

  while ((match = memberRegex.exec(xml)) !== null) {
    const block = match[1];
    const get = (tag: string) => {
      const m = block.match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
      return m ? m[1].trim() : '';
    };

    const filingType = get('FilingType');
    if (filingType !== 'P') continue;

    const first = get('First');
    const last = get('Last');
    const name = `${first} ${last}`.trim();
    const filingId = get('DocID');
    const filingDate = get('FilingDate');
    const stateDst = get('StateDst');

    if (name && filingId) {
      members.push({ name, filingId, filingDate, stateDst, filingType });
    }
  }

  return members;
}

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/^(hon\.|rep\.|sen\.|dr\.)\s+/i, '')
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
