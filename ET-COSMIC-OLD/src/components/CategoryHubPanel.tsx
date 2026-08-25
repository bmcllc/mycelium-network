/**
 * Índice de módulos por área — /crypto, /finance, /compute, etc.
 */

import { Link } from "wouter";
import {
  getCategoryById,
  getCategoryHubPath,
  getRoutesByCategory,
  type PanelCategoryId,
} from "../router";
import PanelTierBadge from "./PanelTierBadge";

interface Props {
  categoryId: PanelCategoryId;
}

export default function CategoryHubPanel({ categoryId }: Props) {
  const cat = getCategoryById(categoryId);
  const areaRoutes = getRoutesByCategory(categoryId);

  if (!cat) {
    return <p className="font-mono text-red-400 text-sm">Categoria desconhecida.</p>;
  }

  return (
    <section className="space-y-8">
      <div>
        <span
          className="font-mono text-[10px] tracking-[0.3em] uppercase"
          style={{ color: cat.color }}
        >
          Área · {cat.label}
        </span>
        <h2 className="mt-3 font-sans font-light text-3xl text-zinc-100">
          {cat.label}
        </h2>
        <p className="mt-2 text-sm text-zinc-500 max-w-2xl leading-relaxed">
          {cat.description}
        </p>
        <p className="mt-3 font-mono text-[9px] text-zinc-600">
          {areaRoutes.length} módulos · hub{" "}
          <code className="text-zinc-500">{getCategoryHubPath(categoryId)}</code>
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {areaRoutes.map((route) => (
          <Link
            key={route.path}
            href={route.path}
            className="group flex items-start gap-3 p-4 border border-[#1a1f26] rounded-lg hover:border-[#2a2f36] hover:bg-[#0a0d10] transition-all no-underline"
            style={{ borderLeftColor: cat.color, borderLeftWidth: 3 }}
          >
            <div
              className="w-8 h-8 flex items-center justify-center rounded flex-shrink-0"
              style={{ background: `${cat.color}15` }}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke={cat.color}
                viewBox="0 0 24 24"
                strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d={route.icon} />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs text-zinc-200 group-hover:text-white truncate">
                  {route.label}
                </span>
                <PanelTierBadge path={route.path} category={route.category} />
              </div>
              <p className="text-[10px] text-zinc-600 line-clamp-2 mt-1 leading-relaxed">
                {route.description}
              </p>
              <p className="mt-2 font-mono text-[9px] text-zinc-700 group-hover:text-zinc-500">
                {route.path}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {areaRoutes.length === 0 && (
        <p className="font-mono text-sm text-zinc-600">Nenhum módulo nesta área.</p>
      )}
    </section>
  );
}
