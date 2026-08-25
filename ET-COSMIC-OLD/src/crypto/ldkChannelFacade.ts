/**
 * LDK Channel Facade — LDK-WASM + LIG/EAM (PMU §3.6.2 / §3.7.3)
 *
 * - BOLT11 parse/validate em WASM (void_core / lightning-invoice)
 * - Canais e pagamentos via LND REST (ldkBridge) — chaves no nó, não no JS
 * - Transporte P2P: DistanceBridge (WebRTC/Nostr/BLE) — ver `ldkWasmBridge.ts`
 *
 * ChannelManager monolítico em wasm32 puro permanece limitado (secp256k1-sys).
 */

import { consentContract } from "../ethics/consentContract";
import { loadSovereignConfig } from "../config/sovereign";
import {
  ldkBridge,
  type LDKChannel,
  type LDKInvoice,
  type LDKNodeInfo,
  type LDKPaymentResult,
} from "./ldkBridge";

export interface ParsedBolt11 {
  amountSat: number;
  description: string;
  paymentHash: string;
  timestamp: number;
  expiry: number;
  network: string;
}

export type ChannelBackend = "lnd_rest" | "unconfigured";

/** Configura LND a partir do ambiente soberano quando disponível. */
export function configureLdkFromSovereignEnv(): boolean {
  const cfg = loadSovereignConfig();
  const macaroon = import.meta.env.VITE_LND_MACAROON_HEX as string | undefined;
  if (!cfg.lndRestUrl || !macaroon) return false;
  ldkBridge.configure(cfg.lndRestUrl, macaroon);
  return true;
}

export async function parseBolt11Invoice(bolt11: string): Promise<ParsedBolt11> {
  try {
    const wasm = await import("void_core");
    await wasm.default();
    if (typeof wasm.parse_bolt11 === "function") {
      const json = wasm.parse_bolt11(bolt11) as string;
      const parsed = JSON.parse(json) as ParsedBolt11;
      return parsed;
    }
  } catch {
    /* fallback abaixo */
  }

  if (!bolt11.toLowerCase().startsWith("ln")) {
    throw new Error("BOLT11 inválido: prefixo ln esperado");
  }
  return {
    amountSat: 0,
    description: "[parse WASM indisponível — rode npm run build:wasm]",
    paymentHash: "",
    timestamp: Math.floor(Date.now() / 1000),
    expiry: 3600,
    network: "unknown",
  };
}

export async function validateBolt11(bolt11: string): Promise<boolean> {
  try {
    const wasm = await import("void_core");
    if (typeof wasm.validate_bolt11 === "function") {
      return wasm.validate_bolt11(bolt11);
    }
  } catch {
    /* fallback regex */
  }
  return /^ln(bc|tb|bcrt|sb)?[0-9a-z]+$/i.test(bolt11.trim());
}

export function getChannelBackend(): ChannelBackend {
  return configureLdkFromSovereignEnv() ? "lnd_rest" : "unconfigured";
}

export class LdkChannelFacade {
  private static instance: LdkChannelFacade;

  public static getInstance(): LdkChannelFacade {
    if (!LdkChannelFacade.instance) {
      LdkChannelFacade.instance = new LdkChannelFacade();
    }
    return LdkChannelFacade.instance;
  }

  private requireLndConsent(): void {
    consentContract.requireConsent("LDK_LND_REMOTE");
  }

  public async getNodeInfo(): Promise<LDKNodeInfo> {
    this.requireLndConsent();
    configureLdkFromSovereignEnv();
    return ldkBridge.getNodeInfo();
  }

  public async listChannels(): Promise<LDKChannel[]> {
    this.requireLndConsent();
    configureLdkFromSovereignEnv();
    return ldkBridge.listChannels();
  }

  public async createInvoice(amountSat: number, memo: string): Promise<LDKInvoice> {
    this.requireLndConsent();
    configureLdkFromSovereignEnv();
    return ldkBridge.createInvoice(amountSat, memo);
  }

  public async payInvoice(bolt11: string): Promise<LDKPaymentResult> {
    this.requireLndConsent();
    await parseBolt11Invoice(bolt11);
    configureLdkFromSovereignEnv();
    return ldkBridge.payInvoice(bolt11);
  }

  public async openChannel(
    nodePubkey: string,
    amountSat: number,
    pushSat = 0,
  ): Promise<string> {
    this.requireLndConsent();
    configureLdkFromSovereignEnv();
    const opened = await ldkBridge.openChannel(nodePubkey, amountSat, pushSat);
    return opened.fundingTxid;
  }
}

export const ldkChannelFacade = LdkChannelFacade.getInstance();
