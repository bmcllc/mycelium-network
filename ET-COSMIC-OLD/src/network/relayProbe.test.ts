import { afterEach, describe, expect, it, vi } from "vitest";
import { probeRelayWebSocket } from "./relayProbe";

describe("relayProbe", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("resolve ok quando WebSocket abre", async () => {
    class MockWS {
      onopen: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(_url: string) {
        queueMicrotask(() => this.onopen?.());
      }
      close() {}
    }
    vi.stubGlobal("WebSocket", MockWS);

    const r = await probeRelayWebSocket("ws://relay.test", 2000);
    expect(r.ok).toBe(true);
    expect(r.url).toBe("ws://relay.test");
    expect(r.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("resolve erro em falha de conexão", async () => {
    class MockWS {
      onopen: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(_url: string) {
        queueMicrotask(() => this.onerror?.());
      }
      close() {}
    }
    vi.stubGlobal("WebSocket", MockWS);

    const r = await probeRelayWebSocket("wss://down.test", 2000);
    expect(r.ok).toBe(false);
    expect(r.error).toBe("connection_error");
  });
});
