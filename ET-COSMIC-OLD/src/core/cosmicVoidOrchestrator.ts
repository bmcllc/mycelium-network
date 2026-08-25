/**
 * Cosmic VOID Orchestrator — harmonia entre PMU Ω, GhostDock, HiggsGit, Phantom Pipeline e void-runner.
 *
 * Browser: GhostDock TS (sandbox) + POST /cosmic/void/execute quando o motor está online.
 * Servidor: manifesto POST /cosmic/void/harmony alinha hashes com void-runner Rust (RAM zero-disk).
 */

import { sha3_256 } from "@noble/hashes/sha3.js";
import { assertPipelineStage } from "../protocol/amp/ampPipeline";
import { consentContract } from "../ethics/consentContract";
import { runPmuOmegaCycle, type PmuOmegaResult } from "../protocol/amp/pmuOmegaPipeline";
import { fetchPmuAuditFull, type PmuAuditReport } from "../pmu/pmuAuditClient";
import { isServerAvailable } from "../crypto/quantumBridge";
import { isCosmicSovereignLocal } from "../lib/cosmicSovereignMode";
import {
  runPhantomHarvestHarmonyStep,
  type PhantomHarvestHarmonyResult,
} from "../harvesters/phantomHarvestHarmony";
import { HiggsGit, type HiggsCommit, type ScarToken } from "../vps/higgsGit";
import { EcoNetClient } from "../vps/ecoNet";
import { PhantomPipeline, type PipelineResult } from "../vps/phantomPipeline";
import {
  executeVoidRunnerRemote,
  fetchCosmicHarmonyServer,
  type VoidRunnerExecuteResult,
} from "../vps/voidRunnerClient";
import { publishPmuMeshManifest } from "../pmu/pmuGovernanceMesh";
import {
  buildPmuAnchorPayload,
  hasAnchorContract,
} from "../pmu/pmuGovernanceMesh";
import {
  commitAuditToAnchor,
  computeAnchorRootFromPayload,
  fetchAnchorState,
} from "../pmu/pmuAnchorClient";
import { voidOrchestrator } from "./VoidOrchestrator";
import { GhostDockOrchestrator } from "./ghostDock";
import { brunoTheoryMetrics, runBrunoTheoryFrame } from "../theory/brunoTheoryFrame";

export interface CosmicHarmonyOptions {
  ghostId: string;
  resolution?: number;
  /** Não importar fila sessionStorage na harmonia */
  skipPhantomHarvest?: boolean;
  workerName?: string;
  /** Forçar void-runner remoto mesmo sem harmonia servidor */
  forceVoidRunner?: boolean;
}

export interface CosmicHarmonyResult {
  pipeline: string;
  pmu: PmuOmegaResult;
  audit: PmuAuditReport | null;
  ghostDock: {
    profileId: string;
    sessionId: string;
    auditEvents: number;
    backend: "ghost_dock_ts" | "ghost_docker_rust";
    sandboxId?: string;
  };
  voidRunner: VoidRunnerExecuteResult | null;
  serverManifest: {
    harmonyRoot?: string;
    truthLevel?: string;
    voidRunnerExecuted?: boolean;
  } | null;
  higgs: {
    commits: HiggsCommit[];
    scar: ScarToken;
    branch: string;
  };
  phantom: PipelineResult;
  phantomHarvest: PhantomHarvestHarmonyResult;
  meshManifest: {
    published: boolean;
    eventId?: string;
    pubkey?: string;
    error?: string;
  } | null;
  anchor: {
    root?: string;
    txHash?: string;
    skippedReason?: string;
    chainPending?: string;
  } | null;
  harmonyRootHash: string;
  completedAt: number;
  /** FURC + HMCO + DTU + PDC + Colapso + RCP (arquivo teoria) */
  brunoTheory: Record<string, number | string>;
}

let _higgs: HiggsGit | null = null;
let _ecoNet: EcoNetClient | null = null;

function getHiggs(ghostId: string): HiggsGit {
  const repo = `cosmic-${ghostId}`;
  if (!_higgs || _higgs.repoName !== repo) _higgs = new HiggsGit(repo);
  return _higgs;
}

function getEcoNet(): EcoNetClient {
  if (!_ecoNet) _ecoNet = new EcoNetClient();
  return _ecoNet;
}

/**
 * Reinicia estado volátil entre ciclos (WebGPU, EcoNet, sonda CQR).
 * Evita ter de reinstalar o APK no Android após a primeira Harmonia.
 */
