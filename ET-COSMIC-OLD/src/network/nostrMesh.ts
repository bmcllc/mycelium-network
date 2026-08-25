/**
 * VØID·ΩMEGA — Global Mesh via NOSTR + WebRTC (Stratum 4)
 *
 * Resolve o problema do NAT e alcance global. Usa relays NOSTR públicos
 * apenas para signaling (troca de ICE candidates e SDPs). Depois que os
 * nós conectam via WebRTC, a comunicação é 100% P2P e invisível aos relays.
 *
 * Features:
 * - Relay health monitoring (ping a cada 30s, marca unhealthy após 3 falhas)
 * - Relay list configurável (constructor ou setter)
 * - Relay discovery via NOSTR kind 10002
 * - Reconnection com backoff exponencial
 */

import { SimplePool, generateSecretKey, getPublicKey, finalizeEvent, nip04 } from 'nostr-tools';
import { voidOrchestrator } from '../core/VoidOrchestrator';
import { getSovereignRelays } from '../config/sovereign';
import {
  KIND_MESH_CONTROL,
  KIND_MESH_DATA,
  TAG_QEL_SHARD,
  TAG_VOID_RENDEZVOUS,
} from './etrnetKinds';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RelayHealth {
  url: string;
  healthy: boolean;
  consecutiveFailures: number;
  lastPing: number;
  lastSuccess: number;
  latencyMs: number;
}

// ─── NostrWebRTCMesh ──────────────────────────────────────────────────────────

export class NostrWebRTCMesh {
  private pool = new SimplePool();
  private relays: string[] = getSovereignRelays();

  private relayHealth: Map<string, RelayHealth> = new Map();
  private sk = generateSecretKey();
  private pk = getPublicKey(this.sk);
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private dataChannels: Map<string, RTCDataChannel> = new Map();
  private healthCheckInterval: ReturnType<typeof setInterval> | null = null;
  private announceInterval: ReturnType<typeof setInterval> | null = null;
  private readonly enabled: boolean;
  /** PMU: descoberta pública de relays (kind 10002) desligada por defeito. */
  private readonly allowPublicRelayDiscovery: boolean;
  private readonly maxRelays: number;
  private discoveryAdded = 0;

  constructor(relays?: string[], options?: { enabled?: boolean }) {
    this.relays = relays ?? getSovereignRelays();
    this.enabled = options?.enabled ?? true;
    this.allowPublicRelayDiscovery =
      import.meta.env.VITE_NOSTR_RELAY_DISCOVERY === "true";
    this.maxRelays = this.allowPublicRelayDiscovery ? 24 : 4;

    // Inicializa health tracking
    for (const url of this.relays) {
      this.relayHealth.set(url, {
        url,
        healthy: true,
        consecutiveFailures: 0,
        lastPing: 0,
        lastSuccess: Date.now(),
        latencyMs: 0,
      });
    }

    if (!this.enabled) {
      if (import.meta.env.DEV) {
        console.debug(
          "[NostrMesh] Desativado em localhost (modo seguro). Ative via banner dev ou VOID_ENABLE_NOSTR_MESH.",
        );
      }
      return;
    }

    // WebRTC signaling via NIP-04 (kind 4) — padrão NOSTR
    this.listenForSignaling();

    // Presença e shards via kinds ETRNET (31217/31218)
    this.listenForPeers();
    this.listenForMeshShards();

    // Anuncia presença na rede
    this.announcePresence();
    this.announceInterval = setInterval(() => this.announcePresence(), 60000);

    // Health check a cada 30s
    this.healthCheckInterval = setInterval(() => this.checkRelayHealth(), 30000);

    // Descoberta de relays públicos só com opt-in explícito (evita spam + relays aleatórios)
    if (this.allowPublicRelayDiscovery) {
      setTimeout(() => void this.discoverRelays(), 5000);
    }
  }

