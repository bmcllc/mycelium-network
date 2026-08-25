/**
 * VØID Phantom Harvester — Orquestrador Principal
 *
 * Coordena todos os scrapers de redes sociais e corretoras,
 * mapeia contatos para Nostr, e exporta para o Messenger.
 */

import { assertOperationAllowed } from "../protocol/amp/consentLattice";
import { consentReceiptStore } from "../protocol/amp/consentReceiptStore";
import {
  contactDirectory,
  generateContactId,
  type HarvestedContact,
  type HarvestReport,
  type HarvestStats,
  type SocialPlatform,
} from "../storage/contactDirectory";
import type { SocialScraper, ScraperAuth } from "./socialScraper";
import type { ExchangeScraper, ExchangeTicker } from "./exchangeScraper";
import { buildHarvestedContact } from "./buildContact";
import { mapBatchToNostr } from "./identityMapper";
import { omitUndefined } from "../utils/omitUndefined";

// Social scrapers
import telegramScraper from "./social/telegramScraper";
import twitterScraper from "./social/twitterScraper";
import instagramScraper from "./social/instagramScraper";
import facebookScraper from "./social/facebookScraper";
import tumblrScraper from "./social/tumblrScraper";
import whatsappScraper from "./social/whatsappScraper";

// Exchange scrapers
import binanceScraper from "./exchanges/binanceScraper";
import coinbaseScraper from "./exchanges/coinbaseScraper";
import krakenScraper from "./exchanges/krakenScraper";
import bybitScraper from "./exchanges/bybitScraper";
import mercadoBitcoinScraper from "./exchanges/mercadoBitcoinScraper";

type ProgressCallback = (platform: SocialPlatform, status: string, current?: number, total?: number) => void;

export class PhantomHarvester {
  private socialScrapers: SocialScraper[];
  private exchangeScrapers: ExchangeScraper[];
  private listeners: Set<ProgressCallback> = new Set();

  constructor() {
    this.socialScrapers = [
      new telegramScraper(),
      new twitterScraper(),
      new instagramScraper(),
      new facebookScraper(),
      new tumblrScraper(),
      new whatsappScraper(),
    ];

    this.exchangeScrapers = [
      new binanceScraper(),
      new coinbaseScraper(),
      new krakenScraper(),
      new bybitScraper(),
      new mercadoBitcoinScraper(),
    ];
  }

  onProgress(cb: ProgressCallback): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private emit(platform: SocialPlatform, status: string, current?: number, total?: number) {
    for (const cb of this.listeners) {
      try {
        cb(platform, status, current, total);
      } catch {
        // ignore listener errors
      }
    }
  }

  // ── Harvest All ──

  /**
   * PMU §3.9: importação só iniciada pelo usuário (JSON/CSV).
   * Não faz scraping de terceiros.
   */
  async importContactsFromUserFile(
    rows: Array<{
      platform: SocialPlatform;
      platformId: string;
      username: string;
      nostrPubkey?: string;
    }>,
  ): Promise<number> {
    assertOperationAllowed(consentReceiptStore.getMaxLevel(), "legacy_import");
    let n = 0;
    for (const row of rows) {
      const id = generateContactId(row.platform, row.platformId);
      await contactDirectory.add(
        buildHarvestedContact({
          id,
          platform: row.platform,
          platformId: row.platformId,
          username: row.username,
          nostrPubkey: row.nostrPubkey,
          tags: ["user_import"],
          lastSeen: Date.now(),
          discoveredAt: Date.now(),
          source: "import",
          confidence: 1,
        }),
      );
      n++;
    }
    return n;
  }

