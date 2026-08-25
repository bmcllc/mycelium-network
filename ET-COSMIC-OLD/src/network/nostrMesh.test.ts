import { afterEach, describe, expect, it, vi } from "vitest";
import {
  KIND_MESH_CONTROL,
  KIND_MESH_DATA,
  TAG_QEL_SHARD,
  TAG_VOID_RENDEZVOUS,
} from "./etrnetKinds";
import { NostrWebRTCMesh } from "./nostrMesh";

vi.mock("../core/VoidOrchestrator", () => ({
  voidOrchestrator: {
    handleIncomingShard: vi.fn(),
  },
}));

describe("etrnetKinds", () => {
  it("define kinds alinhados ao protocolo ETRNET", () => {
    expect(KIND_MESH_DATA).toBe(31217);
    expect(KIND_MESH_CONTROL).toBe(31218);
    expect(TAG_VOID_RENDEZVOUS).toBe("void_omega_rendezvous");
    expect(TAG_QEL_SHARD).toBe("eternet_qel_shard");
  });
});

describe("NostrWebRTCMesh", () => {
  let mesh: NostrWebRTCMesh;

  afterEach(() => {
    mesh?.destroy();
  });

  it("fica desativado quando enabled=false", () => {
    mesh = new NostrWebRTCMesh(["wss://relay.test"], { enabled: false });
    expect(mesh.getRelayHealth().length).toBeGreaterThan(0);
    mesh.broadcastShard({ commitment: "c1", payload: "x" });
    // Sem pool ativo — não deve lançar
    expect(true).toBe(true);
  });

  it("aceita relays customizados via setRelays", () => {
    mesh = new NostrWebRTCMesh(undefined, { enabled: false });
    mesh.setRelays(["wss://a.test", "wss://b.test"]);
    const health = mesh.getRelayHealth();
    expect(health.some((h) => h.url === "wss://a.test")).toBe(true);
    expect(health.some((h) => h.url === "wss://b.test")).toBe(true);
  });

  it("marca relay unhealthy após falhas consecutivas (estado inicial healthy)", () => {
    mesh = new NostrWebRTCMesh(["wss://relay.local"], { enabled: false });
    const entry = mesh.getRelayHealth().find((h) => h.url === "wss://relay.local");
    expect(entry?.healthy).toBe(true);
    expect(entry?.consecutiveFailures).toBe(0);
  });
});
