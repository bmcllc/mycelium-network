/**
 * VØID — Painel de Plugins Lua
 *
 * Gerencia plugins Lua locais no browser.
 * Cada nó roda seus próprios plugins. Sem servidor central.
 *
 * Filosofia: "Nós não descompilamos. Nós escavamos."
 */

import { useState } from "react";
import { useLua, type LuaResult } from "../core/useLua";

/** Scripts Lua de exemplo embutidos */
const EXAMPLE_SCRIPTS: Record<string, string> = {
  "collapse_strategy": `-- Estratégia de Colapso
local M = {}

function M.analyze(args)
    local stress = args.stress or 0
    local signal = "HOLD"
    local reason = ""

    if stress > 0.7 then
        signal = "SELL"
        reason = string.format("Estresse crítico: %.3f", stress)
    elseif stress < 0.3 then
        signal = "BUY"
        reason = string.format("Recuperação: %.3f", stress)
    end

    return {
        signal = signal,
        reason = reason,
        stress = stress,
        confidence = math.min(1.0, math.abs(stress - 0.5) * 2)
    }
end

return M`,

  "lsc_monitor": `-- Monitor LSC
local M = {}

function M.check(args)
    local c_epsilon = args.C_epsilon or 0
    local mu = 0.1
    local beta = 3.0

    local g = 1.0 / ((1.0 - c_epsilon) + mu * math.exp(beta * c_epsilon))
    local k_eff = 1.0 * (1.0 - c_epsilon) + 0.01

    local status = "NORMAL"
    if c_epsilon > 0.86 then status = "CRITICAL"
    elseif c_epsilon > 0.7 then status = "WARNING" end

    return {
        C_epsilon = c_epsilon,
        G_saturation = g,
        K_eff = k_eff,
        status = status
    }
end

return M`,

  "homotopy_validator": `-- Validador PoH
local M = {}

function M.sobolev(field)
    local n = #field
    if n < 3 then return 0, 0 end

    local h1 = 0
    local h2 = 0
    for i = 2, n - 1 do
        local grad = (field[i+1] - field[i-1]) / 2
        local grad2 = field[i+1] - 2*field[i] + field[i-1]
        h1 = h1 + grad * grad
        h2 = h2 + grad2 * grad2
    end

    return math.sqrt(h1/n), math.sqrt(h2/n)
end

return M`,
};

