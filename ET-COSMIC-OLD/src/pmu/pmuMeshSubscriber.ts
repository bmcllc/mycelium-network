/**
 * Subscrição real a manifestos PMU na malha NOSTR (kind 31220).
 */

import { SimplePool } from "nostr-tools/pool";
import { getSovereignRelays } from "../config/sovereign";
import { KIND_PMU_MANIFEST } from "../network/etrnetKinds";
import type { PmuMeshManifest } from "./pmuGovernanceMesh";

export interface PmuMeshManifestEvent {
  id: string;
  pubkey: string;
  created_at: number;
  manifest: PmuMeshManifest;
}

export function subscribePmuMeshManifests(
  onManifest: (ev: PmuMeshManifestEvent) => void,
  relays?: string[],
): { close: () => void } {
  const relayList = (relays ?? getSovereignRelays()).filter(Boolean);
  const pool = new SimplePool();

  const sub = pool.subscribeMany(
    relayList,
    { kinds: [KIND_PMU_MANIFEST], "#t": ["pmu-mesh"], limit: 50 },
    {
      onevent: (event) => {
        try {
          const manifest = JSON.parse(event.content) as PmuMeshManifest;
          if (manifest.protocol !== "PMU_MESH_MANIFEST") return;
          onManifest({
            id: event.id,
            pubkey: event.pubkey,
            created_at: event.created_at,
            manifest,
          });
        } catch {
          /* ignore */
        }
      },
    },
  );

  return {
    close: () => {
      sub.close();
      pool.close(relayList);
    },
  };
}
