#!/usr/bin/env npx tsx
/**
 * Estimativa de receita B2B + taxa de protocolo (licença dupla ET-COSMIC).
 */
import {
  BUNDLE_LIST_EUR_YEAR,
  PANEL_LIST_EUR_YEAR,
  INFRA_LIST_EUR_YEAR,
  SERVICE_LIST_EUR_ONCE,
  TIER_MULTIPLIER,
  estimateProtocolFeeEurYear,
  estimateSetupFeeEur,
  PROTOCOL_MINIMUM_EUR_YEAR,
  SETUP_FEE_PCT_ACV,
  type PricingTier,
} from "../src/b2b/commercialPricing.ts";
import { resolveSkuIds, ROUTE_PRIMARY_SKU } from "../src/b2b/skuManifest.ts";

const args = process.argv.slice(2);
const skuArg = args.find((a) => !a.startsWith("--")) ?? "SOVEREIGN-CITIZEN";
const volumeEur = Number(args.find((a) => a.startsWith("--volume-eur="))?.split("=")[1] ?? 0);
const bps = Number(args.find((a) => a.startsWith("--bps="))?.split("=")[1] ?? 10);
const tier = (args.find((a) => a.startsWith("--tier="))?.split("=")[1] ?? "enterprise") as PricingTier;
const nodes = Number(args.find((a) => a.startsWith("--nodes="))?.split("=")[1] ?? 0);

const mult = TIER_MULTIPLIER[tier] ?? 1;
const skus = [...resolveSkuIds(skuArg)];

let licenseEur = 0;
let setupOnceEur = 0;
const lines: string[] = [];

if (BUNDLE_LIST_EUR_YEAR[skuArg]) {
  licenseEur = BUNDLE_LIST_EUR_YEAR[skuArg];
  lines.push(`Bundle ${skuArg}: €${licenseEur.toLocaleString("pt-PT")}/ano (lista)`);
} else {
  const panelPaths = new Set<string>();
  for (const id of skus) {
    if (BUNDLE_LIST_EUR_YEAR[id]) {
      licenseEur += BUNDLE_LIST_EUR_YEAR[id];
      lines.push(`  + bundle ${id}: €${BUNDLE_LIST_EUR_YEAR[id].toLocaleString("pt-PT")}`);
    } else if (INFRA_LIST_EUR_YEAR[id]) {
      const n = nodes || 1;
      const v = INFRA_LIST_EUR_YEAR[id] * n;
      licenseEur += v;
      lines.push(`  + infra ${id} ×${n}: €${v.toLocaleString("pt-PT")}`);
    } else if (SERVICE_LIST_EUR_ONCE[id]) {
      setupOnceEur += SERVICE_LIST_EUR_ONCE[id];
      lines.push(`  + serviço ${id} (one-shot): €${SERVICE_LIST_EUR_ONCE[id].toLocaleString("pt-PT")}`);
    }
  }
  for (const [path, price] of Object.entries(PANEL_LIST_EUR_YEAR)) {
    const sku = ROUTE_PRIMARY_SKU[path];
    if (sku && skus.includes(sku) && !panelPaths.has(path)) {
      panelPaths.add(path);
      licenseEur += price;
      lines.push(`  + painel ${path}: €${price.toLocaleString("pt-PT")}`);
    }
  }
  if (licenseEur === 0) {
    licenseEur = 48_000 * Math.min(skus.length, 12);
    lines.push(`  (heurística ${skus.length} SKUs: €${licenseEur.toLocaleString("pt-PT")})`);
  }
}

licenseEur = Math.round(licenseEur * mult);
const protocolEur = volumeEur > 0 ? estimateProtocolFeeEurYear(volumeEur, bps) : 0;
const setupEur = estimateSetupFeeEur(licenseEur) + setupOnceEur;
const year1 = licenseEur + protocolEur + setupEur;
const year2plus = licenseEur + protocolEur;

console.log("\n═══ ETΞRNET — Estimativa de receita (licença dupla) ═══\n");
console.log(`SKU(s): ${skuArg} → ${skus.length} IDs expandidos`);
console.log(`Tier: ${tier} (×${mult})`);
console.log("");
for (const l of lines) console.log(l);
console.log("");
console.log(`Licença anual (ajustada):     €${licenseEur.toLocaleString("pt-PT")}`);
if (volumeEur > 0) {
  console.log(`Volume transacções/ano:     €${volumeEur.toLocaleString("pt-PT")}`);
  console.log(
    `Taxa protocolo (${bps} bps):  €${protocolEur.toLocaleString("pt-PT")}/ano (mín. €${PROTOCOL_MINIMUM_EUR_YEAR.toLocaleString("pt-PT")})`,
  );
} else {
  console.log("Taxa protocolo:             (use --volume-eur= para simular)");
}
console.log(`Setup ${Math.round(SETUP_FEE_PCT_ACV * 100)}% ACV + serviços:  €${setupEur.toLocaleString("pt-PT")}`);
console.log("────────────────────────────────────────");
console.log(`Total ano 1:                €${year1.toLocaleString("pt-PT")}`);
console.log(`Recorrente ano 2+:          €${year2plus.toLocaleString("pt-PT")}/ano`);
console.log("");
console.log("Base legal: GPL-3.0 + COMMERCIAL-LICENSE + protocolRoyalty.ts");
console.log("Código aberto; receita = licença + serviços + taxa transparente.\n");
