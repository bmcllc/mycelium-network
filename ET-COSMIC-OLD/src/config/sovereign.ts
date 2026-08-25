/**
 * Configuração da stack soberana (docker-compose.sovereign.yml).
 *
 * Variáveis VITE_* são injetadas em build-time pelo Vite.
 * Em dev, use .env ou .env.sovereign na raiz do projeto.
 */

export interface SovereignConfig {
  /** Relay NOSTR primário (self-hosted) */
  primaryRelay: string;
  /** Relay de contingência */
  fallbackRelay: string;
  /** URI NWC (nostr+walletconnect://...) — opcional em build */
  nwcSecret: string | undefined;
  /** URL REST do LND (para bridge direto, fora do browser) */
  lndRestUrl: string | undefined;
  /** Rede Bitcoin: regtest | testnet | mainnet */
  bitcoinNetwork: "regtest" | "testnet" | "mainnet";
  /** Endereço do contrato ETRNETAnchor após deploy */
  anchorAddress: string | undefined;
}

function env(key: string): string | undefined {
  const v = import.meta.env[key];
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

/** Configuração soberana a partir de variáveis de ambiente. */
export function loadSovereignConfig(): SovereignConfig {
  const network = env("VITE_BITCOIN_NETWORK") ?? "regtest";
  const bitcoinNetwork =
    network === "mainnet" || network === "testnet" ? network : "regtest";

  return {
    primaryRelay: env("VITE_NOSTR_RELAY_PRIMARY") ?? "ws://localhost:7777",
    fallbackRelay: env("VITE_NOSTR_RELAY_FALLBACK") ?? "wss://relay.damus.io",
    nwcSecret: env("VITE_NWC_SECRET"),
    lndRestUrl: env("VITE_LND_REST_URL"),
    bitcoinNetwork,
    anchorAddress: env("VITE_ETRNET_ANCHOR_ADDRESS"),
  };
}

/** Relays ordenados: primário soberano primeiro, depois contingência. */
export function getSovereignRelays(): string[] {
  const cfg = loadSovereignConfig();
  const relays = [cfg.primaryRelay, cfg.fallbackRelay];
  return [...new Set(relays.filter(Boolean))];
}

/** Indica se há URI NWC pré-configurada para produção soberana. */
export function hasSovereignNwc(): boolean {
  return Boolean(loadSovereignConfig().nwcSecret?.startsWith("nostr+walletconnect://"));
}
