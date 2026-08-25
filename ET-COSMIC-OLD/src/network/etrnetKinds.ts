/**
 * ETΞRNET — NOSTR event kinds (protocolo VØID)
 *
 * Alinhado com vault/04-Rede/NOSTR Mesh.md e DOC/VOID.pdf.
 * WebRTC signaling continua em kind 4 (NIP-04 DM padrão).
 */

/** Transações UTXO cegas (Pedersen + Bulletproofs) */
export const KIND_ETRNET_TX = 31214;

/** Ordens DEX */
export const KIND_DEX_ORDER = 31215;

/** Trades DEX confirmados */
export const KIND_DEX_TRADE = 31216;

/** Dados de mesh (shards QEL, payloads P2P) */
export const KIND_MESH_DATA = 31217;

/** Controle de mesh (presença, rendezvous) */
export const KIND_MESH_CONTROL = 31218;

/** Distance Bridge — metadados de roteamento */
export const KIND_DISTANCE_BRIDGE = 31219;

/** Manifesto PMU / harmonia cósmica (malha soberana) */
export const KIND_PMU_MANIFEST = 31220;

/** Lightning via NOSTR (faixa reservada) */
export const KIND_LIGHTNING_BASE = 31340;

/** Watchtower registro */
export const KIND_WATCHTOWER_REG = 31350;

/** Watchtower alerta de breach */
export const KIND_WATCHTOWER_BREACH = 31351;

/** Tag padrão para presença de nó VØID */
export const TAG_VOID_RENDEZVOUS = "void_omega_rendezvous";

/** Tag para shards QEL publicados na malha */
export const TAG_QEL_SHARD = "eternet_qel_shard";

/** Tag para transações UTXO */
export const TAG_ETRNET_TX = "eternet_tx";
