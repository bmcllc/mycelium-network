import { useState } from "react";

interface Props {
  floating?: boolean;
}

const terms = [
  { term: "GhostID", desc: "Identidade temporária gerada em RAM. Morre quando você fecha o app, garantindo que não existam rastros persistentes de quem você é." },
  { term: "QEL (Quantum Entanglement Layer)", desc: "Protocolo que fatia sua transação em 3 pedaços (shards). Nenhum nó da rede vê a transação completa, apenas fragmentos indecifráveis." },
  { term: "HCN (Human Carrier Network)", desc: "Rede de transporte física. Seus dados viajam no bolso de outras pessoas (via Bluetooth) até encontrar o destino, sem usar a internet." },
  { term: "Stablecoin Local", desc: "Moeda com valor estável (ex: $ETBRL) emitida por você mesmo, usando ativos reais como garantia, sem depender de bancos centrais." },
  { term: "DEX (Dual-Mode Exchange)", desc: "Mercado de troca onde as ordens são pareadas de forma cega. Ninguém sabe o preço real sendo negociado até que o 'match' aconteça." },
  { term: "ANIMUS / SYMBIONT", desc: "O motor parasita que roda no seu navegador. Ele ajuda a malha global enquanto você navega, e você ganha $SOV por isso." },
  { term: "HGPU", desc: "Unidade que desenha a interface usando matemática (SDF) em vez de pixels. É a forma mais eficiente e segura de transmitir mundos digitais." },
  { term: "AQRE", desc: "Anacroclastic Quantum-Relativistic Emulator: simulador clássico que impõe as leis LSC (P_max, Cε, G, K_eff) e recusa tarefas com HTTP 429. Nunca alega computação quântica real." },
  { term: "LUSUS", desc: "Engine clássica (lat. ilusão/jogo) que usa Ising óptico, Thomas-Fermi, caos sincronizado e cavidades ressonantes para tarefas que parecem quânticas — sem qubits." },
  { term: "VOID Sovereign Stack", desc: "Sistema unificado AGPL: VOID-BRIDGE (Ising/QUBO clássico), VOID-PCI (PEFB — canal sem fóton), VOID-MESH (Silent hosting + $SOV). Hub: /compute/void-stack · API: POST /api/void." },
  { term: "Anacroclastia", desc: "Disciplina de honestidade: separar o que é engenharia clássica sólida (verde) do especulativo (amarelo) e do impossível ou exponencial (vermelho/laranja)." },
  { term: "Soberania ET-COSMIC", desc: "AGPL-3.0 totalmente livre (§13 anti-SaaS) + NOTICE + taxa protocolo transparente (não fecha código). Painel /governance/sovereignty." },
  { term: "Reserva IA", desc: "Proibição de treino de LLM, scraping para datasets e RE de binários comerciais sem licença. Opt-out TDM UE. Ver AI-USE-RESERVATION.md e public/ai.txt." },
  { term: "Taxa de protocolo", desc: "Percentagem transparente (predefinição 0,1 %) em pagamentos e DEX, destinada a npub de tesouraria. Não fecha o código; monetiza a infraestrutura mantida." },
];

export default function Glossary({ floating = false }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  if (floating) {
    return (
      <>
        {/* Botão Flutuante de Ajuda */}
        <button 
          onClick={() => setIsOpen(true)}
          className="fixed bottom-8 right-8 z-[60] size-12 rounded-full bg-[#b6ff3a] text-black shadow-[0_0_20px_rgba(182,255,58,0.4)] flex items-center justify-center font-mono font-bold text-xl hover:scale-110 transition-smooth group"
        >
          ?
          <span className="absolute right-14 bg-black border border-[#b6ff3a]/30 text-[#b6ff3a] text-[10px] px-3 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
            GLOSSÁRIO DE SOBERANIA
          </span>
        </button>

        {/* Modal do Glossário */}
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-6">
            <div className="max-w-2xl w-full bg-[#0a0d10] border border-[#b6ff3a]/20 p-8 md:p-12 relative max-h-[80vh] overflow-y-auto scrollbar-none">
              <button 
                onClick={() => setIsOpen(false)}
                className="absolute top-6 right-6 text-zinc-500 hover:text-white font-mono text-xs"
              >
                FECHAR [X]
              </button>

              <div className="tag mb-6 text-[#b6ff3a]">Manual do Usuário Soberano</div>
              <h2 className="text-3xl font-sans font-light text-white mb-10">Entendendo o Sistema</h2>

              <div className="space-y-8">
                {terms.map(t => (
                  <div key={t.term} className="group">
                    <h3 className="font-mono text-[#6cf0ff] mb-2 text-sm tracking-widest uppercase">{t.term}</h3>
                    <p className="text-zinc-500 text-sm leading-relaxed group-hover:text-zinc-300 transition-colors">
                      {t.desc}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-12 p-6 bg-black border border-zinc-900 italic text-zinc-600 text-xs leading-relaxed">
                "Este sistema foi desenhado para ser invulnerável à censura. Se você não entende algo, sinta-se seguro: a matemática está protegendo você mesmo no escuro."
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-12">
      <div className="tag text-[#b6ff3a] inline-block">MANUAL DO USUÁRIO SOBERANO</div>
      <div>
        <h2 className="text-3xl font-sans font-light text-white">Glossário de Termos</h2>
        <p className="text-zinc-500 text-sm mt-2 max-w-xl">
          Entenda os conceitos matemáticos e criptográficos fundamentais que sustentam o ecossistema ET-COSMIC.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {terms.map(t => (
          <div key={t.term} className="p-6 bg-[#0a0d10] border border-zinc-900 hover:border-[#b6ff3a]/30 transition-smooth group rounded-sm">
            <h3 className="font-mono text-[#6cf0ff] mb-3 text-sm tracking-widest uppercase">{t.term}</h3>
            <p className="text-zinc-400 text-xs leading-relaxed group-hover:text-zinc-300 transition-colors">
              {t.desc}
            </p>
          </div>
        ))}
      </div>

      <div className="p-6 bg-black border border-zinc-950 italic text-zinc-600 text-xs leading-relaxed text-center">
        "Este sistema foi desenhado para ser invulnerável à censura. Se você não entende algo, sinta-se seguro: a matemática está protegendo você mesmo no escuro."
      </div>
    </div>
  );
}
