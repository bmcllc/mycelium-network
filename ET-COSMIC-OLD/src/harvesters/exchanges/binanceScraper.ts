/**
 * Binance Exchange Scraper
 *
 * Public REST API — no authentication required.
 * https://binance-docs.github.io/apidocs/spot/en/
 */

import type { SocialPlatform } from "../../storage/contactDirectory";
import {
  BaseExchangeScraper,
  type ExchangeTicker,
  type ExchangeTrade,
  type ExchangeOrderBook,
} from "../exchangeScraper";

const BASE_URL = "https://api.binance.com/api/v3";

export default class BinanceScraper extends BaseExchangeScraper {
  exchange = "Binance";
  platform: SocialPlatform = "binance";

  async getTicker(symbol: string): Promise<ExchangeTicker> {
    const data = await this.fetchJSON<Record<string, unknown>>(
      `${BASE_URL}/ticker/24hr?symbol=${encodeURIComponent(symbol)}`,
    );

    return {
      exchange: this.exchange,
      symbol: String(data.symbol ?? symbol),
      price: Number(data.lastPrice ?? 0),
      priceChange24h: Number(data.priceChangePercent ?? 0),
      volume24h: Number(data.quoteVolume ?? 0),
      high24h: Number(data.highPrice ?? 0),
      low24h: Number(data.lowPrice ?? 0),
      timestamp: Date.now(),
    };
  }

  async getOrderBook(symbol: string, limit = 100): Promise<ExchangeOrderBook> {
    const data = await this.fetchJSON<{
      bids: [string, string][];
      asks: [string, string][];
    }>(`${BASE_URL}/depth?symbol=${encodeURIComponent(symbol)}&limit=${limit}`);

    return {
      exchange: this.exchange,
      symbol,
      bids: data.bids.map(([price, volume]) => ({
        price: Number(price),
        volume: Number(volume),
      })),
      asks: data.asks.map(([price, volume]) => ({
        price: Number(price),
        volume: Number(volume),
      })),
      timestamp: Date.now(),
    };
  }

  async getRecentTrades(symbol: string, limit = 50): Promise<ExchangeTrade[]> {
    try {
      const data = await this.fetchJSON<{
        id: number;
        price: string;
        qty: string;
        time: number;
        isBuyerMaker: boolean;
      }[]>(`${BASE_URL}/trades?symbol=${encodeURIComponent(symbol)}&limit=${limit}`);

      return data.map((t) => ({
        exchange: this.exchange,
        tradeId: String(t.id),
        symbol,
        side: t.isBuyerMaker ? "sell" : "buy",
        price: Number(t.price),
        volume: Number(t.qty),
        timestamp: t.time,
      }));
    } catch {
      return [];
    }
  }

  async getTopPairs(): Promise<string[]> {
    return ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT"];
  }
}
