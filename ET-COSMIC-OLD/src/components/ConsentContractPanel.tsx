import { useMemo, useState } from "react";
import {
  CONSENT_CLAUSES,
  consentContract,
  CORE_V1_MAX_LEVEL,
  LAB_MAX_LEVEL,
  LATTICE_LEVEL_LABELS,
  type ConsentScope,
} from "../ethics/consentContract";

export default function ConsentContractPanel() {
  const [selected, setSelected] = useState<Set<ConsentScope>>(new Set());
  const [record, setRecord] = useState(consentContract.getRecord());
  const [exportJson, setExportJson] = useState("");
  const [signing, setSigning] = useState(false);

  const allScopes = useMemo(
    () => CONSENT_CLAUSES.map((c) => c.scope),
    [],
  );

  const toggle = (scope: ConsentScope) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(scope)) next.delete(scope);
      else next.add(scope);
      return next;
    });
  };

  const selectByMaxLevel = (maxLevel: number) => {
    setSelected(
      new Set(
        CONSENT_CLAUSES.filter((c) => c.latticeLevel <= maxLevel).map((c) => c.scope),
      ),
    );
  };

  const selectCore = () => selectByMaxLevel(CORE_V1_MAX_LEVEL);
  const selectLab = () => selectByMaxLevel(LAB_MAX_LEVEL);
  const selectAll = () => setSelected(new Set(allScopes));

  const handleSign = async () => {
    if (selected.size === 0) {
      alert("Selecione ao menos um escopo.");
      return;
    }
    setSigning(true);
    try {
      const r = await consentContract.sign([...selected]);
      setRecord(r);
      setExportJson(consentContract.exportRecord());
    } finally {
      setSigning(false);
    }
  };

  const handleRevokeAll = async () => {
    await consentContract.revokeAll();
    setRecord(null);
    setExportJson("");
    setSelected(new Set());
  };

  const maxLevel = record?.maxLevelGranted ?? 0;

  return (
    <div className="p-6 space-y-8 max-w-3xl">
      <header>
        <div className="tag text-[#b6ff3a] border-[#b6ff3a]/30">AMP · CGF/DCC</div>
        <h2 className="text-2xl font-sans font-light text-white mt-4">
          Reticulado de Consentimento (PMU)
        </h2>
        <p className="text-zinc-500 text-sm mt-2 leading-relaxed">
          Teorema 3.2: cada operação exige nível ⊑ no reticulado (0–10). Recibo SHA3-256 em OPFS.
          Legacy/scraping automático exige nível 8+ e flag de dev — importação manual é o caminho
          ético (LSA §3.9).
        </p>
      </header>

      {record && (
        <div className="p-4 border border-[#b6ff3a]/30 bg-[#b6ff3a]/5 rounded-sm font-mono text-[10px] text-zinc-300">
          <div className="text-[#b6ff3a] mb-2">RECIBO ATIVO</div>
          <div>Versão: {record.version}</div>
          <div>Assinado: {new Date(record.signedAt).toLocaleString()}</div>
          <div>
            Nível máximo: {maxLevel} —{" "}
            {LATTICE_LEVEL_LABELS[maxLevel as keyof typeof LATTICE_LEVEL_LABELS]}
          </div>
          <div>Escopos: {record.grantedScopes.join(", ")}</div>
          <div className="break-all mt-1">Hash: {record.signatureHex.slice(0, 32)}…</div>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={selectCore}
          className="px-3 py-1 border border-zinc-700 text-[9px] font-mono text-zinc-400 hover:text-white"
        >
          NÚCLEO v1 (≤10)
        </button>
        <button
          type="button"
          onClick={selectLab}
          className="px-3 py-1 border border-zinc-700 text-[9px] font-mono text-zinc-400 hover:text-white"
        >
          LAB (≤9)
        </button>
        <button
          type="button"
          onClick={selectAll}
          className="px-3 py-1 border border-zinc-700 text-[9px] font-mono text-zinc-400 hover:text-white"
        >
          TODOS
        </button>
        <button
          type="button"
          onClick={handleSign}
          disabled={signing}
          className="px-4 py-1 bg-[#b6ff3a] text-black text-[9px] font-mono font-bold disabled:opacity-50"
        >
          {signing ? "ASSINANDO…" : "ASSINAR RECIBO"}
        </button>
        <button
          type="button"
          onClick={handleRevokeAll}
          className="px-4 py-1 border border-red-500/50 text-red-400 text-[9px] font-mono"
        >
          REVOGAR TUDO
        </button>
      </div>

      <div className="space-y-4">
        {CONSENT_CLAUSES.map((clause) => (
          <label
            key={clause.scope}
            className="block p-4 border border-zinc-800 hover:border-zinc-600 cursor-pointer rounded-sm"
          >
            <div className="flex gap-3 items-start">
              <input
                type="checkbox"
                checked={selected.has(clause.scope)}
                onChange={() => toggle(clause.scope)}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="text-white text-sm font-medium">
                  Nível {clause.latticeLevel} · {clause.title}
                </div>
                <p className="text-zinc-500 text-xs mt-1">{clause.summary}</p>
                <p className="mt-2 text-[9px] font-mono text-zinc-600">
                  Coleta: {clause.dataCollected.join(" · ")}
                </p>
                <p className="text-[9px] font-mono text-red-400/80 mt-1">
                  Não inclui: {clause.notIncluded.join(" · ")}
                </p>
                <p className="text-[9px] font-mono text-[#6cf0ff]/80 mt-1">
                  Revogação: {clause.revokeHint}
                </p>
              </div>
            </div>
          </label>
        ))}
      </div>

      {exportJson && (
        <pre className="p-3 bg-zinc-900 text-[9px] font-mono text-zinc-400 overflow-auto max-h-48 rounded-sm">
          {exportJson}
        </pre>
      )}
    </div>
  );
}