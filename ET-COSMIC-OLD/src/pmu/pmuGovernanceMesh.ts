/**
 * PMU — governança on-chain + manifesto de malha NOSTR (implementação real).
 */

import { finalizeEvent, getPublicKey } from "nostr-tools/pure";
import { SimplePool } from "nostr-tools/pool";
import { loadSovereignConfig } from "../config/sovereign";
import { KIND_PMU_MANIFEST } from "../network/etrnetKinds";
import type { PmuAuditReport } from "./pmuAuditClient";
import {
  getOrCreateMeshNostrSecretKey,
  meshSecretFromGhostPublicKey,
} from "./pmuMeshIdentity";

export const PMU_MESH_MANIFEST_KIND = KIND_PMU_MANIFEST;

export interface PmuAnchorCommitPayload {
  protocol: "PMU_ANCHOR_COMMIT";
  audit_sha3: string;
  truth_level_id: string;
  harmony_root?: string;
  void_pool_tip?: string;
  generated_at: number;
}

export interface PmuMeshManifest {
  protocol: "PMU_MESH_MANIFEST";
  harmony_root: string;
  truth_level_id: string;
  ghost_id: string;
  void_runner_backend?: string;
  generated_at: number;
}

export function buildPmuAnchorPayload(
  audit: PmuAuditReport,
  extras?: { harmony_root?: string },
): PmuAnchorCommitPayload {
  const payload: PmuAnchorCommitPayload = {
    protocol: "PMU_ANCHOR_COMMIT",
    audit_sha3: audit.entropy.sha3_256,
    truth_level_id: audit.truth_level_id,
    generated_at: audit.generated_at,
  };
  if (extras?.harmony_root) payload.harmony_root = extras.harmony_root;
  const tip = audit.void_pool?.after?.chain_tip;
  if (tip) payload.void_pool_tip = tip;
  return payload;
}

export function hasAnchorContract(): boolean {
  return Boolean(loadSovereignConfig().anchorAddress);
}

function resolveMeshSecretKey(ghostPublicKey?: Uint8Array): Uint8Array {
  if (ghostPublicKey?.length) {
    return meshSecretFromGhostPublicKey(ghostPublicKey);
  }
  return getOrCreateMeshNostrSecretKey();
}

/**
 * Publica manifesto PMU na malha NOSTR com identidade persistente.
 */
export async function publishPmuMeshManifest(
  manifest: Omit<PmuMeshManifest, "protocol" | "generated_at">,
  options?: { relays?: string[]; ghostPublicKey?: Uint8Array },
): Promise<{ published: boolean; eventId?: string; pubkey?: string; error?: string }> {
  const cfg = loadSovereignConfig();
  const relayList = (options?.relays ?? [cfg.primaryRelay, cfg.fallbackRelay]).filter(Boolean);
  if (relayList.length === 0) {
    return { published: false, error: "sem relays NOSTR" };
  }

  const sk = resolveMeshSecretKey(options?.ghostPublicKey);
  const pk = getPublicKey(sk);
  const body: PmuMeshManifest = {
    protocol: "PMU_MESH_MANIFEST",
    generated_at: Date.now(),
    ...manifest,
  };

  const event = finalizeEvent(
    {
      kind: PMU_MESH_MANIFEST_KIND,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ["t", "pmu-mesh"],
        ["truth", manifest.truth_level_id],
        ["ghost", manifest.ghost_id],
        ["backend", manifest.void_runner_backend ?? "unknown"],
      ],
      content: JSON.stringify(body),
    },
    sk,
  );

  const pool = new SimplePool();
  try {
    await Promise.race([
      pool.publish(relayList, event),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("relay timeout")), 12_000),
      ),
    ]);
    return { published: true, eventId: event.id, pubkey: pk };
  } catch (e) {
    return {
      published: false,
      error: e instanceof Error ? e.message : String(e),
    };
  } finally {
    pool.close(relayList);
  }
}
