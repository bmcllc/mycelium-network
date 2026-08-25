import { useCallback, useEffect, useState } from "react";
import {
  consentContract,
  CORE_V1_MAX_LEVEL,
  type ConsentScope,
} from "../ethics/consentContract";
import {
  isOperationAllowed,
  LATTICE_LEVEL,
  type LatticeLevel,
} from "../protocol/amp/consentLattice";
import { consentReceiptStore } from "../protocol/amp/consentReceiptStore";

export function useAmpConsent() {
  const [ready, setReady] = useState(false);
  const [maxLevel, setMaxLevel] = useState<LatticeLevel>(LATTICE_LEVEL.NONE);

  const refresh = useCallback(() => {
    setMaxLevel(consentReceiptStore.getMaxLevel());
    setReady(true);
  }, []);

  useEffect(() => {
    void (async () => {
      await consentReceiptStore.hydrateFromOpfs();
      const { ensureSovereignAmpConsent } = await import("../lib/cosmicSovereignMode");
      await ensureSovereignAmpConsent();
      refresh();
    })();
  }, [refresh]);

  const hasCore = maxLevel >= LATTICE_LEVEL.IDENTITY_COLLECTION;
  const canImport = isOperationAllowed(maxLevel, "legacy_import");
  const canSpawn = isOperationAllowed(maxLevel, "spawn_identity");

  const signCore = useCallback(async () => {
    await consentContract.signPreset(CORE_V1_MAX_LEVEL);
    refresh();
  }, [refresh]);

  const signScopes = useCallback(
    async (scopes: ConsentScope[]) => {
      await consentContract.sign(scopes);
      refresh();
    },
    [refresh],
  );

  return {
    ready,
    maxLevel,
    hasCore,
    canImport,
    canSpawn,
    signCore,
    signScopes,
    refresh,
  };
}
