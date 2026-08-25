/**
 * ETΞRNET — Layer 0: Social Fabric
 *
 * O módulo central para interações sociais e mensagens descentralizadas.
 * Em ETΞRNET, a rede social é indissociável da infraestrutura financeira.
 * Um "post" ou "mensagem" é tratado como um Shard que trafega pela mesma malha (HCN)
 * que um UTXO, garantindo anonimato, resiliência e ausência de servidores centrais.
 *
 * E2EE: Double Ratchet com X25519 ECDH + ChaCha20-Poly1305 + Ed25519 signatures.
 */

import { voidOrchestrator } from "../core/VoidOrchestrator";
import { secureRandomId } from "../utils/secureRandom";
import { GhostIdentity } from "../crypto/ghostid";
import { chatStore, type ChatThread } from "../storage/chatStore";
import { ed25519 } from "@noble/curves/ed25519.js";
import {
  type RatchetState,
  type RatchetMessage,
  type PreKeyBundle,
  initializeRatchetAsAlice,
  initializeRatchetAsBob,
  ratchetEncrypt,
  ratchetDecrypt,
  serializeMessage,
  deserializeMessage,
  generateSignedPreKey,
  generateDHKeyPair,
  createPreKeyBundle,
} from "../crypto/doubleRatchet";

export interface SocialMessage {
  id: string;
  senderPubKey: string; // Em hexadecimal (Ed25519)
  recipientPubKey?: string; // Nulo para broadcasts públicos
  content: string; // O payload encriptado ou texto limpo (se público)
  timestamp: number;
  groupId?: string;
}

export class SocialFabric {
  private static instance: SocialFabric;

  // Memória em RAM das conversas ativas nesta sessão.
  private messages: Map<string, SocialMessage[]> = new Map();
  private listeners: Set<(msg: SocialMessage) => void> = new Set();

  // Double Ratchet states por conversa (chave = recipient pub key hex)
  private ratchetStates: Map<string, RatchetState> = new Map();

  // Pre-key bundles conhecidos (chave = nostr pub key hex)
  private knownBundles: Map<string, PreKeyBundle> = new Map();

  // Nosso pre-key bundle
  private localBundle: PreKeyBundle | null = null;

  public static getInstance(): SocialFabric {
    if (!SocialFabric.instance) {
      SocialFabric.instance = new SocialFabric();
    }
    return SocialFabric.instance;
  }

  private constructor() {
    this.initMeshListener();
  }

  /**
   * Inicializa nosso pre-key bundle para publicação via NOSTR.
   * Deve ser chamado após o GhostID ser spawned.
   */
  public initPreKeyBundle(identity: GhostIdentity): void {
    // Sign the SPK with Ed25519 (identity.publicKey is Ed25519, but private key is zeroed).
    // We use the x25519 secret key as the signing seed — ed25519.sign works with any 32-byte key.
    // The verification key is ed25519.getPublicKey(x25519SecretKey), stored as bundle identityKey.
    const signingPubKey = ed25519.getPublicKey(identity.x25519SecretKey);
    const spk = generateSignedPreKey(identity.x25519SecretKey);
    const opk = generateDHKeyPair();

    this.localBundle = createPreKeyBundle(
      signingPubKey,              // Ed25519 public key (for signature verification)
      identity.x25519PublicKey,   // X25519 public key (for ECDH)
      spk.keyPair,
      spk.signature,
      opk,
    );

    console.log("[SocialFabric] Pre-key bundle inicializado");
  }

  /**
   * Conecta o Tecido Social ao Orquestrador de Rede.
   */
  private initMeshListener() {
    voidOrchestrator.subscribe((event) => {
      if (event.type === "SHARD_RECEIVED") {
        this.processIncomingData(event.shard.payload);
      }
    });
  }

  /**
   * Emite uma mensagem pública para a malha (sem E2EE).
   */
  public async broadcastPublicPost(content: string, identity: GhostIdentity) {
    const post: SocialMessage = {
      id: `post_${Date.now()}_${secureRandomId(4)}`,
      senderPubKey: Array.from(identity.publicKey).map(b => b.toString(16).padStart(2, '0')).join(''),
      content,
      timestamp: Date.now(),
    };

    const payload = JSON.stringify(post);
    console.log(`[SocialFabric] Broadcasting public post: ${post.id}`);

    await voidOrchestrator.send(`SOCIAL_POST:${payload}`);
    this.addMessageToState("public_feed", post);
  }

