/**
 * VOID-MESH — registo de nós e tarefas (delega silentMesh + economy).
 */
import { registerNode, silentMeshStatus, listNodes } from "../silentMesh/void700.js";
import { runImcAction } from "../imc/core.js";
import { creditAccount, sovToMicro } from "../economy/sovLedger.js";

const pendingTasks = [];

export function meshRegister(payload = {}) {
  const node = registerNode({
    ghostId: payload.ghostId ?? `ghost-${Date.now()}`,
    capabilities: payload.capabilities ?? ["ising", "entropy", "cdn"],
    lscLimits: payload.lscLimits ?? { maxCpu: 5, maxRamMb: 50 },
    ...payload,
  });
  return {
    nodeId: node.nodeId ?? node.id,
    assignedRelays: node.relays ?? ["wss://relay.damus.io"],
    peerCount: listNodes().length,
    earnings: {
      totalSov: node.earnedSov ?? 0,
      pendingTasks: pendingTasks.length,
    },
  };
}

export function meshTaskNext(ghostId, capabilities = []) {
  if (pendingTasks.length === 0) {
    pendingTasks.push({
      id: `task-${Date.now()}`,
      kind: capabilities.includes("ising") ? "ising-shard" : "entropy-contribute",
      payload: { n: 10, shardCount: 2 },
      rewardSov: 80,
      deadline: Date.now() + 60_000,
      ghostId,
    });
  }
  const task = pendingTasks.shift();
  if (!task) return { task: null, message: "Sem tarefas disponíveis no momento" };
  return {
    task: {
      id: task.id,
      kind: task.kind,
      payload: task.payload,
      reward: task.rewardSov,
      deadline: task.deadline,
    },
  };
}

export function meshTaskSubmit(payload = {}) {
  const accepted = Boolean(payload.result);
  let earnedSov = 0;
  if (accepted && payload.ghostId) {
    try {
      const r = creditAccount(payload.ghostId, sovToMicro(0.00008), {
        channel: "mesh-task",
        taskId: payload.taskId ?? "task",
      });
      earnedSov = r.creditedMicro ?? sovToMicro(0.00008);
    } catch {
      earnedSov = sovToMicro(0.00008);
    }
  }
  return {
    accepted,
    earnedSov: accepted ? earnedSov : 0,
    totalEarned: earnedSov,
    message: accepted ? `Tarefa aceita. +${earnedSov} $SOV` : `Rejeitada: ${payload.reason ?? "invalid"}`,
  };
}

export function meshStatus() {
  return { ...silentMeshStatus(), engine: "VOID-MESH" };
}

export function meshBridgeCompute(payload) {
  return runImcAction(payload.action ?? "VOID-511", payload);
}
