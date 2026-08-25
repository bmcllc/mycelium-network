/**
 * Bybit Exchange Scraper
 *
 * Public REST API — no authentication required.
 * https://bybit-exchange.github.io/docs/v5/
 */

import type { SocialPlatform } from "../../storage/contactDirectory";
import {
  BaseExchangeScraper,
  type ExchangeTicker,
  type ExchangeTrade,
  type ExchangeOrderBook,
} from "../exchangeScraper";

const BASE_URL = "https://api.bybit.com/v5/market";

export default class BybitScraper extends BaseExchangeScraper {
  exchange = "Bybit";
  platform: SocialPlatform = "bybit";

  async getTicker(symbol: string): Promise<ExchangeTicker> {
    const data = await this.fetchJSON<{
      retCode: number;
      result: {
        list: Array<{
          symbol: string;
          lastPrice: string;
          price24hPcnt: string;
          volume24h: string;
          highPrice24h: string;
          lowPrice24h: string;
        }>;
      };
    }>(`${BASE_URL}/tickers?category=spot&symbol=${encodeURIComponent(symbol)}`);

    const ticker = data.result.list[0];

    return {
      exchange: this.exchange,
      symbol: ticker.symbol,
      price: Number(ticker.lastPrice ?? 0),
      priceChange24h: Number(ticker.price24hPcnt ?? 0) * 100,
      volume24h: Number(ticker.volume24h ?? 0),
      high24h: Number(ticker.highPrice24h ?? 0),
      low24h: Number(ticker.lowPrice24h ?? 0),
      timestamp: Date.now(),
    };
  }

  async getOrderBook(symbol: string, limit = 100): Promise<ExchangeOrderBook> {
    try {
      const data = await this.fetchJSON<{
        result: {
          s: string;
          b: [string, string][];
          a: [string, string][];
          ts: number;
        };
      }>(`${BASE_URL}/orderbook?category=spot&symbol=${encodeURIComponent(symbol)}&limit=${limit}`);

      const book = data.result;

      return {
        exchange: this.exchange,
        symbol,
        bids: book.b.map(([price, volume]) => ({
          price: Number(price),
          volume: Number(volume),
        })),
        asks: book.a.map(([price, volume]) => ({
          price: Number(price),
          volume: Number(volume),
        })),
        timestamp: book.ts,
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
        result: {
          list: Array<{
            execId: string;
            symbol: string;
            price: string;
            size: string;
            side: "Buy" | "Sell";
            time: string;
          }>;
        };
      }>(`${BASE_URL}/recent-trade?category=spot&symbol=${encodeURIComponent(symbol)}&limit=${limit}`);

      return data.result.list.map((t) => ({
        exchange: this.exchange,
        tradeId: t.execId,
        symbol: t.symbol,
        side: t.side === "Buy" ? "buy" : "sell",
        price: Number(t.price),
        volume: Number(t.size),
        timestamp: Number(t.time),
      }));
    } catch {
      return [];
    }
  }

  async getTopPairs(): Promise<string[]> {
    return ["BTCUSDT", "ETHUSDT", "SOLUSDT", "XRPUSDT"];
  }
}
