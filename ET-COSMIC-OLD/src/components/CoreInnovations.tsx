import SectionHeader from "./SectionHeader";
import AntiSybilLab from "./AntiSybilLab";

export default function CoreInnovations() {
  return (
    <section id="core" className="relative border-b border-[#14181c] bg-[#070809]">
      <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <SectionHeader
          index="02"
          kicker="VØID CORE — TRÊS INOVAÇÕES BASE"
          title={
            <>
              Identidade efêmera.{" "}
              <span className="italic text-zinc-500">Mensagens fragmentadas.</span>{" "}
              <span className="text-[#6cf0ff]">Alcance zero‑infrastructure.</span>
            </>
          }
        />

        {/* GhostID */}
        <article className="grid lg:grid-cols-12 gap-px bg-[#14181c] border border-[#14181c] mb-px">
          <div className="lg:col-span-5 bg-black p-8 md:p-10">
            <div className="flex items-center gap-3 mb-5">
              <span className="font-mono text-xs text-[#b6ff3a]">2.1</span>
              <span className="tag">GHOSTID ENGINE</span>
            </div>
            <h3 className="font-mono text-2xl text-zinc-100 mb-4">
              Identidade efêmera por entropia biométrica passiva
            </h3>
            <p className="text-sm text-zinc-400 leading-relaxed mb-6">
              Coleta passiva de ritmo de digitação, giroscópio, pressão de toque,
              ruído de microfone e timestamps de hardware. Derivação via
              HKDF‑SHA3‑512 + Argon2id (64 MB, 3 iter.) → par Ed25519{" "}
              <span className="text-[#b6ff3a]">apenas em RAM</span>.
            </p>
            <ul className="space-y-2 text-sm text-zinc-400 font-mono">
              <li>▸ Handle público: <span className="text-zinc-200">void_◆_{"{16 hex}"}</span></li>
              <li>▸ Destruído ao fim da sessão</li>
              <li>▸ OBALP — troca física via áudio/NFC</li>
              <li>▸ CLT — tokens de reconhecimento entre sessões</li>
            </ul>
          </div>
          <div className="lg:col-span-7 bg-[#0a0d10] p-8 md:p-10 relative overflow-hidden">
            <div className="absolute inset-0 grid-bg opacity-30" />
            <div className="relative">
              <div className="tag mb-6">// terminal · ghost-spawn</div>
              <pre className="font-mono text-[12px] md:text-[13px] leading-relaxed text-zinc-300 whitespace-pre-wrap">
{`$ void ghost --spawn
[ok] entropy.collect ........... 4096 bits
     keystroke_rhythm ............... 1024
     gyro_drift ..................... 1024
     touch_pressure ................. 1024
     mic_floor ...................... 1024
[ok] hkdf-sha3-512 ............. derived
[ok] argon2id (64MB, 3it) ...... 412 ms
[ok] ed25519 keypair ........... in-memory
`}
                <span className="text-[#b6ff3a]">{`> handle = void_◆_a91c4f7e3b2d8901`}</span>
{`
> ttl     = session
> persist = false
ready.`}
              </pre>
            </div>
          </div>
        </article>

        {/* QEL */}
        <article className="grid lg:grid-cols-12 gap-px bg-[#14181c] border-x border-b border-[#14181c] mb-px">
          <div className="lg:col-span-7 bg-[#0a0d10] p-8 md:p-10 relative overflow-hidden">
            <ShardDiagram />
          </div>
          <div className="lg:col-span-5 bg-black p-8 md:p-10">
            <div className="flex items-center gap-3 mb-5">
              <span className="font-mono text-xs text-[#6cf0ff]">2.2</span>
              <span className="tag">QEL PROTOCOL</span>
            </div>
            <h3 className="font-mono text-2xl text-zinc-100 mb-4">
              Fragmentação total de mensagens e transações
            </h3>
            <p className="text-sm text-zinc-400 leading-relaxed mb-6">
              Cada payload é fragmentado em <span className="text-[#6cf0ff]">N=3 shards</span>{" "}
              via Shamir Secret Sharing (K=2). Cada shard é cifrado individualmente
              com ChaCha20‑Poly1305 e roteado por caminhos{" "}
              <span className="italic">maximamente independentes</span> (MDNF).
            </p>
            <div className="border-t border-[#14181c] pt-5 space-y-3">
              {[
                ["NÓ INTERMEDIÁRIO VÊ", "≤ 1/3 da informação"],
                ["BLOQUEIO REQUER", "controle de ≥ K caminhos"],
                ["RECONSTITUIÇÃO", "apenas no destino"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 font-mono text-xs">
                  <span className="text-zinc-500">{k}</span>
                  <span className="text-zinc-200 text-right">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </article>

        {/* Anti-Sybil Defense Layer */}
        <div className="mt-12">
          <AntiSybilLab />
        </div>
      </div>
    </section>
  );
}

function ShardDiagram() {
  return (
    <div className="relative aspect-[7/5] w-full">
      <svg viewBox="0 0 700 500" className="absolute inset-0 w-full h-full">
        {/* source */}
        <g>
          <circle cx="80" cy="250" r="34" fill="#0a0d10" stroke="#b6ff3a" strokeWidth="1.5" />
          <text x="80" y="255" textAnchor="middle" fill="#b6ff3a" fontFamily="JetBrains Mono" fontSize="10">SRC</text>
        </g>
        {/* destination */}
        <g>
          <circle cx="620" cy="250" r="34" fill="#0a0d10" stroke="#6cf0ff" strokeWidth="1.5" />
          <text x="620" y="255" textAnchor="middle" fill="#6cf0ff" fontFamily="JetBrains Mono" fontSize="10">DST</text>
        </g>

        {/* relay nodes */}
        {[
          [220, 110], [380, 80], [500, 140],
          [220, 250], [380, 250], [500, 250],
          [220, 390], [380, 420], [500, 360],
        ].map(([x, y], i) => (
          <g key={i}>
            <rect x={x - 8} y={y - 8} width="16" height="16" fill="#0a0d10" stroke="#1f2428" strokeWidth="1" transform={`rotate(45 ${x} ${y})`} />
          </g>
        ))}

        {/* paths */}
        {[
          { d: "M 114 240 Q 220 110, 380 80 T 586 240", color: "#b6ff3a", delay: "0s", label: "SHARD_01" },
          { d: "M 114 250 Q 300 250, 380 250 T 586 250", color: "#6cf0ff", delay: "1.3s", label: "SHARD_02" },
          { d: "M 114 260 Q 220 390, 380 420 T 586 260", color: "#ff3ad9", delay: "2.6s", label: "SHARD_03" },
        ].map((p, i) => (
          <g key={i}>
            <path d={p.d} fill="none" stroke={p.color} strokeOpacity="0.18" strokeWidth="1" />
            <path
              d={p.d}
              fill="none"
              stroke={p.color}
              strokeWidth="2"
              className="shard-path"
              style={{ animationDelay: p.delay }}
            />
          </g>
        ))}

        {/* labels */}
        <text x="350" y="30" textAnchor="middle" fill="#5a6268" fontFamily="JetBrains Mono" fontSize="10" letterSpacing="2">
          QEL · MDNF · K=2 / N=3
        </text>
      </svg>
      <div className="absolute bottom-3 left-3 font-mono text-[10px] text-zinc-600 tracking-[0.2em]">
        // shamir secret sharing
      </div>
      <div className="absolute bottom-3 right-3 font-mono text-[10px] text-zinc-600 tracking-[0.2em]">
        chacha20-poly1305
      </div>
    </div>
  );
}
