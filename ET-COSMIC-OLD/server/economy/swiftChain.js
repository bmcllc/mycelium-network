/**
 * SwiftChain — Stablecoin local + Rede Lightning + Liquidez P2P Global
 *
 * Camada 1: Stablecoins locais (sBRL, sUSD, sEUR, sGBP) colateralizadas
 * Camada 2: Liquidity Providers (LPs) que mantêm contas reais
 * Camada 3: Roteamento P2P para transações internacionais
 * Camada 4: Integração mesh offline via CRDTs
 */

import crypto from "crypto";
import { transferWithFee, creditAccount, debitAccount } from "./sovLedger.js";
import { createPersistedStore, registerEconomyFlusher } from "./economyPersistence.js";

// ─── Stablecoin State ────────────────────────────────────────────────────────

const lpStore = createPersistedStore("swift-lps.json", { idField: "lpId" });
const txStore = createPersistedStore("swift-txs.json", { idField: "txId" });
const balStore = createPersistedStore("swift-balances.json", { idField: "accountId" });
registerEconomyFlusher(lpStore.flush);
registerEconomyFlusher(txStore.flush);
registerEconomyFlusher(balStore.flush);

/** Moedas suportadas */
const CURRENCIES = {
  BRL: { symbol: "sBRL", decimals: 2, peg: 1.0 },
  USD: { symbol: "sUSD", decimals: 2, peg: 1.0 },
  EUR: { symbol: "sEUR", decimals: 2, peg: 1.0 },
  GBP: { symbol: "sGBP", decimals: 2, peg: 1.0 },
};

/** Taxas de câmbio base (fallback offline). Atualizadas via NostrOracle quando online. */
const FX_RATES = {
  BRL_USD: 5.0,
  BRL_EUR: 5.4,
  BRL_GBP: 6.3,
  USD_EUR: 0.92,
  USD_GBP: 0.79,
  EUR_GBP: 0.86,
};

// ─── Liquidity Providers ─────────────────────────────────────────────────────

/**
 * Registra um LP (Liquidity Provider).
 * LPs mantêm contas bancárias reais e emitem stablecoins.
 */
export function registerLP(body = {}) {
  const lpId = body.lpId ?? `lp-${Date.now().toString(32)}`;
  const lp = {
    lpId,
    name: body.name ?? "Anonymous LP",
    currencies: body.currencies ?? ["BRL"],
    bondMicro: Math.floor((body.bondSov ?? 0) * 1_000_000),
    issuedMicro: 0,
    reputation: 0,
    totalVolume: 0,
    txCount: 0,
    active: true,
    createdAt: Date.now(),
    lastAudit: Date.now(),
  };
  lpStore.map.set(lpId, lp);
  lpStore.schedule();
  return lp;
}

/** Lista LPs ativos. */
export function listLPs(currency) {
  let lps = [...lpStore.map.values()].filter(lp => lp.active);
  if (currency) lps = lps.filter(lp => lp.currencies.includes(currency));
  return lps.sort((a, b) => b.reputation - a.reputation);
}

// ─── Stablecoin Mint/Burn ────────────────────────────────────────────────────

/**
 * Mint stablecoins. LP emite sXXX para usuário após receber pagamento local (PIX/SEPA/etc).
 */
export function mintStable(lpId, accountId, currency, amountLocal) {
  const lp = lpStore.map.get(lpId);
  if (!lp || !lp.active) return { error: "LP_NOT_FOUND" };
  if (!CURRENCIES[currency]) return { error: "UNSUPPORTED_CURRENCY", supported: Object.keys(CURRENCIES) };

  const amountMicro = Math.floor(amountLocal * 1_000_000);
  const colRatio = lp.issuedMicro > 0 ? (lp.bondMicro / lp.issuedMicro) : 999;

  // Verificar colateralização mínima (110%)
  if (lp.issuedMicro > 0 && colRatio < 1.1) {
    return { error: "INSUFFICIENT_COLLATERAL", ratio: colRatio, minimum: 1.1 };
  }

  // Creditar stablecoin no balance do usuário
  const key = `${accountId}:${currency}`;
  let bal = balStore.map.get(key) ?? { accountId, currency, micro: 0 };
  bal.micro += amountMicro;
  balStore.map.set(key, bal);
  balStore.schedule();

  // Atualizar LP
  lp.issuedMicro += amountMicro;
  lp.totalVolume += amountMicro;
  lp.txCount += 1;
  lp.reputation = Math.min(1000, lp.reputation + 1);
  lpStore.map.set(lpId, lp);
  lpStore.schedule();

  // Registrar transação
  const txId = `mint-${Date.now().toString(32)}`;
  txStore.map.set(txId, {
    txId, type: "mint", lpId, accountId, currency, amountMicro, amountLocal,
    timestamp: Date.now(), status: "completed",
  });
  txStore.schedule();

  return {
    txId, type: "mint", lpId, accountId,
    currency, symbol: CURRENCIES[currency].symbol,
    amountMicro, amountLocal,
    newBalance: bal.micro / 1_000_000,
  };
}

/**
 * Burn stablecoins. Usuário queima sXXX e recebe pagamento local do LP.
 */
