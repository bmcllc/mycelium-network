import { PageShell } from "./PageShell";

export default function GovernanceSovereigntyPage() {
  return (
    <PageShell title="Sovereignty" eyebrow="Governance · Protocol-First">
      <p className="text-sm text-zinc-500 leading-relaxed max-w-xl">
        Royalties de protocolo, tesouraria soberana e políticas ETERNET. Configure o VPS e ligue APIs
        para operações live.
      </p>
      <ul className="mt-6 space-y-2 text-[11px] text-zinc-600">
        <li>· Política de royalties e splits on-chain / off-chain</li>
        <li>· Tesouraria SOV e trilhos de auditoria PMU</li>
        <li>· Ghost ID e rotação de identidade (dev stack)</li>
      </ul>
    </PageShell>
  );
}
