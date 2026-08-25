import type { HarvestedContact } from "../storage/contactDirectory";
import type { SocialScrapedContact } from "./socialScraper";
import { omitUndefined } from "../utils/omitUndefined";

type LooseRecord = Record<string, unknown>;

/** Monta contacto com campos opcionais omitidos (exactOptionalPropertyTypes). */
export function buildHarvestedContact(data: LooseRecord): HarvestedContact {
  return omitUndefined(data) as unknown as HarvestedContact;
}

export function buildSocialContact(data: LooseRecord): SocialScrapedContact {
  return omitUndefined(data) as unknown as SocialScrapedContact;
}
