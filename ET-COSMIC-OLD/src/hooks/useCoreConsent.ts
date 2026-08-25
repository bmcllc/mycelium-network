import { useAmpConsent } from "./useAmpConsent";

/** Atalho: consentimento CGF — preset Núcleo v1 (nível 10). */
export function useCoreConsent() {
  const amp = useAmpConsent();
  return {
    ready: amp.ready,
    hasCore: amp.hasCore,
    signCore: amp.signCore,
    refresh: amp.refresh,
  };
}
