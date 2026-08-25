/**
 * VØID Phantom Harvester — Social Scraper Interface
 *
 * Interface unificada para scrapers de redes sociais.
 * Cada plataforma implementa esta interface.
 */

import type { SocialPlatform } from "../storage/contactDirectory";
export { buildSocialContact } from "./buildContact";

export interface SocialScrapedContact {
  platformId: string;
  username: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  followers?: number;
  links?: string[];
}

export interface ScraperAuth {
  token?: string;
  cookie?: string;
  apiKey?: string;
  username?: string;
  password?: string;
}

export interface SocialScraper {
  platform: SocialPlatform;
  isAvailable(): boolean;
  scrapeContacts(auth?: ScraperAuth): Promise<SocialScrapedContact[]>;
  searchUsers(query: string): Promise<SocialScrapedContact[]>;
}

// ─── Base class with common utilities ────────────────────────────────────────

export abstract class BaseSocialScraper implements SocialScraper {
  abstract platform: SocialPlatform;

  isAvailable(): boolean {
    return typeof fetch !== "undefined";
  }

  abstract scrapeContacts(auth?: ScraperAuth): Promise<SocialScrapedContact[]>;
  abstract searchUsers(query: string): Promise<SocialScrapedContact[]>;

  protected async fetchJSON<T>(url: string, headers?: Record<string, string>): Promise<T> {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36",
        Accept: "application/json",
        ...headers,
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return res.json();
  }

  protected async fetchHTML(url: string): Promise<string> {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36",
        Accept: "text/html",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return res.text();
  }

  protected extractNostrFromBio(bio: string): string | undefined {
    // Match npub1... in bio
    const npubMatch = bio.match(/npub1[a-z0-9]{58,}/i);
    if (npubMatch) return npubMatch[0];

    // Match nostr:npub1...
    const nostrMatch = bio.match(/nostr:(npub1[a-z0-9]{58,})/i);
    if (nostrMatch) return nostrMatch[1];

    return undefined;
  }

  protected extractLinksFromBio(bio: string): string[] {
    const urlRegex = /https?:\/\/[^\s<>"]+/gi;
    return bio.match(urlRegex) || [];
  }

  protected extractNostrFromLinks(links: string[]): string | undefined {
    for (const link of links) {
      // snort.social/npub1..., nostr.band/npub1..., primal.net/npub1...
      const match = link.match(/(?:snort\.social|nostr\.band|primal\.net|damus\.io)\/(npub1[a-z0-9]{58,})/i);
      if (match) return match[1];
    }
    return undefined;
  }
}
