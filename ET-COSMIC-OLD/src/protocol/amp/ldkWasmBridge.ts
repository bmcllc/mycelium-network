/**
 * LDK-WASM + DistanceBridge — PMU §3.7.3
 *
 * Nó Lightning não-custodial: BOLT11 em WASM (void_core), canais via LND REST/NWC,
 * transporte P2P encapsulado em WebRTC/Nostr/BLE (DistanceBridge) — contorna falta de TCP no navegador.
 */

import { getChannelBackend, ldkChannelFacade } from "../../crypto/ldkChannelFacade";
import { loadSovereignConfig } from "../../config/sovereign";

export type LightningBackend =
  | "ldk_wasm_distance_bridge"
  | "nwc_only"
  | "unconfigured";

export function getLightningBackend(): LightningBackend {
  const cfg = loadSovereignConfig();
  const hasNwc = Boolean(cfg.nwcSecret);
  const hasLnd = getChannelBackend() === "lnd_rest";

  if (hasLnd) return "ldk_wasm_distance_bridge";
  if (hasNwc) return "nwc_only";
  return "unconfigured";
}

export function isLdkWasmDistanceBridgeReady(): boolean {
  return getLightningBackend() === "ldk_wasm_distance_bridge";
}

export const ldkWasmBridge = {
  getBackend: getLightningBackend,
  facade: ldkChannelFacade,
  /** BOLT11 parse/validate em WASM; pagamentos via LIG (NWC ou LND REST). */
  description:
    "LDK-WASM (invoice) + DistanceBridge (mesh) + LIG/EAM (NWC/LND). Sem seed no JavaScript.",
};
