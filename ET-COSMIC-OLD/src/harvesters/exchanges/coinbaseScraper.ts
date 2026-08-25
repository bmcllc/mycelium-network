/**
 * Coinbase Exchange Scraper
 *
 * Public REST API — no authentication required.
 * https://docs.cloud.coinbase.com/
 */

import type { SocialPlatform } from "../../storage/contactDirectory";
import {
  BaseExchangeScraper,
  type ExchangeTicker,
  type ExchangeTrade,
  type ExchangeOrderBook,
} from "../exchangeScraper";

const BASE_URL = "https://api.coinbase.com/v2";

export default class CoinbaseScraper extends BaseExchangeScraper {
  exchange = "Coinbase";
  platform: SocialPlatform = "coinbase";

  async getTicker(symbol: string): Promise<ExchangeTicker> {
    const data = await this.fetchJSON<{
      data: { base: string; currency: string; amount: string };
    }>(`${BASE_URL}/prices/${encodeURIComponent(symbol)}/spot`);

    return {
      exchange: this.exchange,
      symbol,
      price: Number(data.data.amount ?? 0),
      priceChange24h: 0,
      volume24h: 0,
      high24h: 0,
      low24h: 0,
      timestamp: Date.now(),
    };
  }

  async getOrderBook(symbol: string, limit = 100): Promise<ExchangeOrderBook> {
    try {
      // Coinbase Pro-style endpoint for order book
      const data = await this.fetchJSON<{
        bids: [string, string, string[]][];
        asks: [string, string, string[]][];
      }>(`https://api.exchange.coinbase.com/products/${encodeURIComponent(symbol)}/book?level=2`);

      return {
        exchange: this.exchange,
        symbol,
        bids: data.bids.slice(0, limit).map(([price, volume]) => ({
          price: Number(price),
          volume: Number(volume),
        })),
        asks: data.asks.slice(0, limit).map(([price, volume]) => ({
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
        trade_id: number;
        price: string;
        size: string;
        side: "buy" | "sell";
        time: string;
      }[]>(`https://api.exchange.coinbase.com/products/${encodeURIComponent(symbol)}/trades?limit=${limit}`);

      return data.map((t) => ({
        exchange: this.exchange,
        tradeId: String(t.trade_id),
        symbol,
        side: t.side === "buy" ? "buy" : "sell",
        price: Number(t.price),
        volume: Number(t.size),
        timestamp: new Date(t.time).getTime(),
      }));
    } catch {
      return [];
    }
  }

  async getTopPairs(): Promise<string[]> {
    return ["BTC-USD", "ETH-USD", "SOL-USD", "XRP-USD", "DOGE-USD"];
  }
}
