/**
 * WhatsApp Scraper — VØID Phantom Harvester
 *
 * Runs on Android via Capacitor using the @capacitor-community/contacts plugin.
 * On web, contacts must be imported manually (the scraper returns empty).
 * Extracts phone numbers, names, and avatars from the device contact list.
 */

import { BaseSocialScraper, type SocialScrapedContact, type ScraperAuth } from "../socialScraper.ts";
import type { SocialPlatform } from "../../storage/contactDirectory.ts";
import { buildSocialContact } from "../buildContact";

export default class WhatsAppScraper extends BaseSocialScraper {
  platform: SocialPlatform = "whatsapp";

  /**
   * Override isAvailable — only available when Capacitor Contacts plugin is present.
   */
  isAvailable(): boolean {
    return typeof window !== "undefined" && !!(window as any).Capacitor?.isNativePlatform();
  }

  async scrapeContacts(_auth?: ScraperAuth): Promise<SocialScrapedContact[]> {
    try {
      const contacts = await this.readDeviceContacts();
      return contacts;
    } catch {
      return [];
    }
  }

  /**
   * searchUsers is not applicable for WhatsApp — there is no public user search.
   */
  async searchUsers(_query: string): Promise<SocialScrapedContact[]> {
    return [];
  }

  private async readDeviceContacts(): Promise<SocialScrapedContact[]> {
    // Dynamically import the Capacitor contacts plugin via string to avoid Vite resolution
    let Contacts: any;
    try {
      const pluginName = "@capacitor-community/contacts";
      const mod = await (Function("return import('" + pluginName + "')")() as Promise<any>);
      Contacts = mod.Contacts;
    } catch {
      // Plugin not available — web fallback
      console.warn("[WhatsAppScraper] @capacitor-community/contacts not available. Import contacts manually.");
      return [];
    }

    try {
      // Request permission
      const permission = await Contacts.requestPermissions();
      if (permission.contacts !== "granted") {
        console.warn("[WhatsAppScraper] Contacts permission denied.");
        return [];
      }

      // Read all contacts
      const result = await Contacts.getContacts();
      const scraped: SocialScrapedContact[] = [];

      for (const contact of result.contacts ?? []) {
        const displayName = contact.displayName ?? contact.name?.display ?? "";
        const phoneNumbers = contact.phoneNumbers ?? [];
        void (contact.emails ?? []);

        // Use first phone number as platformId; skip contacts without phone
        const phone = phoneNumbers[0]?.number;
        if (!phone) continue;

        // Normalize phone: strip spaces, dashes, parens
        const normalizedPhone = phone.replace(/[\s\-()]/g, "");

        // Avatar from thumbnailPath or photo
        const avatar = contact.thumbnailPath ?? contact.photo ?? undefined;

        // Build bio from organization/title if available
        const org = contact.organization?.company ?? "";
        const title = contact.organization?.title ?? "";
        const bio = [title, org].filter(Boolean).join(" at ") || undefined;

        scraped.push(
          buildSocialContact({
            platformId: normalizedPhone,
            username: displayName || normalizedPhone,
            displayName: displayName || normalizedPhone,
            avatar,
            bio,
          }),
        );
      }

      return scraped;
    } catch (err) {
      console.error("[WhatsAppScraper] Error reading contacts:", err);
      return [];
    }
  }
}
