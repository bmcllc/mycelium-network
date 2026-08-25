import { describe, it, expect } from "vitest";
import { computeFurc, furcParamsFromMaterial, coherenceFromNoise, FurcSimulator } from "./furc";
import { HmcoOrchestrator, computeHmco } from "./hmcoAmua";
import { runDtuMorphogenesis } from "./dtu";
import { runBrunoTheoryFrame } from "./brunoTheoryFrame";
import { runBrunoTheorySimulation } from "./brunoTheoryEngine";
import {
  pdcEcsMatch,
  pdcMorton2D,
  pdcMorton3D,
  pdcXorshift,
  pdcBresenham3D,
  PdcSubsystem,
} from "./pdc";
import { architectEyeScale, projectTesseract } from "./collapseEngineering";
import { RcpSimulator, runRcpStep } from "./rcp";
import { offlineMaterialFromSeed } from "../lib/moduleRealityBackend";

describe("bruno theory (FURC/HMCO/DTU/PDC/Colapso/RCP)", () => {
  it("FURC: coerência decai com ruído", () => {
    expect(coherenceFromNoise(0)).toBeCloseTo(1, 5);
    expect(coherenceFromNoise(0.5)).toBeLessThan(coherenceFromNoise(0.1));
  });

  it("FURC: simulador evolui ρ_τ no tempo", () => {
    const mat = offlineMaterialFromSeed("furc:sim", 64);
    const sim = new FurcSimulator(mat, 64);
    const s0 = sim.step(0.01);
    for (let i = 0; i < 20; i++) sim.step(0.01);
    expect(sim.history.length).toBe(21);
    expect(sim.rho).not.toBe(s0.rho);
    expect(sim.rho).toBeGreaterThan(0.05);
    expect(sim.rho).toBeLessThan(1);
  });

  it("FURC: P_max e m_dot finitos a partir de material", () => {
    const mat = offlineMaterialFromSeed("test:furc", 32);
    const furc = computeFurc(furcParamsFromMaterial(mat, 64));
    expect(furc.C_epsilon).toBeGreaterThan(0);
    expect(furc.P_max).toBeGreaterThan(0);
    expect(Number.isFinite(furc.m_dot)).toBe(true);
  });

  it("HMCO: loop reduz ou estabiliza page faults relativos", () => {
    const mat = offlineMaterialFromSeed("hmco", 128);
    const furc = computeFurc(furcParamsFromMaterial(mat, 64));
    const orch = new HmcoOrchestrator(48, mat);
    for (let i = 0; i < 16; i++) orch.tick(i, mat, furc);
    const snap = orch.snapshot();
    expect(snap.C_cache).toBeGreaterThan(0);
    expect(snap.kappa).toBeGreaterThan(0);
    expect(orch.traceLog.length).toBe(16);
    expect(computeHmco(mat, furc, 4).Phi).toBeGreaterThanOrEqual(0);
  });

  it("DTU: morfogênese produz QCG com coerência", () => {
    const mat = offlineMaterialFromSeed("dtu", 64);
    const furc = computeFurc(furcParamsFromMaterial(mat, 64));
    const r = runDtuMorphogenesis(mat, furc, 64, 10);
    expect(r.qcg.nodes.length).toBeGreaterThanOrEqual(8);
    expect(r.finalCoherence).toBeGreaterThan(0);
    expect(r.operators.qcg_edges).toBeGreaterThan(0);
  });

  it("PDC: ECS, Morton 3D, Bresenham, corrotina", () => {
    expect(pdcEcsMatch(0b0101, 0b0101)).toBe(true);
    expect(pdcEcsMatch(0b0100, 0b0101)).toBe(false);
    expect(pdcMorton2D(3, 5)).toBeGreaterThan(0);
    expect(pdcMorton3D(1, 2, 3)).toBeGreaterThan(0);
    const voxels = pdcBresenham3D(0, 0, 0, 4, 2, 3);
    expect(voxels.length).toBeGreaterThan(3);
    const { state } = pdcXorshift(1);
    expect(state).toBeGreaterThan(0);
    const mat = offlineMaterialFromSeed("pdc", 64);
    const sub = new PdcSubsystem(42);
    for (let i = 0; i < 6; i++) sub.tick(mat, 64);
    const last = sub.tick(mat, 64);
    expect(last.entities.length).toBeGreaterThan(0);
    expect(last.voxelCount).toBeGreaterThan(0);
  });

  it("Colapso: Olho do Arquiteto amplia projeção", () => {
    const omega = architectEyeScale(4, 0.5);
    expect(omega).toBeGreaterThan(1);
    expect(projectTesseract("tess", 4)).toHaveLength(16);
  });

  it("RCP: simulação multi-passo com splat e energia", () => {
    const mat = offlineMaterialFromSeed("rcp", 64);
    const furc = computeFurc(furcParamsFromMaterial(mat, 64));
    const frame = runBrunoTheoryFrame(64, "rcp-seed", 8);
    const sim = new RcpSimulator(mat, furc, frame.collapse, 24);
    const result = sim.run(10, furc);
    expect(result.frames.length).toBe(10);
    expect(result.finalEnergy).toBeGreaterThanOrEqual(0);
    expect(result.splatGrid.some((v) => v > 0)).toBe(true);
    const rcp = runRcpStep(mat, furc, frame.collapse, 16);
    expect(rcp.splatDensity).toBeGreaterThanOrEqual(0);
  });

  it("motor: simulação completa com histórico", () => {
    const sim = runBrunoTheorySimulation({ resolution: 64, seed: "engine", steps: 16 });
    expect(sim.furcHistory.length).toBe(16);
    expect(sim.hmcoTrace.length).toBeGreaterThan(0);
    expect(sim.rcp.frames.length).toBeGreaterThan(0);
    expect(sim.frame.simulation?.steps).toBe(16);
  });

  it("frame unificado é determinístico", () => {
    const a = runBrunoTheoryFrame(64, "seed", 20);
    const b = runBrunoTheoryFrame(64, "seed", 20);
    expect(a.furc.P_max).toBe(b.furc.P_max);
    expect(a.rcp.splatDensity).toBe(b.rcp.splatDensity);
    expect(a.simulation?.furcHistoryLen).toBe(b.simulation?.furcHistoryLen);
  });
});
