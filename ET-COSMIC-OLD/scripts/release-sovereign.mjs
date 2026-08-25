#!/usr/bin/env node
/**
 * Release v2.0.0-sovereign — pré-voo + build + instruções de tag.
 * Uso: npm run release:sovereign
 * Tag git (após commit): git tag -a v2.0.0-sovereign -m "VOID-QRC Alpha Industrial · stack soberana"
 */
import { spawnSync } from "node:child_process";

function run(label, cmd, args) {
  console.log(`\n▸ ${label}`);
  const r = spawnSync(cmd, args, { stdio: "inherit", cwd: process.cwd() });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

console.log("\n🚀 Release soberana v2.0.0\n");

run("validate", "npm", ["run", "validate"]);
run("core:test", "npm", ["run", "core:test"]);
run("license:preflight", "npm", ["run", "license:preflight"]);
run("build:sovereign", "npm", ["run", "build:sovereign"]);

const tag = "v2.0.0-sovereign";
const tagged = spawnSync("git", ["tag", "-l", tag], { encoding: "utf8" }).stdout.trim();
if (!tagged) {
  const t = spawnSync(
    "git",
    ["tag", "-a", tag, "-m", "VOID-QRC Alpha Industrial — stack soberana SOV/Lightning/PQC"],
    { stdio: "inherit" },
  );
  if (t.status === 0) console.log(`\n✓ Tag git criada: ${tag}`);
  else console.log(`\n○ Tag ${tag} — criar manualmente após commit`);
} else {
  console.log(`\n✓ Tag ${tag} já existe`);
}

console.log("\n✅ Release soberana pronta (dist/)");
console.log(`   Push tag: git push origin ${tag}\n`);
