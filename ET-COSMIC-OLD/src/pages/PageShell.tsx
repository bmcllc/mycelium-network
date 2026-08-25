import type { ReactNode } from "react";
import { Link } from "wouter";

export function PageShell({
  title,
  eyebrow,
  showBack = true,
  children,
}: {
  title: string;
  eyebrow?: string;
  showBack?: boolean;
  children: ReactNode;
}) {
  const base = import.meta.env.BASE_URL;

  return (
    <div className="min-h-screen bg-[#050607] text-zinc-300 font-mono selection:bg-[#b6ff3a]/20">
      <div className="mx-auto max-w-3xl px-6 py-16 md:py-24">
        {showBack && (
          <Link
            href={base}
            className="text-[10px] text-zinc-600 hover:text-[#b6ff3a] no-underline tracking-widest uppercase"
          >
            ← ET-COSMIC
          </Link>
        )}
        {eyebrow && (
          <p className={`${showBack ? "mt-8" : ""} text-[10px] tracking-[0.35em] text-[#b6ff3a]/80 uppercase`}>
            {eyebrow}
          </p>
        )}
        <h1 className="mt-4 font-sans text-3xl md:text-4xl font-light text-zinc-100 tracking-tight">
          {title}
        </h1>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
