/**
 * Kraken Exchange Scraper
 *
 * Public REST API — no authentication required.
 * https://docs.kraken.com/rest/
 */

import type { SocialPlatform } from "../../storage/contactDirectory";
import {
  BaseExchangeScraper,
  type ExchangeTicker,
  type ExchangeTrade,
  type ExchangeOrderBook,
} from "../exchangeScraper";

const BASE_URL = "https://api.kraken.com/0/public";

export default class KrakenScraper extends BaseExchangeScraper {
  exchange = "Kraken";
  platform: SocialPlatform = "kraken";

  async getTicker(symbol: string): Promise<ExchangeTicker> {
    const data = await this.fetchJSON<{
      error: string[];
      result: Record<string, {
        c: [string, string]; // last trade closed [price, lot volume]
        p: [string, string]; // volume weighted average price [today, 24h]
        v: [string, string]; // volume [today, 24h]
        h: [string, string]; // high [today, 24h]
        l: [string, string]; // low [today, 24h]
        o: [string, string]; // open [today, 24h]
      }>;
    }>(`${BASE_URL}/Ticker?pair=${encodeURIComponent(symbol)}`);

    const key = Object.keys(data.result)[0];
    const ticker = data.result[key];

    const price = Number(ticker.c[0]);
    const open = Number(ticker.o[0]);
    const priceChange = open > 0 ? ((price - open) / open) * 100 : 0;

    return {
      exchange: this.exchange,
      symbol,
      price,
      priceChange24h: priceChange,
      volume24h: Number(ticker.v[1]),
      high24h: Number(ticker.h[1]),
      low24h: Number(ticker.l[1]),
      timestamp: Date.now(),
    };
  }

  async getOrderBook(symbol: string, limit = 100): Promise<ExchangeOrderBook> {
    try {
      const data = await this.fetchJSON<{
        result: Record<string, {
          bids: [string, string, number][];
          asks: [string, string, number][];
        }>;
      }>(`${BASE_URL}/Depth?pair=${encodeURIComponent(symbol)}&count=${limit}`);

      const key = Object.keys(data.result)[0];
      const book = data.result[key];

      return {
        exchange: this.exchange,
        symbol,
        bids: book.bids.map(([price, volume]) => ({
          price: Number(price),
          volume: Number(volume),
        })),
        asks: book.asks.map(([price, volume]) => ({
          price: Number(price),
          volume: Number(volume),
        })),
        timestamp: Date.now(),
      };
    } catch {
      return {
        exchange: this.exchange,
        symbol,
        bids: [],
        asks: [],
        timestamp: Date.now(),
      };
    }
  }

  async getRecentTrades(symbol: string, limit = 50): Promise<ExchangeTrade[]> {
    try {
      const data = await this.fetchJSON<{
        result: Record<string, [string, string, string, string, string, string][]>;
      }>(`${BASE_URL}/Trades?pair=${encodeURIComponent(symbol)}`);

      const key = Object.keys(data.result).find((k) => k !== "last") ?? Object.keys(data.result)[0];
      const trades = data.result[key];

      return trades.slice(-limit).map((t, i) => ({
        exchange: this.exchange,
        tradeId: `${key}_${i}`,
        symbol,
        side: t[3] === "b" ? "buy" : "sell",
        price: Number(t[0]),
        volume: Number(t[1]),
        timestamp: Math.floor(Number(t[2]) * 1000),
      }));
    } catch {
      return [];
    }
  }

  async getTopPairs(): Promise<string[]> {
    return ["XBTUSD", "ETHUSD", "SOLUSD", "XRPUSD"];
  }
}
