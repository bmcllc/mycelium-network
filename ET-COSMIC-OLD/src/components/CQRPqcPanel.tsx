/**
 * CQR → PQC — Laboratório de chaves ML-KEM/ML-DSA alimentadas por entropia Bell (CQR).
 */

import { useCallback, useEffect, useState } from "react";
import {
  getCqrPqcStatus,
  runCqrPqcSelfTest,
  generateMLKEMKeypairFromCQR,
  generateMLDSAKeypairFromCQR,
  type CqrPqcStatus,
} from "../crypto/cqrPqc";
import { C3Engine } from "../crypto/c3Engine";

export default function CQRPqcPanel() {
  const [status, setStatus] = useState<CqrPqcStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [selfTest, setSelfTest] = useState<{
    ok: boolean;
    kemMatch: boolean;
    sigValid: boolean;
  } | null>(null);
  const [kemPkLen, setKemPkLen] = useState<number | null>(null);
  const [dsaPkLen, setDsaPkLen] = useState<number | null>(null);
  const [c3Cqr, setC3Cqr] = useState<boolean | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const log = (msg: string) => {
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 30));
  };

  const refreshStatus = useCallback(async () => {
    const s = await getCqrPqcStatus();
    setStatus(s);
    return s;
  }, []);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  const handleSelfTest = async () => {
    setLoading(true);
    setSelfTest(null);
    try {
      const result = await runCqrPqcSelfTest();
      setStatus(result.status);
      setSelfTest({ ok: result.ok, kemMatch: result.kemMatch, sigValid: result.sigValid });
      log(
        result.ok
          ? `Self-test OK (KEM=${result.kemMatch}, SIG=${result.sigValid}, fonte=${result.status.entropySource})`
          : `Self-test FALHOU (KEM=${result.kemMatch}, SIG=${result.sigValid})`,
      );
    } catch (e) {
      log(`ERRO: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleKeygen = async () => {
    setLoading(true);
    try {
      const kem = await generateMLKEMKeypairFromCQR();
      const dsa = await generateMLDSAKeypairFromCQR();
      setKemPkLen(kem.publicKey.length);
      setDsaPkLen(dsa.publicKey.length);
      const s = await refreshStatus();
      log(
        `Keygen CQR: ML-KEM pk=${kem.publicKey.length}B, ML-DSA pk=${dsa.publicKey.length}B (${s.entropySource})`,
      );
    } catch (e) {
      log(`ERRO: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleC3 = async () => {
    setLoading(true);
    try {
      const engine = await C3Engine.createWithCqrEntropy();
      const health = engine.healthCheck();
      setC3Cqr(health.cqrSeeded ?? false);
      log(`C3Engine.createWithCqrEntropy → cqrSeeded=${health.cqrSeeded}`);
    } catch (e) {
      log(`ERRO C3: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  const cqrOnline = status?.cqrOnline ?? false;
  const source = status?.entropySource ?? "—";

  return (
    <section className="relative border-b border-[#14181c] bg-black">
      <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <div className="mb-14 max-w-4xl">
          <div className="flex items-center gap-4 mb-6">
            <span className="font-mono text-[11px] tracking-[0.3em] text-[#b6ff3a]">§ CQR</span>
            <span className="h-px flex-1 bg-gradient-to-r from-[#b6ff3a]/40 to-transparent max-w-[120px]" />
            <span className="font-mono text-[11px] tracking-[0.3em] text-zinc-500">PQC</span>
          </div>
          <h2 className="font-sans font-light text-3xl md:text-5xl text-zinc-100 leading-tight tracking-tight mb-4">
            CQR → <span className="text-[#b6ff3a]">PQC</span>
          </h2>
          <p className="text-zinc-400 text-base md:text-lg leading-relaxed max-w-2xl">
            PMU Ω: CQR (Bell/quimb) + ANU (vácuo) + paleocomputação (fossilização F(C)) em{" "}
            <code className="text-[#b6ff3a]/80">quantum/server.py?v=4</code> alimentam seeds FIPS
            para ML-KEM-1024 e ML-DSA-87. Com o motor offline, HKDF usa CSPRNG local (degradado).
          </p>
          <p className="mt-3 font-mono text-[10px] text-zinc-600">
            Terminal 1: <span className="text-zinc-400">npm run quantum:dev</span> — Terminal 2:{" "}
            <span className="text-zinc-400">npm run dev</span> ou{" "}
            <span className="text-zinc-400">npm run dev:cqr</span>
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-px bg-[#14181c] border border-[#14181c]">
          <div className="lg:col-span-5 bg-[#0a0d10] p-6 md:p-8">
            <span className="tag mb-4 block">ESTADO CQR</span>
            <div className="space-y-3 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-zinc-500">Motor CQR</span>
                <span className={cqrOnline ? "text-[#b6ff3a]" : "text-amber-500"}>
                  {cqrOnline ? "ONLINE" : "OFFLINE / DEGRADADO"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Fonte entropia</span>
                <span className="text-zinc-200">{source}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">SHA3 última medição</span>
                <span className="text-zinc-400 truncate max-w-[180px]" title={status?.lastEntropySha3 ?? ""}>
                  {status?.lastEntropySha3?.slice(0, 16) ?? "—"}…
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Método entropia</span>
                <span className="text-zinc-200">{status?.entropyMethod ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Tier entropia</span>
                <span className="text-zinc-200">{status?.entropyTier ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Hardware quântico</span>
                <span className={status?.quantumVerified ? "text-[#b6ff3a]" : "text-amber-500"}>
                  {status?.entropyTier === "omega"
                    ? "Ω CQR+ANU+paleo"
                    : status?.quantumVerified
                      ? "ANU+CQR"
                      : "degradado"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">CHSH (circuito)</span>
                <span className={status?.chshViolated ? "text-[#b6ff3a]" : "text-zinc-400"}>
                  {status?.chshViolated == null ? "—" : status.chshViolated ? "violado" : "não"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Seeds KEM / DSA</span>
                <span className="text-zinc-200">
                  {status?.kemSeedBytes ?? 64}B / {status?.dsaSeedBytes ?? 32}B
                </span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 bg-[#0a0d10] p-6 md:p-8">
            <span className="tag mb-4 block">OPERAÇÕES</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-6">
              <button
                type="button"
                disabled={loading}
                onClick={() => void handleSelfTest()}
                className="py-3 font-mono text-[10px] border border-[#b6ff3a]/40 bg-[#b6ff3a]/10 text-[#b6ff3a] hover:bg-[#b6ff3a]/20 disabled:opacity-50"
              >
                SELF-TEST
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => void handleKeygen()}
                className="py-3 font-mono text-[10px] border border-[#14181c] text-zinc-300 hover:border-zinc-600 disabled:opacity-50"
              >
                KEYGEN CQR
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => void handleC3()}
                className="py-3 font-mono text-[10px] border border-[#14181c] text-zinc-300 hover:border-zinc-600 disabled:opacity-50"
              >
                C3 + CQR
              </button>
            </div>

            {selfTest && (
              <div
                className={`mb-4 p-3 border font-mono text-[10px] ${
                  selfTest.ok
                    ? "border-[#b6ff3a]/30 text-[#b6ff3a]"
                    : "border-red-500/30 text-red-400"
                }`}
              >
                KEM round-trip: {selfTest.kemMatch ? "OK" : "FALHA"} · Assinatura ML-DSA:{" "}
                {selfTest.sigValid ? "OK" : "FALHA"}
              </div>
            )}

            {(kemPkLen != null || dsaPkLen != null) && (
              <p className="mb-4 font-mono text-[10px] text-zinc-500">
                Último keygen: KEM pk {kemPkLen}B · DSA pk {dsaPkLen}B
                {c3Cqr != null && ` · C3 cqrSeeded=${c3Cqr}`}
              </p>
            )}

            <div className="max-h-40 overflow-y-auto font-mono text-[9px] text-zinc-600 space-y-1">
              {logs.length === 0 ? (
                <p>Execute self-test ou keygen para ver o log.</p>
              ) : (
                logs.map((line, i) => <div key={`${line}-${i}`}>{line}</div>)
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
