/**
 * VØID ScrapScanner — varredura directa (fetch → APIs/HTML públicos).
 * Sem intermediários: browser VOID, CLI, ou Phantom Harvester usam o mesmo núcleo.
 */

import TelegramScraper from "./social/telegramScraper";
import TwitterScraper from "./social/twitterScraper";
import {
  contactDirectory,
  generateContactId,
  type HarvestedContact,
  type SocialPlatform,
} from "../storage/contactDirectory";
import { buildHarvestedContact } from "./buildContact";
import { phantomHarvester } from "./phantomHarvester";
import type { ExchangeTicker } from "./exchangeScraper";
import type { SocialScrapedContact } from "./socialScraper";

export type ScrapScannerLogLevel = "info" | "ok" | "err" | "section";

export interface ScrapScannerLogLine {
  text: string;
  level: ScrapScannerLogLevel;
}

export interface ScrapScannerTelegramResult {
  channel: string;
  contacts: HarvestedContact[];
  newSaved: number;
  logs: ScrapScannerLogLine[];
}

export interface ScrapScannerExchangeResult {
  symbol: string;
  tickers: ExchangeTicker[];
  logs: ScrapScannerLogLine[];
}

export interface ScrapScannerSocialResult {
  platform: "telegram" | "x";
  query: string;
  contacts: HarvestedContact[];
  newSaved: number;
  logs: ScrapScannerLogLine[];
}

const telegram = new TelegramScraper();
const twitter = new TwitterScraper();

function log(level: ScrapScannerLogLevel, text: string): ScrapScannerLogLine {
  return { level, text };
}

function npubFromScraped(s: SocialScrapedContact): string | undefined {
  const ext = s as SocialScrapedContact & { npub?: string };
  if (ext.npub) return ext.npub;
  const bio = s.bio ?? "";
  return bio.match(/npub1[a-z0-9]{58,}/i)?.[0];
}

function scrapedToHarvested(
  platform: SocialPlatform,
  scraped: SocialScrapedContact[],
  tags: string[],
): HarvestedContact[] {
  return scraped.map((s) => {
    const npub = npubFromScraped(s);
    return buildHarvestedContact({
      id: generateContactId(platform, s.platformId),
      platform,
      platformId: s.platformId,
      username: s.displayName || s.username,
      avatar: s.avatar,
      bio: s.bio,
      followers: s.followers,
      links: s.links,
      npub,
      nostrPubkey: npub,
      tags: [...tags, "scrapscanner"],
      lastSeen: Date.now(),
      discoveredAt: Date.now(),
      source: "scraper",
      confidence: 0.85,
    });
  });
}

/** Persiste contactos no OPFS/Dexie local; devolve quantos eram novos. */
export async function persistScrapContacts(contacts: HarvestedContact[]): Promise<number> {
  let newSaved = 0;
  for (const c of contacts) {
    const existing = await contactDirectory.get(c.id);
    if (existing) {
      await contactDirectory.update(c.id, {
        ...c,
        tags: [...new Set([...existing.tags, ...c.tags])],
        lastSeen: Date.now(),
      });
    } else {
      await contactDirectory.add(c);
      newSaved++;
    }
  }
  return newSaved;
}

/** Canal público Telegram (t.me/s/...) — HTML directo. */
export async function scrapScanTelegramChannel(username: string): Promise<ScrapScannerTelegramResult> {
  const channel = username.replace(/^@/, "").trim();
  const logs: ScrapScannerLogLine[] = [
    log("section", `[Scraper Telegram] t.me/s/${channel}`),
    log("info", "Fetch directo ao HTML público (sem API de terceiros pagos)…"),
  ];

  if (!channel) {
    logs.push(log("err", "✖ Nome de canal/utilizador vazio."));
    return { channel, contacts: [], newSaved: 0, logs };
  }

  try {
    const scraped = await telegram.scrapeContacts({ username: channel });
    const contacts = scrapedToHarvested("telegram", scraped, ["telegram", "channel"]);
    const npubCount = contacts.filter((c) => c.npub || c.nostrPubkey).length;
    logs.push(
      log("ok", `✔ ${contacts.length} participante(s) na timeline pública`),
      log("info", `  npub detectados: ${npubCount}`),
    );
    contacts.slice(0, 8).forEach((c) => {
      const np = c.npub ? ` → ${c.npub.slice(0, 20)}…` : "";
      logs.push(log("info", `  • ${c.username}${np}`));
    });
    if (contacts.length > 8) {
      logs.push(log("info", `  • … +${contacts.length - 8} outros`));
    }

    const newSaved = await persistScrapContacts(contacts);
    logs.push(log("ok", `✔ ${newSaved} novo(s) no diretório local VOID`));
    return { channel, contacts, newSaved, logs };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logs.push(log("err", `✖ Telegram: ${msg}`));
    return { channel, contacts: [], newSaved: 0, logs };
  }
}