  /**
   * @deprecated PMU proíbe scraping automático. Use importContactsFromUserFile.
   * Habilitado apenas com VITE_AMP_ALLOW_LEGACY_SCRAPE=true (dev) + consentimento nível 8+.
   */
  async harvestAll(auths?: Record<SocialPlatform, ScraperAuth>): Promise<HarvestReport[]> {
    assertOperationAllowed(consentReceiptStore.getMaxLevel(), "legacy_import");
    const allowScrape = import.meta.env.VITE_AMP_ALLOW_LEGACY_SCRAPE === "true";
    if (!allowScrape) {
      throw new Error(
        "LSA_PMU: scraping automático desativado. Importe JSON/CSV via importContactsFromUserFile " +
          "ou defina VITE_AMP_ALLOW_LEGACY_SCRAPE=true apenas em desenvolvimento.",
      );
    }

    const reports: HarvestReport[] = [];

    // Harvest social platforms
    for (const scraper of this.socialScrapers) {
      if (!scraper.isAvailable()) continue;
      this.emit(scraper.platform, "starting");
      try {
        const report = await this.harvestSocial(scraper, auths?.[scraper.platform]);
        reports.push(report);
      } catch (err) {
        reports.push({
          platform: scraper.platform,
          contactsFound: 0,
          newContacts: 0,
          updatedContacts: 0,
          nostrMapped: 0,
          durationMs: 0,
          errors: [String(err)],
        });
      }
    }

    // Harvest exchanges
    for (const scraper of this.exchangeScrapers) {
      if (!scraper.isAvailable()) continue;
      this.emit(scraper.platform, "starting");
      try {
        const report = await this.harvestExchange(scraper);
        reports.push(report);
      } catch (err) {
        reports.push({
          platform: scraper.platform,
          contactsFound: 0,
          newContacts: 0,
          updatedContacts: 0,
          nostrMapped: 0,
          durationMs: 0,
          errors: [String(err)],
        });
      }
    }

    return reports;
  }

  // ── Harvest Single Social Platform ──

  async harvestSocial(scraper: SocialScraper, auth?: ScraperAuth): Promise<HarvestReport> {
    const start = Date.now();
    const errors: string[] = [];
    let newContacts = 0;
    let updatedContacts = 0;

    try {
      const scraped = await scraper.scrapeContacts(auth);
      this.emit(scraper.platform, "scraped", scraped.length, scraped.length);

      const contacts: HarvestedContact[] = scraped.map((s) =>
        buildHarvestedContact({
          id: generateContactId(scraper.platform, s.platformId),
          platform: scraper.platform,
          platformId: s.platformId,
          username: s.displayName || s.username,
          avatar: s.avatar,
          bio: s.bio,
          followers: s.followers,
          links: s.links,
          tags: [],
          lastSeen: Date.now(),
          discoveredAt: Date.now(),
          source: "scraper",
          confidence: 0.5,
        }),
      );

      // Save to directory
      for (const contact of contacts) {
        const existing = await contactDirectory.get(contact.id);
        if (existing) {
          await contactDirectory.update(contact.id, {
            ...contact,
            tags: [...new Set([...existing.tags, ...contact.tags])],
          });
          updatedContacts++;
        } else {
          await contactDirectory.add(contact);
          newContacts++;
        }
      }

      // Try to map to Nostr
      this.emit(scraper.platform, "mapping", 0, contacts.length);
      const { mapped } = await mapBatchToNostr(contacts, (current, total) => {
        this.emit(scraper.platform, "mapping", current, total);
      });

      // Update directory with Nostr mappings
      for (const contact of contacts) {
        if (contact.nostrPubkey || contact.npub) {
          await contactDirectory.update(
            contact.id,
            omitUndefined({
              nostrPubkey: contact.nostrPubkey,
              npub: contact.npub,
              confidence: contact.confidence,
            }) as Partial<HarvestedContact>,
          );
        }
      }

      this.emit(scraper.platform, "done", contacts.length);

      return {
        platform: scraper.platform,
        contactsFound: contacts.length,
        newContacts,
        updatedContacts,
        nostrMapped: mapped,
        durationMs: Date.now() - start,
        errors,
      };
    } catch (err) {
      errors.push(String(err));
      return {
        platform: scraper.platform,
        contactsFound: 0,
        newContacts,
        updatedContacts,
        nostrMapped: 0,
        durationMs: Date.now() - start,
        errors,
      };
    }
  }

