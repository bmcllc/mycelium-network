import { useEffect, useState } from "react";
import {
  loadOmegaMaterial,
  type ModuleRealityMeta,
} from "../lib/moduleRealityBackend";

/** Entropia Ω partilhada por painel (CQR dispositivo ou remoto). */
export function useOmegaMaterial(bits = 256): {
  material: Uint8Array | null;
  meta: ModuleRealityMeta | null;
  ready: boolean;
} {
  const [material, setMaterial] = useState<Uint8Array | null>(null);
  const [meta, setMeta] = useState<ModuleRealityMeta | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadOmegaMaterial(bits).then((r) => {
      if (cancelled) return;
      setMaterial(r.material);
      setMeta(r.meta);
    });
    return () => {
      cancelled = true;
    };
  }, [bits]);

  return { material, meta, ready: material !== null };
}