/** Perfil Telegram ou pesquisa X via instâncias Nitter (HTML público). */
export async function scrapScanSocialProfile(
  platform: "telegram" | "x",
  query: string,
): Promise<ScrapScannerSocialResult> {
  const q = query.replace(/^@/, "").trim();
  const logs: ScrapScannerLogLine[] = [
    log("section", `[Scraper ${platform === "x" ? "X / Nitter" : "Telegram"}] ${q}`),
  ];

  if (!q) {
    logs.push(log("err", "✖ Query vazia."));
    return { platform, query: q, contacts: [], newSaved: 0, logs };
  }

  try {
    let scraped: SocialScrapedContact[] = [];
    if (platform === "telegram") {
      scraped = await telegram.searchUsers(q);
    } else {
      scraped = await twitter.searchUsers(q);
    }

    const socialPlatform: SocialPlatform = platform === "x" ? "x" : "telegram";
    const contacts = scrapedToHarvested(socialPlatform, scraped, [platform, "profile"]);
    logs.push(log("ok", `✔ ${contacts.length} resultado(s)`));
    contacts.forEach((c) => {
      logs.push(log("info", `  • ${c.username}${c.npub ? ` (${c.npub.slice(0, 16)}…)` : ""}`));
    });

    const newSaved = await persistScrapContacts(contacts);
    logs.push(log("ok", `✔ ${newSaved} novo(s) guardados localmente`));
    return { platform, query: q, contacts, newSaved, logs };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logs.push(log("err", `✖ ${msg}`));
    return { platform, query: q, contacts: [], newSaved: 0, logs };
  }
}

/** Tickers em paralelo — APIs REST públicas das corretoras (já no phantomHarvester). */
export async function scrapScanExchanges(symbol: string): Promise<ScrapScannerExchangeResult> {
  const sym = symbol.trim().toUpperCase() || "BTCUSDT";
  const logs: ScrapScannerLogLine[] = [
    log("section", `[Scraper Exchanges] ${sym}`),
    log("info", "Binance · Bybit · Coinbase · Kraken · Mercado Bitcoin — REST directo"),
  ];

  const tickers = await phantomHarvester.getAllTickers(sym);
  if (tickers.length === 0) {
    logs.push(log("err", "✖ Nenhuma corretora respondeu. Verifique rede ou símbolo (ex. BTCUSDT)."));
    return { symbol: sym, tickers: [], logs };
  }

  for (const t of tickers) {
    logs.push(
      log(
        "ok",
        `✔ [${t.exchange}] $${t.price.toFixed(2)} · 24h ${t.priceChange24h.toFixed(2)}% · vol $${(t.volume24h / 1e6).toFixed(2)}M`,
      ),
    );
  }

  return { symbol: sym, tickers, logs };
}

/** Parse vCard mínimo (importação soberana — ficheiro do utilizador, sem app intermediário). */
export function parseVCardContacts(text: string): Array<{
  platform: SocialPlatform;
  platformId: string;
  username: string;
  nostrPubkey?: string;
}> {
  const rows: Array<{
    platform: SocialPlatform;
    platformId: string;
    username: string;
    nostrPubkey?: string;
  }> = [];
  const cards = text.split(/BEGIN:VCARD/i);
  for (const card of cards) {
    if (!card.trim()) continue;
    const fn = card.match(/FN:(.+)/i)?.[1]?.trim();
    const tel = card.match(/TEL[^:]*:([+\d\s()-]+)/i)?.[1]?.replace(/\s/g, "") ?? "";
    const note = card.match(/NOTE:(.+)/i)?.[1] ?? "";
    const npub = note.match(/npub1[a-z0-9]{58,}/i)?.[0];
    const name = fn || tel || "contacto";
    const id = tel || name.toLowerCase().replace(/\s+/g, "_");
    if (!id) continue;
    rows.push({
      platform: "whatsapp",
      platformId: id,
      username: name,
      ...(npub ? { nostrPubkey: npub } : {}),
    });
  }
  return rows;
}

export async function scrapScanVCardFile(text: string): Promise<{
  imported: number;
  logs: ScrapScannerLogLine[];
}> {
  const rows = parseVCardContacts(text);
  const logs: ScrapScannerLogLine[] = [
    log("section", "[Scraper vCard] importação local"),
    log("info", `${rows.length} entrada(s) no ficheiro`),
  ];
  if (rows.length === 0) {
    logs.push(log("err", "✖ Nenhum contacto válido no vCard."));
    return { imported: 0, logs };
  }
  const imported = await phantomHarvester.importContactsFromUserFile(rows);
  logs.push(log("ok", `✔ ${imported} contacto(s) importados (VOID local)`));
  rows.slice(0, 6).forEach((r) => {
    logs.push(log("info", `  • ${r.username} (${r.platformId})`));
  });
  return { imported, logs };
}

export function logsToStrings(lines: ScrapScannerLogLine[]): string[] {
  return lines.map((l) => {
    if (l.level === "ok" && !l.text.startsWith("✔")) return `✔ ${l.text}`;
    if (l.level === "err" && !l.text.startsWith("✖")) return `✖ ${l.text}`;
    return l.text;
  });
}