export function burnStable(lpId, accountId, currency, amountLocal) {
  const lp = lpStore.map.get(lpId);
  if (!lp || !lp.active) return { error: "LP_NOT_FOUND" };

  const amountMicro = Math.floor(amountLocal * 1_000_000);
  const key = `${accountId}:${currency}`;
  const bal = balStore.map.get(key);

  if (!bal || bal.micro < amountMicro) {
    return { error: "INSUFFICIENT_STABLECOIN", available: (bal?.micro ?? 0) / 1_000_000 };
  }

  // Debitar stablecoin
  bal.micro -= amountMicro;
  balStore.map.set(key, bal);
  balStore.schedule();

  // Atualizar LP
  lp.issuedMicro = Math.max(0, lp.issuedMicro - amountMicro);
  lp.txCount += 1;
  lpStore.map.set(lpId, lp);
  lpStore.schedule();

  const txId = `burn-${Date.now().toString(32)}`;
  txStore.map.set(txId, {
    txId, type: "burn", lpId, accountId, currency, amountMicro, amountLocal,
    timestamp: Date.now(), status: "completed",
  });
  txStore.schedule();

  return {
    txId, type: "burn", lpId, accountId,
    currency, symbol: CURRENCIES[currency].symbol,
    amountMicro, amountLocal,
    newBalance: bal.micro / 1_000_000,
  };
}

// ─── Transferência P2P Internacional ─────────────────────────────────────────

/**
 * Transfere stablecoins entre usuários.
 * Se moedas diferentes, converte via FX rates.
 * Taxa de protocolo: 0.1%
 */
export function transferStable(fromId, toId, fromCurrency, toCurrency, amountLocal) {
  const fromKey = `${fromId}:${fromCurrency}`;
  const fromBal = balStore.map.get(fromKey);
  const amountMicro = Math.floor(amountLocal * 1_000_000);

  if (!fromBal || fromBal.micro < amountMicro) {
    return { error: "INSUFFICIENT_BALANCE", available: (fromBal?.micro ?? 0) / 1_000_000 };
  }

  // Calcular conversão
  let convertedAmount = amountLocal;
  let fxRate = 1.0;
  if (fromCurrency !== toCurrency) {
    const pair = `${fromCurrency}_${toCurrency}`;
    const reversePair = `${toCurrency}_${fromCurrency}`;
    if (FX_RATES[pair]) {
      fxRate = FX_RATES[pair];
      convertedAmount = amountLocal * fxRate;
    } else if (FX_RATES[reversePair]) {
      fxRate = 1 / FX_RATES[reversePair];
      convertedAmount = amountLocal * fxRate;
    } else {
      // Via USD como intermediário
      const toUsd = FX_RATES[`${fromCurrency}_USD`] ?? (1 / (FX_RATES[`USD_${fromCurrency}`] ?? 1));
      const fromUsd = FX_RATES[`USD_${toCurrency}`] ?? (1 / (FX_RATES[`${toCurrency}_USD`] ?? 1));
      fxRate = toUsd * fromUsd;
      convertedAmount = amountLocal * fxRate;
    }
  }

  // Taxa de protocolo: 0.1%
  const feeMicro = Math.floor(amountMicro * 0.001);
  const netMicro = amountMicro - feeMicro;
  const toMicro = Math.floor(convertedAmount * 1_000_000);

  // Debitar remetente
  fromBal.micro -= amountMicro;
  balStore.map.set(fromKey, fromBal);

  // Creditar destinatário
  const toKey = `${toId}:${toCurrency}`;
  let toBal = balStore.map.get(toKey) ?? { accountId: toId, currency: toCurrency, micro: 0 };
  toBal.micro += toMicro;
  balStore.map.set(toKey, toBal);
  balStore.schedule();

  // Protocol fee → $SOV treasury
  creditAccount("treasury:montelauro", feeMicro, "swiftchain:fee");

  const txId = `tx-${Date.now().toString(32)}`;
  txStore.map.set(txId, {
    txId, type: "transfer", fromId, toId, fromCurrency, toCurrency,
    amountMicro, convertedMicro: toMicro, fxRate, feeMicro,
    timestamp: Date.now(), status: "completed",
  });
  txStore.schedule();

  return {
    txId, fromId, toId, fromCurrency, toCurrency,
    symbol: CURRENCIES[toCurrency]?.symbol ?? toCurrency,
    sent: amountLocal, received: convertedAmount, fxRate,
    fee: feeMicro / 1_000_000,
    fromBalance: fromBal.micro / 1_000_000,
    toBalance: toBal.micro / 1_000_000,
  };
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export function getStableBalance(accountId, currency) {
  const key = `${accountId}:${currency}`;
  const bal = balStore.map.get(key);
  return { accountId, currency, symbol: CURRENCIES[currency]?.symbol, balance: (bal?.micro ?? 0) / 1_000_000 };
}

export function getAllBalances(accountId) {
  const balances = {};
  for (const cur of Object.keys(CURRENCIES)) {
    balances[cur] = getStableBalance(accountId, cur);
  }
  return balances;
}

export function getSwiftChainStatus() {
  const lps = [...lpStore.map.values()];
  const txs = [...txStore.map.values()];
  const totalIssued = {};
  for (const cur of Object.keys(CURRENCIES)) {
    totalIssued[cur] = lps
      .filter(lp => lp.currencies.includes(cur))
      .reduce((sum, lp) => sum + lp.issuedMicro, 0) / 1_000_000;
  }
  return {
    currencies: CURRENCIES,
    fxRates: FX_RATES,
    activeLPs: lps.filter(lp => lp.active).length,
    totalTransactions: txs.length,
    totalIssued,
    protocolFee: "0.1%",
  };
}

export function getTxHistory(accountId, limit = 50) {
  return [...txStore.map.values()]
    .filter(tx => tx.accountId === accountId || tx.fromId === accountId || tx.toId === accountId)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
}

export function flushSwiftChain() {
  lpStore.flush();
  txStore.flush();
  balStore.flush();
}