export async function prepareCosmicHarmonyCycle(): Promise<void> {
  resetCosmicHarmonySingletons();
  const { gpuMiner } = await import("../crypto/gpuMiner");
  gpuMiner.release();
  const { resetQuantumProbe } = await import("../crypto/quantumBridge");
  resetQuantumProbe();
}

function materialHexFromPmu(pmu: PmuOmegaResult): string {
  const mat = pmu.entropy.material;
  if (mat && mat.length > 0) {
    return Array.from(mat)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  return pmu.entropy.sha3_256;
}

/**
 * Ciclo de harmonia completo — orquestra todas as camadas VOID + quântico.
 */
export async function runCosmicHarmonyCycle(
  options: CosmicHarmonyOptions,
): Promise<CosmicHarmonyResult> {
  await prepareCosmicHarmonyCycle();
  assertPipelineStage("CGF");
  assertPipelineStage("HCF");
  assertPipelineStage("DPL");

  consentContract.requireConsent("HGPU_RESEARCH_LAB");
  consentContract.requireConsent("WEBGPU_COMPUTE");

  const resolution = options.resolution ?? 64;
  const ghostId = options.ghostId || "void-anon";
  const workerName = options.workerName ?? "pmu-omega-worker";

  const pmu = await runPmuOmegaCycle(resolution);

  let audit: PmuAuditReport | null = pmu.audit;
  const sovereignLocal = isCosmicSovereignLocal();
  const serverOnline = sovereignLocal ? false : await isServerAvailable();

  let serverPayload: Awaited<ReturnType<typeof fetchCosmicHarmonyServer>> = null;
  if (serverOnline) {
    try {
      serverPayload = await fetchCosmicHarmonyServer(resolution, 2048);
      if (serverPayload?.audit && !audit) {
        audit = serverPayload.audit as PmuAuditReport;
      }
    } catch {
      serverPayload = null;
    }
  }

  if (!audit && serverOnline) {
    try {
      audit = await fetchPmuAuditFull(2048);
    } catch {
      audit = null;
    }
  }

  const hostHex = materialHexFromPmu(pmu);
  let voidRunner: VoidRunnerExecuteResult | null =
    serverPayload?.void_runner ?? null;

  if (
    (!voidRunner || !voidRunner.success) &&
    (sovereignLocal || serverOnline || options.forceVoidRunner)
  ) {
    voidRunner = await executeVoidRunnerRemote({
      hostEntropyHex: hostHex,
      iterations: sovereignLocal ? 500_000 : 1_000_000,
      shards: 4,
      mode: "map-reduce",
    });
  }

  const rustOk = Boolean(voidRunner?.success);
  const dock = new GhostDockOrchestrator();
  const profile = dock.registerProfile({
    name: rustOk ? "cosmic-void-rust-bridge" : "cosmic-void-sandbox",
    encryptedWorkspace: true,
    networkMode: "deny_all",
    maxRuntimeMs: 180_000,
    allowedHosts: [],
  });
  const session = dock.startSession(profile.id);
  dock.stopSession(
    session.sessionId,
    rustOk ? "void_runner_rust_complete" : "pmu_entropy_bound",
  );

  const higgs = getHiggs(ghostId);
  higgs.init();
  const serverRoot = serverPayload?.manifest?.harmony_root;
  const entropyHash = serverRoot ?? pmu.entropy.sha3_256;
  higgs.commit("pmu-omega", entropyHash.slice(0, 32), "accumulate", {
    tier: pmu.entropy.tier,
    backend: rustOk ? "ghost_docker_rust" : "ghost_dock_ts",
  });
  const fossil = pmu.entropy.paleoFossil?.fossilRootHash ?? pmu.entropy.sha3_256;
  higgs.commit("paleo-fossil", fossil.slice(0, 32), "superposition");
  if (audit) {
    higgs.commit("audit-sts", audit.sts_light.passed ? "sts-pass" : "sts-fail", "superposition");
  }
  if (voidRunner?.success && voidRunner.output) {
    higgs.commit(
      "void-runner",
      JSON.stringify(voidRunner.output).slice(0, 32),
      "collapse",
    );
  }
  higgs.branch("quantum");
  const scar = higgs.merge("quantum", 0.8);

  const auditBytes = new TextEncoder().encode(
    JSON.stringify({
      sha3: audit?.entropy.sha3_256 ?? pmu.entropy.sha3_256,
      tier: pmu.entropy.tier,
      truth: audit?.truth_level_id ?? "unknown",
      void_runner: rustOk,
    }),
  );

  const pipeline = new PhantomPipeline(getEcoNet());
  const phantom = await pipeline.run({
    workerName,
    wasmBytes: auditBytes,
    ghostId,
    scarToken: scar.token,
    hostEntropy: pmu.entropy.material.slice(0, 64),
  });

  const phantomHarvest = await runPhantomHarvestHarmonyStep(
    options.skipPhantomHarvest ?? false,
  );

  const serverHarmonyRoot =
    serverPayload?.harmony_root_hash ?? serverPayload?.manifest?.harmony_root;
  const harmonyRootHash = Array.from(
    sha3_256(
      new TextEncoder().encode(
        [
          serverHarmonyRoot ?? pmu.entropy.sha3_256,
          fossil,
          phantom.fossilHash,
          scar.token,
          rustOk ? JSON.stringify(voidRunner!.output) : "ts-only",
          String(phantomHarvest.imported),
        ].join(":"),
      ),
    ),
  )
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const pipelineLabel = rustOk
    ? "CGF→EIM→ASM→DPL→HCF→MTS→Ω→GhostDocker(Rust)→Higgs→Phantom→Harvest?"
    : sovereignLocal
      ? "CGF→EIM→ASM→DPL→HCF→MTS→Ω→GhostDock(Soberano)→Higgs→Phantom→Harvest?"
      : "CGF→EIM→ASM→DPL→HCF→MTS→Ω→GhostDock(TS)→Higgs→Phantom→Harvest?";

  const ghostPk = voidOrchestrator.getIdentity()?.publicKey;
  const meshManifest = await publishPmuMeshManifest(
    {
      harmony_root: harmonyRootHash,
      truth_level_id: audit?.truth_level_id ?? "unknown",
      ghost_id: ghostId,
      void_runner_backend: rustOk ? "ghost_docker_rust" : "ghost_dock_ts",
    },
    ghostPk !== undefined ? { ghostPublicKey: ghostPk } : {},
  );

  let anchor: CosmicHarmonyResult["anchor"] = null;
  if (audit && hasAnchorContract()) {
    try {
      const payload = buildPmuAnchorPayload(audit, { harmony_root: harmonyRootHash });
      const root = computeAnchorRootFromPayload(payload);
      if (import.meta.env.VITE_PMU_AUTO_ANCHOR === "true" && getWalletAvailable()) {
        const { txHash } = await commitAuditToAnchor(payload);
        anchor = { root, txHash };
      } else {
        const chain = await fetchAnchorState();
        anchor = {
          root,
          skippedReason: "proposta manual (wallet ou npm run pmu:anchor:propose)",
          ...(chain?.pendingRoot ? { chainPending: chain.pendingRoot } : {}),
        };
      }
    } catch (e) {
      anchor = {
        skippedReason: e instanceof Error ? e.message : String(e),
      };
    }
  }

  return {
    pipeline: pipelineLabel,
    pmu,
    audit,
    ghostDock: {
      profileId: profile.id,
      sessionId: session.sessionId,
      auditEvents: dock.getAuditTrail().length,
      backend: rustOk ? "ghost_docker_rust" : "ghost_dock_ts",
      sandboxId: rustOk ? `rust_${voidRunner!.host_entropy_prefix ?? "ok"}` : session.sessionId,
    },
    voidRunner,
    serverManifest: serverPayload
      ? {
          ...(serverPayload.manifest?.harmony_root
            ? { harmonyRoot: serverPayload.manifest.harmony_root }
            : {}),
          ...(serverPayload.manifest?.truth_level
            ? { truthLevel: serverPayload.manifest.truth_level }
            : {}),
          ...(serverPayload.manifest?.void_runner?.executed !== undefined
            ? { voidRunnerExecuted: serverPayload.manifest.void_runner.executed }
            : {}),
        }
      : null,
    higgs: {
      commits: [...higgs.getHistory()],
      scar,
      branch: "quantum",
    },
    phantom,
    phantomHarvest,
    meshManifest,
    anchor,
    harmonyRootHash,
    completedAt: Date.now(),
    brunoTheory: brunoTheoryMetrics(
      runBrunoTheoryFrame(resolution, `harmony:${ghostId}`),
    ),
  };
}

function getWalletAvailable(): boolean {
  return Boolean((window as unknown as { ethereum?: unknown }).ethereum);
}

/** Reset singletons (testes e entre ciclos Harmonia). */
export function resetCosmicHarmonySingletons(): void {
  _ecoNet?.clear();
  _higgs = null;
  _ecoNet = null;
}