export default function LuaPluginPanel() {
  const { loadPlugin, execute, unload, plugins, isReady } = useLua();
  const [selectedScript, setSelectedScript] = useState<string>("collapse_strategy");
  const [customScript, setCustomScript] = useState("");
  const [pluginName, setPluginName] = useState("");
  const [execResult, setExecResult] = useState<LuaResult | null>(null);
  const [execArgs, setExecArgs] = useState('{"stress": 0.75}');
  const [execFunction, setExecFunction] = useState("analyze");
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 20));
  };

  /** Carrega o script selecionado */
  const handleLoad = () => {
    const script = customScript || EXAMPLE_SCRIPTS[selectedScript] || "";
    const name = pluginName || selectedScript;
    if (!script) {
      addLog("ERRO: script vazio");
      return;
    }
    loadPlugin(name, script);
    addLog(`Plugin "${name}" carregado (${script.length} bytes)`);
  };

  /** Executa a função */
  const handleExecute = async () => {
    if (plugins.length === 0) {
      addLog("ERRO: nenhum plugin carregado");
      return;
    }

    const target = plugins[0]?.name;
    let args: Record<string, unknown> = {};
    try {
      args = JSON.parse(execArgs);
    } catch {
      addLog("ERRO: args JSON inválido");
      return;
    }

    addLog(`Executando ${target}.${execFunction}()...`);
    const result = await execute(target, execFunction, args);
    setExecResult(result);

    if (result.success) {
      addLog(`OK (${result.time.toFixed(1)}ms): ${JSON.stringify(result.result)}`);
    } else {
      addLog(`ERRO: ${result.error}`);
    }
  };

  return (
    <section className="relative border-b border-[#14181c] bg-black">
      <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <div className="mb-14 max-w-4xl">
          <div className="flex items-center gap-4 mb-6">
            <span className="font-mono text-[11px] tracking-[0.3em] text-[#b6ff3a]">
              PLUGINS
            </span>
            <span className="h-px flex-1 bg-gradient-to-r from-[#b6ff3a]/40 to-transparent max-w-[120px]" />
            <span className="font-mono text-[11px] tracking-[0.3em] text-zinc-500">
              LUA LOCAL
            </span>
          </div>
          <h2 className="font-sans font-light text-3xl md:text-5xl text-zinc-100 leading-tight tracking-tight mb-4">
            Plugins <span className="text-[#b6ff3a]">Lua</span> Locais
          </h2>
          <p className="text-zinc-400 text-base md:text-lg leading-relaxed max-w-3xl">
            Scripts Lua executados localmente no browser via WebAssembly.
            Cada nó roda seus próprios plugins. Sem servidor central.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-px bg-[#14181c] border border-[#14181c]">
          {/* Editor */}
          <div className="lg:col-span-7 bg-[#0a0d10] p-6 md:p-8">
            <span className="tag mb-4 block">SCRIPT LUA</span>

            {/* Seleção de script */}
            <div className="flex gap-2 mb-4">
              <select
                value={selectedScript}
                onChange={(e) => setSelectedScript(e.target.value)}
                className="flex-1 bg-black border border-[#14181c] text-zinc-300 font-mono text-xs px-3 py-2"
              >
                {Object.keys(EXAMPLE_SCRIPTS).map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              <input
                type="text"
                value={pluginName}
                onChange={(e) => setPluginName(e.target.value)}
                placeholder="nome do plugin"
                className="w-40 bg-black border border-[#14181c] text-zinc-300 font-mono text-xs px-3 py-2"
              />
            </div>

            {/* Área de script */}
            <textarea
              value={customScript || EXAMPLE_SCRIPTS[selectedScript] || ""}
              onChange={(e) => {
                setCustomScript(e.target.value);
                setSelectedScript("");
              }}
              className="w-full h-64 bg-black border border-[#14181c] text-[#6cf0ff] font-mono text-[11px] p-4 resize-none focus:outline-none focus:border-[#6cf0ff]/50"
              spellCheck={false}
            />

            <button
              onClick={handleLoad}
              className="mt-3 px-4 py-2 bg-[#b6ff3a]/10 border border-[#b6ff3a]/30 text-[#b6ff3a] font-mono text-xs hover:bg-[#b6ff3a]/20 transition-colors"
            >
              CARREGAR PLUGIN
            </button>

            {/* Execução */}
            <div className="mt-6">
              <span className="tag mb-3 block">EXECUTAR</span>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={execFunction}
                  onChange={(e) => setExecFunction(e.target.value)}
                  placeholder="função"
                  className="w-40 bg-black border border-[#14181c] text-zinc-300 font-mono text-xs px-3 py-2"
                />
                <input
                  type="text"
                  value={execArgs}
                  onChange={(e) => setExecArgs(e.target.value)}
                  placeholder='{"key": "value"}'
                  className="flex-1 bg-black border border-[#14181c] text-zinc-300 font-mono text-xs px-3 py-2"
                />
                <button
                  onClick={handleExecute}
                  disabled={!isReady || plugins.length === 0}
                  className="px-4 py-2 bg-[#6cf0ff]/10 border border-[#6cf0ff]/30 text-[#6cf0ff] font-mono text-xs hover:bg-[#6cf0ff]/20 transition-colors disabled:opacity-30"
                >
                  EXECUTAR
                </button>
              </div>

              {/* Resultado */}
              {execResult && (
                <div className={`p-3 border font-mono text-[10px] ${
                  execResult.success
                    ? "bg-[#b6ff3a]/5 border-[#b6ff3a]/20 text-[#b6ff3a]"
                    : "bg-[#ff3ad9]/5 border-[#ff3ad9]/20 text-[#ff3ad9]"
                }`}>
                  <div className="mb-1">
                    {execResult.success ? "✓ SUCESSO" : "✗ ERRO"} ({execResult.time.toFixed(1)}ms)
                  </div>
                  <pre className="whitespace-pre-wrap">
                    {execResult.success
                      ? JSON.stringify(execResult.result, null, 2)
                      : execResult.error}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-5 bg-black p-6 md:p-8">
            {/* Status */}
            <div className="mb-6">
              <span className="tag mb-3 block">STATUS</span>
              <div className="p-3 bg-[#0a0d10] border border-[#14181c]">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-2 h-2 rounded-full ${isReady ? "bg-[#b6ff3a]" : "bg-zinc-600"}`} />
                  <span className="font-mono text-[10px] text-zinc-400">
                    {isReady ? "Lua WASM pronto" : "Carregando..."}
                  </span>
                </div>
                <div className="font-mono text-[9px] text-zinc-600">
                  Plugins carregados: {plugins.length}
                </div>
              </div>
            </div>

            {/* Plugins ativos */}
            <div className="mb-6">
              <span className="tag mb-3 block">PLUGINS ATIVOS</span>
              {plugins.length === 0 ? (
                <div className="p-3 bg-[#0a0d10] border border-[#14181c] font-mono text-[9px] text-zinc-600">
                  Nenhum plugin carregado
                </div>
              ) : (
                <div className="space-y-2">
                  {plugins.map((p) => (
                    <div key={p.name} className="p-3 bg-[#0a0d10] border border-[#14181c]">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-[10px] text-[#6cf0ff]">{p.name}</span>
                        <button
                          onClick={() => unload(p.name)}
                          className="font-mono text-[8px] text-[#ff3ad9] hover:text-[#ff3ad9]/80"
                        >
                          REMOVER
                        </button>
                      </div>
                      <div className="flex gap-3 font-mono text-[8px] text-zinc-600">
                        <span>execs: {p.executions}</span>
                        <span>erros: {p.errors}</span>
                        <span className={p.status === "active" ? "text-[#b6ff3a]" : "text-[#ff3ad9]"}>
                          {p.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Logs */}
            <div>
              <span className="tag mb-3 block">LOG</span>
              <div className="h-48 overflow-y-auto bg-[#0a0d10] border border-[#14181c] p-3 font-mono text-[9px]">
                {logs.length === 0 ? (
                  <span className="text-zinc-600">Aguardando execução...</span>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className={`${
                      log.includes("ERRO") ? "text-[#ff3ad9]" : "text-zinc-500"
                    }`}>
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-[#14181c] font-mono text-[9px] text-zinc-600 leading-relaxed">
              Plugins Lua executam localmente via WebAssembly.
              Sem rede. Sem servidor. Sem permissão.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
