/**
 * Ponte de compatibilidade → CGF/DCC (Protocolo de Malha Unificado)
 *
 * Escopos legados mapeados para níveis do reticulado (⊑).
 * Recibos SHA3-256 em OPFS via consentReceiptStore.
 */

import {
  LATTICE_LEVEL,
  type LatticeLevel,
  LATTICE_LEVEL_LABELS,
  assertOperationAllowed,
  type AmpOperation,
} from "../protocol/amp/consentLattice";
import {
  ConsentReceiptStore,
  consentReceiptStore,
} from "../protocol/amp/consentReceiptStore";

export const CONSENT_CONTRACT_VERSION = "amp-cgf-1.0.0";

/** @deprecated Use LatticeLevel — mantido para UI legada */
export type ConsentScope =
  | "BIOMETRIC_ENTROPY"
  | "QUANTUM_SIMULATION"
  | "BLE_CARRIER"
  | "NATIVE_BACKGROUND"
  | "ANIMUS_PERSISTENCE"
  | "SYMBIONT_SERVICE_WORKER"
  | "WEBGPU_COMPUTE"
  | "HGPU_RESEARCH_LAB"
  | "ZK_STARK_RESEARCH"
  | "LDK_LND_REMOTE"
  | "LEGACY_IMPORT";

const SCOPE_TO_LEVEL: Record<ConsentScope, LatticeLevel> = {
  BIOMETRIC_ENTROPY: LATTICE_LEVEL.IDENTITY_COLLECTION,
  QUANTUM_SIMULATION: LATTICE_LEVEL.DIFFERENTIAL_COMPUTATION,
  BLE_CARRIER: LATTICE_LEVEL.ANTIENTROPIC_SYNC,
  NATIVE_BACKGROUND: LATTICE_LEVEL.RESOURCE_SCAVENGING,
  ANIMUS_PERSISTENCE: LATTICE_LEVEL.ANTIENTROPIC_SYNC,
  SYMBIONT_SERVICE_WORKER: LATTICE_LEVEL.RESOURCE_SCAVENGING,
  WEBGPU_COMPUTE: LATTICE_LEVEL.HETEROGENEOUS_COMPUTE,
  HGPU_RESEARCH_LAB: LATTICE_LEVEL.HETEROGENEOUS_COMPUTE,
  ZK_STARK_RESEARCH: LATTICE_LEVEL.VERIFIABLE_STATE,
  LDK_LND_REMOTE: LATTICE_LEVEL.ECONOMIC_ATTENTION,
  LEGACY_IMPORT: LATTICE_LEVEL.LEGACY_BRIDGE,
};

const SCOPE_TO_OP: Record<ConsentScope, AmpOperation> = {
  BIOMETRIC_ENTROPY: "spawn_identity",
  QUANTUM_SIMULATION: "quantum_sim",
  BLE_CARRIER: "ble_advertise",
  NATIVE_BACKGROUND: "symbiont_cycles",
  ANIMUS_PERSISTENCE: "crdt_merge",
  SYMBIONT_SERVICE_WORKER: "symbiont_cycles",
  WEBGPU_COMPUTE: "webgpu_compute",
  HGPU_RESEARCH_LAB: "webgpu_compute",
  ZK_STARK_RESEARCH: "merkle_fossilize",
  LDK_LND_REMOTE: "nwc_payment",
  LEGACY_IMPORT: "legacy_import",
};

export interface ConsentClause {
  scope: ConsentScope;
  title: string;
  summary: string;
  dataCollected: string[];
  notIncluded: string[];
  retention: string;
  revokeHint: string;
  latticeLevel: LatticeLevel;
}

