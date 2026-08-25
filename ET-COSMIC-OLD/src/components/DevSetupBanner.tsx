import { useCallback, useEffect, useState } from "react";
import { loadSovereignConfig } from "../config/sovereign";
import { b2bRouteMeta } from "../router";

type WasmStatus = "checking" | "ok" | "missing";
type ServiceStatus = "up" | "down" | "optional" | "manual";

interface ServiceCheck {
  id: string;
  label: string;
  status: ServiceStatus;
  hint: string;
}

function probeWs(url: string, ms = 2500): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const ws = new WebSocket(url);
      const timer = setTimeout(() => {
        try {
          ws.close();
        } catch {
          /* ignore */
        }
        resolve(false);
      }, ms);
      ws.onopen = () => {
        clearTimeout(timer);
        try {
          ws.close();
        } catch {
          /* ignore */
        }
        resolve(true);
      };
      ws.onerror = () => {
        clearTimeout(timer);
        resolve(false);
      };
    } catch {
      resolve(false);
    }
  });
}

export default function DevSetupBanner() {
  const [wasm, setWasm] = useState<WasmStatus>("checking");
  const [services, setServices] = useState<ServiceCheck[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [meshOn, setMeshOn] = useState(false);
  const [probing, setProbing] = useState(false);

  const isDev =
    import.meta.env.DEV &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1");

  useEffect(() => {
    try {
      setMeshOn(localStorage.getItem("VOID_ENABLE_NOSTR_MESH") === "true");
    } catch {
      setMeshOn(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mod = await import("void_core");
        if (typeof mod.default === "function") await mod.default();
        if (!cancelled) setWasm("ok");
      } catch {
        if (!cancelled) setWasm("missing");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** Sem HTTP para quantum/LND — evita 500 na consola quando serviços estão parados. */
  const probeServices = useCallback(async () => {
    setProbing(true);
    const cfg = loadSovereignConfig();
    const nostrUp = await probeWs(cfg.primaryRelay);

    setServices([
      {
        id: "quantum",
        label: "Quantum",
        status: "optional",
        hint: "npm run quantum:dev (GhostID usa CSPRNG se OFF)",
      },
      {
        id: "nostr",
        label: "NOSTR relay",
        status: nostrUp ? "up" : "down",
        hint: "npm run stack:up",
      },
      {
        id: "lnd",
        label: "LND REST",
        status: import.meta.env.VITE_LND_MACAROON_HEX ? "manual" : "down",
        hint: import.meta.env.VITE_LND_MACAROON_HEX
          ? "npm run stack:status (terminal)"
          : "npm run lnd:create + macaroon no .env.sovereign",
      },
    ]);
    setProbing(false);
  }, []);

  const toggleMesh = () => {
    const next = !meshOn;
    try {
      if (next) localStorage.setItem("VOID_ENABLE_NOSTR_MESH", "true");
      else localStorage.removeItem("VOID_ENABLE_NOSTR_MESH");
    } catch {
      /* ignore */
    }
    setMeshOn(next);
    window.location.reload();
  };

  if (!isDev || dismissed) return null;

  const statusLabel = (s: ServiceStatus) => {
    if (s === "up") return "OK";
    if (s === "optional") return "OPCIONAL";
    if (s === "manual") return "CONFIG";
    return "OFF";
  };

  const statusClass = (s: ServiceStatus) => {
    if (s === "up") return "text-[#00ff41]";
    if (s === "optional" || s === "manual") return "text-yellow-400";
    return "text-red-400";
  };

  return (
    <div className="border-b border-yellow-500/40 bg-yellow-950/40 px-4 py-2 space-y-2">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <p className="text-[10px] font-mono text-yellow-200/90 max-w-3xl">
          <span className="text-yellow-400">Modo dev.</span>{" "}
          {wasm === "missing" ? (
            <>
              WASM ausente — <code className="text-yellow-300">npm run build:wasm</code>.
            </>
          ) : meshOn ? (
            <>Mesh NOSTR ativo (relays soberanos). Descoberta pública desligada.</>
          ) : (
            <>Serviços Docker/quantum opcionais. A app funciona com fallbacks locais.</>
          )}
          {b2bRouteMeta.active && (
            <>
              {" "}
              · B2B{" "}
              <span className="text-cyan-300">
                {b2bRouteMeta.routeCount}/{b2bRouteMeta.totalCount}
              </span>{" "}
              painéis ({b2bRouteMeta.label})
            </>
          )}
        </p>
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={toggleMesh}
            className="px-2 py-1 text-[9px] font-mono border border-yellow-600/50 text-yellow-300 hover:bg-yellow-900/30"
          >
            {meshOn ? "NOSTR MESH: ON" : "ATIVAR NOSTR MESH"}
          </button>
          <button
            type="button"
            onClick={() => void probeServices()}
            disabled={probing}
            className="px-2 py-1 text-[9px] font-mono border border-zinc-600 text-zinc-400 hover:text-white disabled:opacity-50"
          >
            {probing ? "A VERIFICAR…" : "VERIFICAR STACK"}
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="text-[10px] font-mono text-zinc-500 hover:text-zinc-300"
          >
            FECHAR
          </button>
        </div>
      </div>

      {services.length > 0 && (
        <div className="flex flex-wrap gap-3 text-[9px] font-mono">
          {services.map((s) => (
            <span key={s.id} className={statusClass(s.status)} title={s.hint}>
              {s.label}: {statusLabel(s.status)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
