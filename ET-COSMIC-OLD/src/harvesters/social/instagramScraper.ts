/**
 * Instagram Scraper — VØID Phantom Harvester
 *
 * Scrapes public Instagram profiles. Attempts the JSON endpoint first,
 * falling back to HTML profile parsing.
 * Looks for nostr/npub references in bios.
 */

import { BaseSocialScraper, type SocialScrapedContact, type ScraperAuth } from "../socialScraper.ts";
import type { SocialPlatform } from "../../storage/contactDirectory.ts";
import { buildSocialContact } from "../buildContact";

export default class InstagramScraper extends BaseSocialScraper {
  platform: SocialPlatform = "instagram";

  async scrapeContacts(auth?: ScraperAuth): Promise<SocialScrapedContact[]> {
    try {
      const username = auth?.username;
      if (!username) return [];

      const contact = await this.fetchProfile(username);
      return contact ? [contact] : [];
    } catch {
      return [];
    }
  }

  async searchUsers(query: string): Promise<SocialScrapedContact[]> {
    // Instagram search requires authentication; attempt profile lookup
    try {
      const contact = await this.fetchProfile(query);
      return contact ? [contact] : [];
    } catch {
      return [];
    }
  }

  async fetchProfile(username: string): Promise<SocialScrapedContact | undefined> {
    // Try JSON API first
    try {
      return await this.fetchProfileJSON(username);
    } catch {
      // Fall through to HTML
    }

    // Fallback: parse HTML
    try {
      return await this.fetchProfileHTML(username);
    } catch {
      return undefined;
    }
  }

  private async fetchProfileJSON(username: string): Promise<SocialScrapedContact> {
    const data = await this.fetchJSON<InstagramJSONResponse>(
      `https://www.instagram.com/${username}/?__a=1&__d=1`
    );

    const user = data.graphql?.user ?? data.data?.user;
    if (!user) throw new Error("No user data in JSON response");

    const bio = user.biography ?? "";
    const links = this.extractLinksFromBio(bio);

    return buildSocialContact({
      platformId: username,
      username,
      displayName: user.full_name ?? username,
      avatar: user.profile_pic_url ?? undefined,
      bio,
      followers: user.edge_followed_by?.count,
      links,
    });
  }

  private async fetchProfileHTML(username: string): Promise<SocialScrapedContact> {
    const html = await this.fetchHTML(`https://www.instagram.com/${username}/`);
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute("content") ?? "";
    const ogDesc = doc.querySelector('meta[property="og:description"]')?.getAttribute("content") ?? "";
    const ogImage = doc.querySelector('meta[property="og:image"]')?.getAttribute("content") ?? undefined;

    // og:title is typically "username (@username) ..."
    const displayName = ogTitle.replace(/\s*\(@\w+\).*/, "").trim() || username;
    const bio = ogDesc;
    const links = this.extractLinksFromBio(bio);

    // Try to extract follower count from description like "123K Followers"
    const followerMatch = ogDesc.match(/([\d,.]+[kKmM]?)\s*Followers/i);
    const followers = followerMatch ? this.parseFollowerCount(followerMatch[1]) : undefined;

    return buildSocialContact({
      platformId: username,
      username,
      displayName,
      avatar: ogImage,
      bio,
      followers,
      links,
    });
  }

  private parseFollowerCount(text: string): number | undefined {
    if (!text) return undefined;
    const cleaned = text.replace(/,/g, "");
    const num = parseFloat(cleaned.replace(/[kK]/, "e3").replace(/[mM]/, "e6"));
    return isNaN(num) ? undefined : Math.round(num);
  }
}

// ─── JSON response types ────────────────────────────────────────────────────

interface InstagramJSONResponse {
  graphql?: { user?: InstagramUser };
  data?: { user?: InstagramUser };
}

interface InstagramUser {
  full_name?: string;
  biography?: string;
  profile_pic_url?: string;
  edge_followed_by?: { count?: number };
}
