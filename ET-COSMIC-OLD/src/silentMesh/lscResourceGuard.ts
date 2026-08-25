/**
 * VOID-180 / VOID-700 — limitador de recursos no cliente (Lei LSC #1).
 */

export interface LscGuardLimits {
  cpuPctMax: number;
  ramMbMax: number;
  minBatteryPct: number;
}

export const BROWSER_LIMITS: LscGuardLimits = {
  cpuPctMax: 5,
  ramMbMax: 50,
  minBatteryPct: 20,
};

export const VPS_LIMITS: LscGuardLimits = {
  cpuPctMax: 3,
  ramMbMax: 64,
  minBatteryPct: 0,
};

/** Estima carga CPU com trabalho sintético curto (0–100). */
export function estimateCpuPct(sampleMs = 8): number {
  const budget = sampleMs;
  const t0 = performance.now();
  let n = 0;
  while (performance.now() - t0 < budget) n++;
  const rate = n / budget;
  const baseline = 800_000;
  return Math.min(100, Math.round((rate / baseline) * 100));
}

export async function readBatteryPct(): Promise<number | null> {
  const nav = navigator as Navigator & {
    getBattery?: () => Promise<{ level: number; charging: boolean }>;
  };
  if (!nav.getBattery) return null;
  try {
    const b = await nav.getBattery();
    return Math.round(b.level * 100);
  } catch {
    return null;
  }
}

export function readDeviceMemoryMb(): number | null {
  const dm = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  return dm != null ? dm * 1024 : null;
}

export async function lscAllowsWork(
  limits: LscGuardLimits,
  hostCpuPct?: number,
): Promise<{ ok: boolean; reason?: string }> {
  const cpu = hostCpuPct ?? estimateCpuPct();
  if (cpu > limits.cpuPctMax) {
    return { ok: false, reason: `CPU ${cpu}% > ${limits.cpuPctMax}%` };
  }
  const mem = readDeviceMemoryMb();
  if (mem != null && mem > limits.ramMbMax * 4) {
    return { ok: false, reason: "RAM budget exceeded" };
  }
  const batt = await readBatteryPct();
  if (batt != null && batt < limits.minBatteryPct) {
    return { ok: false, reason: `Bateria ${batt}%` };
  }
  return { ok: true };
}
