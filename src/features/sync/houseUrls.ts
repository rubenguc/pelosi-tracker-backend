const HOUSE_BASE = 'https://disclosures-clerk.house.gov/public_disc';


export function getCurrentZip(): { year: number; zipUrl: string } {
  const year = new Date().getFullYear();
  return {
    year,
    zipUrl: `${HOUSE_BASE}/financial-pdfs/${year}FD.ZIP`,
  };
}

export function getPdfUrl(filingId: string, year: number): string {
  return `${HOUSE_BASE}/ptr-pdfs/${year}/${filingId}.pdf`;
}
