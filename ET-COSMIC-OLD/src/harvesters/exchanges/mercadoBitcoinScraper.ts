/**
 * Mercado Bitcoin Exchange Scraper
 *
 * Public REST API — no authentication required.
 * https://www.mercadobitcoin.com.br/api-doc/
 */

import type { SocialPlatform } from "../../storage/contactDirectory";
import {
  BaseExchangeScraper,
  type ExchangeTicker,
  type ExchangeTrade,
  type ExchangeOrderBook,
} from "../exchangeScraper";

const BASE_URL = "https://api.mercadobitcoin.net/api";

export default class MercadoBitcoinScraper extends BaseExchangeScraper {
  exchange = "Mercado Bitcoin";
  platform: SocialPlatform = "mercadobitcoin";

  async getTicker(symbol: string): Promise<ExchangeTicker> {
    const data = await this.fetchJSON<{
      ticker: {
        high: string;
        low: string;
        vol: string;
        last: string;
        buy: string;
        sell: string;
        date: number;
      };
    }>(`${BASE_URL}/${encodeURIComponent(symbol)}/ticker`);

    return {
      exchange: this.exchange,
      symbol,
      price: Number(data.ticker.last ?? 0),
      priceChange24h: 0,
      volume24h: Number(data.ticker.vol ?? 0),
      high24h: Number(data.ticker.high ?? 0),
      low24h: Number(data.ticker.low ?? 0),
      timestamp: data.ticker.date * 1000,
    };
  }

  async getOrderBook(symbol: string, _limit = 100): Promise<ExchangeOrderBook> {
    try {
      const data = await this.fetchJSON<{
        bids: [number, number][];
        asks: [number, number][];
      }>(`${BASE_URL}/${encodeURIComponent(symbol)}/orderbook`);

      return {
        exchange: this.exchange,
        symbol,
        bids: data.bids.map(([price, volume]) => ({
          price,
          volume,
        })),
        asks: data.asks.map(([price, volume]) => ({
          price,
          volume,
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
      const data = await this.fetchJSON<Array<{
        tid: number;
        date: number;
        type: "buy" | "sell";
        amount: string;
        price: string;
      }>>(`${BASE_URL}/${encodeURIComponent(symbol)}/trades`);

      return data.slice(-limit).map((t) => ({
        exchange: this.exchange,
        tradeId: String(t.tid),
        symbol,
        side: t.type,
        price: Number(t.price),
        volume: Number(t.amount),
        timestamp: t.date * 1000,
      }));
    } catch {
      return [];
    }
  }

  async getTopPairs(): Promise<string[]> {
    return ["BTC", "ETH", "SOL", "XRP"];
  }
}
