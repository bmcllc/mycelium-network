/**
 * Motor unificado Bruno Theory — simulação multi-passo real (FURC→HMCO→DTU→PDC→Colapso→RCP).
 */

import { offlineMaterialFromSeed } from "../lib/moduleRealityBackend";
import { FurcSimulator, type FurcState } from "./furc";
import { HmcoOrchestrator, type HmcoState, type HmcoTick } from "./hmcoAmua";
import { runDtuMorphogenesis, type DtuMorphogenesisResult } from "./dtu";
import { PdcSubsystem, type PdcSubsystemState } from "./pdc";
import { runCollapseMorphogenesisProtocol, type CollapseEngineeringState } from "./collapseEngineering";
import { RcpSimulator, type RcpSimulationResult, type RcpFrame } from "./rcp";
import type { BrunoTheoryFrame } from "./brunoTheoryTypes";

export interface BrunoTheorySimulationConfig {
  resolution?: number;
  seed?: string;
  steps?: number;
  furcDt?: number;
  hmcoPages?: number;
  rcpParticles?: number;
  rcpSteps?: number;
}

export interface BrunoTheorySimulation {
  source: "bruno-theory-archive";
  version: string;
  resolution: number;
  steps: number;
  materialBytes: number;
  furcHistory: FurcState[];
  hmcoTrace: HmcoTick[];
  dtu: DtuMorphogenesisResult;
  pdc: PdcSubsystemState;
  collapse: CollapseEngineeringState;
  rcp: RcpSimulationResult;
  frame: BrunoTheoryFrame;
  archiveRef: string;
}

const ENGINE_VERSION = "FURC-2.1+HMCO-v2+DTU-3.0+PDC-5.2+Colapso+RCP-engine";

export function runBrunoTheorySimulation(
  config: BrunoTheorySimulationConfig = {},
): BrunoTheorySimulation {
  const resolution = config.resolution ?? 64;
  const seed = config.seed ?? "etrnet:bruno-theory";
  const steps = config.steps ?? 24;
  const material = offlineMaterialFromSeed(`${seed}:${resolution}`, 256);

  const furcSim = new FurcSimulator(material, resolution);
  const hmco = new HmcoOrchestrator(config.hmcoPages ?? 96, material);
  const pdc = new PdcSubsystem((resolution * 0x9e3779b9) ^ (material[0]! << 24));
  const furcDt = config.furcDt ?? 0.01;

  let lastFurc = furcSim.step(furcDt, 0);
  let lastHmco: HmcoTick | null = null;
  let lastPdc: PdcSubsystemState | null = null;

  for (let s = 1; s < steps; s++) {
    const noiseMod = (material[s % material.length]! / 255 - 0.5) * 0.01;
    lastFurc = furcSim.step(furcDt, noiseMod);
    lastHmco = hmco.tick(s, material, lastFurc);
    lastPdc = pdc.tick(material, resolution);
  }

  const furc = furcSim.last;
  const dtu = runDtuMorphogenesis(material, furc, resolution, Math.max(8, steps >> 1));
  const collapse = runCollapseMorphogenesisProtocol(material, furc, resolution);
  const rcpParticles = config.rcpParticles ?? 32 + (resolution % 16);
  const rcpSim = new RcpSimulator(material, furc, collapse, rcpParticles);
  const rcp = rcpSim.run(config.rcpSteps ?? Math.max(12, steps >> 1), furc);

  const pdcFinal = lastPdc ?? pdc.tick(material, resolution);
  const hmcoFinal = lastHmco ?? hmco.tick(0, material, furc);

  const frame: BrunoTheoryFrame = {
    source: "bruno-theory-archive",
    version: ENGINE_VERSION,
    resolution,
    furc,
    hmco: stripHmcoTick(hmcoFinal),
    dtu: dtu.operators,
    pdc: stripPdcSubsystem(pdcFinal),
    collapse,
    rcp: rcp.frames[rcp.frames.length - 1] ?? emptyRcpFrame(),
    archiveRef: "docs/archive/bruno-theory/mirror/",
    simulation: {
      steps,
      furcHistoryLen: furcSim.history.length,
      hmcoTraceLen: hmco.traceLog.length,
      rcpFrames: rcp.frames.length,
      dtuCoherence: dtu.finalCoherence,
      rcpFinalEnergy: rcp.finalEnergy,
    },
  };

  return {
    source: "bruno-theory-archive",
    version: ENGINE_VERSION,
    resolution,
    steps,
    materialBytes: material.length,
    furcHistory: [...furcSim.history],
    hmcoTrace: [...hmco.traceLog],
    dtu,
    pdc: pdcFinal,
    collapse,
    rcp,
    frame,
    archiveRef: frame.archiveRef,
  };
}

function stripHmcoTick(t: HmcoTick): HmcoState {
  const { step: _s, evictions: _e, prefetches: _p, ...rest } = t;
  return rest;
}

function stripPdcSubsystem(s: PdcSubsystemState): import("./pdc").PdcFrame {
  const { entities: _e, voxelKeys: _v, coroutineStep: _c, ...rest } = s;
  return rest;
}

function emptyRcpFrame(): RcpFrame {
  return {
    particles: 0,
    energy: 0,
    splatDensity: 0,
    homotopyPreserved: true,
    meanTau: 0,
    step: 0,
  };
}