  /**
   * Envia uma DM criptografada com Double Ratchet.
   *
   * 1. Se não há ratchet state com o destinatário, inicializa como Alice
   * 2. Criptografa com ratchetEncrypt
   * 3. Serializa e envia via orquestrador
   */
  public async sendDirectMessage(content: string, recipientPk: string, identity: GhostIdentity) {
    const senderPkHex = Array.from(identity.publicKey).map(b => b.toString(16).padStart(2, '0')).join('');

    // Obter ou inicializar ratchet state
    let ratchetState = this.ratchetStates.get(recipientPk);
    if (!ratchetState) {
      // Precisamos do pre-key bundle do destinatário
      const bundle = this.knownBundles.get(recipientPk);
      if (bundle) {
        const result = initializeRatchetAsAlice(
          bundle,
          identity.x25519PublicKey,
          identity.x25519SecretKey,
        );
        ratchetState = result.state;
      } else {
        // Sem bundle: criar ratchet state com DH direto (fallback para peers diretos)
        // Isso permite DMs quando os bundles são trocados via WebRTC/acoustic
        const ephemeral = generateDHKeyPair();
        const recipientPkBytes = new Uint8Array(recipientPk.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));

        // X25519 ECDH real
        const { x25519 } = await import("@noble/curves/ed25519.js");
        const sharedSecret = x25519.getSharedSecret(identity.x25519SecretKey, recipientPkBytes);

        // Derivar root key e chain key do shared secret
        const { sha3_256 } = await import("@noble/hashes/sha3.js");
        const rootKey = sha3_256(new Uint8Array([...sharedSecret, ...new TextEncoder().encode("RK")]));
        const chainKey = sha3_256(new Uint8Array([...sharedSecret, ...new TextEncoder().encode("CK")]));

        ratchetState = {
          dhKeyPair: ephemeral,
          dhRemotePubKey: recipientPkBytes,
          rootKey,
          sendingChainKey: chainKey,
          receivingChainKey: null,
          sendMessageNumber: 0,
          receiveMessageNumber: 0,
          previousSendingChainLength: 0,
          skippedKeys: new Map(),
          localIdentityKey: identity.publicKey,
          localSigningKey: identity.x25519SecretKey,
        };
      }
      this.ratchetStates.set(recipientPk, ratchetState);
    }

    // Criptografa com Double Ratchet
    const plaintext = new TextEncoder().encode(content);
    const { state: newState, message } = ratchetEncrypt(ratchetState, plaintext);
    this.ratchetStates.set(recipientPk, newState);

    // Serializa mensagem do ratchet
    const serialized = serializeMessage(message);

    const msg: SocialMessage = {
      id: `dm_${Date.now()}_${secureRandomId(4)}`,
      senderPubKey: senderPkHex,
      recipientPubKey: recipientPk,
      content: btoa(serialized),
      timestamp: Date.now(),
    };

    const payload = JSON.stringify(msg);
    console.log(`[SocialFabric] Sending E2EE DM (Double Ratchet) to ${recipientPk.slice(0, 8)}...`);

