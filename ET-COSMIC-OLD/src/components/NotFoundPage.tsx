import { Link } from "wouter";

/** Rota não registada em router.tsx */
export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-[#050607] text-zinc-300 flex flex-col items-center justify-center p-8 font-mono text-sm">
      <p className="text-[#b6ff3a] mb-2">404 — módulo não encontrado</p>
      <p className="text-zinc-600 text-xs mb-6 text-center max-w-md">
        O caminho não está em <code className="text-zinc-400">router.tsx</code>.
      </p>
      <Link href="/" className="text-zinc-400 hover:text-[#b6ff3a] no-underline">
        ← Voltar ao início
      </Link>
    </div>
  );
}
