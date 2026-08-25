import { useState, useEffect, useCallback, useRef } from "react";

interface ApiKeyInfo {
  apiKey: string;
  name: string;
  balanceSat: number;
  totalRequests?: number;
}

interface RefillResponse {
  id: string;
  invoice: string;
  amountSat: number;
  paymentHash: string;
  expiresAt: number;
}

export default function PqcDeveloperDashboard() {
  const [name, setName] = useState("");
  const [apiKeyInfo, setApiKeyInfo] = useState<ApiKeyInfo | null>(null);
  const [manualKey, setManualKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  // Refill flow state
  const [refillAmount, setRefillAmount] = useState("500");
  const [currentInvoice, setCurrentInvoice] = useState<RefillResponse | null>(null);
  const [invoiceStatus, setInvoiceStatus] = useState<"pending" | "confirmed" | "expired" | null>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Playground state
  const [activeTab, setActiveTab] = useState<"keygen" | "kem" | "dsa" | "entropy">("keygen");
  const [selectedAlgo, setSelectedAlgo] = useState<"ML-KEM-1024" | "ML-DSA-87">("ML-KEM-1024");
  const [generatedKeys, setGeneratedKeys] = useState<{ publicKey: string; privateKey: string } | null>(null);
  
  // ML-KEM states
  const [kemPubKey, setKemPubKey] = useState("");
  const [kemCiphertext, setKemCiphertext] = useState("");
  const [kemPrivKey, setKemPrivKey] = useState("");
  const [encapsulationResult, setEncapsulationResult] = useState<{ sharedSecret: string; ciphertext: string } | null>(null);
  const [decapsulationResult, setDecapsulationResult] = useState<string | null>(null);

  // ML-DSA states
  const [dsaPrivKey, setDsaPrivKey] = useState("");
  const [dsaMsg, setDsaMsg] = useState("48656c6c6f20505143"); // "Hello PQC" in hex
  const [dsaPubKey, setDsaPubKey] = useState("");
  const [dsaSignature, setDsaSignature] = useState("");
  const [signatureOutput, setSignatureOutput] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<boolean | null>(null);

  // Entropy state
  const [entropyBits, setEntropyBits] = useState(256);
  const [entropyResult, setEntropyResult] = useState<{ source: string; bits: number; sha3_256: string; entropy_hex: string } | null>(null);

  const addLog = (msg: string) => {
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 50));
  };

  // Load key from localStorage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem("ETRNET_PQC_DEVELOPER_KEY");
    if (savedKey) {
      void fetchBalance(savedKey);
    }
  }, []);

  const fetchBalance = async (key: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/pqc/balance", {
        headers: { "x-api-key": key },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao carregar saldo.");
      }
      const data = (await res.json()) as { name: string; balanceSat: number; totalRequests: number };
      const info = {
        apiKey: key,
        name: data.name,
        balanceSat: data.balanceSat,
        totalRequests: data.totalRequests,
      };
      setApiKeyInfo(info);
      localStorage.setItem("ETRNET_PQC_DEVELOPER_KEY", key);
      addLog(`✓ Autenticado com sucesso. Saldo: ${data.balanceSat} Sats.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido.");
      addLog(`✗ Erro de autenticação: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/pqc/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao registrar chave.");
      }
      const data = (await res.json()) as ApiKeyInfo;
      setApiKeyInfo(data);
      localStorage.setItem("ETRNET_PQC_DEVELOPER_KEY", data.apiKey);
      addLog(`✓ Chave gerada para '${name}': ${data.apiKey.slice(0, 10)}...`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro no registro.");
    } finally {
      setLoading(false);
    }
  };

  const handleManualAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualKey.trim()) return;
    void fetchBalance(manualKey.trim());
  };

  const handleDisconnect = () => {
    localStorage.removeItem("ETRNET_PQC_DEVELOPER_KEY");
    setApiKeyInfo(null);
    setManualKey("");
    setCurrentInvoice(null);
    setInvoiceStatus(null);
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    addLog("Chave de API desconectada.");
  };

  // Refill Billing flow
  const handleCreateRefill = async () => {
    if (!apiKeyInfo) return;
    setLoading(true);
    setError(null);
    setCurrentInvoice(null);
    setInvoiceStatus(null);
    try {
      const res = await fetch("/api/pqc/refill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: apiKeyInfo.apiKey,
          amountSat: parseInt(refillAmount, 10),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao gerar fatura.");
      }
      const data = (await res.json()) as RefillResponse;
      setCurrentInvoice(data);
      setInvoiceStatus("pending");
      addLog(`⚡ Fatura de ${data.amountSat} Sats criada. RHash: ${data.paymentHash.slice(0, 16)}...`);

      // Start Polling LND for status
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      pollTimerRef.current = setInterval(() => {
        void checkInvoiceStatus(data.id);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro na recarga.");
      addLog(`✗ Erro na recarga: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const checkInvoiceStatus = async (id: string) => {
    try {
      const res = await fetch(`/api/lightning/status/${id}`);
      if (!res.ok) return;
      const data = (await res.json()) as { status: "pending" | "confirmed" | "expired" };
      if (data.status === "confirmed") {
        setInvoiceStatus("confirmed");
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        addLog(`✓ Pagamento confirmado! Saldo recarregado.`);
        // Refresh balance
        if (apiKeyInfo) {
          void fetchBalance(apiKeyInfo.apiKey);
        }
      } else if (data.status === "expired") {
        setInvoiceStatus("expired");
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        addLog(`✗ Fatura expirou.`);
      }
    } catch {
      // Ignore poll errors
    }
  };

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  // API Client helper
  const apiCall = useCallback(async (path: string, body: Record<string, unknown> = {}) => {
    if (!apiKeyInfo) {
      alert("Por favor, conecte ou gere uma chave de API primeiro.");
      return null;
    }
    setLoading(true);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKeyInfo.apiKey,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro na chamada de API.");
      }
      // Deduct 1 sat from local state for smooth UX
      setApiKeyInfo((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          balanceSat: Math.max(0, prev.balanceSat - 1),
          totalRequests: (prev.totalRequests || 0) + 1,
        };
      });
      return data;
    } catch (err) {
      addLog(`✗ Erro na API: ${err instanceof Error ? err.message : String(err)}`);
      alert(err instanceof Error ? err.message : String(err));
      return null;
    } finally {
      setLoading(false);
    }
  }, [apiKeyInfo]);

  // Keypair Generator
  const runKeygen = async () => {
    const data = await apiCall("/api/pqc/v1/generate-keys", { algorithm: selectedAlgo });
    if (data) {
      setGeneratedKeys(data as { publicKey: string; privateKey: string });
      addLog(`✓ Par de chaves ${selectedAlgo} gerado com sucesso.`);
      // Populate corresponding inputs
      if (selectedAlgo === "ML-KEM-1024") {
        setKemPubKey(data.publicKey);
        setKemPrivKey(data.privateKey);
      } else {
        setDsaPubKey(data.publicKey);
        setDsaPrivKey(data.privateKey);
      }
    }
  };

  // ML-KEM operations
  const runEncapsulate = async () => {
    const data = await apiCall("/api/pqc/v1/encapsulate", { publicKey: kemPubKey });
    if (data) {
      setEncapsulationResult(data as { sharedSecret: string; ciphertext: string });
      setKemCiphertext(data.ciphertext);
      addLog(`✓ ML-KEM encapsulamento completo.`);
    }
  };

  const runDecapsulate = async () => {
    const data = await apiCall("/api/pqc/v1/decapsulate", { privateKey: kemPrivKey, ciphertext: kemCiphertext });
    if (data) {
      setDecapsulationResult(data.sharedSecret as string);
      addLog(`✓ ML-KEM desencapsulamento completo.`);
    }
  };

  // ML-DSA operations
  const runSign = async () => {
    const data = await apiCall("/api/pqc/v1/sign", { privateKey: dsaPrivKey, message: dsaMsg });
    if (data) {
      setSignatureOutput(data.signature as string);
      setDsaSignature(data.signature);
      addLog(`✓ Assinatura ML-DSA efetuada com sucesso.`);
    }
  };

  const runVerify = async () => {
    const data = await apiCall("/api/pqc/v1/verify", { publicKey: dsaPubKey, message: dsaMsg, signature: dsaSignature });
    if (data) {
      setVerificationResult(data.valid as boolean);
      addLog(`✓ Verificação ML-DSA concluída. Resultado: ${data.valid ? "VÁLIDA" : "INVÁLIDA"}`);
    }
  };

  // Quantum Entropy
  const runGetEntropy = async () => {
    if (!apiKeyInfo) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/pqc/v1/entropy?bits=${entropyBits}`, {
        headers: { "x-api-key": apiKeyInfo.apiKey },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Deduct 1 sat
      setApiKeyInfo((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          balanceSat: Math.max(0, prev.balanceSat - 1),
          totalRequests: (prev.totalRequests || 0) + 1,
        };
      });

      setEntropyResult(data as typeof entropyResult);
      addLog(`✓ Coletados ${entropyBits} bits de entropia (${data.source}).`);
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="relative border-b border-[#14181c] bg-[#070809] text-zinc-100 min-h-screen">
      <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        
        {/* Header */}
        <div className="mb-14 max-w-4xl">
          <div className="flex items-center gap-4 mb-6">
            <span className="font-mono text-[11px] tracking-[0.3em] text-[#6cf0ff]">PQC-AS-A-SERVICE</span>
            <span className="h-px flex-1 bg-gradient-to-r from-[#6cf0ff]/40 to-transparent max-w-[120px]" />
            <span className="font-mono text-[11px] tracking-[0.3em] text-zinc-500">GATEWAY v1.0</span>
          </div>
          <h2 className="font-sans font-light text-3xl md:text-5xl leading-tight tracking-tight mb-4">
            Portal do <span className="text-[#6cf0ff]">Desenvolvedor PQC</span>
          </h2>
          <p className="text-zinc-400 text-base md:text-lg leading-relaxed max-w-2xl">
            Gateway de Criptografia Pós-Quântica segura contra computadores quânticos.
            Faturamento automatizado a <span className="text-[#b6ff3a] font-mono">1 Sat por requisição</span> via Lightning Network.
          </p>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-950/20 border border-red-500/30 text-red-400 font-mono text-xs rounded">
            ⚠️ ERRO: {error}
          </div>
        )}

        <div className="grid lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT: Auth, Balance & Billing */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Key Management Card */}
            {!apiKeyInfo ? (
              <div className="bg-[#0a0d10] border border-zinc-800/40 p-6 rounded shadow-xl backdrop-blur-md">
                <span className="tag mb-4 block">REGISTRO DE DESENVOLVEDOR</span>
                
                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-mono text-zinc-400 mb-2 uppercase">Nome do Projeto/Dev</label>
                    <input
                      id="dev-name-input"
                      type="text"
                      placeholder="Ex: VOID-Pay-Gateway"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-[#070809] border border-zinc-800 focus:border-[#6cf0ff] p-3 text-xs font-mono rounded outline-none text-zinc-200"
                      required
                    />
                  </div>
                  <button
                    id="register-btn"
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-[#6cf0ff]/10 hover:bg-[#6cf0ff]/20 border border-[#6cf0ff]/40 text-[#6cf0ff] text-xs font-mono tracking-wider transition-all rounded disabled:opacity-50"
                  >
                    {loading ? "PROCESSANDO..." : "GERAR NOVA CHAVE API"}
                  </button>
                </form>

                <div className="my-6 border-t border-zinc-850 flex items-center justify-center">
                  <span className="bg-[#0a0d10] px-3 text-[10px] font-mono text-zinc-500 -mt-2">OU AUTENTICAR EXISTENTE</span>
                </div>

                <form onSubmit={handleManualAuth} className="space-y-4">
                  <div>
                    <input
                      id="manual-key-input"
                      type="password"
                      placeholder="sk_pqc_..."
                      value={manualKey}
                      onChange={(e) => setManualKey(e.target.value)}
                      className="w-full bg-[#070809] border border-zinc-800 focus:border-[#6cf0ff] p-3 text-xs font-mono rounded outline-none text-zinc-200"
                      required
                    />
                  </div>
                  <button
                    id="auth-btn"
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-mono tracking-wider transition-all rounded disabled:opacity-50"
                  >
                    AUTENTICAR CHAVE
                  </button>
                </form>
              </div>
            ) : (
              <div className="bg-[#0a0d10] border border-zinc-800/40 p-6 rounded shadow-xl backdrop-blur-md space-y-6">
                <div className="flex justify-between items-start border-b border-zinc-850 pb-4">
                  <div>
                    <span className="tag">AUTENTICADO</span>
                    <h3 className="text-sm font-mono text-zinc-200 mt-2">{apiKeyInfo.name}</h3>
                  </div>
                  <button
                    id="disconnect-btn"
                    type="button"
                    onClick={handleDisconnect}
                    className="text-[9px] font-mono text-red-400 border border-red-500/20 hover:border-red-500/50 hover:bg-red-500/10 px-2 py-1 rounded"
                  >
                    SAIR
                  </button>
                </div>

                {/* API Key Display */}
                <div>
                  <label className="block text-[9px] font-mono text-zinc-400 mb-1 uppercase">Sua Chave API (mantenha secreta)</label>
                  <div className="flex gap-2">
                    <input
                      id="api-key-display"
                      type={showKey ? "text" : "password"}
                      readOnly
                      value={apiKeyInfo.apiKey}
                      className="flex-1 bg-[#070809] border border-zinc-850 p-2.5 text-[10px] font-mono rounded text-zinc-400"
                    />
                    <button
                      id="toggle-key-visibility"
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="px-3 border border-zinc-800 hover:bg-zinc-900 rounded text-xs font-mono text-zinc-300"
                    >
                      {showKey ? "HIDE" : "SHOW"}
                    </button>
                  </div>
                </div>

                {/* Balance Display */}
                <div className="grid grid-cols-2 gap-4 bg-[#070809] p-4 border border-zinc-850 rounded">
                  <div>
                    <span className="block text-[9px] font-mono text-zinc-500 uppercase">Saldo API</span>
                    <span className="text-xl font-mono text-[#b6ff3a] font-bold">
                      {apiKeyInfo.balanceSat} <span className="text-xs font-normal">Sats</span>
                    </span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-mono text-zinc-500 uppercase">Requisições</span>
                    <span className="text-xl font-mono text-zinc-200 font-bold">
                      {apiKeyInfo.totalRequests ?? 0}
                    </span>
                  </div>
                </div>

                {/* Refill Billing Section */}
                <div className="border-t border-zinc-850 pt-4 space-y-4">
                  <span className="tag block bg-zinc-900 text-zinc-400">RECARREGAR SALDO</span>
                  
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        id="refill-amount-input"
                        type="number"
                        min="10"
                        placeholder="Ex: 500"
                        value={refillAmount}
                        onChange={(e) => setRefillAmount(e.target.value)}
                        className="w-full bg-[#070809] border border-zinc-800 focus:border-[#6cf0ff] p-2.5 text-xs font-mono rounded outline-none text-zinc-200"
                      />
                      <span className="absolute right-3 top-2.5 text-[9px] font-mono text-zinc-500">SATS</span>
                    </div>
                    <button
                      id="refill-btn"
                      type="button"
                      onClick={handleCreateRefill}
                      disabled={loading}
                      className="px-4 bg-[#b6ff3a]/10 hover:bg-[#b6ff3a]/20 border border-[#b6ff3a]/40 text-[#b6ff3a] text-xs font-mono rounded transition-all"
                    >
                      Refilar
                    </button>
                  </div>

                  {/* LN Invoice Box */}
                  {currentInvoice && (
                    <div className="mt-4 p-4 bg-zinc-950 border border-zinc-850 rounded space-y-3 font-mono text-[10px]">
                      <div className="flex justify-between items-center">
                        <span className="text-[#b6ff3a]">⚡ FATURA LIGHTNING</span>
                        <span className={`px-2 py-0.5 rounded text-[8px] uppercase ${
                          invoiceStatus === "confirmed" ? "bg-emerald-950/40 text-emerald-400 border border-emerald-500/30" :
                          invoiceStatus === "expired" ? "bg-red-950/40 text-red-400 border border-red-500/30" :
                          "bg-amber-950/40 text-amber-400 border border-amber-500/30 animate-pulse"
                        }`}>
                          {invoiceStatus === "confirmed" ? "PAGA" :
                           invoiceStatus === "expired" ? "EXPIRADA" : "AGUARDANDO PAGAMENTO..."}
                        </span>
                      </div>

                      {/* Mock QR visualizer for premium sci-fi aesthetics */}
                      <div className="relative mx-auto w-32 h-32 border border-zinc-800 bg-[#070809] flex items-center justify-center overflow-hidden group">
                        <div className="absolute inset-2 grid grid-cols-8 gap-0.5 opacity-60">
                          {Array.from({ length: 64 }).map((_, i) => (
                            <div
                              key={i}
                              className={`h-full w-full transition-all duration-300 ${
                                (i % 3 === 0 || i % 7 === 0 || (i > 15 && i < 30) || (i > 45 && i < 55)) 
                                ? "bg-zinc-300" 
                                : "bg-transparent"
                              }`}
                            />
                          ))}
                        </div>
                        <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-[#b6ff3a]" />
                        <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-[#b6ff3a]" />
                        <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-[#b6ff3a]" />
                        <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-[#b6ff3a]" />
                        <div className="absolute top-0 w-full h-0.5 bg-[#b6ff3a]/40 animate-bounce" />
                        <span className="relative z-10 text-[9px] bg-black/80 px-1 text-zinc-400 border border-zinc-800">SCAN QR</span>
                      </div>

                      <div className="space-y-1">
                        <span className="text-zinc-500 block">CÓDIGO DE PAGAMENTO (BOLT11)</span>
                        <div className="flex gap-2">
                          <input
                            id="bolt11-invoice-input"
                            type="text"
                            readOnly
                            value={currentInvoice.invoice}
                            className="w-full bg-[#070809] border border-zinc-900 p-2 text-[9px] text-zinc-400 rounded cursor-pointer"
                            onClick={(e) => (e.target as HTMLInputElement).select()}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              void navigator.clipboard.writeText(currentInvoice.invoice);
                              addLog("✓ Copiado BOLT11.");
                            }}
                            className="px-2 border border-zinc-800 hover:bg-zinc-900 rounded"
                          >
                            COPY
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Interactive Cryptography Playground */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Terminal logs */}
            <div className="bg-black border border-zinc-900 p-4 rounded shadow-2xl">
              <div className="flex justify-between items-center border-b border-zinc-850 pb-2 mb-3">
                <span className="font-mono text-[10px] tracking-widest text-zinc-400 uppercase">// Live Gateway Logs</span>
                <button
                  type="button"
                  onClick={() => setLogs([])}
                  className="font-mono text-[8px] text-zinc-500 hover:text-zinc-300"
                >
                  LIMPAR LOGS
                </button>
              </div>
              <div className="h-32 overflow-y-auto font-mono text-[9px] leading-relaxed text-zinc-400 space-y-1.5 scrollbar-thin">
                {logs.length === 0 ? (
                  <p className="text-zinc-600">Aguardando operações na API...</p>
                ) : (
                  logs.map((line, i) => (
                    <div key={i} className={line.includes("✓") ? "text-emerald-400" : line.includes("✗") ? "text-red-400" : "text-zinc-400"}>
                      {line}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Playground Card */}
            <div className="bg-[#0a0d10] border border-zinc-800/40 rounded shadow-xl overflow-hidden">
              <div className="flex border-b border-zinc-850 bg-zinc-950">
                {(["keygen", "kem", "dsa", "entropy"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-4 font-mono text-[10px] tracking-wider uppercase border-b-2 transition-all ${
                      activeTab === tab
                        ? "border-[#6cf0ff] text-[#6cf0ff] bg-[#0a0d10]"
                        : "border-transparent text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {tab === "keygen" ? "1. Keygen" :
                     tab === "kem" ? "2. ML-KEM Encrypt" :
                     tab === "dsa" ? "3. ML-DSA Sign" : "4. Entropy"}
                  </button>
                ))}
              </div>

              <div className="p-6 md:p-8 space-y-6">
                
                {/* TAB 1: Keygen */}
                {activeTab === "keygen" && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-mono text-sm text-zinc-200 mb-2">Geração de Par de Chaves Pós-Quântico</h4>
                      <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                        ML-KEM-1024 (Kyber) é usado para encapsulamento de segredo (acordo de chaves pós-quântico).<br />
                        ML-DSA-87 (Dilithium) é usado para assinaturas digitais pós-quânticas.
                      </p>
                    </div>

                    <div className="flex gap-4 items-center">
                      <div className="flex-1">
                        <select
                          id="algo-select"
                          value={selectedAlgo}
                          onChange={(e) => setSelectedAlgo(e.target.value as "ML-KEM-1024" | "ML-DSA-87")}
                          className="w-full bg-[#070809] border border-zinc-800 p-3 text-xs font-mono rounded outline-none text-zinc-200"
                        >
                          <option value="ML-KEM-1024">ML-KEM-1024 (Encapsulation)</option>
                          <option value="ML-DSA-87">ML-DSA-87 (Digital Signature)</option>
                        </select>
                      </div>
                      <button
                        id="run-keygen-btn"
                        type="button"
                        onClick={runKeygen}
                        disabled={loading}
                        className="py-3 px-6 bg-[#6cf0ff]/10 hover:bg-[#6cf0ff]/20 border border-[#6cf0ff]/40 text-[#6cf0ff] text-xs font-mono rounded transition-all"
                      >
                        Executar Keygen
                      </button>
                    </div>

                    {generatedKeys && (
                      <div className="space-y-4 font-mono text-[10px]">
                        <div>
                          <span className="text-zinc-500 block mb-1">CHAVE PÚBLICA (HEX)</span>
                          <textarea
                            id="gen-pubkey-text"
                            readOnly
                            rows={3}
                            value={generatedKeys.publicKey}
                            className="w-full bg-[#070809] border border-zinc-850 p-2.5 text-zinc-300 rounded resize-none"
                          />
                        </div>
                        <div>
                          <span className="text-zinc-500 block mb-1">CHAVE PRIVADA (HEX)</span>
                          <textarea
                            id="gen-privkey-text"
                            readOnly
                            rows={4}
                            value={generatedKeys.privateKey}
                            className="w-full bg-[#070809] border border-zinc-850 p-2.5 text-zinc-300 rounded resize-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: ML-KEM */}
                {activeTab === "kem" && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-mono text-sm text-zinc-200 mb-2">Encapsulamento e Desencapsulamento ML-KEM-1024</h4>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        Kyber encapsula um segredo de 32 bytes usando a chave pública do destinatário.
                        A chave privada correspondente é usada para decifrar (desencapsular) e revelar o segredo simétrico idêntico.
                      </p>
                    </div>

                    {/* Step 1: Encapsulate */}
                    <div className="space-y-3 border-b border-zinc-850 pb-6">
                      <span className="tag text-[#6cf0ff] border-[#6cf0ff]/20">Passo 1: Encapsular</span>
                      <div>
                        <label className="block text-[9px] font-mono text-zinc-500 mb-1">CHAVE PÚBLICA DO DESTINATÁRIO (HEX)</label>
                        <input
                          id="kem-pubkey-input"
                          type="text"
                          placeholder="Cole a chave pública ML-KEM-1024 em hex"
                          value={kemPubKey}
                          onChange={(e) => setKemPubKey(e.target.value)}
                          className="w-full bg-[#070809] border border-zinc-800 p-2.5 text-[10px] font-mono rounded outline-none text-zinc-200"
                        />
                      </div>
                      <button
                        id="kem-encap-btn"
                        type="button"
                        onClick={runEncapsulate}
                        disabled={loading}
                        className="py-2 px-4 bg-[#6cf0ff]/10 hover:bg-[#6cf0ff]/20 border border-[#6cf0ff]/30 text-[#6cf0ff] text-xs font-mono rounded"
                      >
                        Encapsular
                      </button>

                      {encapsulationResult && (
                        <div className="space-y-3 font-mono text-[9px] bg-zinc-950 p-4 border border-zinc-850 rounded">
                          <div>
                            <span className="text-[#6cf0ff] block">CIPHERTEXT (ENVIADO AO DESTINATÁRIO)</span>
                            <span className="text-zinc-400 break-all">{encapsulationResult.ciphertext}</span>
                          </div>
                          <div>
                            <span className="text-[#b6ff3a] block">SHARED SECRET DERIVADO (REMETENTE)</span>
                            <span className="text-zinc-400 break-all">{encapsulationResult.sharedSecret}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Step 2: Decapsulate */}
                    <div className="space-y-3">
                      <span className="tag text-[#b6ff3a] border-[#b6ff3a]/20">Passo 2: Desencapsular</span>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[9px] font-mono text-zinc-500 mb-1">CHAVE PRIVADA DO DESTINATÁRIO (HEX)</label>
                          <input
                            id="kem-privkey-input"
                            type="text"
                            placeholder="Cole a chave privada ML-KEM-1024 em hex"
                            value={kemPrivKey}
                            onChange={(e) => setKemPrivKey(e.target.value)}
                            className="w-full bg-[#070809] border border-zinc-800 p-2.5 text-[10px] font-mono rounded outline-none text-zinc-200"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-mono text-zinc-500 mb-1">CIPHERTEXT (HEX)</label>
                          <input
                            id="kem-ct-input"
                            type="text"
                            placeholder="Cole o ciphertext em hex"
                            value={kemCiphertext}
                            onChange={(e) => setKemCiphertext(e.target.value)}
                            className="w-full bg-[#070809] border border-zinc-800 p-2.5 text-[10px] font-mono rounded outline-none text-zinc-200"
                          />
                        </div>
                      </div>
                      <button
                        id="kem-decap-btn"
                        type="button"
                        onClick={runDecapsulate}
                        disabled={loading}
                        className="py-2 px-4 bg-[#b6ff3a]/10 hover:bg-[#b6ff3a]/20 border border-[#b6ff3a]/30 text-[#b6ff3a] text-xs font-mono rounded"
                      >
                        Desencapsular
                      </button>

                      {decapsulationResult && (
                        <div className="p-4 bg-zinc-950 border border-zinc-850 rounded font-mono text-[9px]">
                          <span className="text-[#b6ff3a] block">SHARED SECRET DESENCAPSULADO (DESTINATÁRIO)</span>
                          <span className="text-zinc-400 break-all">{decapsulationResult}</span>
                          {encapsulationResult && decapsulationResult === encapsulationResult.sharedSecret && (
                            <span className="text-emerald-400 block mt-2 font-bold">✓ OS SEGREDOS SIMÉTRICOS COINCIDEM! canal criptografado seguro estabelecido.</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 3: ML-DSA */}
                {activeTab === "dsa" && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-mono text-sm text-zinc-200 mb-2">Assinatura Digital ML-DSA-87 (Dilithium)</h4>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        Dilithium assina mensagens digitalmente de forma que qualquer pessoa com a chave pública
                        possa validar a autenticidade e a integridade da mensagem sem obter a chave privada.
                      </p>
                    </div>

                    {/* Step 1: Sign */}
                    <div className="space-y-3 border-b border-zinc-850 pb-6">
                      <span className="tag text-[#6cf0ff] border-[#6cf0ff]/20">Passo 1: Assinar Mensagem</span>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[9px] font-mono text-zinc-500 mb-1">CHAVE PRIVADA DO EMISSOR (HEX)</label>
                          <input
                            id="dsa-privkey-input"
                            type="text"
                            placeholder="Cole a chave privada ML-DSA-87 em hex"
                            value={dsaPrivKey}
                            onChange={(e) => setDsaPrivKey(e.target.value)}
                            className="w-full bg-[#070809] border border-zinc-800 p-2.5 text-[10px] font-mono rounded outline-none text-zinc-200"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-mono text-zinc-500 mb-1">MENSAGEM A ASSINAR (HEX)</label>
                          <input
                            id="dsa-msg-input"
                            type="text"
                            value={dsaMsg}
                            onChange={(e) => setDsaMsg(e.target.value)}
                            className="w-full bg-[#070809] border border-zinc-800 p-2.5 text-[10px] font-mono rounded outline-none text-zinc-200"
                          />
                        </div>
                      </div>
                      <button
                        id="dsa-sign-btn"
                        type="button"
                        onClick={runSign}
                        disabled={loading}
                        className="py-2 px-4 bg-[#6cf0ff]/10 hover:bg-[#6cf0ff]/20 border border-[#6cf0ff]/30 text-[#6cf0ff] text-xs font-mono rounded"
                      >
                        Assinar Mensagem
                      </button>

                      {signatureOutput && (
                        <div className="p-4 bg-zinc-950 border border-zinc-850 rounded font-mono text-[9px]">
                          <span className="text-[#6cf0ff] block mb-1">ASSINATURA GERADA (HEX)</span>
                          <span className="text-zinc-400 break-all">{signatureOutput}</span>
                        </div>
                      )}
                    </div>

                    {/* Step 2: Verify */}
                    <div className="space-y-3">
                      <span className="tag text-[#b6ff3a] border-[#b6ff3a]/20">Passo 2: Verificar Assinatura</span>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[9px] font-mono text-zinc-500 mb-1">CHAVE PÚBLICA DO EMISSOR (HEX)</label>
                          <input
                            id="dsa-pubkey-input"
                            type="text"
                            placeholder="Cole a chave pública ML-DSA-87 em hex"
                            value={dsaPubKey}
                            onChange={(e) => setDsaPubKey(e.target.value)}
                            className="w-full bg-[#070809] border border-zinc-800 p-2.5 text-[10px] font-mono rounded outline-none text-zinc-200"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-mono text-zinc-500 mb-1">ASSINATURA (HEX)</label>
                          <input
                            id="dsa-sig-input"
                            type="text"
                            placeholder="Cole a assinatura em hex"
                            value={dsaSignature}
                            onChange={(e) => setDsaSignature(e.target.value)}
                            className="w-full bg-[#070809] border border-zinc-800 p-2.5 text-[10px] font-mono rounded outline-none text-zinc-200"
                          />
                        </div>
                      </div>
                      <button
                        id="dsa-verify-btn"
                        type="button"
                        onClick={runVerify}
                        disabled={loading}
                        className="py-2 px-4 bg-[#b6ff3a]/10 hover:bg-[#b6ff3a]/20 border border-[#b6ff3a]/30 text-[#b6ff3a] text-xs font-mono rounded"
                      >
                        Verificar
                      </button>

                      {verificationResult !== null && (
                        <div className={`p-4 border rounded font-mono text-xs ${
                          verificationResult 
                            ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-400" 
                            : "bg-red-950/20 border-red-500/30 text-red-400"
                        }`}>
                          {verificationResult ? "✓ ASSINATURA VÁLIDA: A integridade e autoria da mensagem foram confirmadas!" : "✗ ASSINATURA INVÁLIDA: A mensagem ou a chave pública não correspondem à assinatura."}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 4: Entropy */}
                {activeTab === "entropy" && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-mono text-sm text-zinc-200 mb-2">Entropia Quântica Coletada (CQR)</h4>
                      <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                        Coleta entropia pura baseada nas flutuações e emulação do motor Relacional-Quântico CQR.
                        O material retornado pode ser usado para semear geradores criptográficos locais de alta segurança.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-[9px] font-mono text-zinc-500 mb-2">QUANTIDADE DE BITS DE ENTROPIA</label>
                        <div className="flex gap-4 items-center">
                          <input
                            id="entropy-slider"
                            type="range"
                            min="256"
                            max="1024"
                            step="256"
                            value={entropyBits}
                            onChange={(e) => setEntropyBits(parseInt(e.target.value, 10))}
                            className="flex-1 accent-[#6cf0ff] h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                          />
                          <span className="font-mono text-xs text-zinc-200 w-16 text-right">{entropyBits} BITS</span>
                        </div>
                      </div>

                      <button
                        id="entropy-btn"
                        type="button"
                        onClick={runGetEntropy}
                        disabled={loading}
                        className="py-3 px-6 bg-[#6cf0ff]/10 hover:bg-[#6cf0ff]/20 border border-[#6cf0ff]/40 text-[#6cf0ff] text-xs font-mono rounded transition-all"
                      >
                        Obter Entropia CQR
                      </button>
                    </div>

                    {entropyResult && (
                      <div className="space-y-4 font-mono text-[9px] bg-zinc-950 p-4 border border-zinc-850 rounded">
                        <div className="grid md:grid-cols-2 gap-4 border-b border-zinc-900 pb-3">
                          <div>
                            <span className="text-zinc-500 block">FONTE</span>
                            <span className="text-[#6cf0ff] font-bold">{entropyResult.source}</span>
                          </div>
                          <div>
                            <span className="text-zinc-500 block">TAMANHO</span>
                            <span className="text-zinc-200 font-bold">{entropyResult.bits} bits ({entropyResult.bits / 8} bytes)</span>
                          </div>
                        </div>
                        <div>
                          <span className="text-zinc-500 block mb-1">SHA3-256 DO MATERIAL</span>
                          <span className="text-zinc-300 break-all">{entropyResult.sha3_256}</span>
                        </div>
                        <div>
                          <span className="text-zinc-500 block mb-1">RAW ENTROPIA (HEX)</span>
                          <span className="text-[#b6ff3a] break-all">{entropyResult.entropy_hex}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM: API Documentation */}
        <div className="mt-16 bg-[#0a0d10] border border-zinc-800/40 p-6 md:p-8 rounded shadow-xl">
          <span className="tag mb-4 block">// DOCUMENTAÇÃO RÁPIDA DA API</span>
          <h3 className="font-sans font-light text-xl text-zinc-200 mb-6">Integre a criptografia segura em seu aplicativo</h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            
            {/* Kyber / Dilithium Keygen Doc */}
            <div className="space-y-3 font-mono text-[10px]">
              <span className="text-[#6cf0ff] font-bold">1. Gerar Chaves</span>
              <pre className="bg-[#070809] border border-zinc-850 p-3 rounded text-zinc-400 overflow-x-auto">
{`curl -X POST \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: SUA_CHAVE_PQC" \\
  -d '{"algorithm": "ML-KEM-1024"}' \\
  http://localhost:3001/api/pqc/v1/generate-keys`}
              </pre>
              <span className="text-zinc-500 block">Retorno esperado (JSON):</span>
              <pre className="bg-[#070809] border border-zinc-900 p-3 rounded text-zinc-400 overflow-x-auto text-[9px]">
{`{
  "publicKey": "01af3e...",
  "privateKey": "89dcba..."
}`}
              </pre>
            </div>

            {/* KEM Encapsulate Doc */}
            <div className="space-y-3 font-mono text-[10px]">
              <span className="text-[#b6ff3a] font-bold">2. Encapsulamento de Segredo</span>
              <pre className="bg-[#070809] border border-zinc-850 p-3 rounded text-zinc-400 overflow-x-auto">
{`curl -X POST \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: SUA_CHAVE_PQC" \\
  -d '{"publicKey": "CHAVE_PUB_ML_KEM"}' \\
  http://localhost:3001/api/pqc/v1/encapsulate`}
              </pre>
              <span className="text-zinc-500 block">Retorno esperado (JSON):</span>
              <pre className="bg-[#070809] border border-zinc-900 p-3 rounded text-zinc-400 overflow-x-auto text-[9px]">
{`{
  "sharedSecret": "bf2d45...",
  "ciphertext": "8ca09e..."
}`}
              </pre>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
