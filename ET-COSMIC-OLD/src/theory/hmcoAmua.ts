/**
 * HMCO–AMUA v2 — orquestração hierárquica VRAM / RAM / NVMe.
 * Heat map H, operadores M, C, Φ, leadsto, loop multi-tick.
 */

import type { FurcState } from "./furc";
import { topOperator } from "./furc";

export type MemTier = "VRAM" | "RAM" | "NVMe";

export interface MemPage {
  id: number;
  tier: MemTier;
  heat: number;
  freq: number;
  recency: number;
  critical: number;
  pred: number;
  virtAddr: number;
}

export interface HmcoState {
  kappa: number;
  Sigma_ent: number;
  grad_pred: number;
  prefetch_mode: "idle" | "async" | "burst";
  C_cache: number;
  Phi: number;
  page_faults: number;
  accesses: number;
  pages_in_vram: number;
  bandwidth_util: number;
}

export interface HmcoTick extends HmcoState {
  step: number;
  evictions: number;
  prefetches: number;
}

const VRAM_CAP = 32;
const RAM_CAP = 64;

export function pageHeat(
  p: Pick<MemPage, "freq" | "recency" | "critical" | "pred">,
  alpha = 0.4,
  beta = 0.3,
  gamma = 0.2,
  delta = 0.1,
): number {
  return alpha * p.freq + beta * p.recency + gamma * p.critical + delta * p.pred;
}

export function leadstoPhi(
  phi: number,
  demand: number,
  deltaDown: number,
  deltaUp: number,
): number {
  return topOperator(phi + (demand - phi), phi - deltaDown, phi + deltaUp);
}

export class HmcoOrchestrator {
  readonly pages: MemPage[];
  bandwidth = 1;
  pageFaults = 0;
  accesses = 0;
  phi = 0;
  private trace: HmcoTick[] = [];

  constructor(pageCount: number, material: Uint8Array) {
    const u = (i: number) => (material[i % material.length] ?? 0) / 255;
    this.pages = Array.from({ length: pageCount }, (_, id) => ({
      id,
      tier: id < VRAM_CAP ? "VRAM" : id < VRAM_CAP + RAM_CAP ? "RAM" : "NVMe",
      heat: 0,
      freq: u(id) * 0.5,
      recency: u(id + 1) * 0.5,
      critical: u(id + 2) * 0.3,
      pred: u(id + 3) * 0.4,
      virtAddr: (id * 4096) ^ (material[id % material.length]! << 8),
    }));
    this.bandwidth = 0.5 + u(50) * 0.5;
    this.phi = this.bandwidth * 0.3;
  }

  /** Um tick do loop HMCO (acesso simulado + heat + prefetch + eviction). */
  tick(step: number, material: Uint8Array, furc: FurcState): HmcoTick {
    const u = (i: number) => (material[(step * 7 + i) % material.length] ?? 0) / 255;
    const accessIdx = Math.floor(u(0) * this.pages.length) % this.pages.length;
    const page = this.pages[accessIdx]!;
    this.accesses++;
    page.freq = topOperator(page.freq + 0.15, 0, 1);
    page.recency = 1;
    for (const p of this.pages) {
      if (p.id !== page.id) p.recency *= 0.92;
    }
    page.pred = topOperator(page.pred + u(1) * 0.1 - 0.05, 0, 1);
    page.heat = pageHeat(page);

    if (page.tier !== "VRAM") {
      this.pageFaults++;
    }

    const demand = page.heat * furc.C_epsilon * this.bandwidth;
    this.phi = leadstoPhi(this.phi, demand, this.bandwidth * 0.2, this.bandwidth * 0.35);

    let prefetches = 0;
    let evictions = 0;
    const hot = [...this.pages].sort((a, b) => b.heat - a.heat);
    for (const hp of hot.slice(0, 4)) {
      if (hp.tier === "NVMe" && this.phi > this.bandwidth * 0.4) {
        hp.tier = "RAM";
        prefetches++;
      } else if (hp.tier === "RAM" && hp.heat > 0.55 && this.countTier("VRAM") < VRAM_CAP) {
        const cold = this.pages
          .filter((p) => p.tier === "VRAM")
          .sort((a, b) => a.heat - b.heat)[0];
        if (cold) {
          cold.tier = "RAM";
          evictions++;
        }
        hp.tier = "VRAM";
        prefetches++;
      }
    }

    const C_cache = 1 - this.pageFaults / Math.max(1, this.accesses);
    const kappa = C_cache * furc.C_epsilon;
    const Sigma_ent = -this.pages.reduce((s, p) => {
      const h = Math.max(p.heat, 1e-6);
      return s + h * Math.log(h);
    }, 0);
    const grad_pred = hot[0] && hot[1] ? hot[0].heat - hot[1].heat : 0;
    const prefetch_mode: HmcoState["prefetch_mode"] =
      prefetches > 2 ? "burst" : prefetches > 0 ? "async" : "idle";

    const tickState: HmcoTick = {
      step,
      kappa,
      Sigma_ent,
      grad_pred,
      prefetch_mode,
      C_cache,
      Phi: this.phi,
      page_faults: this.pageFaults,
      accesses: this.accesses,
      pages_in_vram: this.countTier("VRAM"),
      bandwidth_util: this.phi / Math.max(this.bandwidth, 1e-9),
      evictions,
      prefetches,
    };
    this.trace.push(tickState);
    return tickState;
  }

  get traceLog(): readonly HmcoTick[] {
    return this.trace;
  }

  snapshot(): HmcoState {
    const last = this.trace[this.trace.length - 1];
    if (last) {
      const { step: _s, evictions: _e, prefetches: _p, ...rest } = last;
      return rest;
    }
    return {
      kappa: 0,
      Sigma_ent: 0,
      grad_pred: 0,
      prefetch_mode: "idle",
      C_cache: 1,
      Phi: this.phi,
      page_faults: 0,
      accesses: 0,
      pages_in_vram: this.countTier("VRAM"),
      bandwidth_util: 0,
    };
  }

  private countTier(tier: MemTier): number {
    return this.pages.filter((p) => p.tier === tier).length;
  }
}

/** Compat: um snapshot após N ticks internos. */
export function computeHmco(material: Uint8Array, furc: FurcState, ticks = 8): HmcoState {
  const orch = new HmcoOrchestrator(96, material);
  for (let i = 0; i < ticks; i++) orch.tick(i, material, furc);
  return orch.snapshot();
}
