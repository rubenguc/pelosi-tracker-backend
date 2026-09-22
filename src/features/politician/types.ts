/**
 * Politician feature types
 * Represents a politician who files Periodic Transaction Reports (FilingType P)
 */

export interface Politician {
  /** Bioguide ID from legislators-current.json */
  id: string;
  /** Full official name from legislators-current.json (name.official_full) */
  fullname: string;
  /** ISO timestamp of last successful sync */
  last_sync: string;
  /** Whether this politician is available in Telegram bot (stored as 0/1 in DB, mapped to boolean) */
  is_available_in_bot: boolean;
}

/**
 * Raw member from House Clerk XML (2026FD.xml)
 */
export interface HouseClerkMember {
  Prefix: string;
  Last: string;
  First: string;
  Suffix: string;
  FilingType: string;
  StateDst: string;
  Year: string;
  FilingDate: string;
  DocID: string;
}

/**
 * Raw legislator from legislators-current.json
 */
export interface Legislator {
  id: {
    bioguide: string;
    thomas?: string;
    lis?: string;
    govtrack?: number;
    opensecrets?: string;
    votesmart?: number;
    fec?: string[];
    cspan?: number;
    wikipedia?: string;
    house_history?: number;
    ballotpedia?: string;
    maplight?: number;
    icpsr?: number;
    wikidata?: string;
    google_entity_id?: string;
    pictorial?: number;
  };
  name: {
    first: string;
    middle?: string;
    last: string;
    nickname?: string;
    official_full: string;
  };
  bio: {
    birthday: string;
    gender: 'M' | 'F';
  };
  terms: Array<{
    type: 'rep' | 'sen';
    start: string;
    end: string;
    state: string;
    district?: number;
    class?: number;
    party: string;
    url?: string;
    address?: string;
    phone?: string;
    fax?: string;
    contact_form?: string;
    office?: string;
    state_rank?: string;
    rss_url?: string;
    caucus?: string;
    how?: string;
  }>;
  leadership_roles?: Array<{
    title: string;
    chamber: string;
    start: string;
    end?: string;
  }>;
}