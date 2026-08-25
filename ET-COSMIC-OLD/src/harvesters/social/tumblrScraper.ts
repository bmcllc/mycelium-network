/**
 * Tumblr Scraper — VØID Phantom Harvester
 *
 * Scrapes Tumblr blogs and searches for crypto/nostr related tags.
 * Uses the Tumblr public blog API (/api/read/json) as a fallback
 * when no API key is provided for the v2 API.
 */

import { BaseSocialScraper, type SocialScrapedContact, type ScraperAuth } from "../socialScraper.ts";
import type { SocialPlatform } from "../../storage/contactDirectory.ts";

interface TumblrV2TaggedResponse {
  response?: Array<{
    blog_name?: string;
    blog?: { title?: string; description?: string; name?: string };
  }>;
}

interface TumblrReadJSON {
  tumblelog?: {
    title?: string;
    description?: string;
    name?: string;
  };
}

const NOSTR_TAGS = [
  "nostr", "bitcoin", "crypto", "npub", "lightning",
  "satoshi", "decentralization", "web3", "freedom",
];

export default class TumblrScraper extends BaseSocialScraper {
  platform: SocialPlatform = "tumblr";

  async scrapeContacts(auth?: ScraperAuth): Promise<SocialScrapedContact[]> {
    try {
      const apiKey = auth?.apiKey;
      const blog = auth?.username;

      if (apiKey) {
        // Use v2 API to search nostr-related tags
        return await this.searchByTags(apiKey);
      }

      if (blog) {
        const contact = await this.fetchBlogProfile(blog);
        return contact ? [contact] : [];
      }

      return [];
    } catch {
      return [];
    }
  }

  async searchUsers(query: string): Promise<SocialScrapedContact[]> {
    try {
      // Try to fetch as a blog name first
      const contact = await this.fetchBlogProfile(query);
      if (contact) return [contact];
    } catch {
      // Not a blog or fetch failed
    }

    // Without an API key we cannot do a general search
    return [];
  }

  async searchByTags(apiKey: string, limit = 20): Promise<SocialScrapedContact[]> {
    const contacts: SocialScrapedContact[] = [];
    const seen = new Set<string>();

    for (const tag of NOSTR_TAGS) {
      try {
        const data = await this.fetchJSON<TumblrV2TaggedResponse>(
          `https://api.tumblr.com/v2/tagged?tag=${encodeURIComponent(tag)}&api_key=${apiKey}&limit=${limit}`
        );

        for (const post of data.response ?? []) {
          const blogName = post.blog_name ?? post.blog?.name;
          if (!blogName || seen.has(blogName)) continue;
          seen.add(blogName);

          const description = post.blog?.description ?? "";
          const links = this.extractLinksFromBio(description);

          contacts.push({
            platformId: blogName,
            username: blogName,
            displayName: post.blog?.title ?? blogName,
            bio: description,
            links,
          });
        }
      } catch {
        continue;
      }
    }

    return contacts;
  }

  async fetchBlogProfile(blog: string): Promise<SocialScrapedContact | undefined> {
    try {
      // Tumblr public read API returns JSONP-wrapped JSON
      const rawText = await this.fetchHTML(`https://${blog}.tumblr.com/api/read/json`);

      // Strip JSONP wrapper: var tumblr_api_read = {...};
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return undefined;

      const data: TumblrReadJSON = JSON.parse(jsonMatch[0]);
      const tumblelog = data.tumblelog;
      if (!tumblelog) return undefined;

      const description = tumblelog.description ?? "";
      const links = this.extractLinksFromBio(description);

      return {
        platformId: blog,
        username: blog,
        displayName: tumblelog.title ?? blog,
        bio: description,
        links,
      };
    } catch {
      return undefined;
    }
  }
}