  /** Aceita relay descoberto: soberano/local por defeito; cap global. */
  private tryAddDiscoveredRelay(url: string): boolean {
    if (!url || this.relays.includes(url) || this.relays.length >= this.maxRelays) {
      return false;
    }
    if (!this.allowPublicRelayDiscovery) {
      const sovereign = new Set(getSovereignRelays());
      const isLocal = /^wss?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(url);
      if (!sovereign.has(url) && !isLocal) return false;
    }
    this.relays.push(url);
    this.relayHealth.set(url, {
      url,
      healthy: true,
      consecutiveFailures: 0,
      lastPing: 0,
      lastSuccess: Date.now(),
      latencyMs: 0,
    });
    this.discoveryAdded++;
    return true;
  }

  // ─── Relay Management ──────────────────────────────────────────────────

  /** Retorna apenas relays saudáveis */
  private getHealthyRelays(): string[] {
    const healthy = this.relays.filter(url => {
      const h = this.relayHealth.get(url);
      return !h || h.healthy;
    });
    // Se todos caíram, retorna todos (melhor tentar do que nada)
    return healthy.length > 0 ? healthy : this.relays;
  }

  /** Health check: tenta receber um evento de cada relay */
  private async checkRelayHealth(): Promise<void> {
    for (const url of this.relays) {
      const health = this.relayHealth.get(url)!;
      const start = Date.now();

      try {
        // Tenta uma subscription rápida com timeout
        const sub = this.pool.subscribeMany([url], { kinds: [1], limit: 1 }, {
          onevent: () => {},
          onclose: () => {},
        });

        // Aguarda 5s ou até receber algo
        await new Promise<void>((resolve) => {
          const timer = setTimeout(resolve, 5000);
          // Se chegou aqui, relay respondeu
          clearTimeout(timer);
          resolve();
        });

        sub.close();

        const latency = Date.now() - start;
        health.latencyMs = latency;
        health.lastPing = Date.now();

        if (latency < 10000) {
          // Relay respondeu razoavelmente
          if (!health.healthy) {
            console.debug(`[NostrMesh] Relay ${url} recuperado (${latency}ms)`);
          }
          health.healthy = true;
          health.consecutiveFailures = 0;
          health.lastSuccess = Date.now();
        } else {
          health.consecutiveFailures++;
        }
      } catch {
        health.consecutiveFailures++;
        health.lastPing = Date.now();

        if (health.consecutiveFailures >= 3 && health.healthy) {
          health.healthy = false;
          console.warn(`[NostrMesh] Relay ${url} marcado como UNHEALTHY após ${health.consecutiveFailures} falhas`);
        }
      }
    }
  }

  /** Configura relays dinamicamente */
  setRelays(relays: string[]): void {
    this.relays = relays;
    for (const url of relays) {
      if (!this.relayHealth.has(url)) {
        this.relayHealth.set(url, {
          url,
          healthy: true,
          consecutiveFailures: 0,
          lastPing: 0,
          lastSuccess: Date.now(),
          latencyMs: 0,
        });
      }
    }
  }

  /** Descobre relays de peers via kind 10002 (opt-in: VITE_NOSTR_RELAY_DISCOVERY) */
  private async discoverRelays(): Promise<void> {
    if (!this.allowPublicRelayDiscovery) return;
    const addedBefore = this.discoveryAdded;
    try {
      const sub = this.pool.subscribeMany(this.getHealthyRelays(), {
        kinds: [10002],
        limit: 20,
      }, {
        onevent: (event: { tags: string[][] }) => {
          for (const tag of event.tags) {
            if (tag[0] === "r" && tag[1]) {
              this.tryAddDiscoveredRelay(tag[1]);
            }
          }
        },
        onclose: () => {
          const n = this.discoveryAdded - addedBefore;
          if (n > 0) {
            console.debug(
              `[NostrMesh] Descoberta: +${n} relay(s) (${this.relays.length} no total)`,
            );
          }
        },
      });

      setTimeout(() => sub.close(), 10000);
    } catch {
      /* best-effort */
    }
  }

  /** Retorna status de saúde dos relays */
  getRelayHealth(): RelayHealth[] {
    return Array.from(this.relayHealth.values());
  }

