import { describe, it, expect } from "vitest";
import { parseVCardContacts } from "./scrapScanner";

describe("scrapScanner", () => {
  it("parseVCardContacts extrai FN, TEL e npub na NOTE", () => {
    const vcf = `BEGIN:VCARD
FN:Alice Test
TEL;TYPE=CELL:+5511999887766
NOTE:npub1l4h5qsn48sc8s77x9g8eec9scs97xsc8877l4h5qsn48sc8s77x9g8eec9scs97xsc8877aa
END:VCARD`;
    const rows = parseVCardContacts(vcf);
    expect(rows).toHaveLength(1);
    expect(rows[0].username).toBe("Alice Test");
    expect(rows[0].platformId).toContain("5511");
    expect(rows[0].nostrPubkey).toMatch(/^npub1/);
  });
});
