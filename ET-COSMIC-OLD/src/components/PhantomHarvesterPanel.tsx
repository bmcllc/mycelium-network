import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { phantomHarvester } from "../harvesters/phantomHarvester";
import { useAmpConsent } from "../hooks/useAmpConsent";
import {
  contactDirectory,
  PLATFORM_LABELS,
  PLATFORM_ICONS,
  type HarvestReport,
  type HarvestStats,
  type HarvestedContact,
  type SocialPlatform,
} from "../storage/contactDirectory";
import type { ExchangeTicker } from "../harvesters/exchangeScraper";
import {
  getPendingHarmonyCount,
  queueContactsForHarmony,
} from "../harvesters/phantomHarvestHarmony";
import {
  logsToStrings,
  scrapScanExchanges,
  scrapScanSocialProfile,
  scrapScanTelegramChannel,
  scrapScanVCardFile,
} from "../harvesters/scrapScanner";

type View = "dashboard" | "exchanges" | "contacts" | "search" | "scrapscanner";

export default function PhantomHarvesterPanel() {
  const { ready: consentReady, canImport, signCore } = useAmpConsent();
  const [view, setView] = useState<View>("dashboard");
  const [stats, setStats] = useState<HarvestStats | null>(null);
  const [reports] = useState<HarvestReport[]>([]);
  const [contacts, setContacts] = useState<HarvestedContact[]>([]);
  const [tickers, setTickers] = useState<ExchangeTicker[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<HarvestedContact[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [tickerError, setTickerError] = useState<string | null>(null);
  const [harmonyQueue, setHarmonyQueue] = useState(getPendingHarmonyCount());

  // Interactive ScrapScanner state
  const [cliLogs, setCliLogs] = useState<string[]>([
    "■ VØID PHANTOM HARVESTER — SCRAPSCANNER INTERFACE",
    "Aguardando comando de varredura soberana...",
  ]);
  const [cliRunning, setCliRunning] = useState(false);
  const [cliTgUser, setCliTgUser] = useState("voidmessenger");
  const [cliTgProfile, setCliTgProfile] = useState("");
  const [cliXQuery, setCliXQuery] = useState("");
  const [cliExSymbol, setCliExSymbol] = useState("BTCUSDT");

  const refreshLocalData = useCallback(async () => {
    const s = await phantomHarvester.getStats();
    setStats(s);
    const c = await contactDirectory.getAll(100);
    setContacts(c);
  }, []);

  // Load stats on mount
  useEffect(() => {
    void refreshLocalData();
  }, [refreshLocalData]);

  const appendScanLogs = (lines: string[]) => {
    setCliLogs((prev) => [...prev.filter((l) => !l.startsWith("Aguardando")), ...lines]);
  };

  const runTelegramScan = async (username: string) => {
    if (cliRunning) return;
    setCliRunning(true);
    try {
      const r = await scrapScanTelegramChannel(username);
      appendScanLogs(logsToStrings(r.logs));
      await refreshLocalData();
    } finally {
      setCliRunning(false);
    }
  };

  const runTelegramProfileScan = async (username: string) => {
    if (cliRunning || !username.trim()) return;
    setCliRunning(true);
    try {
      const r = await scrapScanSocialProfile("telegram", username);
      appendScanLogs(logsToStrings(r.logs));
      await refreshLocalData();
    } finally {
      setCliRunning(false);
    }
  };

  const runXScan = async (query: string) => {
    if (cliRunning || !query.trim()) return;
    setCliRunning(true);
    try {
      const r = await scrapScanSocialProfile("x", query);
      appendScanLogs(logsToStrings(r.logs));
      await refreshLocalData();
    } finally {
      setCliRunning(false);
    }
  };

  const runVCardImport = async (file: File) => {
    if (cliRunning) return;
    if (!consentReady || !canImport) {
      appendScanLogs(["✖ Consentimento CGF necessário para importar contactos."]);
      return;
    }
    setCliRunning(true);
    try {
      const text = await file.text();
      const r = await scrapScanVCardFile(text);
      appendScanLogs(logsToStrings(r.logs));
      await refreshLocalData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      appendScanLogs([msg.includes("CGF") ? msg : `✖ vCard: ${msg}`]);
    } finally {
      setCliRunning(false);
    }
  };

  const runExchangeScan = async (symbol: string) => {
    if (cliRunning) return;
    setCliRunning(true);
    try {
      const r = await scrapScanExchanges(symbol);
      appendScanLogs(logsToStrings(r.logs));
    } finally {
      setCliRunning(false);
    }
  };

  const loadTickers = useCallback(async () => {
    setTickerError(null);
    try {
      const t = await phantomHarvester.getAllTickers("BTCUSDT");
      setTickers(t);
    } catch (err) {
      setTickerError(err instanceof Error ? err.message : String(err));
      setTickers([]);
    }
  }, []);

  useEffect(() => {
    if (view !== "exchanges") return;
    void loadTickers();
  }, [view, loadTickers]);

  const handleImportJson = useCallback(
    async (file: File) => {
      setIsImporting(true);
      setImportMsg(null);
      try {
        const text = await file.text();
        const rows = JSON.parse(text) as Array<{
          platform: SocialPlatform;
          platformId: string;
          username: string;
          nostrPubkey?: string;
        }>;
        const n = await phantomHarvester.importContactsFromUserFile(rows);
        setImportMsg(`Importados ${n} contacto(s) (LSA §3.9 — iniciado pelo utilizador).`);
        setStats(await phantomHarvester.getStats());
        setContacts(await contactDirectory.getAll(100));
        setHarmonyQueue(getPendingHarmonyCount());
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setImportMsg(msg.includes("CGF_DCC") ? `${msg} — assine em /governance/consent` : msg);
      } finally {
        setIsImporting(false);
      }
    },
    [],
  );

  const handleQueueForHarmony = useCallback(
    async (file: File) => {
      setIsImporting(true);
      setImportMsg(null);
      try {
        const text = await file.text();
        const rows = JSON.parse(text) as Array<{
          platform: SocialPlatform;
          platformId: string;
          username: string;
          nostrPubkey?: string;
        }>;
        const total = queueContactsForHarmony(rows);
        setHarmonyQueue(total);
        setImportMsg(
          `${rows.length} enfileirado(s). Total na fila: ${total}. Corra Harmonia em /compute/cosmic-harmony.`,
        );
      } catch (err) {
        setImportMsg(err instanceof Error ? err.message : String(err));
      } finally {
        setIsImporting(false);
      }
    },
    [],
  );

  // Search
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    const results = await phantomHarvester.searchAll(searchQuery);
    setSearchResults(results);
  }, [searchQuery]);

  // ─── Dashboard View ───
  if (view === "dashboard") {
    return (
      <section className="border border-[#1a1f26] bg-[#080a0c]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a1f26]">
          <div>
            <div className="tag">PHANTOM HARVESTER</div>
            <div className="text-[10px] text-zinc-600 font-mono mt-1">
              IMPORTAÇÃO MANUAL (PMU LSA) + TICKERS DE EXCHANGE
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setView("exchanges")}
              className="px-3 py-1.5 text-[10px] font-mono text-[#00ff41] border border-[#00ff41]/20 hover:bg-[#00ff41]/10"
            >
              EXCHANGES
            </button>
            <button
              onClick={() => setView("contacts")}
              className="px-3 py-1.5 text-[10px] font-mono text-zinc-400 border border-zinc-800 hover:border-zinc-600"
            >
              CONTATOS ({stats?.totalContacts || 0})
            </button>
            <button
              onClick={() => setView("scrapscanner")}
              className="px-3 py-1.5 text-[10px] font-mono text-[#a855f7] border border-[#a855f7]/20 hover:bg-[#a855f7]/10"
            >
              SCRAPSCANNER
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="border border-[#1a1f26] p-4 text-center">
              <div className="text-2xl font-mono text-[#a855f7]">{stats?.totalContacts || 0}</div>
              <div className="text-[9px] font-mono text-zinc-600">TOTAL CONTATOS</div>
            </div>
            <div className="border border-[#1a1f26] p-4 text-center">
              <div className="text-2xl font-mono text-[#00ff41]">{stats?.withNostr || 0}</div>
              <div className="text-[9px] font-mono text-zinc-600">COM NOSTR</div>
            </div>
            <div className="border border-[#1a1f26] p-4 text-center">
              <div className="text-2xl font-mono text-yellow-400">{stats?.withExchangeData || 0}</div>
              <div className="text-[9px] font-mono text-zinc-600">TRADERS</div>
            </div>
            <div className="border border-[#1a1f26] p-4 text-center">
              <div className="text-2xl font-mono text-blue-400">
                {Object.keys(stats?.byPlatform || {}).length}
              </div>
              <div className="text-[9px] font-mono text-zinc-600">PLATAFORMAS</div>
            </div>
          </div>

          {/* Platform Grid */}
          <div>
            <div className="text-[10px] font-mono text-zinc-500 mb-3">PLATAFORMAS</div>
            <div className="grid grid-cols-4 gap-2">
              {(Object.keys(PLATFORM_LABELS) as SocialPlatform[]).map((platform) => (
                <div
                  key={platform}
                  className="border border-[#1a1f26] p-3 flex items-center gap-2"
                >
                  <span className="text-lg">{PLATFORM_ICONS[platform]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-mono text-zinc-300 truncate">
                      {PLATFORM_LABELS[platform]}
                    </div>
                    <div className="text-[9px] font-mono text-zinc-600">
                      {stats?.byPlatform[platform] || 0} contatos
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Importação manual (PMU §3.9) */}
          <div className="border border-[#1a1f26] p-4 space-y-3">
            <p className="text-[10px] font-mono text-zinc-500">
              Scraping automático desativado. Importe JSON:{" "}
              <code className="text-zinc-400">
                [{"{"}platform, platformId, username, nostrPubkey?{"}"}]
              </code>
              {" "}
              — exemplo em{" "}
              <a
                href="/sample-contacts.json"
                download
                className="text-[#a855f7] hover:underline"
              >
                sample-contacts.json
              </a>
            </p>
            {consentReady && !canImport && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-mono text-yellow-500">
                  Importação exige consentimento nível ≥8 (legacy_bridge).
                </span>
                <button
                  type="button"
                  onClick={() => void signCore()}
                  className="px-2 py-1 text-[9px] font-mono bg-[#b6ff3a] text-black"
                >
                  ASSINAR NÚCLEO v1
                </button>
                <Link
                  href="/governance/consent"
                  className="text-[9px] font-mono text-zinc-500 hover:text-zinc-300"
                >
                  detalhes →
                </Link>
              </div>
            )}
            <p className="font-mono text-[9px] text-zinc-600 mb-2">
              Fila harmonia: {harmonyQueue} contacto(s) ·{" "}
              <Link href="/compute/cosmic-harmony" className="text-[#b6ff3a] hover:underline">
                cosmic-harmony
              </Link>
            </p>
            <label
              className={`inline-block px-6 py-3 font-mono text-xs tracking-widest mr-2 ${
                canImport
                  ? "bg-zinc-800 text-zinc-200 cursor-pointer hover:bg-zinc-700"
                  : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
              }`}
            >
              {isImporting ? "…" : "FILA HARMONIA (JSON)"}
              <input
                type="file"
                accept=".json,application/json"
                className="hidden"
                disabled={isImporting || !canImport}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleQueueForHarmony(f);
                  e.target.value = "";
                }}
              />
            </label>
            <label
              className={`inline-block px-6 py-3 font-mono text-xs tracking-widest ${
                canImport
                  ? "bg-[#a855f7] text-black cursor-pointer hover:bg-[#a855f7]/80"
                  : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
              }`}
            >
              {isImporting ? "IMPORTANDO…" : "IMPORTAR JSON"}
              <input
                type="file"
                accept=".json,application/json"
                className="hidden"
                disabled={isImporting || !canImport}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleImportJson(f);
                  e.target.value = "";
                }}
              />
            </label>
            {importMsg && (
              <p
                className={`text-[10px] font-mono ${importMsg.startsWith("Importados") ? "text-[#00ff41]" : "text-red-400"}`}
              >
                {importMsg}
              </p>
            )}
          </div>

          {/* Reports */}
          {reports.length > 0 && (
            <div>
              <div className="text-[10px] font-mono text-zinc-500 mb-3">ÚLTIMO HARVEST</div>
              <div className="space-y-1">
                {reports.map((r) => (
                  <div
                    key={r.platform}
                    className="flex items-center gap-2 px-3 py-2 border border-[#1a1f26] text-[10px] font-mono"
                  >
                    <span>{PLATFORM_ICONS[r.platform]}</span>
                    <span className="text-zinc-300 flex-1">{PLATFORM_LABELS[r.platform]}</span>
                    <span className="text-[#00ff41]">{r.contactsFound} encontrados</span>
                    <span className="text-[#a855f7]">{r.newContacts} novos</span>
                    <span className="text-yellow-400">{r.nostrMapped} Nostr</span>
                    {r.errors.length > 0 && (
                      <span className="text-red-500">{r.errors.length} erros</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    );
  }

  // ─── Exchanges View ───
  if (view === "exchanges") {
    return (
      <section className="border border-[#1a1f26] bg-[#080a0c]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a1f26]">
          <div>
            <div className="tag">EXCHANGE TICKERS</div>
            <div className="text-[10px] text-zinc-600 font-mono mt-1">
              PREÇOS EM TEMPO REAL — BINANCE · COINBASE · KRAKEN · BYBIT · MERCADO BITCOIN
            </div>
          </div>
          <button
            onClick={() => setView("dashboard")}
            className="text-zinc-500 hover:text-zinc-300 font-mono text-xs"
          >
            ← VOLTAR
          </button>
        </div>

        <div className="p-6">
          {tickers.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-zinc-600 font-mono text-xs mb-2">
                {tickerError ?? "Sem tickers — clique para carregar"}
              </div>
              <button
                type="button"
                onClick={() => void loadTickers()}
                className="px-4 py-2 text-[10px] font-mono text-[#00ff41] border border-[#00ff41]/20 hover:bg-[#00ff41]/10"
              >
                CARREGAR BTCUSDT
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {tickers.map((t) => (
                <div
                  key={t.exchange}
                  className="flex items-center gap-4 px-4 py-3 border border-[#1a1f26]"
                >
                  <span className="text-lg">{PLATFORM_ICONS[t.exchange.toLowerCase().replace(" ", "") as SocialPlatform] || "💱"}</span>
                  <div className="flex-1">
                    <div className="font-mono text-xs text-zinc-300">{t.exchange}</div>
                    <div className="text-[9px] text-zinc-600 font-mono">{t.symbol}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm text-white">${t.price.toLocaleString()}</div>
                    <div
                      className={`text-[9px] font-mono ${
                        t.priceChange24h >= 0 ? "text-[#00ff41]" : "text-red-500"
                      }`}
                    >
                      {t.priceChange24h >= 0 ? "+" : ""}
                      {t.priceChange24h.toFixed(2)}%
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[9px] font-mono text-zinc-500">VOL 24h</div>
                    <div className="font-mono text-[10px] text-zinc-400">
                      ${(t.volume24h / 1e6).toFixed(1)}M
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    );
  }

  // ─── Contacts View ───
  if (view === "contacts") {
    return (
      <section className="border border-[#1a1f26] bg-[#080a0c]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a1f26]">
          <div>
            <div className="tag">DIRETÓRIO UNIVERSAL</div>
            <div className="text-[10px] text-zinc-600 font-mono mt-1">
              {contacts.length} CONTATOS HARVESTADOS
            </div>
          </div>
          <button
            onClick={() => setView("dashboard")}
            className="text-zinc-500 hover:text-zinc-300 font-mono text-xs"
          >
            ← VOLTAR
          </button>
        </div>

        <div className="p-6">
          {contacts.length === 0 ? (
            <div className="text-center py-8 text-zinc-600 font-mono text-xs">
              Nenhum contacto importado. Use IMPORTAR JSON no painel principal.
            </div>
          ) : (
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {contacts.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 px-3 py-2 border border-[#1a1f26] hover:bg-[#0a0d10]"
                >
                  <span className="text-sm">{PLATFORM_ICONS[c.platform]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-mono text-zinc-300 truncate">
                      {c.username}
                    </div>
                    <div className="text-[8px] font-mono text-zinc-600 truncate">
                      {c.platformId} · {PLATFORM_LABELS[c.platform]}
                    </div>
                  </div>
                  {c.nostrPubkey && (
                    <span className="px-1.5 py-0.5 text-[8px] font-mono text-[#00ff41] border border-[#00ff41]/20">
                      NOSTR
                    </span>
                  )}
                  {c.exchangeData && (
                    <span className="px-1.5 py-0.5 text-[8px] font-mono text-yellow-400 border border-yellow-400/20">
                      TRADER
                    </span>
                  )}
                  <div className="text-[8px] font-mono text-zinc-700">
                    {Math.round(c.confidence * 100)}%
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    );
  }

  // ─── Search View ───
  if (view === "search") {
    return (
      <section className="border border-[#1a1f26] bg-[#080a0c]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a1f26]">
          <div>
            <div className="tag">BUSCA UNIVERSAL</div>
            <div className="text-[10px] text-zinc-600 font-mono mt-1">
              BUSCA EM TODAS AS PLATAFORMAS + DIRETÓRIO LOCAL
            </div>
          </div>
          <button
            onClick={() => setView("dashboard")}
            className="text-zinc-500 hover:text-zinc-300 font-mono text-xs"
          >
            ← VOLTAR
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Buscar contatos, traders, usuários..."
              className="flex-1 bg-[#0a0d10] border border-[#1a1f26] px-4 py-2.5 text-xs font-mono text-zinc-300 outline-none focus:border-[#a855f7]/50 placeholder:text-zinc-700"
            />
            <button
              onClick={handleSearch}
              className="px-6 py-2.5 bg-[#a855f7] hover:bg-[#a855f7]/80 text-black font-mono text-[10px] tracking-widest"
            >
              BUSCAR
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="space-y-1">
              <div className="text-[10px] font-mono text-zinc-500">
                {searchResults.length} resultados
              </div>
              {searchResults.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 px-3 py-2 border border-[#1a1f26]"
                >
                  <span className="text-sm">{PLATFORM_ICONS[c.platform]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-mono text-zinc-300">{c.username}</div>
                    <div className="text-[8px] font-mono text-zinc-600">{c.bio?.slice(0, 80)}</div>
                  </div>
                  {c.nostrPubkey && (
                    <span className="px-1.5 py-0.5 text-[8px] font-mono text-[#00ff41] border border-[#00ff41]/20">
                      NOSTR
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    );
  }

  // ─── ScrapScanner View ───
  if (view === "scrapscanner") {
    return (
      <section className="border border-[#1a1f26] bg-[#080a0c]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a1f26]">
          <div>
            <div className="tag">SCRAPSCANNER</div>
            <div className="text-[10px] text-zinc-600 font-mono mt-1">
              FETCH DIRECTO — TELEGRAM · X/NITTER · EXCHANGES · VCARD (VOID LOCAL, SEM INTERMEDIÁRIO)
            </div>
          </div>
          <button
            onClick={() => setView("dashboard")}
            className="text-zinc-500 hover:text-zinc-300 font-mono text-xs"
          >
            ← VOLTAR
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Controls Bar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-[#1a1f26] p-4 bg-[#0a0d10]">
            <div className="space-y-2">
              <div className="text-[10px] font-mono text-zinc-500">TELEGRAM CANAL (t.me/s/…)</div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={cliTgUser}
                  onChange={(e) => setCliTgUser(e.target.value)}
                  disabled={cliRunning}
                  placeholder="voidmessenger"
                  className="flex-1 bg-black border border-[#1a1f26] px-2 py-1.5 text-xs font-mono text-zinc-300 outline-none focus:border-[#a855f7]/50 disabled:opacity-50"
                />
                <button
                  onClick={() => runTelegramScan(cliTgUser)}
                  disabled={cliRunning}
                  className="px-3 py-1.5 bg-[#a855f7]/10 hover:bg-[#a855f7]/20 border border-[#a855f7]/30 disabled:opacity-50 text-[#a855f7] font-mono text-[9px]"
                >
                  VARRE
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-[10px] font-mono text-zinc-500">TELEGRAM PERFIL</div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={cliTgProfile}
                  onChange={(e) => setCliTgProfile(e.target.value)}
                  disabled={cliRunning}
                  placeholder="@utilizador"
                  className="flex-1 bg-black border border-[#1a1f26] px-2 py-1.5 text-xs font-mono text-zinc-300 outline-none focus:border-[#a855f7]/50 disabled:opacity-50"
                />
                <button
                  onClick={() => runTelegramProfileScan(cliTgProfile)}
                  disabled={cliRunning}
                  className="px-3 py-1.5 bg-[#a855f7]/10 hover:bg-[#a855f7]/20 border border-[#a855f7]/30 disabled:opacity-50 text-[#a855f7] font-mono text-[9px]"
                >
                  PERFIL
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-[10px] font-mono text-zinc-500">X / NITTER (HTML PÚBLICO)</div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={cliXQuery}
                  onChange={(e) => setCliXQuery(e.target.value)}
                  disabled={cliRunning}
                  placeholder="npub OR username"
                  className="flex-1 bg-black border border-[#1a1f26] px-2 py-1.5 text-xs font-mono text-zinc-300 outline-none focus:border-[#a855f7]/50 disabled:opacity-50"
                />
                <button
                  onClick={() => runXScan(cliXQuery)}
                  disabled={cliRunning}
                  className="px-3 py-1.5 bg-[#a855f7]/10 hover:bg-[#a855f7]/20 border border-[#a855f7]/30 disabled:opacity-50 text-[#a855f7] font-mono text-[9px]"
                >
                  BUSCA
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-[10px] font-mono text-zinc-500">EXCHANGES (PAR)</div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={cliExSymbol}
                  onChange={(e) => setCliExSymbol(e.target.value)}
                  disabled={cliRunning}
                  placeholder="BTCUSDT"
                  className="flex-1 bg-black border border-[#1a1f26] px-2 py-1.5 text-xs font-mono text-zinc-300 outline-none focus:border-[#00ff41]/50 disabled:opacity-50 uppercase"
                />
                <button
                  onClick={() => runExchangeScan(cliExSymbol)}
                  disabled={cliRunning}
                  className="px-3 py-1.5 bg-[#00ff41]/10 hover:bg-[#00ff41]/20 border border-[#00ff41]/30 disabled:opacity-50 text-[#00ff41] font-mono text-[9px]"
                >
                  TICKERS
                </button>
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <div className="text-[10px] font-mono text-zinc-500">AGENDA / VCARD (.vcf) — IMPORTAÇÃO LOCAL (LSA §3.9)</div>
              <label className="block w-full py-2 text-center bg-[#00ff41]/10 hover:bg-[#00ff41]/20 border border-[#00ff41]/30 text-[#00ff41] font-mono text-[9px] cursor-pointer disabled:opacity-50">
                {cliRunning ? "A PROCESSAR…" : "ESCOLHER FICHEIRO VCARD"}
                <input
                  type="file"
                  accept=".vcf,text/vcard,text/x-vcard"
                  className="hidden"
                  disabled={cliRunning}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void runVCardImport(f);
                    e.target.value = "";
                  }}
                />
              </label>
              <p className="text-[9px] font-mono text-zinc-600">
                CLI: npm run scrapscanner -- --social canal · --profile user · --x query · --exchange BTCUSDT
              </p>
            </div>
          </div>

          {/* Interactive CLI Terminal Screen */}
          <div className="border border-[#1a1f26] bg-black p-4 font-mono text-xs h-[400px] overflow-y-auto flex flex-col justify-between">
            <div className="space-y-2">
              {cliLogs.map((line, idx) => {
                let colorClass = "text-zinc-400";
                if (line.startsWith("✖")) colorClass = "text-red-500 font-bold";
                else if (line.startsWith("✔")) colorClass = "text-[#00ff41] font-bold";
                else if (line.startsWith("[Scraper")) colorClass = "text-[#3b82f6]";
                else if (line.startsWith("■")) colorClass = "text-[#a855f7] font-bold";
                else if (line.startsWith("Aguardando")) colorClass = "text-zinc-500 italic";

                return (
                  <div key={idx} className={colorClass}>
                    {line}
                  </div>
                );
              })}
              {cliRunning && (
                <div className="text-[#a855f7] animate-pulse">▒ EXECUTANDO OPERAÇÃO DE VARREDURA...</div>
              )}
            </div>
            
            <div className="mt-6 border-t border-zinc-900 pt-2 flex justify-between items-center text-zinc-600 text-[10px]">
              <span>NÓ HARVESTER LOGS // LSA §3.9</span>
              <button
                onClick={() => setCliLogs(["■ VØID PHANTOM HARVESTER — SCRAPSCANNER INTERFACE", "Console limpo. Aguardando comando..."])}
                className="text-zinc-500 hover:text-zinc-300 font-mono text-[9px]"
              >
                [LIMPAR CONSOLE]
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return null;
}
