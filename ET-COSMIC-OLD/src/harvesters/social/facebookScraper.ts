/**
 * Facebook Scraper — VØID Phantom Harvester
 *
 * Scrapes public Facebook pages/profiles. Facebook is one of the hardest
 * platforms to scrape — this implementation uses basic HTML fallback
 * and the public Graph API where possible.
 */

import { BaseSocialScraper, type SocialScrapedContact, type ScraperAuth } from "../socialScraper.ts";
import type { SocialPlatform } from "../../storage/contactDirectory.ts";
import { buildSocialContact } from "../buildContact";

export default class FacebookScraper extends BaseSocialScraper {
  platform: SocialPlatform = "facebook";

  async scrapeContacts(auth?: ScraperAuth): Promise<SocialScrapedContact[]> {
    try {
      const pagename = auth?.username;
      if (!pagename) return [];

      const contact = await this.fetchPageProfile(pagename);
      return contact ? [contact] : [];
    } catch {
      return [];
    }
  }

  async searchUsers(query: string): Promise<SocialScrapedContact[]> {
    // Facebook public search is extremely limited without auth.
    // Try the mobile page search as a last resort.
    try {
      const html = await this.fetchHTML(
        `https://m.facebook.com/public/${encodeURIComponent(query)}`
      );
      return this.parseSearchResults(html);
    } catch {
      return [];
    }
  }

  async fetchPageProfile(pagename: string): Promise<SocialScrapedContact | undefined> {
    // Try mobile version first (less JavaScript-dependent)
    try {
      return await this.fetchMobileProfile(pagename);
    } catch {
      // Fall through
    }

    // Fallback: desktop og: meta tags
    try {
      return await this.fetchDesktopProfile(pagename);
    } catch {
      return undefined;
    }
  }

  private async fetchMobileProfile(pagename: string): Promise<SocialScrapedContact> {
    const html = await this.fetchHTML(`https://m.facebook.com/${pagename}`);
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute("content") ?? pagename;
    const ogDesc = doc.querySelector('meta[property="og:description"]')?.getAttribute("content") ?? "";
    const ogImage = doc.querySelector('meta[property="og:image"]')?.getAttribute("content") ?? undefined;

    const bio = ogDesc;
    const links = this.extractLinksFromBio(bio);

    return buildSocialContact({
      platformId: pagename,
      username: pagename,
      displayName: ogTitle,
      avatar: ogImage,
      bio,
      links,
    });
  }

  private async fetchDesktopProfile(pagename: string): Promise<SocialScrapedContact> {
    const html = await this.fetchHTML(`https://www.facebook.com/${pagename}`);
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute("content") ?? pagename;
    const ogDesc = doc.querySelector('meta[property="og:description"]')?.getAttribute("content") ?? "";
    const ogImage = doc.querySelector('meta[property="og:image"]')?.getAttribute("content") ?? undefined;

    const bio = ogDesc;
    const links = this.extractLinksFromBio(bio);

    return buildSocialContact({
      platformId: pagename,
      username: pagename,
      displayName: ogTitle,
      avatar: ogImage,
      bio,
      links,
    });
  }

  private parseSearchResults(html: string): SocialScrapedContact[] {
    const contacts: SocialScrapedContact[] = [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    // Mobile search results use simple list items with links
    const resultLinks = doc.querySelectorAll('a[href*="/profile.php"], a[href*="facebook.com/"]');

    const seen = new Set<string>();

    for (const link of resultLinks) {
      const href = link.getAttribute("href") ?? "";
      const name = link.textContent?.trim();
      if (!name || name.length < 2) continue;

      // Derive a page id from the href
      const idMatch = href.match(/id=(\d+)/);
      const pageId = idMatch?.[1] ?? name.toLowerCase().replace(/\s+/g, ".");
      if (seen.has(pageId)) continue;
      seen.add(pageId);

      const avatarImg = link.querySelector("img");
      const avatar = avatarImg?.getAttribute("src") ?? undefined;

      contacts.push(buildSocialContact({
        platformId: pageId,
        username: pageId,
        displayName: name,
        avatar,
      }));
    }

    return contacts;
  }
}