  // ─── NOSTR Signaling ──────────────────────────────────────────────────

  private announcePresence() {
    const event = finalizeEvent({
      kind: KIND_MESH_CONTROL,
      created_at: Math.floor(Date.now() / 1000),
      tags: [['t', TAG_VOID_RENDEZVOUS], ['p', this.pk]],
      content: 'void_node_active',
    }, this.sk);

    const healthy = this.getHealthyRelays();
    this.pool.publish(healthy, event);
  }

  private listenForSignaling() {
    this.pool.subscribeMany(this.getHealthyRelays(), {
      kinds: [4],
      "#p": [this.pk]
    }, {
      onevent: (event: any) => this.handleSignaling(event)
    });
  }

  private listenForPeers() {
    this.pool.subscribeMany(this.getHealthyRelays(), {
      kinds: [KIND_MESH_CONTROL],
      "#t": [TAG_VOID_RENDEZVOUS],
    }, {
      onevent: (event: any) => {
        if (event.pubkey !== this.pk && !this.peerConnections.has(event.pubkey)) {
          console.debug(
            `[NostrMesh] Peer ${event.pubkey.slice(0, 8)}… — handshake WebRTC`,
          );
          this.connectToPeer(event.pubkey);
        }
      }
    });
  }

  private async handleSignaling(event: any) {
    try {
      // Decifra NIP-04
      const decrypted = await nip04.decrypt(this.sk, event.pubkey, event.content);
      const payload = JSON.parse(decrypted);

      if (payload.type === 'offer') {
        const pc = this.createPeerConnection(event.pubkey);
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        this.sendSignaling(event.pubkey, { type: 'answer', sdp: answer });
      } else if (payload.type === 'answer') {
        const pc = this.peerConnections.get(event.pubkey);
        if (pc) await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      } else if (payload.type === 'candidate') {
        const pc = this.peerConnections.get(event.pubkey);
        if (pc) await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
      }
    } catch {
      // Ignora spam ou mensagens inválidas
    }
  }

  private async sendSignaling(targetPk: string, payload: any) {
    // Cifra NIP-04 e envia DM via NOSTR
    const encrypted = await nip04.encrypt(this.sk, targetPk, JSON.stringify(payload));
    const event = finalizeEvent({
      kind: 4,
      created_at: Math.floor(Date.now() / 1000),
      tags: [['p', targetPk]],
      content: encrypted
    }, this.sk);

    this.pool.publish(this.getHealthyRelays(), event);
  }

  // ─── WebRTC ────────────────────────────────────────────────────────────

  private createPeerConnection(peerPk: string): RTCPeerConnection {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    pc.onicecandidate = (e) => {
      if (e.candidate) this.sendSignaling(peerPk, { type: 'candidate', candidate: e.candidate });
    };

    pc.ondatachannel = (e) => {
      this.setupDataChannel(peerPk, e.channel);
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        if (import.meta.env.DEV) {
          console.debug(`[NostrMesh] Peer ${peerPk.slice(0, 8)} desconectado (reconnect em dev suprimido)`);
          return;
        }
        console.warn(`[NostrMesh] Conexão com ${peerPk.slice(0, 8)} perdida. Tentando reconectar...`);
        this.reconnectWithBackoff(peerPk);
      }
    };

