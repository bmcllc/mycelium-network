/**
 * VØID Phantom Harvester — Contact Directory (Dexie/IndexedDB)
 *
 * Diretório universal de contatos harvestados de redes sociais e corretoras.
 * Cada contato é mapeado para um identificador universal (Nostr pubkey ou GhostID).
 */

import Dexie, { type Table } from "dexie";

// ─── Types ──────────────────────────────────────────────────────────────────

export type SocialPlatform =
  | "whatsapp"
  | "telegram"
  | "x"
  | "instagram"
  | "facebook"
  | "tumblr"
  | "binance"
  | "coinbase"
  | "kraken"
  | "bybit"
  | "mercadobitcoin";

export interface ExchangeData {
  exchange: string;
  tradingPair?: string;
  volume30d?: number;
  favoriteAssets?: string[];
  publicProfile?: boolean;
  referralCode?: string;
  lastTradePrice?: number;
  lastTradeSide?: "buy" | "sell";
  lastTradeVolume?: number;
}

export interface HarvestedContact {
  id: string; // hash(platform + platformId)
  platform: SocialPlatform;
  platformId: string; // ID na plataforma (phone, @handle, uid)
  username: string; // nome de exibição
  avatar?: string;
  bio?: string;
  followers?: number;
  links?: string[];

  // Mapeamento para VOID
  nostrPubkey?: string;
  ghostId?: string;
  npub?: string;

  // Dados de exchange
  exchangeData?: ExchangeData;

  // Metadata
  tags: string[];
  lastSeen: number;
  discoveredAt: number;
  source: "scraper" | "import" | "manual" | "exchange_api";
  confidence: number; // 0-1
}

export interface HarvestReport {
  platform: SocialPlatform;
  contactsFound: number;
  newContacts: number;
  updatedContacts: number;
  nostrMapped: number;
  durationMs: number;
  errors: string[];
}

export interface HarvestStats {
  totalContacts: number;
  byPlatform: Record<SocialPlatform, number>;
  withNostr: number;
  withExchangeData: number;
  lastHarvest: number;
}

// ─── Dexie Database ─────────────────────────────────────────────────────────

class ContactDatabase extends Dexie {
  contacts!: Table<HarvestedContact>;

  constructor() {
    super("phantom-contacts");
    this.version(1).stores({
      contacts:
        "id, platform, platformId, nostrPubkey, ghostId, tags, lastSeen, discoveredAt, confidence, [platform+platformId]",
    });
  }
}

const db = new ContactDatabase();

// ─── Contact Directory API ──────────────────────────────────────────────────

export const contactDirectory = {
  // ── CRUD ──
  async add(contact: HarvestedContact): Promise<void> {
    await db.contacts.put(contact);
  },

  async addBatch(contacts: HarvestedContact[]): Promise<number> {
    await db.contacts.bulkPut(contacts);
    return contacts.length;
  },

  async get(id: string): Promise<HarvestedContact | undefined> {
    return db.contacts.get(id);
  },

  async getByPlatform(platformId: string, platform: SocialPlatform): Promise<HarvestedContact | undefined> {
    return db.contacts.where("[platform+platformId]").equals([platform, platformId]).first();
  },

  async update(id: string, changes: Partial<HarvestedContact>): Promise<void> {
    await db.contacts.update(id, changes);
  },

  async remove(id: string): Promise<void> {
    await db.contacts.delete(id);
  },

  // ── Queries ──
  async getAll(limit = 500): Promise<HarvestedContact[]> {
    return db.contacts.orderBy("lastSeen").reverse().limit(limit).toArray();
  },

  async getByPlatform_filter(platform: SocialPlatform, limit = 200): Promise<HarvestedContact[]> {
    return db.contacts.where("platform").equals(platform).reverse().sortBy("lastSeen").then((c) => c.slice(0, limit));
  },

  async getWithNostr(limit = 200): Promise<HarvestedContact[]> {
    return db.contacts
      .filter((c) => !!c.nostrPubkey)
      .reverse()
      .sortBy("confidence")
      .then((c) => c.slice(0, limit));
  },

  async getWithExchangeData(limit = 200): Promise<HarvestedContact[]> {
    return db.contacts
      .filter((c) => !!c.exchangeData)
      .reverse()
      .sortBy("lastSeen")
      .then((c) => c.slice(0, limit));
  },

  async search(query: string, limit = 50): Promise<HarvestedContact[]> {
    const q = query.toLowerCase();
    return db.contacts
      .filter(
        (c) =>
          c.username.toLowerCase().includes(q) ||
          c.platformId.toLowerCase().includes(q) ||
          c.bio?.toLowerCase().includes(q) ||
          c.tags.some((t) => t.toLowerCase().includes(q))
      )
      .limit(limit)
      .toArray();
  },

  // ── Stats ──
  async getStats(): Promise<HarvestStats> {
    const all = await db.contacts.toArray();
    const byPlatform = {} as Record<SocialPlatform, number>;
    let withNostr = 0;
    let withExchangeData = 0;
    let lastHarvest = 0;

    for (const c of all) {
      byPlatform[c.platform] = (byPlatform[c.platform] || 0) + 1;
      if (c.nostrPubkey) withNostr++;
      if (c.exchangeData) withExchangeData++;
      if (c.discoveredAt > lastHarvest) lastHarvest = c.discoveredAt;
    }

    return { totalContacts: all.length, byPlatform, withNostr, withExchangeData, lastHarvest };
  },

  // ── Maintenance ──
  async clear(): Promise<void> {
    await db.contacts.clear();
  },

  async count(): Promise<number> {
    return db.contacts.count();
  },
};

// ─── Utility ────────────────────────────────────────────────────────────────

export function generateContactId(platform: SocialPlatform, platformId: string): string {
  const data = `${platform}:${platformId}`;
  // Simple hash — crypto.subtle.digest is async, use a fast alternative
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return `hc_${Math.abs(hash).toString(36)}`;
}

export const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  x: "X / Twitter",
  instagram: "Instagram",
  facebook: "Facebook",
  tumblr: "Tumblr",
  binance: "Binance",
  coinbase: "Coinbase",
  kraken: "Kraken",
  bybit: "Bybit",
  mercadobitcoin: "Mercado Bitcoin",
};

export const PLATFORM_ICONS: Record<SocialPlatform, string> = {
  whatsapp: "📱",
  telegram: "✈️",
  x: "𝕏",
  instagram: "📸",
  facebook: "📘",
  tumblr: "📝",
  binance: "🟡",
  coinbase: "🔵",
  kraken: "🟣",
  bybit: "🟠",
  mercadobitcoin: "🇧🇷",
};