export const CONSENT_CLAUSES: ConsentClause[] = [
  {
    scope: "BIOMETRIC_ENTROPY",
    latticeLevel: LATTICE_LEVEL.IDENTITY_COLLECTION,
    title: LATTICE_LEVEL_LABELS[1],
    summary: "Entropia de hardware (acelerómetro, ruído de microfone, toque). Sem reconhecimento biométrico.",
    dataCollected: ["Jitter MEMS", "Piso de ruído", "Delta de toque"],
    notIncluded: ["Gravação de voz", "Face ID", "Nuvem"],
    retention: "RAM + OPFS cifrado",
    revokeHint: "Revogue e destrua GhostID",
  },
  {
    scope: "QUANTUM_SIMULATION",
    latticeLevel: LATTICE_LEVEL.DIFFERENTIAL_COMPUTATION,
    title: "Simulação quântica (lab)",
    summary: "Bell/BB84 simulados — não é hardware quântico.",
    dataCollected: ["Bytes aleatórios locais/backend"],
    notIncluded: ["QKD físico", "IBM QRNG sem chave"],
    retention: "Sessão",
    revokeHint: "Revogue nível 2+",
  },
  {
    scope: "BLE_CARRIER",
    latticeLevel: LATTICE_LEVEL.ANTIENTROPIC_SYNC,
    title: "BLE carrier (≤26 B)",
    summary: "Advertising BLE conforme PMU §7.",
    dataCollected: ["Commitment truncado"],
    notIncluded: ["GPS", "Scan passivo"],
    retention: "Serviço ativo",
    revokeHint: "Pare Animus",
  },
  {
    scope: "NATIVE_BACKGROUND",
    latticeLevel: LATTICE_LEVEL.RESOURCE_SCAVENGING,
    title: "Serviço Android 1º plano",
    summary: "Notificação persistente; sem execução oculta.",
    dataCollected: ["Heartbeat mesh"],
    notIncluded: ["Root", "Sem notificação"],
    retention: "Até parar",
    revokeHint: "Revogue nível 7+",
  },
  {
    scope: "ANIMUS_PERSISTENCE",
    latticeLevel: LATTICE_LEVEL.ANTIENTROPIC_SYNC,
    title: "Persistência local (stego)",
    summary: "LSB em imagens locais apenas.",
    dataCollected: ["Checksum WASM"],
    notIncluded: ["Injeção em terceiros"],
    retention: "Até apagar",
    revokeHint: "Revogue",
  },
  {
    scope: "SYMBIONT_SERVICE_WORKER",
    latticeLevel: LATTICE_LEVEL.RESOURCE_SCAVENGING,
    title: "Service Worker local",
    summary: "Integridade WASM offline — sem propagação.",
    dataCollected: ["Hash SHA-256"],
    notIncluded: ["eBPF", "Malware"],
    retention: "Cache SW",
    revokeHint: "Desregistre SW",
  },
  {
    scope: "WEBGPU_COMPUTE",
    latticeLevel: LATTICE_LEVEL.HETEROGENEOUS_COMPUTE,
    title: "HCF — WebGPU",
    summary: "Álgebra linear clássica na GPU.",
    dataCollected: ["Telemetria local"],
    notIncluded: ["Mineração oculta"],
    retention: "Sessão",
    revokeHint: "Revogue",
  },
  {
    scope: "HGPU_RESEARCH_LAB",
    latticeLevel: LATTICE_LEVEL.HETEROGENEOUS_COMPUTE,
    title: "vHGPU terceirizada (SLCC)",
    summary: "Worker WebGPU nos dados do cliente; PoH geométrico (PMU §3.7.3).",
    dataCollected: ["Parâmetros SDF", "Telemetria de frame"],
    notIncluded: ["Dados brutos enviados a servidor central"],
    retention: "Sessão",
    revokeHint: "Revogue",
  },
  {
    scope: "ZK_STARK_RESEARCH",
    latticeLevel: LATTICE_LEVEL.VERIFIABLE_STATE,
    title: "VSC — RecursiveSTARK",
    summary: "C = g^v h^r + Bulletproofs; composição recursiva via void_core (SLCC §3.7).",
    dataCollected: ["Merkle roots", "Provas compostas"],
    notIncluded: ["Consenso global O(1)", "Oráculo central"],
    retention: "EcoNet",
    revokeHint: "Revogue",
  },
  {
    scope: "LEGACY_IMPORT",
    latticeLevel: LATTICE_LEVEL.LEGACY_BRIDGE,
    title: "Importação legada (manual)",
    summary:
      "Importar contactos JSON/CSV iniciado por si. Scraping automático permanece bloqueado (LSA §3.9).",
    dataCollected: ["Lista de contactos que você escolheu importar"],
    notIncluded: ["Scraping de terceiros", "Harvest automático"],
    retention: "IndexedDB local",
    revokeHint: "Revogue nível 8+ ou apague contactos",
  },
  {
    scope: "LDK_LND_REMOTE",
    latticeLevel: LATTICE_LEVEL.ECONOMIC_ATTENTION,
    title: "LIG/EAM — LDK-WASM + NWC",
    summary: "BOLT11 em WASM; canais via NWC/LND REST; transporte P2P via DistanceBridge.",
    dataCollected: ["Invoices, saldo via macaroon"],
    notIncluded: ["Seed no browser"],
    retention: "Política do nó",
    revokeHint: "Revogue macaroon",
  },
];

