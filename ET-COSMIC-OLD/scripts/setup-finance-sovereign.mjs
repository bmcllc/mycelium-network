#!/usr/bin/env node
/**
 * Configura LND + NWC para soberania financeira:
 * 1. Garante .env.sovereign (copia do example)
 * 2. Extrai admin macaroon do container lnd (se online)
 * 3. Sincroniza LND_* e VITE_LND_* no .env.sovereign
 * 4. Copia NWC_SECRET → VITE_NWC_SECRET quando aplicável
 */
import { execSync, spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ENV_SOVEREIGN,
  ROOT,
  ensureEnvSovereign,
  parseEnv,
  readEnvText,
  upsertEnvKeys,
} from "./lib/env-sovereign.mjs";

const SCRIPTS = dirname(fileURLToPath(import.meta.url));

const LND_REST_DEFAULT = "https://127.0.0.1:8180";

function log(msg) {
  console.log(`[finance:setup] ${msg}`);
}

function dockerRunning(name) {
  try {
    const out = execSync(`docker ps --format '{{.Names}}'`, { encoding: "utf8" });
    return out.split("\n").some((n) => n.trim() === name);
  } catch {
    return false;
  }
}

function fetchMacaroonFromDocker(network = "regtest") {
  const path = `/root/.lnd/data/chain/bitcoin/${network}/admin.macaroon`;
  try {
    return execSync(
      `docker exec lnd xxd -p -c 256 ${path} 2>/dev/null | tr -d '\\n'`,
      { encoding: "utf8" },
    ).trim();
  } catch {
    return "";
  }
}

async function probeLnd(restUrl, macaroonHex, tlsSkip) {
  if (!restUrl || !macaroonHex) return null;
  const prev = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  if (tlsSkip) process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  try {
    const res = await fetch(`${restUrl.replace(/\/$/, "")}/v1/getinfo`, {
      headers: { "Grpc-Metadata-Macaroon": macaroonHex },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { ok: false, status: res.status };
    const info = await res.json();
    return { ok: true, alias: info.alias, pubkey: info.identity_pubkey?.slice(0, 16) };
  } catch (e) {
    return { ok: false, error: String(e.message ?? e) };
  } finally {
    if (tlsSkip) {
      if (prev === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
      else process.env.NODE_TLS_REJECT_UNAUTHORIZED = prev;
    }
  }
}

async function main() {
  const created = ensureEnvSovereign();
  if (created) log("Criado .env.sovereign a partir do example");

  const env = parseEnv(readEnvText());
  const network = env.BITCOIN_NETWORK || env.VITE_BITCOIN_NETWORK || "regtest";
  const restUrl = env.LND_REST_URL || env.VITE_LND_REST_URL || LND_REST_DEFAULT;
  const tlsSkip = (env.LND_TLS_SKIP ?? "true") !== "false";

  let macaroon = (env.LND_MACAROON_HEX || env.VITE_LND_MACAROON_HEX || "").trim();

  if (dockerRunning("lnd")) {
    log("Container lnd online — a extrair macaroon…");
    const fromDocker = fetchMacaroonFromDocker(network);
    if (fromDocker.length > 20) {
      macaroon = fromDocker;
      log(`Macaroon obtido (${macaroon.length} chars hex)`);
    } else {
      log("Macaroon indisponível — wallet LND ainda não criada? npm run lnd:create");
    }
  } else {
    log("Container lnd offline — npm run stack:up && npm run lnd:create");
  }

  const updates = {
    LND_REST_URL: restUrl,
    VITE_LND_REST_URL: restUrl,
    LND_TLS_SKIP: tlsSkip ? "true" : "false",
  };
  if (macaroon) {
    updates.LND_MACAROON_HEX = macaroon;
    updates.VITE_LND_MACAROON_HEX = macaroon;
  }
  upsertEnvKeys(ENV_SOVEREIGN, updates);

  const nwc = env.NWC_SECRET || env.NWC_INTEROP_URI || "";
  if (nwc.startsWith("nostr+walletconnect://")) {
    const r = spawnSync("node", [join(SCRIPTS, "sync-nwc-to-vite.mjs")], {
      cwd: ROOT,
      stdio: "inherit",
    });
    if (r.status !== 0) log("sync NWC falhou — verifique NWC_SECRET");
    else log("VITE_NWC_SECRET sincronizado");
  } else {
    log("NWC ausente — RTL http://localhost:8085 → Settings → NWC → colar URI em NWC_SECRET");
  }

  const fresh = parseEnv(readEnvText());
  if (fresh.LND_MACAROON_HEX) {
    const probe = await probeLnd(restUrl, fresh.LND_MACAROON_HEX, tlsSkip);
    if (probe?.ok) {
      log(`LND REST OK — alias=${probe.alias ?? "?"} pubkey=${probe.pubkey ?? "?"}…`);
    } else {
      log(`LND REST inacessível${probe?.error ? `: ${probe.error}` : probe?.status ? `: HTTP ${probe.status}` : ""}`);
    }
  }

  console.log("\nPróximos passos:");
  console.log("  npm run stack:up          # bitcoind + lnd + rtl + nostr-relay");
  console.log("  npm run lnd:create        # se wallet LND ainda não existir");
  console.log("  npm run finance:setup     # re-extrair macaroon após create");
  console.log("  npm run server:sovereign  # API com LND real");
  console.log("  npm run dev               # Vite mode sovereign → /finance/payment");
  console.log("  npm run finance:preflight # validar SOV + LND + NWC\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
