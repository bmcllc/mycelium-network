/**
 * Sonda WebSocket de relays NOSTR (pré-voo mesh / staging).
 */

export interface RelayProbeResult {
  url: string;
  ok: boolean;
  latencyMs: number;
  error?: string;
}

export async function probeRelayWebSocket(
  relayUrl: string,
  timeoutMs = 8_000,
): Promise<RelayProbeResult> {
  const started = performance.now();

  return new Promise((resolve) => {
    let settled = false;
    let ws: WebSocket | undefined;

    const finish = (partial: Omit<RelayProbeResult, "url">) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        ws?.close();
      } catch {
        /* ignora */
      }
      resolve({ url: relayUrl, ...partial });
    };

    const timer = setTimeout(
      () =>
        finish({
          ok: false,
          latencyMs: Math.round(performance.now() - started),
          error: "timeout",
        }),
      timeoutMs,
    );

    try {
      ws = new WebSocket(relayUrl);
    } catch (err) {
      finish({
        ok: false,
        latencyMs: 0,
        error: err instanceof Error ? err.message : String(err),
      });
      return;
    }

    ws.onopen = () =>
      finish({
        ok: true,
        latencyMs: Math.round(performance.now() - started),
      });

    ws.onerror = () =>
      finish({
        ok: false,
        latencyMs: Math.round(performance.now() - started),
        error: "connection_error",
      });
  });
}

/** Sonda primário + fallback (deduplicado). */
export async function probeSovereignRelays(
  primary: string,
  fallback?: string,
  timeoutMs = 8_000,
): Promise<RelayProbeResult[]> {
  const urls = [...new Set([primary, fallback].filter(Boolean) as string[])];
  const results: RelayProbeResult[] = [];
  for (const url of urls) {
    results.push(await probeRelayWebSocket(url, timeoutMs));
  }
  return results;
}