export interface ConsentRecord {
  version: string;
  grantedScopes: ConsentScope[];
  signedAt: number;
  locale: string;
  signatureHex: string;
  revokedAt: number | null;
  maxLevelGranted: LatticeLevel;
}

export class ConsentContract {
  private static instance: ConsentContract;

  public static getInstance(): ConsentContract {
    if (!ConsentContract.instance) {
      ConsentContract.instance = new ConsentContract();
    }
    return ConsentContract.instance;
  }

  public getRecord(): ConsentRecord | null {
    const r = consentReceiptStore.getReceipt();
    if (!r) return null;
    const grantedScopes =
      r.grantedScopeKeys.length > 0
        ? (r.grantedScopeKeys as ConsentScope[])
        : ((Object.keys(SCOPE_TO_LEVEL) as ConsentScope[]).filter(
            (s) => SCOPE_TO_LEVEL[s] <= r.maxLevelGranted,
          ));
    return {
      version: r.version,
      grantedScopes,
      signedAt: r.signedAt,
      locale: r.locale,
      signatureHex: r.receiptHash,
      revokedAt: r.revokedAt,
      maxLevelGranted: r.maxLevelGranted,
    };
  }

  public getClause(scope: ConsentScope): ConsentClause | undefined {
    return CONSENT_CLAUSES.find((c) => c.scope === scope);
  }

  public hasConsent(scope: ConsentScope): boolean {
    try {
      assertOperationAllowed(consentReceiptStore.getMaxLevel(), SCOPE_TO_OP[scope]);
      return true;
    } catch {
      return false;
    }
  }

  public requireConsent(scope: ConsentScope): void {
    assertOperationAllowed(consentReceiptStore.getMaxLevel(), SCOPE_TO_OP[scope]);
  }

  /** Assina pelo nível máximo do reticulado (PMU). */
  public async sign(grantedScopes: ConsentScope[]): Promise<ConsentRecord> {
    let maxLevel: LatticeLevel = LATTICE_LEVEL.NONE;
    for (const s of grantedScopes) {
      maxLevel = Math.max(maxLevel, SCOPE_TO_LEVEL[s]) as LatticeLevel;
    }
    await consentReceiptStore.sign(maxLevel, grantedScopes);
    return this.getRecord()!;
  }

  /** Preset PMU: garante nível máximo explícito (ex.: Núcleo v1 = 10). */
  public async signPreset(maxLevel: LatticeLevel): Promise<ConsentRecord> {
    const grantedScopes = CONSENT_CLAUSES.filter((c) => c.latticeLevel <= maxLevel).map(
      (c) => c.scope,
    );
    let computed: LatticeLevel = LATTICE_LEVEL.NONE;
    for (const s of grantedScopes) {
      computed = Math.max(computed, SCOPE_TO_LEVEL[s]) as LatticeLevel;
    }
    const effective = Math.max(maxLevel, computed) as LatticeLevel;
    await consentReceiptStore.sign(effective, grantedScopes);
    return this.getRecord()!;
  }

  public async revokeAll(): Promise<void> {
    await consentReceiptStore.revoke();
  }

  public async revokeScopes(scopes: ConsentScope[]): Promise<void> {
    const record = this.getRecord();
    if (!record) return;
    const remaining = record.grantedScopes.filter((s) => !scopes.includes(s));
    if (remaining.length === 0) {
      await this.revokeAll();
      return;
    }
    await this.sign(remaining);
  }

  public exportRecord(): string {
    return consentReceiptStore.exportJson();
  }

  public getMaxLatticeLevel(): LatticeLevel {
    return consentReceiptStore.getMaxLevel();
  }
}

export const consentContract = ConsentContract.getInstance();

export function resetConsentContractForTests(): void {
  localStorage.removeItem("void_consent_contract_v1");
  ConsentReceiptStore.resetForTests();
  delete (ConsentContract as unknown as { instance?: ConsentContract }).instance;
}

export {
  LATTICE_LEVEL,
  LATTICE_LEVEL_LABELS,
  CORE_V1_MAX_LEVEL,
  LAB_MAX_LEVEL,
} from "../protocol/amp/consentLattice";
export { AMP_KNOWN_LIMITATIONS, BLE_MAX_AD_BYTES } from "../protocol/amp/knownLimitations";
export { assertPipelineStage, getPipelineStatus } from "../protocol/amp/ampPipeline";
export { RecursiveSTARK } from "../protocol/amp/recursiveStark";
export { ldkWasmBridge, getLightningBackend } from "../protocol/amp/ldkWasmBridge";
export { vHGPUClient } from "../protocol/amp/vhgpuClient";
export { slccChannel, SLCCChannel } from "../protocol/amp/slcc";
