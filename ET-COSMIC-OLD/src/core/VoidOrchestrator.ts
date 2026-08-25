/**
 * VØID Core — System Orchestrator
 *
 * O "Cérebro" do ecossistema. Unifica Identidade, Memória (HCN) e Sensaçāo (Drivers).
 * Resolve "The Glue Problem" centralizando o estado e o fluxo de dados.
 */

import { spawnGhostId, destroyGhostId, type GhostIdentity, type SpawnProgress } from "../crypto/ghostid";
import { fragmentMessage, type FragmentResult } from "../crypto/qel";
import { C3Engine, type C3Result } from "../crypto/c3Engine";
import { HCNStore, type HCNShard } from "../storage/hcnStore";
import { BluetoothDriver, NFCDriver, SerialUWBDriver } from "../network/localDrivers";
import { LoRaDriver } from "../network/loraDriver";
import { AcousticDriver } from "../network/acousticDriver";
import { nostrMesh } from "../network/nostrMesh";
import { DistanceBridge, type DistanceBridgeMetrics } from "../network/distanceBridge";
import { planQrcRoute } from "../qrc/qrcMotor";
import type { QrcSignedRoute } from "../qrc/qrcRoutePqc";
import { verifyQrcRouteSeal } from "../qrc/qrcRoutePqc";

// === Novos motores: O Livro do ETRNET ===

/** Resultado de envio com PQC (extensão de FragmentResult) */
export interface PQCSendResult extends FragmentResult {
  encapsulatedKey: Uint8Array;
  nonce: Uint8Array;
  tag: Uint8Array;
  senderMLKEMPubKey: Uint8Array;
  senderMLDSAPubKey: Uint8Array;
  signature: Uint8Array;
}

export type VoidEvent =
// ... (rest is same)
  | { type: "GHOST_SPAWNED"; identity: GhostIdentity }
  | { type: "GHOST_DESTROYED" }
  | { type: "SHARD_RECEIVED"; shard: HCNShard }
  | { type: "SHARD_SENT"; commitment: string; channel: string }
  | { type: "KARMA_UPDATED"; balance: number }
  | { type: "NETWORK_STATUS_CHANGE"; driver: string; status: "online" | "offline" | "scanning" }
  | { type: "COLLAPSE_EVENT"; operator: string; irreversibility: number }
  | { type: "LSC_UPDATE"; C_epsilon: number; P_current: number; K_eff: number };

export type VoidListener = (event: VoidEvent) => void;

export class VoidOrchestrator {
  private static instance: VoidOrchestrator;
  
  // State
  private identity: GhostIdentity | null = null;
  private hcnStore = new HCNStore();
  private listeners: Set<VoidListener> = new Set();

  // C3 — pipeline unificado PQC + QEL + ZK (ver c3Engine.ts)
  private c3Engine: C3Engine | null = null;
  private knownRecipientKeys: Map<string, Uint8Array> = new Map();

  // Drivers
  public readonly ble = new BluetoothDriver();
  public readonly nfc = new NFCDriver();
  public readonly uwb = new SerialUWBDriver();
  public readonly lora = new LoRaDriver();
  public readonly acoustic = new AcousticDriver();

  // Cross-Tab Mesh (Real Peer Simulation)
  private meshChannel = new BroadcastChannel("void_omega_mesh");
  private distanceBridge = new DistanceBridge({
    ble: this.ble,
    lora: this.lora,
    meshChannel: this.meshChannel,
    broadcastWebRTC: (shard) => nostrMesh.broadcastShard(shard),
    meshSender: () => this.identity?.handle || "anon_node",
  });

  private constructor() {
    this.initNetworkListeners();
    this.initMeshChannel();
  }

