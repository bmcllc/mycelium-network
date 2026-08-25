import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { loadSovereignConfig } from "../config/sovereign";
import { paymentGateway, type PaymentResult } from "../crypto/paymentGateway";
import { createNwcInteropHarnessClient, runNwcInteropHarness, type NwcInteropReport } from "../crypto/nwcInteropHarness";
import ProtocolRoyaltyDisclosure from "./ProtocolRoyaltyDisclosure";
import {
  computeProtocolRoyalty,
  fiatToSatEstimate,
} from "../protocol/sovereignty/protocolRoyalty";

type PaymentOpState = "idle" | "processing" | "retrying" | "success" | "error";

export default function PaymentGatewayPanel() {
  const [nwcUri, setNwcUri] = useState("");
  const [connected, setConnected] = useState(false);
  const [balanceSat, setBalanceSat] = useState<number | null>(null);
  const [amount, setAmount] = useState("49.90");
  const [currency, setCurrency] = useState("BRL");
  const [label, setLabel] = useState("ETRNET Premium");
  const [result, setResult] = useState<PaymentResult | null>(null);
  const [opState, setOpState] = useState<PaymentOpState>("idle");
  const [retryInfo, setRetryInfo] = useState<{ attempt: number; maxAttempts: number; nextDelayMs: number } | null>(null);
  const [retryRemainingMs, setRetryRemainingMs] = useState<number>(0);
  const [interopRunning, setInteropRunning] = useState(false);
  const [interopReport, setInteropReport] = useState<NwcInteropReport | null>(null);
  const [prices, setPrices] = useState<{ brl: number; usd: number; eur: number } | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [protocolFeeAck, setProtocolFeeAck] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const logRef = useRef<string[]>([]);

  // Gerar QR code quando invoice é criada
  useEffect(() => {
    if (result?.success && result.invoice) {
      QRCode.toDataURL(result.invoice, {
        width: 200,
        margin: 2,
        color: { dark: "#ffd700", light: "#0a0a0f" },
      })
        .then(setQrDataUrl)
        .catch(() => setQrDataUrl(null));
    } else {
      setQrDataUrl(null);
    }
  }, [result]);

  const handleCopyInvoice = async () => {
    if (!result?.invoice) return;
    try {
      await navigator.clipboard.writeText(result.invoice);
      setCopied(true);
      addLog("Invoice copiada para clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      addLog("ERRO: não foi possível copiar");
    }
  };

  const handleOpenLightning = () => {
    if (!result?.invoice) return;
    window.location.href = `lightning:${result.invoice}`;
  };

  const royaltyPreview = useMemo(() => {
    const sat = prices ? fiatToSatEstimate(amount, currency, prices) : 0;
    return { sat, split: computeProtocolRoyalty(sat, "payment") };
  }, [amount, currency, prices]);

  useEffect(() => {
    setProtocolFeeAck(false);
  }, [amount, currency, royaltyPreview.sat]);

  const mustAckProtocolFee =
    royaltyPreview.split.enabled && royaltyPreview.sat > 0;
  const canConfirmPayment =
    connected && (!mustAckProtocolFee || protocolFeeAck);

  const addLog = (msg: string) => {
    logRef.current = [`[${new Date().toLocaleTimeString()}] ${msg}`, ...logRef.current].slice(0, 40);
    setLogs([...logRef.current]);
  };

  // Carregar preços ao vivo
  useEffect(() => {
    paymentGateway.getBtcPrices().then(setPrices).catch(() => {});
    const interval = setInterval(() => {
      paymentGateway.getBtcPrices().then(setPrices).catch(() => {});
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  // Pré-preenche NWC da stack soberana (VITE_NWC_SECRET) quando disponível
  useEffect(() => {
    const cfg = loadSovereignConfig();
    if (cfg.nwcSecret?.startsWith("nostr+walletconnect://")) {
      setNwcUri(cfg.nwcSecret);
      addLog("URI NWC soberana carregada do ambiente (VITE_NWC_SECRET)");
    }
  }, []);

  // Verificar conexão NWC
  useEffect(() => {
    paymentGateway.isNWCConnected().then(setConnected);
  }, []);

  useEffect(() => {
    if (opState !== "retrying" || !retryInfo) {
      setRetryRemainingMs(0);
      return;
    }
    const startedAt = Date.now();
    setRetryRemainingMs(retryInfo.nextDelayMs);

    const interval = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, retryInfo.nextDelayMs - elapsed);
      setRetryRemainingMs(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [opState, retryInfo]);

  const handleConnect = async () => {
    if (!nwcUri.startsWith("nostr+walletconnect://")) {
      addLog("ERRO: URI inválido. Deve começar com nostr+walletconnect://");
      return;
    }
    try {
      const info = await paymentGateway.connectNWC(nwcUri);
      setConnected(info.connected);
      if (info.balanceSat !== undefined) {
        setBalanceSat(info.balanceSat);
      }
      addLog(`NWC conectado: ${info.walletPubKey.slice(0, 16)}... via ${info.relay.slice(0, 40)}`);
    } catch (err: any) {
      addLog(`ERRO ao conectar: ${err.message}`);
    }
  };

  const handleDisconnect = async () => {
    await paymentGateway.disconnectNWC();
    setConnected(false);
    setBalanceSat(null);
    addLog("NWC desconectado");
  };

  const handleRefreshBalance = async () => {
    const info = await paymentGateway.getWalletInfo();
    if (info?.balanceSat !== undefined) {
      setBalanceSat(info.balanceSat);
      addLog(`Saldo: ${info.balanceSat.toLocaleString()} sats`);
    }
  };

  const handleCreatePayment = async () => {
    if (!canConfirmPayment) return;
    setOpState("processing");
    setRetryInfo(null);
    const r = await paymentGateway.createPayment(
      { label, amount, currency },
      {
        onRetry: (event) => {
          setOpState("retrying");
          setRetryInfo({
            attempt: event.attempt,
            maxAttempts: event.maxAttempts,
            nextDelayMs: event.nextDelayMs,
          });
          addLog(
            `RETRY [${event.code}] tentativa ${event.attempt + 1}/${event.maxAttempts} em ${event.nextDelayMs}ms`,
          );
        },
      },
    );
    setResult(r);
    setOpState(r.success ? "success" : "error");
    addLog(
      r.success
        ? `Invoice criada: ${r.amountSat} sats${(r.attempts ?? 1) > 1 ? ` (retentativas: ${(r.attempts ?? 1) - 1})` : ""}`
        : `ERRO${r.errorCode ? ` [${r.errorCode}]` : ""}: ${r.error}`,
    );
  };

  const handleRunInteropHarness = async () => {
    if (!nwcUri.startsWith("nostr+walletconnect://")) {
      addLog("ERRO: URI inválido para interop harness.");
      return;
    }
    setInteropRunning(true);
    setInteropReport(null);
    addLog("Iniciando NWC interop harness...");

    try {
      const report = await runNwcInteropHarness(nwcUri, {
        timeoutMs: 12_000,
        includeInvoiceFlow: true,
        client: createNwcInteropHarnessClient(),
      });
      setInteropReport(report);
      addLog(
        `Interop finalizado: pass=${report.summary.passed} fail=${report.summary.failed} skipped=${report.summary.skipped}`,
      );
    } catch (err: any) {
      addLog(`ERRO no interop harness: ${err?.message ?? String(err)}`);
    } finally {
      setInteropRunning(false);
    }
  };

  const handleCopyInteropReport = async () => {
    if (!interopReport) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(interopReport, null, 2));
      addLog("Relatório de interop copiado para clipboard (JSON).");
    } catch {
      addLog("ERRO: não foi possível copiar o relatório para clipboard.");
    }
  };

  return (
    <section id="payment-gateway-panel" className="relative border-b border-[#14181c] bg-black">
      <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <div className="mb-14 max-w-4xl">
          <div className="flex items-center gap-4 mb-6">
            <span className="font-mono text-[11px] tracking-[0.3em] text-[#ffd700]">§ 13.6</span>
            <span className="h-px flex-1 bg-gradient-to-r from-[#ffd700]/40 to-transparent max-w-[120px]" />
            <span className="font-mono text-[11px] tracking-[0.3em] text-zinc-500">PAYMENT GATEWAY</span>
          </div>
          <h2 className="font-sans font-light text-3xl md:text-5xl text-zinc-100 leading-tight tracking-tight mb-4">
            Gateway de <span className="text-[#ffd700]">Pagamento</span>
          </h2>
          <p className="text-zinc-400 text-base md:text-lg leading-relaxed max-w-2xl">
            Nostr Wallet Connect (NWC) — payments reais via Lightning.
            Sem KYC, sem conta, sem terceiro. Preços ao vivo.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-px bg-[#14181c] border border-[#14181c]">
          <div className="lg:col-span-7 bg-[#0a0d10] p-6 md:p-8">
            {/* NWC Connection */}
            <div className="mb-6">
              <span className="tag mb-3 block">NWC WALLET CONNECT</span>
              <div className="flex gap-2 mb-3">
                <input
                  value={nwcUri}
                  onChange={(e) => setNwcUri(e.target.value)}
                  placeholder="nostr+walletconnect://..."
                  className="flex-1 bg-black border border-[#14181c] px-3 py-2 text-[10px] font-mono text-zinc-300 focus:outline-none focus:border-[#ffd700]/50"
                />
                {connected ? (
                  <button
                    onClick={handleDisconnect}
                    className="px-4 py-2 border border-red-500/30 text-red-400 font-mono text-[10px] hover:bg-red-500/10 transition-all"
                  >
                    DESCONECTAR
                  </button>
                ) : (
                  <button
                    onClick={handleConnect}
                    className="px-4 py-2 bg-[#ffd700] text-black font-mono text-[10px] hover:bg-white transition-all"
                  >
                    CONECTAR
                  </button>
                )}
              </div>
              {connected && balanceSat !== null && (
                <div className="flex items-center justify-between p-3 bg-black border border-[#14181c] font-mono text-[10px]">
                  <div>
                    <span className="text-zinc-600">saldo: </span>
                    <span className="text-[#b6ff3a]">{balanceSat.toLocaleString()} sats</span>
                  </div>
                  <button
                    onClick={handleRefreshBalance}
                    className="text-[#6cf0ff] hover:text-white transition-all text-[9px]"
                  >
                    [refresh]
                  </button>
                </div>
              )}
              {!connected && (
                <div className="p-3 bg-black border border-red-500/20 font-mono text-[10px] text-red-400">
                  Nenhuma wallet conectada. Cole uma URI NWC acima.
                </div>
              )}
            </div>

            {/* Create Payment */}
            <div className="flex items-center justify-between mb-4">
              <span className="tag">CRIAR PAGAMENTO</span>
              <div className={`font-mono text-[9px] tracking-[0.14em] ${
                opState === "success"
                  ? "text-[#b6ff3a]"
                  : opState === "error"
                    ? "text-red-400"
                    : opState === "retrying"
                      ? "text-[#ffd700]"
                      : opState === "processing"
                        ? "text-[#6cf0ff]"
                        : "text-zinc-600"
              }`}>
                STATE: {opState.toUpperCase()}
              </div>
            </div>
            {opState === "retrying" && retryInfo && (
              <div className="mb-4 border border-[#14181c] bg-black px-3 py-2 font-mono text-[9px] text-zinc-400">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border border-[#ffd700]/60 border-t-transparent" />
                  <span>
                    retry {retryInfo.attempt + 1}/{retryInfo.maxAttempts} · próximo backoff em {(retryRemainingMs / 1000).toFixed(1)}s
                  </span>
                </div>
              </div>
            )}

            <div className="mb-4 border border-[#14181c] bg-black px-3 py-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="tag">NWC INTEROP HARNESS</span>
                <button
                  onClick={handleRunInteropHarness}
                  disabled={interopRunning}
                  className={`px-3 py-1 font-mono text-[9px] tracking-[0.15em] transition-all ${
                    interopRunning
                      ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                      : "border border-[#14181c] text-[#6cf0ff] hover:text-white hover:border-[#6cf0ff]/40"
                  }`}
                >
                  {interopRunning ? "RUNNING..." : "RUN NWC INTEROP"}
                </button>
              </div>
              <div className="font-mono text-[9px] text-zinc-500">
                Checks: connect, get_info, get_balance, list_transactions, make_invoice.
              </div>
              {interopReport && (
                <div className="mt-3 border-t border-[#14181c] pt-2 font-mono text-[9px]">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="text-zinc-400">
                      summary: pass={interopReport.summary.passed} fail={interopReport.summary.failed} skipped={interopReport.summary.skipped}
                    </div>
                    <button
                      onClick={handleCopyInteropReport}
                      className="border border-[#14181c] px-2 py-1 text-[8px] tracking-[0.1em] text-zinc-400 hover:text-white hover:border-zinc-500 transition-all"
                    >
                      COPY JSON
                    </button>
                  </div>
                  <div className="space-y-1">
                    {interopReport.checks.map((check) => (
                      <div key={check.id} className="flex items-start justify-between gap-3">
                        <div className="text-zinc-300">
                          [{check.id}] {check.details}
                        </div>
                        <div className={
                          check.status === "pass"
                            ? "text-[#b6ff3a]"
                            : check.status === "fail"
                              ? "text-red-400"
                              : "text-zinc-500"
                        }>
                          {check.status.toUpperCase()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              <div>
                <span className="font-mono text-[9px] text-zinc-600 mb-1 block">VALOR ({currency})</span>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-black border border-[#14181c] px-3 py-2 text-[10px] font-mono text-zinc-300 focus:outline-none focus:border-[#ffd700]/50"
                />
              </div>
              <div>
                <span className="font-mono text-[9px] text-zinc-600 mb-1 block">MOEDA</span>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full bg-black border border-[#14181c] px-3 py-2 text-[10px] font-mono text-zinc-300 focus:outline-none"
                >
                  <option value="BRL">BRL</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
            </div>

            <div className="mb-6">
              <span className="font-mono text-[9px] text-zinc-600 mb-1 block">LABEL</span>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="w-full bg-black border border-[#14181c] px-3 py-2 text-[10px] font-mono text-zinc-300 focus:outline-none focus:border-[#ffd700]/50"
              />
            </div>

            <div className="mb-4">
              <ProtocolRoyaltyDisclosure
                split={royaltyPreview.split}
                contextLabel={
                  royaltyPreview.sat > 0
                    ? `Pagamento estimado: ~${royaltyPreview.sat.toLocaleString("pt-PT")} sat (${amount} ${currency})`
                    : "Informe valor e moeda para estimar a taxa"
                }
                requireAck
                acknowledged={protocolFeeAck}
                onAckChange={setProtocolFeeAck}
              />
            </div>

            <button
              onClick={handleCreatePayment}
              disabled={!canConfirmPayment}
              className={`w-full py-3 font-mono text-[10px] tracking-[0.2em] transition-all ${
                canConfirmPayment
                  ? "bg-[#ffd700] text-black hover:bg-white"
                  : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
              }`}
            >
              {!connected
                ? "CONECTE UMA WALLET PRIMEIRO"
                : mustAckProtocolFee && !protocolFeeAck
                  ? "ACEITE A TAXA TRANSPARENTE ACIMA"
                  : "CRIAR INVOICE VIA NWC"}
            </button>

            {result && (
              <div className={`mt-4 p-4 border font-mono text-[10px] space-y-1 ${
                result.success ? "bg-black border-[#ffd700]/20" : "bg-black border-red-500/20"
              }`}>
                <div className="tag mb-2">{result.success ? "PAGAMENTO CRIADO" : "ERRO"}</div>
                {result.amountSat && (
                  <div className="flex justify-between">
                    <span className="text-zinc-600">sats</span>
                    <span className="text-[#b6ff3a]">{result.amountSat.toLocaleString()}</span>
                  </div>
                )}
                {result.protocolRoyalty && (
                  <div className="pt-2 border-t border-[#14181c]">
                    <ProtocolRoyaltyDisclosure
                      split={result.protocolRoyalty}
                      contextLabel="Taxa aplicada neste pagamento"
                      compact
                    />
                  </div>
                )}
                {result.invoice && (
                  <div className="pt-2 border-t border-[#14181c]">
                    {/* QR Code */}
                    {qrDataUrl && (
                      <div className="flex justify-center mb-3">
                        <img src={qrDataUrl} alt="Lightning Invoice QR" className="border border-[#14181c]" />
                      </div>
                    )}
                    {/* Invoice texto */}
                    <div className="text-[8px] text-zinc-500 break-all mb-2">
                      invoice: {result.invoice.slice(0, 48)}...
                    </div>
                    {/* Botões de ação */}
                    <div className="flex gap-2">
                      <button
                        onClick={handleCopyInvoice}
                        className="flex-1 py-2 border border-[#ffd700]/30 text-[#ffd700] font-mono text-[9px] hover:bg-[#ffd700]/10 transition-all"
                      >
                        {copied ? "COPIADO!" : "COPIAR INVOICE"}
                      </button>
                      <button
                        onClick={handleOpenLightning}
                        className="flex-1 py-2 bg-[#ffd700] text-black font-mono text-[9px] hover:bg-white transition-all"
                      >
                        ABRIR WALLET
                      </button>
                    </div>
                  </div>
                )}
                {result.paymentHash && (
                  <div className="text-[8px] text-zinc-600 break-all">
                    hash: {result.paymentHash.slice(0, 32)}...
                  </div>
                )}
                {result.error && <div className="text-red-400">{result.error}</div>}
                {result.errorCode && (
                  <div className="text-[9px] text-zinc-500">code: {result.errorCode}</div>
                )}
                {result.errorHint && (
                  <div className="text-[9px] text-zinc-500">{result.errorHint}</div>
                )}
                {typeof result.attempts === "number" && result.attempts > 1 && (
                  <div className="text-[9px] text-zinc-500">
                    tentativas totais: {result.attempts} (retentativas: {result.attempts - 1})
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="lg:col-span-5 bg-black p-6 md:p-8 flex flex-col justify-between">
            <div className="space-y-6">
              <div>
                <span className="tag mb-3 block">COMO FUNCIONA</span>
                <div className="space-y-2 font-mono text-[10px]">
                  <div className="p-3 bg-[#0a0d10] border border-[#14181c]">
                    <div className="text-zinc-300 mb-1">1. Cole sua NWC URI</div>
                    <div className="text-zinc-600 text-[8px]">Alby, Blixt, Umbrel, LNbits</div>
                  </div>
                  <div className="p-3 bg-[#0a0d10] border border-[#14181c]">
                    <div className="text-zinc-300 mb-1">2. Defina o valor</div>
                    <div className="text-zinc-600 text-[8px]">Fiat → sats (preço ao vivo)</div>
                  </div>
                  <div className="p-3 bg-[#0a0d10] border border-[#14181c]">
                    <div className="text-zinc-300 mb-1">3. Crie a invoice</div>
                    <div className="text-zinc-600 text-[8px]">NWC envia ao seu wallet via NOSTR</div>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-[#0a0d10] border border-[#14181c] font-mono text-[10px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-zinc-600">KYC</span>
                  <span className="text-[#b6ff3a]">NENHUM</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">custodia</span>
                  <span className="text-[#b6ff3a]">ZERO</span>
                </div>
                {prices && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-zinc-600">BTC/BRL</span>
                      <span className="text-zinc-300">R${prices.brl.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-600">BTC/USD</span>
                      <span className="text-zinc-300">${prices.usd.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-600">BTC/EUR</span>
                      <span className="text-zinc-300">€{prices.eur.toLocaleString()}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-[#14181c]">
              <div className="tag mb-3">TERMINAL OUTPUT</div>
              <div className="h-40 overflow-y-auto font-mono text-[8px] text-zinc-500 space-y-1 scrollbar">
                {logs.length === 0 ? (
                  <div className="italic">// Aguardando operador...</div>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className="border-l border-[#14181c] pl-2">{log}</div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
