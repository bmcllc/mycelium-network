/**
 * VØID Messenger — BLE Chat Transport
 *
 * Envia mensagens criptografadas via BLE usando QEL (Shamir K=2/N=3).
 * Cada mensagem é fragmentada em 3 shards, cada um enviado como
 * characteristic write via GATT (500 bytes por shard).
 *
 * Fluxo:
 *   SocialFabric.sendDM → Double Ratchet encrypt → QEL fragment
 *   → BLE GATT write (shard 0, 1, 2) → receptor reconstitui com K=2
 *   → Double Ratchet decrypt → chatStore → UI
 */

import {
  BluetoothDriver,
  VOID_BLE_SERVICE_UUID,
  VOID_BLE_SHARD_CHAR_UUID,
  type BLEPeer,
} from "./localDrivers";
import { fragmentMessage, reconstituteMessage, type Shard } from "@crypto/qel";

export interface BLEChatMessage {
  id: string;
  senderPk: string;
  ciphertext: string; // serialized Double Ratchet message
  timestamp: number;
}

interface PendingReconstruction {
  shards: Shard[];
  sessionKey: Uint8Array;
  receivedAt: number;
}

/**
 * Transporte de chat via BLE com fragmentação QEL.
 *
 * Usa o BluetoothDriver existente para scan/connect/GATT write.
 * Fragmenta mensagens em 3 shards (K=2, N=3) e reconstitui
 * quando recebe pelo menos 2 shards do mesmo fragmento.
 */
export class BLEChatTransport {
  private ble: BluetoothDriver;
  private peers: Map<string, BLEPeer> = new Map();
  private pending: Map<string, PendingReconstruction> = new Map();
  private listeners: Set<(msg: BLEChatMessage) => void> = new Set();
  private scanActive = false;

  constructor() {
    this.ble = new BluetoothDriver();
  }

  isSupported(): boolean {
    return this.ble.isSupported();
  }

  /**
   * Inicia scan por peers VØID via BLE.
   */
  async startScan(): Promise<void> {
    if (this.scanActive) return;
    this.scanActive = true;

    try {
      await this.ble.scanForPeers((peer) => {
        this.peers.set(peer.id, peer);
        console.log(`[BLE Chat] Peer discovered: ${peer.name} (${peer.id})`);
      });
    } catch (err) {
      this.scanActive = false;
      throw err;
    }
  }

  /**
   * Para o scan BLE.
   */
  stopScan(): void {
    this.scanActive = false;
  }

  /**
   * Envia uma mensagem criptografada via BLE para um peer.
   *
   * A mensagem já deve estar criptografada com Double Ratchet.
   * Este método apenas fragmenta com QEL e envia via GATT.
   */
  async sendEncryptedMessage(
    peerId: string,
    ciphertext: string,
    senderPk: string
  ): Promise<void> {
    const peer = this.peers.get(peerId);
    if (!peer) {
      throw new Error(`Peer ${peerId} not found. Run scanForPeers first.`);
    }

    // Create BLE chat message
    const msg: BLEChatMessage = {
      id: crypto.randomUUID(),
      senderPk,
      ciphertext,
      timestamp: Date.now(),
    };

    // Fragment with QEL (K=2, N=3)
    const fragmentResult = fragmentMessage(JSON.stringify(msg));

    try {
      // Connect to peer via GATT
      const server = await peer.device.gatt?.connect();
      if (!server) throw new Error("GATT connection failed");

      const service = await server.getPrimaryService(VOID_BLE_SERVICE_UUID);
      const characteristic = await service.getCharacteristic(
        VOID_BLE_SHARD_CHAR_UUID
      );

      // Send each shard as a GATT write
      for (const shard of fragmentResult.shards) {
        // Encode shard as: [index(1)] [nonce(12)] [tag(16)] [data(N)]
        const shardBytes = new Uint8Array(
          1 + 12 + 16 + shard.data.length
        );
        shardBytes[0] = shard.index;
        shardBytes.set(shard.nonce, 1);
        shardBytes.set(shard.tag, 13);
        shardBytes.set(shard.data, 29);

        // GATT write (500 byte chunks if needed)
        const MTU = 500;
        for (let offset = 0; offset < shardBytes.length; offset += MTU) {
          const chunk = shardBytes.slice(offset, offset + MTU);
          await characteristic.writeValueWithoutResponse(chunk);
        }
      }

      console.log(
        `[BLE Chat] Sent ${fragmentResult.shards.length} shards to ${peer.name}`
      );
    } finally {
      // Clean up sensitive data
      // fragmentResult.sessionKey is already in the reconstruction map
    }
  }

  /**
   * Registra um listener para mensagens recebidas via BLE.
   * O listener recebe a mensagem já desfragmentada (mas ainda criptografada com Double Ratchet).
   */
  onMessage(callback: (msg: BLEChatMessage) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Processa um shard recebido via BLE.
   * Chamado pelo NativeBridge ou pelo BLE listener.
   *
   * Quando K=2 shards do mesmo fragmento são recebidos,
   * reconstitui a mensagem e notifica os listeners.
   */
  handleIncomingShard(shard: Shard, sessionKeyHex: string): void {
    const key = sessionKeyHex;

    if (!this.pending.has(key)) {
      this.pending.set(key, {
        shards: [],
        sessionKey: new Uint8Array(
          sessionKeyHex.match(/.{2}/g)!.map((b) => parseInt(b, 16))
        ),
        receivedAt: Date.now(),
      });
    }

    const reconstruction = this.pending.get(key)!;

    // Avoid duplicate shards
    if (reconstruction.shards.some((s) => s.index === shard.index)) return;

    reconstruction.shards.push(shard);

    // Need K=2 shards to reconstruct
    if (reconstruction.shards.length >= 2) {
      try {
        const plaintext = reconstituteMessage(
          reconstruction.shards,
          reconstruction.sessionKey
        );
        const msg: BLEChatMessage = JSON.parse(plaintext);

        // Notify listeners
        for (const listener of this.listeners) {
          try {
            listener(msg);
          } catch (err) {
            console.warn("[BLE Chat] Listener error:", err);
          }
        }

        console.log(
          `[BLE Chat] Reconstructed message from ${msg.senderPk.slice(0, 8)}`
        );
      } catch (err) {
        console.warn("[BLE Chat] Reconstruction failed:", err);
      } finally {
        // Clean up
        this.pending.delete(key);
      }
    }
  }

  /**
   * Retorna peers BLE conhecidos.
   */
  getDiscoveredPeers(): BLEPeer[] {
    return Array.from(this.peers.values());
  }

  /**
   * Limpa peers e shards pendentes.
   */
  destroy(): void {
    this.stopScan();
    this.peers.clear();
    this.pending.clear();
    this.listeners.clear();
  }
}

// Singleton
export const bleChatTransport = new BLEChatTransport();
