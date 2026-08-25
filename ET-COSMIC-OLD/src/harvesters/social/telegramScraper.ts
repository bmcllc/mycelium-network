/**
 * Telegram Scraper — VØID Phantom Harvester
 *
 * Scrapes public Telegram groups and user profiles via t.me/s/ HTML pages.
 * Looks for npub1... identifiers in bios.
 */

import { BaseSocialScraper, type SocialScrapedContact, type ScraperAuth } from "../socialScraper.ts";
import type { SocialPlatform } from "../../storage/contactDirectory.ts";
import { buildSocialContact } from "../buildContact";

export default class TelegramScraper extends BaseSocialScraper {
  platform: SocialPlatform = "telegram";

  async scrapeContacts(auth?: ScraperAuth): Promise<SocialScrapedContact[]> {
    try {
      const group = auth?.username;
      if (!group) return [];

      const html = await this.fetchHTML(`https://t.me/s/${group}`);
      return this.parseGroupMembers(html);
    } catch {
      return [];
    }
  }

  async searchUsers(query: string): Promise<SocialScrapedContact[]> {
    try {
      const html = await this.fetchHTML(`https://t.me/${query}`);
      const contact = this.parseProfile(html, query);
      return contact ? [contact] : [];
    } catch {
      return [];
    }
  }

  private parseGroupMembers(html: string): SocialScrapedContact[] {
    const contacts: SocialScrapedContact[] = [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const messageBlocks = doc.querySelectorAll(".tgme_widget_message_wrap");
    const seen = new Set<string>();

    for (const block of messageBlocks) {
      const authorEl = block.querySelector(".tgme_widget_message_author_name");
      if (!authorEl) continue;

      const username = authorEl.getAttribute("href")?.replace("https://t.me/", "")?.replace(/^@/, "") ?? "";
      if (!username || seen.has(username)) continue;
      seen.add(username);

      const displayName = authorEl.textContent?.trim() ?? username;
      const avatarEl = block.querySelector(".tgme_widget_message_user_photo img");
      const avatar = avatarEl?.getAttribute("src") ?? undefined;

      const messageTextEl = block.querySelector(".tgme_widget_message_text");
      const bio = messageTextEl?.textContent?.trim() ?? "";
      const npub = this.extractNostrFromBio(bio);

      contacts.push(buildSocialContact({
        platformId: username,
        username,
        displayName,
        avatar,
        bio: bio || undefined,
        links: this.extractLinksFromBio(bio),
        npub,
      }));
    }

    return contacts;
  }

  private parseProfile(html: string, username: string): SocialScrapedContact | undefined {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute("content") ?? undefined;
    const ogDesc = doc.querySelector('meta[property="og:description"]')?.getAttribute("content") ?? undefined;
    const ogImage = doc.querySelector('meta[property="og:image"]')?.getAttribute("content") ?? undefined;

    if (!ogTitle && !ogDesc) return undefined;

    const displayName = ogTitle ?? username;
    const bio = ogDesc ?? "";
    const links = this.extractLinksFromBio(bio);
    const npub = this.extractNostrFromBio(bio);

    return buildSocialContact({
      platformId: username,
      username,
      displayName,
      avatar: ogImage,
      bio,
      links,
      npub,
    });
  }
}
