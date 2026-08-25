export default function Manifesto() {
  return (
    <section id="manifesto" className="relative border-b border-[#14181c] overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-40" />
      <div className="absolute inset-0 bg-gradient-radial bg-[radial-gradient(ellipse_at_center,rgba(182,255,58,0.08),transparent_60%)]" />

      <div className="relative mx-auto max-w-5xl px-6 py-32 md:py-40 text-center">
        <div className="font-mono text-[11px] tracking-[0.4em] text-[#b6ff3a] mb-10">
          ◆ ◆ ◆ &nbsp; MANIFESTO &nbsp; ◆ ◆ ◆
        </div>

        <h2 className="font-sans font-light text-4xl md:text-7xl text-zinc-100 leading-[1.05] tracking-tight mb-12">
          O <span className="font-mono font-bold text-[#b6ff3a] glitch" data-text="VØID">VØID</span>{" "}
          <span className="italic text-zinc-500">não existe.</span>
          <br />
          O <span className="font-mono font-bold text-[#6cf0ff]">Hydra</span>{" "}
          <span className="italic text-zinc-500">não existe.</span>
          <br />
          <span className="text-zinc-100">Nós existimos.</span>
        </h2>

        <p className="max-w-2xl mx-auto text-zinc-400 text-lg leading-relaxed mb-12">
          Quando o dinheiro e a comunicação se tornam tão privados quanto um
          pensamento, o poder volta para as mãos de quem os gera. O ecossistema
          é uma tecnologia de privacidade radical, projetada para proteger
          jornalistas, ativistas e cidadãos comuns contra vigilância em massa
          e censura.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <a
            href="#core"
            className="group inline-flex items-center gap-3 px-6 py-3 bg-[#b6ff3a] text-black font-mono text-xs tracking-[0.2em] hover:bg-white transition-colors"
          >
            VOLTAR_AO_CORE
            <span className="group-hover:-translate-x-1 transition-transform">▴</span>
          </a>
          <a
            href="/whitepaper.pdf"
            download
            className="inline-flex items-center gap-3 px-6 py-3 border border-[#14181c] text-zinc-400 font-mono text-xs tracking-[0.2em] hover:border-[#b6ff3a]/40 hover:text-[#b6ff3a] transition-colors"
          >
            DOWNLOAD_WHITEPAPER.PDF
          </a>
        </div>

        <div className="mt-20 pt-10 border-t border-[#14181c] max-w-3xl mx-auto text-left">
          <div className="tag mb-4">SOBERANIA DO CÓDIGO</div>
          <p className="text-xs text-zinc-500 leading-relaxed mb-4">
            ET-COSMIC é software <span className="text-[#b6ff3a]">totalmente livre</span> sob{" "}
            <span className="text-zinc-300">AGPL-3.0</span> — Devs e Users vs Big Tech.
            Forks devem preservar créditos à MontêLauro Foundation / Bruno Monteiro Caldas da Cunha.
            Taxa de protocolo opcional (0,1 % predefinida) financia a tesouraria sem fechar o código.
            Produtos proprietários requerem licença comercial.
          </p>
          <a
            href="/governance/sovereignty"
            className="inline-block font-mono text-[10px] tracking-widest text-[#b6ff3a] hover:text-white no-underline"
          >
            SOBERANIA & ROYALTIES →
          </a>
        </div>

        <div className="mt-10 pt-10 border-t border-[#14181c] max-w-3xl mx-auto text-left">
          <div className="tag mb-4">AVISO LEGAL · ÉTICA</div>
          <p className="text-xs text-zinc-600 leading-relaxed">
            O ecossistema VØID / Hydra / Ωmega é uma tecnologia de privacidade
            radical. Seu uso é de exclusiva responsabilidade do usuário. Os
            desenvolvedores não incentivam atividades ilícitas e não se
            responsabilizam por violações de leis locais.
          </p>
        </div>
      </div>
    </section>
  );
}
