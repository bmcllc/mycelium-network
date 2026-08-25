/**
 * SwiftChain Client — Stablecoins locais + pagamento multi-moeda
 */

const API = import.meta.env.VITE_API_ORIGIN ?? "";

// ─── API calls ───────────────────────────────────────────────────────────────

export async function getSwiftChainStatus() {
  const res = await fetch(`${API}/api/economy/swift/status`);
  return res.json();
}

export async function getSwiftLPs(currency?: string) {
  const url = currency ? `${API}/api/economy/swift/lps?currency=${currency}` : `${API}/api/economy/swift/lps`;
  const res = await fetch(url);
  return res.json();
}

export async function registerSwiftLP(lp: { name?: string; currencies?: string[]; bondSov?: number }) {
  const res = await fetch(`${API}/api/economy/swift/lps/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(lp),
  });
  return res.json();
}

export async function mintStable(lpId: string, accountId: string, currency: string, amountLocal: number) {
  const res = await fetch(`${API}/api/economy/swift/mint`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lpId, accountId, currency, amountLocal }),
  });
  return res.json();
}

export async function burnStable(lpId: string, accountId: string, currency: string, amountLocal: number) {
  const res = await fetch(`${API}/api/economy/swift/burn`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lpId, accountId, currency, amountLocal }),
  });
  return res.json();
}

export async function transferStable(
  fromId: string, toId: string, fromCurrency: string, toCurrency: string, amountLocal: number
) {
  const res = await fetch(`${API}/api/economy/swift/transfer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fromId, toId, fromCurrency, toCurrency, amountLocal }),
  });
  return res.json();
}

export async function getStableBalances(accountId: string) {
  const res = await fetch(`${API}/api/economy/swift/balance/${accountId}`);
  return res.json();
}

export async function getTxHistory(accountId: string, limit = 50) {
  const res = await fetch(`${API}/api/economy/swift/history/${accountId}?limit=${limit}`);
  return res.json();
}

// ─── Payment methods ─────────────────────────────────────────────────────────

export async function payWithMethod(
  method: "sov" | "lightning" | "stablecoin",
  accountId: string,
  productId: string,
  amount: number,
  currency?: string
) {
  const res = await fetch(`${API}/api/economy/pay`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ method, accountId, productId, amount, currency }),
  });
  return res.json();
}

// ─── Local account ID ────────────────────────────────────────────────────────

export function getOrCreateAccountId(): string {
  if (typeof localStorage === "undefined") return "anonymous";
  let id = localStorage.getItem("etrnet:accountId");
  if (!id) {
    id = `user:${crypto.randomUUID()}`;
    localStorage.setItem("etrnet:accountId", id);
  }
  return id;
}
