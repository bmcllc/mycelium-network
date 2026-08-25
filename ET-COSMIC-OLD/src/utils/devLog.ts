/** Logs de fallback esperados — só em debug no Vite dev. */
export function devDebug(...args: unknown[]): void {
  if (import.meta.env.DEV) {
    console.debug(...args);
  }
}

export function devWarn(...args: unknown[]): void {
  if (import.meta.env.DEV) {
    console.debug(...args);
  } else {
    console.warn(...args);
  }
}
