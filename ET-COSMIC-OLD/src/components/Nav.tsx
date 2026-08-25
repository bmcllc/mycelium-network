import { useState, useEffect } from "react";

export default function Nav() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        console.log("[VØID PWA] Instalação aceita.");
        setDeferredPrompt(null);
      }
    }
  };

  const links = [
    { href: "#overview", label: "OVERVIEW" },
    { href: "#eternet", label: "ETERNET" },
    { href: "#terminal", label: "TERMINAL" },
    { href: "#bridge", label: "BRIDGE" },
    { href: "#hydra", label: "HYDRA" },
    { href: "#omega", label: "Ωmega" },
    { href: "#dao", label: "DAO" },
    { href: "#pow-faucet", label: "FAUCET" },
    { href: "#farm", label: "FARM" },
    { href: "#qrng-panel", label: "MODULES" },
  ];
  return (
    <header className="sticky top-0 z-50 border-b border-[#14181c] bg-black/70 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-6 h-14 flex items-center justify-between">
        <a href="#" className="flex items-center gap-3 group">
          <div className="relative">
            <div className="size-6 border border-[#b6ff3a]/60 rotate-45 group-hover:rotate-[225deg] transition-transform duration-700" />
            <div className="absolute inset-0 size-6 border border-[#ff3ad9]/40 rotate-45 scale-50 group-hover:scale-100 transition-transform duration-700" />
          </div>
          <span className="font-mono text-sm tracking-[0.3em] text-zinc-100">
            VØID<span className="text-[#b6ff3a]">/</span>SYS
          </span>
        </a>
        <nav className="hidden md:flex items-center gap-7">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="font-mono text-[11px] tracking-[0.2em] text-zinc-500 hover:text-[#b6ff3a] transition-colors"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {deferredPrompt && (
            <button
              onClick={handleInstallClick}
              className="font-mono text-[10px] tracking-[0.2em] px-2 py-1 bg-[#ff3ad9]/20 text-[#ff3ad9] border border-[#ff3ad9]/40 hover:bg-[#ff3ad9] hover:text-black transition-colors"
            >
              INSTALL APP
            </button>
          )}
          <span className="hidden sm:inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.2em] text-zinc-500">
            <span className="size-1.5 rounded-full bg-[#b6ff3a] pulse-soft shadow-[0_0_8px_#b6ff3a]" />
            NODES · 47.2K
          </span>
          <a
            href="#manifesto"
            className="font-mono text-[11px] tracking-[0.2em] px-3 py-1.5 border border-[#b6ff3a]/40 text-[#b6ff3a] hover:bg-[#b6ff3a] hover:text-black transition-colors"
          >
            INIT_SESSION ▸
          </a>
        </div>
      </div>
    </header>
  );
}
