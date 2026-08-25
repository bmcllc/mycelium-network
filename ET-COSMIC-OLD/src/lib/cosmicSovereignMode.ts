/**
 * Harmonia independente — GhostDock + Higgs + Phantom no dispositivo, sem motor CQR remoto.
 */

import { getRemoteCqrUrl } from "./remoteCqrConfig";

export function isCapacitorNative(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } })
    .Capacitor;
  return cap?.isNativePlatform?.() === true;
}

/** Chrome/Android «Adicionar ao ecrã inicial» — evita WebView Capacitor e travamentos do APK. */
export function isPwaStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    nav.standalone === true
  );
}

/** APK Capacitor ou PWA instalada — mesmas regras de SW/GPU. */
export function isMobileShell(): boolean {
  return isCapacitorNative() || isPwaStandalone();
}

function capNative(): boolean {
  return isCapacitorNative();
}

/** Build-time: VITE_COSMIC_SOVEREIGN=true ou VITE_QUANTUM_SOVEREIGN=local */
export function isCosmicSovereignBuild(): boolean {
  const v = import.meta.env.VITE_COSMIC_SOVEREIGN;
  const q = import.meta.env.VITE_QUANTUM_SOVEREIGN;
  return v === "true" || v === "1" || q === "local";
}

/**
 * Ciclo Harmonia 100% no cliente — sem POST /cosmic/void/* remoto.
 * APK Android soberano: true por defeito se não houver VITE_QUANTUM_API_URL.
 */
export function isCosmicSovereignLocal(): boolean {
  if (getRemoteCqrUrl()) return false;
  if (import.meta.env.VITE_COSMIC_SOVEREIGN === "true" || import.meta.env.VITE_QUANTUM_SOVEREIGN === "local") {
    return true;
  }
  const api = import.meta.env.VITE_QUANTUM_API_URL;
  if (api === "same-origin" || api === ".") return false;
  if (api && String(api).trim() !== "") return false;
  if (isCosmicSovereignBuild()) return true;
  return capNative();
}

export function cosmicSovereignLabel(): string {
  const remote = getRemoteCqrUrl();
  if (remote) return `remoto (${remote.length > 32 ? `${remote.slice(0, 28)}…` : remote})`;
  return isCosmicSovereignLocal() ? "CQR no dispositivo" : "rede (CQR remoto)";
}

/** APK/PWA soberano: garante consentimento CGF núcleo v1 antes de Harmonia/ScrapScanner import. */
export async function ensureSovereignAmpConsent(): Promise<void> {
  if (!isCosmicSovereignBuild() && !isCosmicSovereignLocal()) return;
  const { consentReceiptStore } = await import("../protocol/amp/consentReceiptStore");
  const { consentContract, CORE_V1_MAX_LEVEL } = await import("../ethics/consentContract");
  await consentReceiptStore.hydrateFromOpfs();
  const level = consentReceiptStore.getMaxLevel();
  if (level < CORE_V1_MAX_LEVEL) {
    await consentContract.signPreset(CORE_V1_MAX_LEVEL);
    await consentReceiptStore.hydrateFromOpfs();
  }
}
