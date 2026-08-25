// Test setup — mocks for native WASM modules

import { vi } from 'vitest';

// Mock void_core (Rust/WASM) since it can't run in jsdom
vi.mock('void_core', () => ({
  default: vi.fn().mockResolvedValue(undefined),
  derive_ghost_id: vi.fn().mockReturnValue({
    handle: 'ghost_test_1234',
    public_key: new Uint8Array(32).fill(0x42),
  }),
  init_void_core: vi.fn(),
  create_pedersen_commitment: vi.fn().mockImplementation((value: bigint) => ({
    commitment: new Uint8Array(32).fill(Number(value & 0xFFn)),
    blinding_factor: new Uint8Array(32).fill(0xaa),
  })),
  create_balance_proof: vi.fn().mockReturnValue(new Uint8Array(32).fill(0x01)),
  create_range_proof: vi.fn().mockReturnValue({
    proof: new Uint8Array(64).fill(0xbb),
    commitment: new Uint8Array(32).fill(0xcc),
  }),
  verify_range_proof: vi.fn().mockReturnValue(true),
  create_hash_chronicle: vi.fn().mockReturnValue({
    event_hash: new Uint8Array(32).fill(0xdd),
  }),
  aggregate_zk_proofs: vi.fn().mockImplementation((data: Uint8Array) => ({
    merkle_root: new Uint8Array(32).fill(data[0] ?? 0xee),
    proof_count: Math.max(1, Math.floor(data.length / 64)),
    compressed_size: 128,
  })),
  /** VOID-00 license handshake (community mode in tests — always ok). */
  license_compute_device_id: vi.fn().mockImplementation(
    (deviceEntropy: Uint8Array, _sku: string) => {
      const out = new Uint8Array(32);
      for (let i = 0; i < 32; i++) out[i] = deviceEntropy[i % deviceEntropy.length] ^ 0xa5;
      return out;
    },
  ),
  license_verify_handshake: vi.fn().mockReturnValue({
    ok: true,
    device_id_hex: "ab".repeat(32),
    reason: "ok",
  }),
  license_build_payload: vi.fn().mockReturnValue(new Uint8Array(121).fill(0x01)),
}));

// Mock quantumBridge (needs Python server running)
const mockQuantumEntropy = {
  entropy_hex: 'aabbccdd'.repeat(16),
  sha3_256: 'mock-sha3',
  bits: 256,
  source: 'mock',
  n_measurements: 8,
  sources: ['mock'],
  quantum_verified: true,
  simulation: false,
  chsh_audit: { S_value: 2.82, chsh_violated: true },
};

vi.mock('../crypto/quantumBridge', () => ({
  generateQuantumEntropy: vi.fn().mockResolvedValue(mockQuantumEntropy),
  generateQuantumEntropyWithFallback: vi.fn().mockResolvedValue(mockQuantumEntropy),
  isServerAvailable: vi.fn().mockResolvedValue(false),
  runHeptaryQuantumSimulation: vi.fn(),
}));

// Fix Node 22 globalThis.localStorage conflict with JSDOM
try {
  const store = new Map<string, string>();
  const mockStorage: Storage = {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { store.set(key, String(value)); }),
    removeItem: vi.fn((key: string) => { store.delete(key); }),
    clear: vi.fn(() => { store.clear(); }),
    key: vi.fn((index: number) => Array.from(store.keys())[index] ?? null),
    length: 0,
  };
  Object.defineProperty(mockStorage, 'length', {
    get: () => store.size,
    configurable: true,
  });
  Object.defineProperty(globalThis, 'localStorage', {
    value: mockStorage,
    writable: true,
    configurable: true,
  });
} catch (e) {
  // ignore
}

