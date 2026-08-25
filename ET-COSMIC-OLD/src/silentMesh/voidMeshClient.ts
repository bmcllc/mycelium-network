/**
 * VOID-700 — cliente browser (embed + painel 702).
 */

import { BROWSER_LIMITS, estimateCpuPct, lscAllowsWork } from "./lscResourceGuard";

const API = import.meta.env.VITE_SILENT_MESH_API ?? "/api/silent-mesh";

export interface SilentMeshNode {
  nodeId: string;
  mode: "browser" | "vps";
  stats?: {
    tasksCompleted: number;
    entropyContributions: number;
    bytesServed: number;
    sovEarnedMicro: number;
  };
}

export async function registerBrowserNode(opts: {
  siteOrigin?: string;
  consent: { compute: boolean; entropy: boolean; cdn: boolean };
}): Promise<SilentMeshNode> {
  const res = await fetch(`${API}/nodes/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: "browser",
      siteOrigin: opts.siteOrigin ?? (typeof location !== "undefined" ? location.origin : ""),
      consent: opts.consent,
    }),
  });
  if (!res.ok) throw new Error(`VOID-700 register ${res.status}`);
  return res.json();
}

export async function heartbeat(nodeId: string): Promise<{ action: string; reason?: string }> {
  const cpuPct = estimateCpuPct();
  const res = await fetch(`${API}/nodes/${nodeId}/heartbeat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cpuPct }),
  });
  if (!res.ok) throw new Error(`heartbeat ${res.status}`);
  return res.json();
}

export async function runIdleMarketplaceTask(nodeId: string): Promise<boolean> {
  const guard = await lscAllowsWork(BROWSER_LIMITS);
  if (!guard.ok) return false;
  try {
    const res = await fetch("/api/imc/action/marketplace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "ising", n: 8, budgetSov: 100 }),
    });
    if (!res.ok) return false;
    await fetch(`${API}/nodes/${nodeId}/work`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "marketplace", sovMicro: 50 }),
    });
    return true;
  } catch {
    return false;
  }
}

export async function listMeshNodes(): Promise<SilentMeshNode[]> {
  const res = await fetch(`${API}/nodes`);
  if (!res.ok) throw new Error(`nodes ${res.status}`);
  const data = (await res.json()) as { nodes: SilentMeshNode[] };
  return data.nodes ?? [];
}

export async function publishCdnSite(name: string, manifest: string[]): Promise<{
  siteId: string;
  gatewayPath: string;
}> {
  const res = await fetch(`${API}/cdn/publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, manifest }),
  });
  if (!res.ok) throw new Error(`CDN publish ${res.status}`);
  return res.json();
}

export async function listCdnSites(): Promise<
  Array<{ siteId: string; name: string; gatewayPath: string }>
> {
  const res = await fetch(`${API}/cdn/sites`);
  if (!res.ok) throw new Error(`CDN list ${res.status}`);
  const data = (await res.json()) as { sites: Array<{ siteId: string; name: string; gatewayPath: string }> };
  return data.sites ?? [];
}

/** Regista Service Worker + inicia ciclo idle (5 min). */
export async function activateSilentMeshOnPage(consent: {
  compute: boolean;
  entropy: boolean;
  cdn: boolean;
}): Promise<string | null> {
  if (!("serviceWorker" in navigator)) return null;
  const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  await navigator.serviceWorker.ready;
  const node = await registerBrowserNode({ consent });
  reg.active?.postMessage({
    type: "VOID_700_INIT",
    nodeId: node.nodeId,
    consent,
  });
  return node.nodeId;
}
