/**
 * Twitter/X Scraper — VØID Phantom Harvester
 *
 * Uses Nitter instances for scraping public profiles and search results.
 * Looks for npub1... identifiers in bios and profile links.
 */

import { BaseSocialScraper, type SocialScrapedContact, type ScraperAuth } from "../socialScraper.ts";
import type { SocialPlatform } from "../../storage/contactDirectory.ts";
import { buildSocialContact } from "../buildContact";

const NITTER_INSTANCES = [
  "nitter.privacydev.net",
  "nitter.poast.org",
  "nitter.net",
];

export default class TwitterScraper extends BaseSocialScraper {
  platform: SocialPlatform = "x";

  async scrapeContacts(auth?: ScraperAuth): Promise<SocialScrapedContact[]> {
    try {
      const query = auth?.username;
      if (!query) return [];
      return await this.searchUsers(query);
    } catch {
      return [];
    }
  }

  async searchUsers(query: string): Promise<SocialScrapedContact[]> {
    for (const nitter of NITTER_INSTANCES) {
      try {
        const html = await this.fetchHTML(`https://${nitter}/search?q=${encodeURIComponent(query)}&f=user`);
        return this.parseSearchResults(html);
      } catch {
        continue;
      }
    }
    return [];
  }

  async fetchProfile(handle: string): Promise<SocialScrapedContact | undefined> {
    for (const nitter of NITTER_INSTANCES) {
      try {
        const html = await this.fetchHTML(`https://${nitter}/${handle}`);
        return this.parseProfile(html, handle);
      } catch {
        continue;
      }
    }
    return undefined;
  }

  private parseSearchResults(html: string): SocialScrapedContact[] {
    const contacts: SocialScrapedContact[] = [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const userCards = doc.querySelectorAll(".timeline-item");

    for (const card of userCards) {
      const handleEl = card.querySelector(".username");
      const displayNameEl = card.querySelector(".fullname");
      const avatarEl = card.querySelector(".avatar img");
      const bioEl = card.querySelector(".tweet-content");
      const followersEl = card.querySelector(".icon-container + span");

      const rawHandle = handleEl?.textContent?.trim() ?? "";
      const handle = rawHandle.replace(/^@/, "");
      if (!handle) continue;

      const displayName = displayNameEl?.textContent?.trim() ?? handle;
      const avatar = avatarEl?.getAttribute("src")
        ? `https:${avatarEl.getAttribute("src")}`
        : undefined;
      const bio = bioEl?.textContent?.trim() ?? "";
      const followersText = followersEl?.textContent?.trim().replace(/[^0-9kKmM.]/g, "") ?? "";
      const followers = this.parseFollowerCount(followersText);

      const links = this.extractLinksFromBio(bio);

      contacts.push(buildSocialContact({
        platformId: handle,
        username: handle,
        displayName,
        avatar,
        bio,
        followers,
        links,
      }));
    }

    return contacts;
  }

  private parseProfile(html: string, handle: string): SocialScrapedContact | undefined {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const displayNameEl = doc.querySelector(".profile-card-fullname");
    const avatarEl = doc.querySelector(".profile-card-avatar img");
    const bioEl = doc.querySelector(".profile-bio");
    const followersEl = doc.querySelector(".profile-statnum");

    const displayName = displayNameEl?.textContent?.trim() ?? handle;
    const avatar = avatarEl?.getAttribute("src")
      ? `https:${avatarEl.getAttribute("src")}`
      : undefined;
    const bio = bioEl?.textContent?.trim() ?? "";
    const followersText = followersEl?.textContent?.trim().replace(/[^0-9kKmM.]/g, "") ?? "";
    const followers = this.parseFollowerCount(followersText);
    const links = this.extractLinksFromBio(bio);

    return buildSocialContact({
      platformId: handle,
      username: handle,
      displayName,
      avatar,
      bio,
      followers,
      links,
    });
  }

  private parseFollowerCount(text: string): number | undefined {
    if (!text) return undefined;
    const num = parseFloat(text.replace(/[kK]/, "e3").replace(/[mM]/, "e6"));
    return isNaN(num) ? undefined : Math.round(num);
  }
}
