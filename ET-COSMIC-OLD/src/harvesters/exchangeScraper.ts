/**
 * VØID Phantom Harvester — Exchange Scraper Interface
 *
 * Interface unificada para scrapers de corretoras crypto.
 * Usa apenas APIs públicas (sem autenticação).
 */

import type { SocialPlatform, HarvestedContact } from "../storage/contactDirectory";

export interface ExchangeTicker {
  exchange: string;
  symbol: string;
  price: number;
  priceChange24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  timestamp: number;
}

export interface ExchangeTrade {
  exchange: string;
  tradeId: string;
  symbol: string;
  side: "buy" | "sell";
  price: number;
  volume: number;
  timestamp: number;
}

export interface ExchangeOrderBook {
  exchange: string;
  symbol: string;
  bids: { price: number; volume: number }[];
  asks: { price: number; volume: number }[];
  timestamp: number;
}

export interface ExchangeScraper {
  exchange: string;
  platform: SocialPlatform;
  isAvailable(): boolean;
  getTicker(symbol: string): Promise<ExchangeTicker>;
  getOrderBook(symbol: string, limit?: number): Promise<ExchangeOrderBook>;
  getRecentTrades(symbol: string, limit?: number): Promise<ExchangeTrade[]>;
  getTopPairs(): Promise<string[]>;
  tradesToContacts(trades: ExchangeTrade[]): HarvestedContact[];
}

// ─── Base class ─────────────────────────────────────────────────────────────

export abstract class BaseExchangeScraper implements ExchangeScraper {
  abstract exchange: string;
  abstract platform: SocialPlatform;

  isAvailable(): boolean {
    return typeof fetch !== "undefined";
  }

  abstract getTicker(symbol: string): Promise<ExchangeTicker>;
  abstract getOrderBook(symbol: string, limit?: number): Promise<ExchangeOrderBook>;
  abstract getRecentTrades(symbol: string, limit?: number): Promise<ExchangeTrade[]>;
  abstract getTopPairs(): Promise<string[]>;

  protected async fetchJSON<T>(url: string, headers?: Record<string, string>): Promise<T> {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        ...headers,
      },
    });
    if (!res.ok) throw new Error(`${this.exchange}: HTTP ${res.status}`);
    return res.json();
  }

  /**
   * Converte trades do exchange para HarvestedContact[]
   * Cada trade representa um trader anônimo — útil para volume analysis
   */
  tradesToContacts(trades: ExchangeTrade[]): HarvestedContact[] {
    const now = Date.now();
    return trades.map((t) => ({
      id: `${this.exchange}_${t.tradeId}`,
      platform: this.platform,
      platformId: t.tradeId,
      username: `trader_${t.tradeId.slice(-6)}`,
      tags: ["trader", t.side, t.symbol.toLowerCase()],
      lastSeen: t.timestamp,
      discoveredAt: now,
      source: "exchange_api" as const,
      confidence: 0.3,
      exchangeData: {
        exchange: this.exchange,
        tradingPair: t.symbol,
        lastTradePrice: t.price,
        lastTradeSide: t.side,
        lastTradeVolume: t.volume,
      },
    }));
  }
}
