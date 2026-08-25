#!/usr/bin/env node
/**
 * Pré-voo VOID-00 license.rs — WASM + modo comunidade vs enforce.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";

let pass = 0;
let fail = 0;

function ok(label, detail = "") {
  pass++;
  console.log(`  ✓ ${label}${detail ? `: ${detail}` : ""}`);
}
function bad(label, detail = "") {
  fail++;
  console.log(`  ✗ ${label}${detail ? `: ${detail}` : ""}`);
}

console.log("\n🔐 VOID-00 license preflight\n");

const wasmPkg = join(process.cwd(), "void_core/pkg");
if (existsSync(wasmPkg)) {
  ok("void_core/pkg", "WASM presente");
} else {
  console.log("  ○ void_core/pkg ausente — build: cd void_core && wasm-pack build --target web");
}

const enforced = process.env.VITE_VOID_LICENSE_ENFORCE === "true";
if (enforced) {
  const hasToken = Boolean(
    process.env.VITE_VOID_LICENSE_VENDOR_PK &&
      process.env.VITE_VOID_LICENSE_PAYLOAD_HEX &&
      process.env.VITE_VOID_LICENSE_SIGNATURE_HEX,
  );
  if (hasToken) ok("enforce mode", "token VITE_VOID_LICENSE_* configurado");
  else bad("enforce mode", "VITE_VOID_LICENSE_ENFORCE=true sem token");
} else {
  ok("community mode", "VITE_VOID_LICENSE_ENFORCE≠true (GhostID livre)");
}

try {
  const { spawnSync } = await import("node:child_process");
  const r = spawnSync(
    "cargo",
    ["test", "-p", "void_core", "license", "--", "--nocapture"],
    { cwd: join(process.cwd(), "void_core"), encoding: "utf8", timeout: 120_000 },
  );
  if (r.status === 0) ok("cargo test license", "void_core");
  else if (r.error?.code === "ENOENT") {
    console.log("  ○ cargo offline — skip Rust license tests");
  } else {
    bad("cargo test license", (r.stderr || r.stdout || "").slice(0, 120));
  }
} catch (e) {
  console.log(`  ○ cargo skip: ${e.message ?? e}`);
}

console.log(`\n${fail === 0 ? "✅" : "⚠️"} ${pass}/${pass + fail} checks\n`);
process.exit(fail > 0 ? 1 : 0);