    this.peerConnections.set(peerPk, pc);
    return pc;
  }

  private setupDataChannel(peerPk: string, channel: RTCDataChannel) {
    channel.onopen = () => {
      if (import.meta.env.DEV) {
        console.debug(`[WebRTC] DataChannel aberto: ${peerPk.slice(0, 8)}…`);
      } else {
        console.log(`[WebRTC] DataChannel aberto com peer global: ${peerPk}`);
        voidOrchestrator.handleIncomingShard({ commitment: "system" }, `WEBRTC:${peerPk.slice(0, 8)}`);
      }
    };

    channel.onmessage = (e) => {
      try {
        const shard = JSON.parse(e.data);
        voidOrchestrator.handleIncomingShard(shard, `WEBRTC:${peerPk.slice(0,8)}`);
      } catch { /* ignora */ }
    };

    this.dataChannels.set(peerPk, channel);
  }

  /** Reconexão com backoff exponencial */
  private reconnectWithBackoff(peerPk: string, attempt: number = 0): void {
    if (attempt >= 5) {
      console.error(`[NostrMesh] Desistindo de reconectar com ${peerPk.slice(0,8)} após 5 tentativas`);
      this.peerConnections.delete(peerPk);
      this.dataChannels.delete(peerPk);
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, attempt), 30000); // max 30s
    setTimeout(() => {
      console.log(`[NostrMesh] Tentativa ${attempt + 1} de reconexão com ${peerPk.slice(0,8)}...`);
      // Limpa conexão antiga
      const oldPc = this.peerConnections.get(peerPk);
      if (oldPc) {
        try { oldPc.close(); } catch { /* ignora */ }
      }
      this.peerConnections.delete(peerPk);
      this.dataChannels.delete(peerPk);

      // Tenta reconectar
      this.connectToPeer(peerPk);
    }, delay);
  }

  public connectToPeer(peerPk: string) {
    const pc = this.createPeerConnection(peerPk);
    const dc = pc.createDataChannel('void_shard_channel');
    this.setupDataChannel(peerPk, dc);

    pc.createOffer().then(offer => {
      pc.setLocalDescription(offer);
      this.sendSignaling(peerPk, { type: 'offer', sdp: offer });
    });
  }

  /** Publica shard QEL na malha (kind 31217) e replica via WebRTC. */
  public broadcastShard(shardData: unknown) {
    const payload = JSON.stringify(shardData);
    this.dataChannels.forEach(dc => {
      if (dc.readyState === 'open') {
        dc.send(payload);
      }
    });

    if (!this.enabled) return;

    try {
      const commitment =
        typeof shardData === 'object' && shardData !== null && 'commitment' in shardData
          ? String((shardData as { commitment: string }).commitment)
          : 'shard';

      const event = finalizeEvent({
        kind: KIND_MESH_DATA,
        created_at: Math.floor(Date.now() / 1000),
        tags: [['t', TAG_QEL_SHARD], ['commitment', commitment]],
        content: payload,
      }, this.sk);

      this.pool.publish(this.getHealthyRelays(), event);
    } catch (err) {
      console.warn('[NostrMesh] Falha ao publicar shard no relay:', err);
    }
  }

  /** Inscreve em shards QEL publicados por peers (kind 31217). */
  private listenForMeshShards() {
    this.pool.subscribeMany(this.getHealthyRelays(), {
      kinds: [KIND_MESH_DATA],
      '#t': [TAG_QEL_SHARD],
    }, {
      onevent: (event) => {
        if (event.pubkey === this.pk) return;
        try {
          const shard = JSON.parse(event.content);
          voidOrchestrator.handleIncomingShard(shard, `NOSTR:${event.pubkey.slice(0, 8)}`);
        } catch {
          /* payload inválido */
        }
      },
    });
  }

  /** Cleanup */
  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    if (this.announceInterval) {
      clearInterval(this.announceInterval);
      this.announceInterval = null;
    }
    this.peerConnections.forEach(pc => {
      try { pc.close(); } catch { /* ignora */ }
    });
    this.peerConnections.clear();
    this.dataChannels.clear();
  }
}

const isLocalDev =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

let forceEnableInDev = import.meta.env.VITE_ENABLE_NOSTR_MESH === "true";
try {
  if (
    typeof window !== "undefined" &&
    window.localStorage.getItem("VOID_ENABLE_NOSTR_MESH") === "true"
  ) {
    forceEnableInDev = true;
  }
} catch {
  /* localStorage bloqueado */
}

const enableNostrMesh = !isLocalDev || forceEnableInDev;

export const nostrMesh = new NostrWebRTCMesh(undefined, { enabled: enableNostrMesh });
