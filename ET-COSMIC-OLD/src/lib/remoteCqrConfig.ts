/** Motor CQR remoto — guardado no dispositivo (Harmonia longe de casa). */

const STORAGE_KEY = "void_remote_cqr_url";

/** localtunnel (loca.lt) exige este header em WebView/browser. */
export function cqrTunnelHeaders(url?: string): HeadersInit {
  const u = (url ?? getRemoteCqrUrl() ?? "").toLowerCase();
  if (u.includes("loca.lt") || u.includes("localtunnel")) {
    return { "Bypass-Tunnel-Reminder": "true" };
  }
  return {};
}

export function cqrFetchInit(init?: RequestInit, url?: string): RequestInit {
  const extra = cqrTunnelHeaders(url);
  const headers = new Headers(init?.headers);
  for (const [k, v] of Object.entries(extra)) {
    headers.set(k, String(v));
  }
  return { ...init, headers };
}

export function getRemoteCqrUrl(): string | null {
  if (typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY)?.trim();
  if (!raw) return null;
  return raw.replace(/\/$/, "");
}

export function setRemoteCqrUrl(url: string | null): void {
  if (typeof localStorage === "undefined") return;
  const v = url?.trim().replace(/\/$/, "") ?? "";
  if (!v) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  localStorage.setItem(STORAGE_KEY, v);
}

export async function probeRemoteCqrUrl(
  url?: string,
): Promise<{ ok: boolean; voidRunner: boolean; message: string }> {
  const base = (url ?? getRemoteCqrUrl())?.replace(/\/$/, "");
  if (!base) {
    return { ok: false, voidRunner: false, message: "URL não definida" };
  }
  try {
    const health = await fetch(
      `${base}/health`,
      cqrFetchInit({ signal: AbortSignal.timeout(8_000) }, base),
    );
    if (!health.ok) {
      return { ok: false, voidRunner: false, message: `health HTTP ${health.status}` };
    }
    const runner = await fetch(
      `${base}/cosmic/void/runner/status`,
      cqrFetchInit({ signal: AbortSignal.timeout(8_000) }, base),
    );
    if (!runner.ok) {
      return { ok: true, voidRunner: false, message: "CQR online; void-runner indisponível" };
    }
    const st = (await runner.json()) as { available?: boolean };
    return {
      ok: true,
      voidRunner: Boolean(st.available),
      message: st.available ? "CQR + GhostDocker Rust OK" : "CQR online (fallback TS)",
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, voidRunner: false, message: msg };
  }
}
