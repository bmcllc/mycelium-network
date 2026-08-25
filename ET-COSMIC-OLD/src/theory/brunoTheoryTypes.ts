import type { PdcFrame } from "./pdc";
import type { FurcState } from "./furc";
import type { HmcoState } from "./hmcoAmua";
import type { DtuOperators } from "./dtu";
import type { CollapseEngineeringState } from "./collapseEngineering";
import type { RcpFrame } from "./rcp";

export interface BrunoTheorySimulationMeta {
  steps: number;
  furcHistoryLen: number;
  hmcoTraceLen: number;
  rcpFrames: number;
  dtuCoherence: number;
  rcpFinalEnergy: number;
}

export interface BrunoTheoryFrame {
  source: "bruno-theory-archive";
  version: string;
  resolution: number;
  furc: FurcState;
  hmco: HmcoState;
  dtu: DtuOperators;
  pdc: PdcFrame;
  collapse: CollapseEngineeringState;
  rcp: RcpFrame;
  archiveRef: string;
  simulation?: BrunoTheorySimulationMeta;
}