  private initMeshChannel() {
    this.meshChannel.onmessage = (event) => {
      const { type, payload, sender } = event.data;
      
      if (type === "PEER_DISCOVERY") {
        this.notify({ type: "NETWORK_STATUS_CHANGE", driver: `MESH:${sender}`, status: "online" });
      } else if (type === "SHARD_BROADCAST") {
        this.handleIncomingShard(payload, `MESH:${sender}`);
      }
    };

    // Broadcast our presence every 5s
    setInterval(() => {
      if (this.identity) {
        this.meshChannel.postMessage({
          type: "PEER_DISCOVERY",
          sender: this.identity.handle
        });
      }
    }, 5000);
  }

  public static getInstance(): VoidOrchestrator {
    if (!VoidOrchestrator.instance) {
      VoidOrchestrator.instance = new VoidOrchestrator();
    }
    return VoidOrchestrator.instance;
  }

  // --- Identity Management ---

  public getIdentity(): GhostIdentity | null {
    return this.identity;
  }

  public async spawn(onProgress?: (p: SpawnProgress) => void): Promise<GhostIdentity> {
    const id = await spawnGhostId(onProgress);
    this.identity = id;

    this.c3Engine = new C3Engine();

    this.notify({ type: "GHOST_SPAWNED", identity: id });
    return id;
  }

  public destroy(): void {
    if (this.identity) {
      destroyGhostId(this.identity);
      this.identity = null;
      if (this.c3Engine) {
        this.c3Engine.destroy();
        this.c3Engine = null;
      }
      this.knownRecipientKeys.clear();
      this.notify({ type: "GHOST_DESTROYED" });
    }
  }

  /** Registra a chave ML-KEM pública de um destinatário conhecido. */
  public registerRecipientKey(handle: string, publicKey: Uint8Array): void {
    this.knownRecipientKeys.set(handle, publicKey);
  }

  /** Retorna a chave ML-KEM pública do próprio nó (para compartilhar). */
  public getMLKEMPublicKey(): Uint8Array | null {
    return this.c3Engine?.getPublicKey() ?? null;
  }

  /** Retorna a chave ML-DSA pública do próprio nó (para verificação). */
  public getMLDSAPublicKey(): Uint8Array | null {
    return this.c3Engine?.getSigningPublicKey() ?? null;
  }

  /** Motor C3 ativo (null se GhostID não foi spawnado). */
  public getC3Engine(): C3Engine | null {
    return this.c3Engine;
  }

  // --- Messaging & Routing ---

  /**
   * Envia uma mensagem fragmentada através dos melhores canais disponíveis.
   * Se recipientMLKEMPubKey for fornecido, aplica criptografia Pós-Quântica (C3)
   * antes da fragmentação Shamir.
   */
  public async send(
    message: string,
    recipientMLKEMPubKey?: Uint8Array,
    recipientHandle?: string,
  ): Promise<FragmentResult | PQCSendResult> {
    if (!this.identity) throw new Error("GHOSTID_REQUIRED");

    const resolvedRecipientKey =
      recipientMLKEMPubKey ??
      (recipientHandle ? this.knownRecipientKeys.get(recipientHandle) : undefined);

    let result: FragmentResult | C3Result;
    let pqcMeta: Pick<PQCSendResult, "encapsulatedKey" | "nonce" | "tag" | "senderMLKEMPubKey" | "senderMLDSAPubKey" | "signature"> | null = null;

    if (resolvedRecipientKey && this.c3Engine) {
      const c3Result = this.c3Engine.send({
        payload: message,
        recipientMLKEMPubKey: resolvedRecipientKey,
      });
      result = c3Result;
      pqcMeta = {
        encapsulatedKey: c3Result.encapsulatedKey,
        nonce: c3Result.nonce,
        tag: c3Result.tag,
        senderMLKEMPubKey: c3Result.senderMLKEMPubKey,
        senderMLDSAPubKey: c3Result.senderMLDSAPubKey,
        signature: c3Result.signature,
      };
    } else {
      result = fragmentMessage(message);
    }

    // Roteamento QRC: geodésica STA sin² + Lieb-Robinson → Anderson
    for (let i = 0; i < result.shards.length; i++) {
      const shard = result.shards[i];
      if (!shard) continue;

      const qrc = planQrcRoute({ shardIndex: i, commitment: shard.commitment });
      let qrcSeal: QrcSignedRoute | undefined;
      if (this.c3Engine) {
        qrcSeal = this.c3Engine.sealQrcRoute(shard.commitment, i, qrc);
      }

      if (qrc.andersonCollapse) {
        this.notify({
          type: "COLLAPSE_EVENT",
          operator: "anderson_cage",
          irreversibility: qrc.liebRobinson.spreadRate / Math.max(qrc.liebRobinson.vLR, 1e-6),
        });
      }

      const route = await this.distanceBridge.routeShard(shard, i, qrc.preferredChannel);
      const channel = route.channel;
      if (route.fallbackUsed) {
        console.warn(
          `[Orchestrator] Fallback de transporte: preferido=${route.preferred} escolhido=${route.channel} tentativas=${route.attempted.join("->")}`,
        );
      }

      // Store in local HCN for relay (Carrier logic)
      const storedPayload = qrcSeal
        ? { ...shard, qrcSeal }
        : shard;
      await this.hcnStore.storeShard({
        commitment: shard.commitment,
        payload: btoa(JSON.stringify(storedPayload)),
        channel,
      });

      this.notify({ type: "SHARD_SENT", commitment: shard.commitment, channel });
    }

    if (pqcMeta) {
      return { ...result, ...pqcMeta };
    }

    return result;
  }

