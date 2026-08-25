/**
 * Evita que long-press / botão direito / auxclick quebrem o WebView Capacitor.
 * No Android o menu nativo (copiar/colar) pode deixar a UI presa até reinstalar.
 */

import { isCapacitorNative } from "./cosmicSovereignMode";

let installed = false;

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return target.isContentEditable;
}

export function installMobileWebViewGuard(): void {
  if (installed || typeof document === "undefined") return;
  if (!isCapacitorNative()) return;
  installed = true;

  const block = (e: Event) => {
    if (isEditableTarget(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
  };

  document.addEventListener("contextmenu", block, { capture: true, passive: false });
  document.addEventListener("auxclick", block, { capture: true, passive: false });

  document.addEventListener(
    "mousedown",
    (e) => {
      if (e.button === 0) return;
      if (isEditableTarget(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
    },
    { capture: true, passive: false },
  );

  document.addEventListener(
    "mouseup",
    (e) => {
      if (e.button === 0) return;
      if (isEditableTarget(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
    },
    { capture: true, passive: false },
  );

  document.addEventListener(
    "selectstart",
    (e) => {
      if (isEditableTarget(e.target)) return;
      e.preventDefault();
    },
    { capture: true, passive: false },
  );

  document.addEventListener(
    "dragstart",
    (e) => {
      if (isEditableTarget(e.target)) return;
      e.preventDefault();
    },
    { capture: true, passive: false },
  );
}