  // ── Harvest Single Exchange ──

  async harvestExchange(scraper: ExchangeScraper): Promise<HarvestReport> {
    const start = Date.now();
    const errors: string[] = [];
    let newContacts = 0;

    try {
      const pairs = await scraper.getTopPairs();
      this.emit(scraper.platform, "pairs", pairs.length, pairs.length);

      for (const pair of pairs) {
        try {
          const trades = await scraper.getRecentTrades(pair, 100);
          const contacts = scraper.tradesToContacts(trades);

          for (const contact of contacts) {
            const existing = await contactDirectory.get(contact.id);
            if (!existing) {
              await contactDirectory.add(contact);
              newContacts++;
            }
          }

          this.emit(scraper.platform, "trades", trades.length, pairs.length);
        } catch (err) {
          errors.push(`${pair}: ${err}`);
        }
      }

      this.emit(scraper.platform, "done", newContacts);

      return {
        platform: scraper.platform,
        contactsFound: newContacts,
        newContacts,
        updatedContacts: 0,
        nostrMapped: 0,
        durationMs: Date.now() - start,
        errors,
      };
    } catch (err) {
      errors.push(String(err));
      return {
        platform: scraper.platform,
        contactsFound: 0,
        newContacts: 0,
        updatedContacts: 0,
        nostrMapped: 0,
        durationMs: Date.now() - start,
        errors,
      };
    }
  }

  // ── Search ──

  async searchAll(query: string): Promise<HarvestedContact[]> {
    // Search local directory first
    const localResults = await contactDirectory.search(query);

    // Search social platforms in parallel
    const searchPromises = this.socialScrapers
      .filter((s) => s.isAvailable())
      .map(async (s) => {
        try {
          const results = await s.searchUsers(query);
          return results.map((r) =>
            buildHarvestedContact({
              id: generateContactId(s.platform, r.platformId),
              platform: s.platform,
              platformId: r.platformId,
              username: r.displayName || r.username,
              avatar: r.avatar,
              bio: r.bio,
              followers: r.followers,
              links: r.links,
              tags: [],
              lastSeen: Date.now(),
              discoveredAt: Date.now(),
              source: "scraper",
              confidence: 0.5,
            }),
          );
        } catch {
          return [];
        }
      });

    const remoteResults = (await Promise.all(searchPromises)).flat();

    // Merge and deduplicate
    const seen = new Set(localResults.map((c) => c.id));
    const merged = [...localResults];
    for (const contact of remoteResults) {
      if (!seen.has(contact.id)) {
        seen.add(contact.id);
        merged.push(contact);
      }
    }

    return merged;
  }

  // ── Get Tickers ──

  async getAllTickers(symbol: string): Promise<ExchangeTicker[]> {
    const tickers: ExchangeTicker[] = [];
    for (const scraper of this.exchangeScrapers) {
      if (!scraper.isAvailable()) continue;
      try {
        const ticker = await scraper.getTicker(symbol);
        tickers.push(ticker);
      } catch {
        // skip failed
      }
    }
    return tickers;
  }

  // ── Stats ──

  async getStats(): Promise<HarvestStats> {
    return contactDirectory.getStats();
  }

  // ── Export to Messenger ──

  async exportToMessenger(): Promise<void> {
    // Contacts with Nostr are already in the same Dexie instance
    // The Messenger's ContactList can read from contactDirectory
    const withNostr = await contactDirectory.getWithNostr();
    console.log(`[PhantomHarvester] ${withNostr.length} contacts with Nostr pubkey ready for Messenger`);
  }
}

// Singleton
export const phantomHarvester = new PhantomHarvester();