    await voidOrchestrator.send(`SOCIAL_DM:${payload}`);
    this.addMessageToState(recipientPk, msg);
  }

  private processIncomingData(rawPayload: string) {
    try {
      const decodedStr = atob(rawPayload);

      if (decodedStr.startsWith("SOCIAL_POST:")) {
        const post = JSON.parse(decodedStr.replace("SOCIAL_POST:", ""));
        this.addMessageToState("public_feed", post);
      }
      else if (decodedStr.startsWith("SOCIAL_DM:")) {
        const dm = JSON.parse(decodedStr.replace("SOCIAL_DM:", ""));

        // Verifica se é para nós
        const myId = voidOrchestrator.getIdentity();
        const myPkHex = myId ? Array.from(myId.publicKey).map(b => b.toString(16).padStart(2, '0')).join('') : null;

        if (dm.recipientPubKey === myPkHex && myId) {
          try {
            // Deserializa mensagem do ratchet
            const ratchetMsg: RatchetMessage = deserializeMessage(atob(dm.content));

            // Obter ou inicializar ratchet state
            let ratchetState = this.ratchetStates.get(dm.senderPubKey);
            if (!ratchetState) {
              // Primeira mensagem do sender — inicializar como Bob
              // Bob needs Alice's identity key for X3DH.
              // In first message, Alice includes senderIdentityKey in the ratchet message.
              // Fallback: use the sender's pubkey from the DM metadata.
              const aliceIdKey = ratchetMsg.senderIdentityKey
                || new Uint8Array(dm.senderPubKey.match(/.{1,2}/g)!.map((byte: string) => parseInt(byte, 16)));

              ratchetState = initializeRatchetAsBob(
                ratchetMsg.dhPublicKey,        // Alice's ephemeral key
                aliceIdKey,                    // Alice's X25519 identity key
                myId.x25519SecretKey,          // Bob's X25519 secret
                { publicKey: myId.x25519PublicKey, secretKey: myId.x25519SecretKey },
              );
              this.ratchetStates.set(dm.senderPubKey, ratchetState);
            }

            // Descriptografa com Double Ratchet
            const { state: newState, plaintext } = ratchetDecrypt(ratchetState, ratchetMsg);
            this.ratchetStates.set(dm.senderPubKey, newState);

            dm.content = new TextDecoder().decode(plaintext);
          } catch {
            // Se decifrar falhar, mantém como está (pode ser mensagem antiga sem cifra)
          }
          this.addMessageToState(dm.senderPubKey, dm);
        }
      }
    } catch {
      // Shard financeiro ou lixo
    }
  }

  private addMessageToState(threadId: string, msg: SocialMessage) {
    const thread = this.messages.get(threadId) || [];
    if (!thread.some(m => m.id === msg.id)) {
      thread.push(msg);
      if (thread.length > 100) thread.shift();

      this.messages.set(threadId, thread);
      this.listeners.forEach(l => l(msg));

      // Persist to IndexedDB for cross-session history
      const myId = voidOrchestrator.getIdentity();
      const myPkHex = myId
        ? Array.from(myId.publicKey).map(b => b.toString(16).padStart(2, '0')).join('')
        : '';
      const direction: 'in' | 'out' = msg.senderPubKey === myPkHex ? 'out' : 'in';

      chatStore.addMessage({
        id: msg.id,
        threadId,
        senderPk: msg.senderPubKey,
        content: msg.content,
        encrypted: msg.content, // for DMs this is the ciphertext
        timestamp: msg.timestamp,
        status: 'delivered',
        direction,
      }).catch(err => console.warn('[SocialFabric] chatStore error:', err));
    }
  }

  public getThread(threadId: string): SocialMessage[] {
    return this.messages.get(threadId) || [];
  }

  /** Registra um pre-key bundle conhecido (recebido via NOSTR ou WebRTC) */
  public registerBundle(pubKeyHex: string, bundle: PreKeyBundle): void {
    this.knownBundles.set(pubKeyHex, bundle);
  }

  /** Retorna nosso pre-key bundle para publicação */
  public getLocalBundle(): PreKeyBundle | null {
    return this.localBundle;
  }

  /**
   * Carrega histórico de mensagens de uma thread a partir do chatStore (IndexedDB).
   */
  public async loadHistory(threadId: string, limit?: number): Promise<SocialMessage[]> {
    const stored = await chatStore.getMessages(threadId, limit);
    return stored.map((m) => ({
      id: m.id,
      senderPubKey: m.senderPk,
      ...(threadId !== "public_feed" ? { recipientPubKey: threadId } : {}),
      content: m.content,
      timestamp: m.timestamp,
    }));
  }

  /**
   * Retorna a lista de threads persistidas no chatStore (IndexedDB).
   */
  public async getThreadList(): Promise<ChatThread[]> {
    return chatStore.getThreads();
  }

  public subscribe(listener: (msg: SocialMessage) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const socialFabric = SocialFabric.getInstance();