  // --- Network Event Loop ---

  private initNetworkListeners() {
    // Configura os drivers para reportar shards recebidos de volta ao orquestrador
    this.lora.onMessageReceived((sender, payload) => {
      try {
        const shard = JSON.parse(atob(payload));
        this.handleIncomingShard(shard, `LoRa:${sender}`);
      } catch { /* não é um shard VØID válido */ }
    });

    // Acoustic Scanner agora é ativado apenas via UI (gesto do usuário)
  }

  public async handleIncomingShard(shard: any, source: string) {
    if (!shard || !shard.commitment) return;

    if (shard.qrcSeal && !verifyQrcRouteSeal(shard.qrcSeal)) {
      console.warn(`[Orchestrator] qrcSeal inválido de ${source}: ${shard.commitment}`);
      return;
    }

    console.log(`[Orchestrator] Shard recebido de ${source}: ${shard.commitment}`);
    
    // 1. Salva no HCN Store (OPFS)
    await this.hcnStore.storeShard({
      commitment: shard.commitment,
      payload: btoa(JSON.stringify(shard)),
      channel: source,
    });

    // 2. Notifica o sistema
    this.notify({ 
      type: "SHARD_RECEIVED", 
      shard: {
        commitment: shard.commitment,
        payload: btoa(JSON.stringify(shard)),
        channel: source,
        createdAt: Date.now(),
        expiresAt: Date.now() + 48 * 3600 * 1000
      }
    });

    // 3. Recompensa o Carrier (Karma)
    const newBalance = await this.hcnStore.awardKarma(shard.commitment, 5);
    this.notify({ type: "KARMA_UPDATED", balance: newBalance });
  }

  // --- Event System ---

  public subscribe(listener: VoidListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Retorna métricas agregadas do DistanceBridge.
   */
  public getTransportMetrics(): DistanceBridgeMetrics {
    return this.distanceBridge.getMetrics();
  }

  /**
   * Reseta métricas de transporte (útil para benchmark/sessão).
   */
  public resetTransportMetrics(): void {
    this.distanceBridge.resetMetrics();
  }

  /** Plano QRC STA (sin² + LUT + LR) para um shard — STAUmpire. */
  public planShardRoute(shardIndex: number, commitment: string) {
    return planQrcRoute({ shardIndex, commitment });
  }

  private notify(event: VoidEvent) {
    this.listeners.forEach(l => l(event));
  }
}

export const voidOrchestrator = VoidOrchestrator.getInstance();
