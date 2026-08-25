#!/usr/bin/env node
/**
 * Build a specific ET-COSMIC product by its ID.
 * Usage: node scripts/build-product.mjs <product-id>
 *
 * Example:
 *   node scripts/build-product.mjs lusus-engine
 *   node scripts/build-product.mjs core-sdk
 *   node scripts/build-product.mjs full-enterprise
 */

import { execSync } from "node:child_process";

const PRODUCT_SKUS = {
  "core-sdk": ["VOID-00", "VOID-01", "VOID-0A", "VOID-0D", "VOID-20", "VOID-21"],
  "lusus-engine": ["VOID-80", "VOID-00", "VOID-01", "VOID-0A", "VOID-0D", "VOID-20", "VOID-21"],
  "aqre-engine": ["VOID-74", "VOID-70", "VOID-71", "VOID-72", "VOID-73", "VOID-80", "VOID-76", "VOID-77", "VOID-78", "VOID-79", "VOID-00", "VOID-01", "VOID-0A", "VOID-0D", "VOID-20", "VOID-21"],
  "sovereign-economy": ["VOID-710", "VOID-520", "VOID-703", "VOID-704", "VOID-705", "VOID-00", "VOID-01", "VOID-0A", "VOID-0D", "VOID-20", "VOID-21"],
  "void-stack": ["VOID-700", "VOID-701", "VOID-702", "VOID-511", "VOID-512", "VOID-721", "VOID-00", "VOID-01", "VOID-0A", "VOID-0D", "VOID-20", "VOID-21"],
  "imc-isossupra": ["VOID-600", "VOID-510", "VOID-513", "VOID-514", "VOID-515", "VOID-516", "VOID-517", "VOID-518", "VOID-519", "VOID-521", "VOID-522", "VOID-80", "VOID-76", "VOID-77", "VOID-78", "VOID-79", "VOID-00", "VOID-01", "VOID-0A", "VOID-0D", "VOID-20", "VOID-21"],
  "pqc-service": ["VOID-22", "VOID-23", "VOID-00", "VOID-01", "VOID-0A", "VOID-0D", "VOID-20", "VOID-21"],
  "lightning-payment": ["VOID-37", "VOID-05", "VOID-06", "VOID-113", "VOID-00", "VOID-01", "VOID-0A", "VOID-0D", "VOID-20", "VOID-21"],
  "qrc-lab": ["VOID-54", "VOID-57", "VOID-58", "VOID-59", "VOID-60", "VOID-61", "VOID-09", "VOID-80", "VOID-76", "VOID-77", "VOID-78", "VOID-79", "VOID-00", "VOID-01", "VOID-0A", "VOID-0D", "VOID-20", "VOID-21"],
  "pmu-governance": ["VOID-90", "VOID-91", "VOID-92", "VOID-93", "VOID-94", "VOID-95", "VOID-96", "VOID-97", "VOID-103", "VOID-00", "VOID-01", "VOID-0A", "VOID-0D", "VOID-20", "VOID-21"],
};

const ALL_PRODUCT_IDS = Object.keys(PRODUCT_SKUS);

const productId = process.argv[2];

if (!productId || productId === "--help" || productId === "-h") {
  console.log(`
ET-COSMIC Product Builder

Usage: node scripts/build-product.mjs <product-id>

Available products:
${ALL_PRODUCT_IDS.map((id) => `  - ${id}`).join("\n")}

Example:
  node scripts/build-product.mjs lusus-engine
`);
  process.exit(productId ? 0 : 1);
}

if (productId === "full-enterprise") {
  console.log("[build-product] full-enterprise → building all routes (no SKU filter)");
  execSync("npx vite build", { stdio: "inherit" });
  process.exit(0);
}

const skus = PRODUCT_SKUS[productId];
if (!skus) {
  console.error(`[build-product] Unknown product: ${productId}`);
  console.error(`Available: ${ALL_PRODUCT_IDS.join(", ")}`);
  process.exit(1);
}

console.log(`[build-product] Building product: ${productId}`);
console.log(`[build-product] SKUs (${skus.length}): ${skus.join(", ")}`);

const skuEnv = JSON.stringify(skus.join(","));

execSync(`npx vite build`, {
  stdio: "inherit",
  env: {
    ...process.env,
    VITE_B2B_SKUS: skuEnv,
  },
});

console.log(`[build-product] Build complete for ${productId}`);
