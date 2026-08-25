/** Flags injectados em build via vite.config `define`. */

declare const __B2B_SLIM_SHELL__: boolean;
declare const __B2B_SINGLE_ENTRY__: string;

export function isB2bSlimShell(): boolean {
  return typeof __B2B_SLIM_SHELL__ !== "undefined" && __B2B_SLIM_SHELL__ === true;
}

/** Path único para redirect `/` em builds de 1 painel; vazio = não aplicável. */
export function getB2bSingleEntry(): string | null {
  const raw = typeof __B2B_SINGLE_ENTRY__ !== "undefined" ? __B2B_SINGLE_ENTRY__ : "";
  return raw.length > 0 ? raw : null;
}
