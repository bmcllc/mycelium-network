#!/usr/bin/env node
/**
 * Preflight Isossupramulação — VOID-500–600 (local, sem servidor HTTP).
 */
import { coreStatus, runEngine } from "../server/isossupra/core.js";

const checks = [];

function ok(name, detail) {
  checks.push({ name, ok: true, detail });
  console.log(`  ✓ ${name}: ${detail}`);
}

function fail(name, err) {
  checks.push({ name, ok: false, detail: String(err) });
  console.error(`  ✗ ${name}: ${err}`);
}

console.log("\n⚡ Isossupramulação preflight (VOID-500–600)\n");

try {
  const st = coreStatus();
  ok("VOID-600 status", `${st.engines.length} motores`);
} catch (e) {
  fail("VOID-600 status", e);
}

for (const [id, label] of [
  ["ising", "VOID-500"],
  ["thermal-qrng", "VOID-501"],
  ["acoustic", "VOID-502"],
  ["thomas-fermi", "VOID-503"],
  ["chaos-bell", "VOID-504"],
  ["vortex", "VOID-505"],
  ["homotopy", "VOID-506"],
]) {
  try {
    const body =
      id === "ising"
        ? { n: 8 }
        : id === "thomas-fermi"
          ? { molecule: "H2" }
          : id === "vortex"
            ? {}
            : id === "homotopy"
              ? { programId: "preflight" }
              : id === "thermal-qrng"
                ? { bits: 128 }
                : id === "acoustic"
                  ? { room: "preflight" }
                  : { seed: 42 };
    const r = runEngine(id, body);
    if (r.error) fail(label, r.error);
    else ok(label, r.engine ?? id);
  } catch (e) {
    fail(label, e);
  }
}

const bad = checks.filter((c) => !c.ok);
console.log(`\n${bad.length ? "❌" : "✅"} ${checks.length - bad.length}/${checks.length} OK\n`);
process.exit(bad.length ? 1 : 0);
