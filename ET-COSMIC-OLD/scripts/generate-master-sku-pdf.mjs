#!/usr/bin/env node
/**
 * Gera PDF do catálogo B2B a partir de src/b2b/masterSkuList.json
 * + metadados de src/b2b/skuCatalog.generated.ts
 *
 * Saída: docs/master-sku-list.pdf, public/master-sku-list.pdf
 * Requer: tectonic ou pdflatex (ver compile-master-sku-pdf.sh)
 */
import { readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ids = JSON.parse(readFileSync(join(root, "src/b2b/masterSkuList.json"), "utf8"));
const catalogSrc = readFileSync(join(root, "src/b2b/skuCatalog.generated.ts"), "utf8");
const catalogMatch = catalogSrc.match(
  /export const SKU_CATALOG[^=]*=\s*(\[[\s\S]*?\])\s*as const/,
);
if (!catalogMatch) {
  console.error("Não foi possível ler SKU_CATALOG de skuCatalog.generated.ts");
  process.exit(1);
}
const catalog = JSON.parse(catalogMatch[1]);
const byId = Object.fromEntries(catalog.map((e) => [e.id, e]));

function texEscape(s) {
  return String(s)
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/[\u2013\u2014]/g, "---")
    .replace(/ê/g, "\\^e")
    .replace(/[àáâãäå]/g, "a")
    .replace(/[èéêë]/g, "e")
    .replace(/[ìíîï]/g, "i")
    .replace(/[òóôõö]/g, "o")
    .replace(/[ùúûü]/g, "u")
    .replace(/ç/g, "c")
    .replace(/[&%$#_{}]/g, (c) => `\\${c}`)
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}");
}

function sortKey(id) {
  if (id.startsWith("VOID-")) {
    const n = parseInt(id.slice(5), 16);
    return Number.isNaN(n) ? 0x10000 + id.charCodeAt(5) : n;
  }
  return 0x20000 + id.charCodeAt(0);
}
const sortedIds = [...ids].sort((a, b) => {
  const ka = sortKey(a);
  const kb = sortKey(b);
  return ka !== kb ? ka - kb : a.localeCompare(b);
});

const rows = sortedIds.map((id, i) => {
  const e = byId[id];
  const name = e?.name ?? "—";
  const kind = e?.kind ?? "—";
  const path = e?.path ? `\\texttt{${texEscape(e.path)}}` : "—";
  return `${i + 1} & \\textbf{${texEscape(id)}} & ${texEscape(name)} & ${texEscape(kind)} & ${path} \\\\`;
});

const tex = `\\documentclass[10pt,a4paper,landscape]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{lmodern}
\\usepackage[margin=1.5cm]{geometry}
\\usepackage{booktabs}
\\usepackage{longtable}
\\usepackage{array}
\\usepackage{xcolor}
\\usepackage{hyperref}
\\usepackage{fancyhdr}

\\definecolor{voidgreen}{HTML}{B6FF3A}
\\hypersetup{colorlinks=true,linkcolor=voidgreen,urlcolor=voidgreen}

\\pagestyle{fancy}
\\fancyhf{}
\\fancyhead[L]{\\small ET-COSMIC --- Master SKU List}
\\fancyhead[R]{\\small MontêLauro Foundation · ${sortedIds.length} SKUs}
\\fancyfoot[C]{\\small \\thepage}

\\title{\\textbf{ET-COSMIC B2B}\\\\Master SKU List (${sortedIds.length} IDs)}
\\author{Gerado de \\texttt{src/b2b/masterSkuList.json}}
\\date{${new Date().toISOString().slice(0, 10)}}

\\begin{document}
\\maketitle
\\thispagestyle{empty}
\\vspace{0.5cm}

\\noindent
Catálogo canónico de identificadores \\texttt{VOID-XX} para builds white-label (\\texttt{VITE\\_B2B\\_SKUS}).
Metadados de nome/tipo/rota: \\texttt{skuCatalog.generated.ts}.\\\\
Licença dupla: GPL-3.0-or-later + comercial opcional. Taxa de protocolo transparente na UI.

\\vspace{0.5cm}
\\begin{longtable}{@{}rl p{4.2cm} p{1.4cm} p{3.8cm}@{}}
\\toprule
\\# & SKU & Nome comercial & Tipo & Rota UI \\\\
\\midrule
\\endhead
${rows.join("\n")}
\\bottomrule
\\end{longtable}

\\vfill
\\begin{center}
\\small\\textcolor{gray}{ET-COSMIC · MontêLauro Foundation · ${sortedIds.length} SKUs · catálogo sincronizado com skuCatalog.generated.ts}
\\end{center}
\\end{document}
`;

const docsDir = join(root, "docs");
mkdirSync(docsDir, { recursive: true });
const texPath = join(docsDir, "master-sku-list.tex");
writeFileSync(texPath, tex);
console.log(`✓ ${texPath} (${ids.length} linhas)`);

function compile() {
  if (process.env.SKIP_PDF_COMPILE === "1") {
    console.log("(SKIP_PDF_COMPILE=1 — só .tex gerado)");
    return true;
  }
  const cwd = docsDir;
  const base = "master-sku-list";
  if (spawnSync("which", ["tectonic"], { encoding: "utf8" }).stdout.trim()) {
    const r = spawnSync("tectonic", [`${base}.tex`], { cwd, stdio: "inherit" });
    return r.status === 0;
  }
  if (spawnSync("which", ["pdflatex"], { encoding: "utf8" }).stdout.trim()) {
    spawnSync("pdflatex", ["-interaction=nonstopmode", `${base}.tex`], { cwd, stdio: "inherit" });
    spawnSync("pdflatex", ["-interaction=nonstopmode", `${base}.tex`], { cwd, stdio: "inherit" });
    return existsSync(join(docsDir, `${base}.pdf`));
  }
  console.error("Instale tectonic ou pdflatex para gerar o PDF.");
  return false;
}

if (compile()) {
  const pdf = join(docsDir, "master-sku-list.pdf");
  const pub = join(root, "public");
  if (existsSync(pub)) {
    copyFileSync(pdf, join(pub, "master-sku-list.pdf"));
    console.log("✓ public/master-sku-list.pdf");
  }
  console.log(`✓ ${pdf}`);
} else {
  process.exit(1);
}
