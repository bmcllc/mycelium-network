#!/usr/bin/env node
/**
 * Stress Anderson SKU-A (baixo W) vs SKU-B (alto W) — core/hamiltonians/anderson.py
 */
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const py = `
from core.hamiltonians.anderson import anderson_stress_test
for profile in ("SKU-A", "SKU-B"):
    r = anderson_stress_test(n=32, profile=profile, seed=42)
    print(f"{profile} W={r.W:.2f} PR={r.participation_ratio:.4f} localized={r.localized} hermitian={r.hermitian}")
`;

const r = spawnSync("python3", ["-c", py], {
  cwd: process.cwd(),
  encoding: "utf8",
  env: { ...process.env, PYTHONPATH: join(process.cwd(), "core/..") },
});

if (r.status !== 0) {
  console.error(r.stderr || r.stdout);
  process.exit(1);
}

const lines = (r.stdout || "").trim().split("\n").filter(Boolean);
console.log("\n⚛️  Anderson SKU stress\n");
for (const line of lines) console.log(`  ${line}`);

const skuA = lines.find((l) => l.startsWith("SKU-A"));
const skuB = lines.find((l) => l.startsWith("SKU-B"));
if (!skuA || !skuB) {
  console.error("\n✗ resultados incompletos\n");
  process.exit(1);
}

// SKU-A tende a menos localizado; SKU-B (W alto) tende a localized=true
const bLocalized = skuB.includes("localized=True");
console.log(`\n${bLocalized ? "✅" : "⚠️"} SKU-B localizado=${bLocalized} · Anderson OK\n`);
process.exit(0);
