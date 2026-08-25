/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_NOSTR_RELAY_PRIMARY?: string;
  readonly VITE_NOSTR_RELAY_FALLBACK?: string;
  readonly VITE_NWC_SECRET?: string;
  readonly VITE_LND_REST_URL?: string;
  readonly VITE_LND_MACAROON_HEX?: string;
  readonly VITE_BITCOIN_NETWORK?: string;
  readonly VITE_ETRNET_ANCHOR_ADDRESS?: string;
  readonly VITE_QUANTUM_API_URL?: string;
  readonly VITE_QUANTUM_DEV?: string;
  /** true = Harmonia offline no APK (sem CQR remoto) */
  readonly VITE_COSMIC_SOVEREIGN?: string;
  /** Base path GitHub Pages (ex. /ET-COSMIC/) */
  readonly VITE_PAGES_BASE?: string;
  /** Origin VPS opcional para APIs em Pages */
  readonly VITE_PAGES_API_ORIGIN?: string;
  readonly VITE_API_BASE?: string;
  readonly VITE_ECONOMY_API?: string;
  readonly VITE_MESH_LIQUIDITY_API?: string;
  readonly VITE_SOV_VAS_DEMO?: string;
  readonly VITE_SOV_DEPOSIT_DEMO?: string;
  readonly VITE_QUANTUM_SOVEREIGN?: string;
  readonly VITE_ENABLE_NOSTR_MESH?: string;
  readonly VITE_NOSTR_RELAY_DISCOVERY?: string;
  readonly VITE_AMP_ALLOW_LEGACY_SCRAPE?: string;
  /** CSV ou JSON array — filtra painéis no build white-label (ex.: VOID-11,VOID-57) */
  readonly VITE_B2B_SKUS?: string;
}

declare const __B2B_SKUS__: string;
declare const __B2B_SLIM_SHELL__: boolean;
declare const __B2B_SINGLE_ENTRY__: string;

declare module "virtual:b2b-panel-loaders" {
  import type { ComponentType } from "react";
  export type PanelLoader = () => Promise<{ default: ComponentType }>;
  export const B2B_PANEL_LOADERS: Record<string, PanelLoader>;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
