/**
 * Limitações conhecidas — PMU §7 (sincronizado com Protocolo_de_Malha_Unificado.pdf)
 *
 * Lightning, STARK recursivo e vHGPU estão cobertos por §3.7 (SLCC):
 * LDK-WASM + DistanceBridge, RecursiveSTARK, vHGPU terceirizada.
 */

export interface AmpLimitation {
  component: string;
  limitation: string;
  mitigation: string;
}

/** Tabela 7 do PMU — apenas limitações que permanecem após §3.7. */
export const AMP_KNOWN_LIMITATIONS: AmpLimitation[] = [
  {
    component: "BLE",
    limitation: "Disponível principalmente no Chrome; payload máximo ~26 bytes por pacote AD.",
    mitigation: "App Android nativo (Capacitor); fragmentar commitments; bulk via WebRTC/Nostr.",
  },
  {
    component: "Lightning",
    limitation: "ChannelManager LDK completo não roda em wasm32 puro (secp256k1-sys).",
    mitigation:
      "LDK-WASM (BOLT11) + DistanceBridge (WebRTC/Nostr/BLE) + LIG/EAM (NWC ou LND REST); ver `ldkWasmBridge.ts`.",
  },
  {
    component: "WebRTC",
    limitation: "Requer servidor de sinalização (pode ser self-hosted via Nostr).",
    mitigation: "Relay soberano; kinds 31217/31218 para mesh ETRNET.",
  },
  {
    component: "LoRa",
    limitation: "Necessita módulo de hardware e conexão Web Serial (não padrão).",
    mitigation: "Driver `loraDriver.ts` + hardware Reyax/Ebyte.",
  },
  {
    component: "WebGPU",
    limitation: "Disponível apenas em navegadores modernos com compute shaders.",
    mitigation: "Cadeia HCF: WebGPU → WASM SIMD → WASM puro (PMU §3.5.2); vHGPU terceirizada em SLCC.",
  },
  {
    component: "Legacy (LSA)",
    limitation: "Scraping automático viola PMU §3.9 e ToS de plataformas.",
    mitigation: "Importação só por arquivo/OAuth iniciado pelo usuário.",
  },
];

export const BLE_MAX_AD_BYTES = 26;
