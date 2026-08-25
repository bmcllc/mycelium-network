/** Gerado por scripts/generate-sku-catalog.mjs — não editar à mão. */
import type { SkuKind } from "./skuTypes";

export interface SkuCatalogEntry {
  id: string;
  name: string;
  kind: SkuKind;
  path?: string;
  legacyPath?: string;
}

export const SKU_CATALOG: readonly SkuCatalogEntry[] = [
  {
    "id": "VOID-00",
    "name": "Core WASM",
    "kind": "infra"
  },
  {
    "id": "VOID-01",
    "name": "TypeScript SDK",
    "kind": "infra"
  },
  {
    "id": "VOID-02",
    "name": "void-runner",
    "kind": "infra"
  },
  {
    "id": "VOID-03",
    "name": "IMC Bridge (legado CQR)",
    "kind": "infra"
  },
  {
    "id": "VOID-04",
    "name": "Express Gateway",
    "kind": "infra"
  },
  {
    "id": "VOID-05",
    "name": "Sovereign Stack",
    "kind": "infra"
  },
  {
    "id": "VOID-06",
    "name": "Anchor Contracts",
    "kind": "infra"
  },
  {
    "id": "VOID-07",
    "name": "Android Shell",
    "kind": "infra"
  },
  {
    "id": "VOID-08",
    "name": "PWA Sovereign",
    "kind": "infra"
  },
  {
    "id": "VOID-09",
    "name": "Arquivo R&D Teoria",
    "kind": "infra"
  },
  {
    "id": "VOID-0A",
    "name": "pi_worker WASM",
    "kind": "infra"
  },
  {
    "id": "VOID-0B",
    "name": "RE-trolab Bridge",
    "kind": "infra"
  },
  {
    "id": "VOID-0C",
    "name": "Specs & Whitepaper Pack",
    "kind": "infra"
  },
  {
    "id": "VOID-0D",
    "name": "Rust Workspace",
    "kind": "infra"
  },
  {
    "id": "VOID-0E",
    "name": "Production Docker Image",
    "kind": "infra"
  },
  {
    "id": "VOID-0F",
    "name": "Nginx Sovereign Proxy",
    "kind": "infra"
  },
  {
    "id": "VOID-10",
    "name": "Dashboard Hub",
    "kind": "route",
    "path": "/dashboard"
  },
  {
    "id": "VOID-11",
    "name": "VOID Messenger",
    "kind": "route",
    "path": "/messenger"
  },
  {
    "id": "VOID-12",
    "name": "Phantom Harvester",
    "kind": "route",
    "path": "/harvester"
  },
  {
    "id": "VOID-13",
    "name": "Landing & Marketing Shell",
    "kind": "infra"
  },
  {
    "id": "VOID-14",
    "name": "Onboarding Flow",
    "kind": "infra"
  },
  {
    "id": "VOID-15",
    "name": "GhostID Setup Widget",
    "kind": "infra"
  },
  {
    "id": "VOID-16",
    "name": "Dev Setup Banner",
    "kind": "infra"
  },
  {
    "id": "VOID-17",
    "name": "Panel Tier Badges",
    "kind": "infra"
  },
  {
    "id": "VOID-18",
    "name": "Network Simulation Core",
    "kind": "infra"
  },
  {
    "id": "VOID-20",
    "name": "ZKP Studio",
    "kind": "route",
    "path": "/crypto/zkp"
  },
  {
    "id": "VOID-21",
    "name": "GhostID & VPN",
    "kind": "route",
    "path": "/crypto/ghostid"
  },
  {
    "id": "VOID-22",
    "name": "PQC Enterprise",
    "kind": "route",
    "path": "/crypto/pqc"
  },
  {
    "id": "VOID-23",
    "name": "CQR→PQC Bridge",
    "kind": "route",
    "path": "/crypto/cqr-pqc"
  },
  {
    "id": "VOID-24",
    "name": "Crypto Testament",
    "kind": "route",
    "path": "/crypto/testament"
  },
  {
    "id": "VOID-25",
    "name": "Karma Wallet",
    "kind": "route",
    "path": "/crypto/karma"
  },
  {
    "id": "VOID-26",
    "name": "Trust Bundle",
    "kind": "bundle"
  },
  {
    "id": "VOID-30",
    "name": "DEX Order Book",
    "kind": "route",
    "path": "/finance/dex"
  },
  {
    "id": "VOID-31",
    "name": "Chimera Dark Pool",
    "kind": "route",
    "path": "/finance/chimera"
  },
  {
    "id": "VOID-32",
    "name": "Nostr DEX",
    "kind": "route",
    "path": "/finance/nostr-dex"
  },
  {
    "id": "VOID-33",
    "name": "Stablecoin Engine",
    "kind": "route",
    "path": "/finance/stablecoin"
  },
  {
    "id": "VOID-34",
    "name": "RWA Tokenization",
    "kind": "route",
    "path": "/finance/rwa"
  },
  {
    "id": "VOID-35",
    "name": "Sovereign Pools",
    "kind": "route",
    "path": "/finance/pools"
  },
  {
    "id": "VOID-36",
    "name": "Janus Finance",
    "kind": "route",
    "path": "/finance/janus"
  },
  {
    "id": "VOID-37",
    "name": "Payment Gateway",
    "kind": "route",
    "path": "/finance/payment"
  },
  {
    "id": "VOID-38",
    "name": "Collapse Finance",
    "kind": "route",
    "path": "/finance/collapse"
  },
  {
    "id": "VOID-39",
    "name": "Finance Full Stack",
    "kind": "bundle"
  },
  {
    "id": "VOID-40",
    "name": "Distance Bridge",
    "kind": "route",
    "path": "/network/distance"
  },
  {
    "id": "VOID-41",
    "name": "Parasitic Architecture",
    "kind": "route",
    "path": "/network/parasitic"
  },
  {
    "id": "VOID-42",
    "name": "EcoNet",
    "kind": "route",
    "path": "/network/echonet"
  },
  {
    "id": "VOID-43",
    "name": "Nostr Sync Mesh",
    "kind": "route",
    "path": "/network/mesh"
  },
  {
    "id": "VOID-44",
    "name": "Acoustic Handshake",
    "kind": "route",
    "path": "/network/acoustic"
  },
  {
    "id": "VOID-45",
    "name": "Supply Chain Security",
    "kind": "route",
    "path": "/network/supply-chain"
  },
  {
    "id": "VOID-46",
    "name": "Network Edge Bundle",
    "kind": "bundle"
  },
  {
    "id": "VOID-50",
    "name": "Mirage Enclaves",
    "kind": "route",
    "path": "/compute/mirage"
  },
  {
    "id": "VOID-51",
    "name": "HGPU Visualizer",
    "kind": "route",
    "path": "/compute/hgpu"
  },
  {
    "id": "VOID-52",
    "name": "vHGPU Farm",
    "kind": "route",
    "path": "/compute/vhgpu"
  },
  {
    "id": "VOID-53",
    "name": "PMU vHGPU Cores",
    "kind": "route",
    "path": "/compute/pmu-vhgpu"
  },
  {
    "id": "VOID-54",
    "name": "Bruno Theory Engine",
    "kind": "route",
    "path": "/compute/bruno-theory"
  },
  {
    "id": "VOID-55",
    "name": "PMU Truth Ω",
    "kind": "route",
    "path": "/compute/pmu-truth"
  },
  {
    "id": "VOID-56",
    "name": "PMU Roadmap & Anchor",
    "kind": "route",
    "path": "/compute/pmu-roadmap"
  },
  {
    "id": "VOID-57",
    "name": "Cosmic Harmonia",
    "kind": "route",
    "path": "/compute/cosmic-harmony"
  },
  {
    "id": "VOID-58",
    "name": "PMU Truth Omega",
    "kind": "route",
    "path": "/compute/pmu-truth"
  },
  {
    "id": "VOID-59",
    "name": "PMU Roadmap",
    "kind": "route",
    "path": "/compute/pmu-roadmap"
  },
  {
    "id": "VOID-60",
    "name": "Omega Layer",
    "kind": "route",
    "path": "/compute/omega"
  },
  {
    "id": "VOID-61",
    "name": "HGPU Compute",
    "kind": "route",
    "path": "/compute/hgpu-compute"
  },
  {
    "id": "VOID-62",
    "name": "Compute Appliance",
    "kind": "bundle"
  },
  {
    "id": "VOID-70",
    "name": "LSC Engine",
    "kind": "route",
    "path": "/lab/lsc",
    "legacyPath": "/quantum/lsc"
  },
  {
    "id": "VOID-71",
    "name": "QRC Topology",
    "kind": "route",
    "path": "/lab/qrc-topology",
    "legacyPath": "/quantum/qrc"
  },
  {
    "id": "VOID-72",
    "name": "Paleo Engine",
    "kind": "route",
    "path": "/lab/paleo",
    "legacyPath": "/quantum/paleo"
  },
  {
    "id": "VOID-73",
    "name": "Collapse Algebra",
    "kind": "route",
    "path": "/lab/collapse-algebra",
    "legacyPath": "/quantum/collapse"
  },
  {
    "id": "VOID-74",
    "name": "Anacroclastia Lab",
    "kind": "route",
    "path": "/lab/anacroclastia",
    "legacyPath": "/quantum/anacroclastia"
  },
  {
    "id": "VOID-75",
    "name": "Nostr Oracle",
    "kind": "route",
    "path": "/network/nostr-oracle",
    "legacyPath": "/quantum/oracle"
  },
  {
    "id": "VOID-76",
    "name": "EaaS Precursor",
    "kind": "route",
    "path": "/lab/eaas",
    "legacyPath": "/quantum/qrng"
  },
  {
    "id": "VOID-77",
    "name": "QR Stocks",
    "kind": "route",
    "path": "/finance/rwa",
    "legacyPath": "/quantum/qrstocks"
  },
  {
    "id": "VOID-78",
    "name": "Anacroclastia",
    "kind": "route",
    "path": "/lab/anacroclastia",
    "legacyPath": "/quantum/heptary"
  },
  {
    "id": "VOID-79",
    "name": "AQRE Monitor",
    "kind": "route",
    "path": "/lab/aqre-limits",
    "legacyPath": "/quantum/aqre"
  },
  {
    "id": "VOID-80",
    "name": "LUSUS Terminal",
    "kind": "route",
    "path": "/lab/lusus",
    "legacyPath": "/quantum/lusus"
  },
  {
    "id": "VOID-81",
    "name": "CQR Entropy Gateway",
    "kind": "bundle"
  },
  {
    "id": "VOID-90",
    "name": "Lab DAO",
    "kind": "route",
    "path": "/governance/dao"
  },
  {
    "id": "VOID-91",
    "name": "Anti-Sybil Lab",
    "kind": "route",
    "path": "/governance/anti-sybil"
  },
  {
    "id": "VOID-92",
    "name": "Double-Spend Defense",
    "kind": "route",
    "path": "/governance/double-spend"
  },
  {
    "id": "VOID-93",
    "name": "Temporal Oracle",
    "kind": "route",
    "path": "/governance/temporal"
  },
  {
    "id": "VOID-94",
    "name": "Social Recovery",
    "kind": "route",
    "path": "/governance/social-recovery"
  },
  {
    "id": "VOID-95",
    "name": "Consent & AMP (CGF)",
    "kind": "route",
    "path": "/governance/consent"
  },
  {
    "id": "VOID-96",
    "name": "Sovereignty & Royalties",
    "kind": "route",
    "path": "/governance/sovereignty"
  },
  {
    "id": "VOID-97",
    "name": "Governance Suite",
    "kind": "bundle"
  },
  {
    "id": "VOID-100",
    "name": "Phantom Shopper",
    "kind": "route",
    "path": "/vault/phopper",
    "legacyPath": "/defi/phopper"
  },
  {
    "id": "VOID-101",
    "name": "Aegis Vault",
    "kind": "route",
    "path": "/vault/aegis",
    "legacyPath": "/defi/aegis"
  },
  {
    "id": "VOID-102",
    "name": "Paleo Yield",
    "kind": "route",
    "path": "/vault/yield",
    "legacyPath": "/defi/yield"
  },
  {
    "id": "VOID-103",
    "name": "Ghost Locker",
    "kind": "route",
    "path": "/vault/ghost-locker",
    "legacyPath": "/defi/ghost-locker"
  },
  {
    "id": "VOID-104",
    "name": "PoW Faucet",
    "kind": "route",
    "path": "/vault/faucet",
    "legacyPath": "/defi/faucet"
  },
  {
    "id": "VOID-110",
    "name": "Active Terminal",
    "kind": "route",
    "path": "/terminal/active"
  },
  {
    "id": "VOID-111",
    "name": "Symbiont Inoculator",
    "kind": "route",
    "path": "/terminal/symbiont"
  },
  {
    "id": "VOID-112",
    "name": "Lua Plugin Runtime",
    "kind": "route",
    "path": "/terminal/lua"
  },
  {
    "id": "VOID-113",
    "name": "Watchtower",
    "kind": "route",
    "path": "/terminal/watchtower"
  },
  {
    "id": "VOID-114",
    "name": "Sphinx Mixnet",
    "kind": "route",
    "path": "/terminal/sphinx"
  },
  {
    "id": "VOID-115",
    "name": "Differential Core",
    "kind": "route",
    "path": "/terminal/differential"
  },
  {
    "id": "VOID-116",
    "name": "Compute Marketplace",
    "kind": "route",
    "path": "/terminal/marketplace",
    "legacyPath": "/terminal/mining"
  },
  {
    "id": "VOID-117",
    "name": "GPU Mining",
    "kind": "route",
    "path": "/terminal/gpu-mining"
  },
  {
    "id": "VOID-118",
    "name": "Homotopy Mining",
    "kind": "route",
    "path": "/terminal/homotopy"
  },
  {
    "id": "VOID-119",
    "name": "Ghost Mailbox",
    "kind": "route",
    "path": "/terminal/ghost-mailbox"
  },
  {
    "id": "VOID-120",
    "name": "PoW Mining (legado)",
    "kind": "route",
    "path": "/terminal/octree"
  },
  {
    "id": "VOID-121",
    "name": "Social Fabric",
    "kind": "route",
    "path": "/terminal/social"
  },
  {
    "id": "VOID-122",
    "name": "Glossary & Docs Hub",
    "kind": "route",
    "path": "/terminal/glossary"
  },
  {
    "id": "VOID-125",
    "name": "SKU Cosmos Hub",
    "kind": "route",
    "path": "/lab/sku-cosmos"
  },
  {
    "id": "VOID-130",
    "name": "VOID Shell",
    "kind": "service"
  },
  {
    "id": "VOID-131",
    "name": "VOID Browser",
    "kind": "service"
  },
  {
    "id": "VOID-132",
    "name": "Animus IA Filosófica",
    "kind": "service"
  },
  {
    "id": "VOID-133",
    "name": "VOID OS Appliance",
    "kind": "service"
  },
  {
    "id": "VOID-140",
    "name": "QEL Shamir Fragmentation",
    "kind": "service"
  },
  {
    "id": "VOID-141",
    "name": "Double Ratchet E2EE",
    "kind": "service"
  },
  {
    "id": "VOID-142",
    "name": "UTXO Confidencial",
    "kind": "service"
  },
  {
    "id": "VOID-143",
    "name": "Entropy Orchestrator",
    "kind": "service"
  },
  {
    "id": "VOID-144",
    "name": "Secure Random Facade",
    "kind": "service"
  },
  {
    "id": "VOID-145",
    "name": "Steganography Layer",
    "kind": "service"
  },
  {
    "id": "VOID-146",
    "name": "Fuzzy Extractor (bio)",
    "kind": "service"
  },
  {
    "id": "VOID-147",
    "name": "Signing Keys Vault",
    "kind": "service"
  },
  {
    "id": "VOID-148",
    "name": "Matchmaker Protocol",
    "kind": "service"
  },
  {
    "id": "VOID-149",
    "name": "Topology Tracker",
    "kind": "service"
  },
  {
    "id": "VOID-150",
    "name": "GF(256) Primitives",
    "kind": "service"
  },
  {
    "id": "VOID-151",
    "name": "ZK Compressor",
    "kind": "service"
  },
  {
    "id": "VOID-152",
    "name": "Local CQR Engine",
    "kind": "service"
  },
  {
    "id": "VOID-153",
    "name": "Remote CQR Config",
    "kind": "service"
  },
  {
    "id": "VOID-154",
    "name": "Anti-Higgs Shield",
    "kind": "service"
  },
  {
    "id": "VOID-155",
    "name": "Singularity Harvester",
    "kind": "service"
  },
  {
    "id": "VOID-156",
    "name": "UTU Token Registry",
    "kind": "service"
  },
  {
    "id": "VOID-157",
    "name": "LDK Lightning Bridge",
    "kind": "service"
  },
  {
    "id": "VOID-158",
    "name": "NWC Interop",
    "kind": "service"
  },
  {
    "id": "VOID-159",
    "name": "Crypto Primitives Bundle",
    "kind": "bundle"
  },
  {
    "id": "VOID-160",
    "name": "AMP Pipeline",
    "kind": "service"
  },
  {
    "id": "VOID-161",
    "name": "SLCC Consent Layer",
    "kind": "service"
  },
  {
    "id": "VOID-162",
    "name": "Consent Receipt Store",
    "kind": "service"
  },
  {
    "id": "VOID-163",
    "name": "Consent Lattice",
    "kind": "service"
  },
  {
    "id": "VOID-164",
    "name": "CGF Consent Contract",
    "kind": "service"
  },
  {
    "id": "VOID-165",
    "name": "PMU Ω Pipeline",
    "kind": "service"
  },
  {
    "id": "VOID-166",
    "name": "PMU Compute Orchestrator",
    "kind": "service"
  },
  {
    "id": "VOID-167",
    "name": "vHGPU AMP Client",
    "kind": "service"
  },
  {
    "id": "VOID-168",
    "name": "Recursive STARK (AMP)",
    "kind": "service"
  },
  {
    "id": "VOID-169",
    "name": "LDK WASM Bridge",
    "kind": "service"
  },
  {
    "id": "VOID-170",
    "name": "Known Limitations Registry",
    "kind": "service"
  },
  {
    "id": "VOID-171",
    "name": "Protocol Royalty",
    "kind": "service"
  },
  {
    "id": "VOID-172",
    "name": "Core Consent Hook",
    "kind": "service"
  },
  {
    "id": "VOID-173",
    "name": "Sovereign Config",
    "kind": "service"
  },
  {
    "id": "VOID-174",
    "name": "AMP Enterprise Bundle",
    "kind": "bundle"
  },
  {
    "id": "VOID-180",
    "name": "LSC Resource Guard",
    "kind": "service"
  },
  {
    "id": "VOID-181",
    "name": "ScrapScanner CLI",
    "kind": "service"
  },
  {
    "id": "VOID-182",
    "name": "Telegram Scraper",
    "kind": "service"
  },
  {
    "id": "VOID-183",
    "name": "Binance Scraper",
    "kind": "service"
  },
  {
    "id": "VOID-184",
    "name": "Mercado Bitcoin Scraper",
    "kind": "service"
  },
  {
    "id": "VOID-185",
    "name": "Phantom Harvest Harmony",
    "kind": "service"
  },
  {
    "id": "VOID-186",
    "name": "Contact Directory",
    "kind": "service"
  },
  {
    "id": "VOID-187",
    "name": "vCard / export pipeline",
    "kind": "service"
  },
  {
    "id": "VOID-188",
    "name": "Exchange Intel Bundle",
    "kind": "bundle"
  },
  {
    "id": "VOID-189",
    "name": "Social Harvest Bundle",
    "kind": "bundle"
  },
  {
    "id": "VOID-190",
    "name": "GhostDocker Bridge",
    "kind": "service"
  },
  {
    "id": "VOID-191",
    "name": "void-runner Client",
    "kind": "service"
  },
  {
    "id": "VOID-192",
    "name": "Phantom Pipeline VPS",
    "kind": "service"
  },
  {
    "id": "VOID-193",
    "name": "HiggsGit Sync",
    "kind": "service"
  },
  {
    "id": "VOID-194",
    "name": "GhostDock Core",
    "kind": "service"
  },
  {
    "id": "VOID-195",
    "name": "EcoNet VPS Module",
    "kind": "service"
  },
  {
    "id": "VOID-196",
    "name": "Harmonia CLI",
    "kind": "service"
  },
  {
    "id": "VOID-197",
    "name": "Harmonia VPS Script",
    "kind": "service"
  },
  {
    "id": "VOID-198",
    "name": "build-vps.sh Appliance",
    "kind": "service"
  },
  {
    "id": "VOID-199",
    "name": "Perfil B LAN Bundle",
    "kind": "bundle"
  },
  {
    "id": "VOID-200",
    "name": "Chat Store E2EE",
    "kind": "service"
  },
  {
    "id": "VOID-201",
    "name": "Channel Store",
    "kind": "service"
  },
  {
    "id": "VOID-202",
    "name": "HCN Store",
    "kind": "service"
  },
  {
    "id": "VOID-203",
    "name": "G-Counter CRDT",
    "kind": "service"
  },
  {
    "id": "VOID-204",
    "name": "UTXO Store",
    "kind": "service"
  },
  {
    "id": "VOID-205",
    "name": "Messaging Data Bundle",
    "kind": "bundle"
  },
  {
    "id": "VOID-210",
    "name": "Native Bridge (Capacitor)",
    "kind": "service"
  },
  {
    "id": "VOID-211",
    "name": "ETRNET Nostr Kinds",
    "kind": "service"
  },
  {
    "id": "VOID-212",
    "name": "Relay Health Probe",
    "kind": "service"
  },
  {
    "id": "VOID-213",
    "name": "Lightning+Nostr Transport",
    "kind": "service"
  },
  {
    "id": "VOID-214",
    "name": "Local Drivers (BLE/serial)",
    "kind": "service"
  },
  {
    "id": "VOID-215",
    "name": "Acoustic Driver",
    "kind": "service"
  },
  {
    "id": "VOID-216",
    "name": "Distance Bridge Core",
    "kind": "service"
  },
  {
    "id": "VOID-217",
    "name": "Mesh Preflight",
    "kind": "service"
  },
  {
    "id": "VOID-218",
    "name": "CQR Tunnel Quick",
    "kind": "service"
  },
  {
    "id": "VOID-219",
    "name": "Mesh Transport Bundle",
    "kind": "bundle"
  },
  {
    "id": "VOID-230",
    "name": "Lua: LSC Monitor",
    "kind": "service"
  },
  {
    "id": "VOID-231",
    "name": "Lua: vHGPU Farm",
    "kind": "service"
  },
  {
    "id": "VOID-232",
    "name": "Lua: Ghost Strategy",
    "kind": "service"
  },
  {
    "id": "VOID-233",
    "name": "Lua: Collapse Strategy",
    "kind": "service"
  },
  {
    "id": "VOID-234",
    "name": "Lua: Homotopy Validator",
    "kind": "service"
  },
  {
    "id": "VOID-235",
    "name": "Lab Switch",
    "kind": "service"
  },
  {
    "id": "VOID-236",
    "name": "WebGPU Tensor Engine",
    "kind": "service"
  },
  {
    "id": "VOID-237",
    "name": "AQRE Client",
    "kind": "service"
  },
  {
    "id": "VOID-238",
    "name": "LUSUS Client",
    "kind": "service"
  },
  {
    "id": "VOID-239",
    "name": "Anacróclastic Limits",
    "kind": "service"
  },
  {
    "id": "VOID-240",
    "name": "Paleo Entropy Fossil",
    "kind": "service"
  },
  {
    "id": "VOID-241",
    "name": "BB84 / Penrose (Python)",
    "kind": "service"
  },
  {
    "id": "VOID-242",
    "name": "PMU Domain Compute (Py)",
    "kind": "service"
  },
  {
    "id": "VOID-243",
    "name": "Plugin API (Py)",
    "kind": "service"
  },
  {
    "id": "VOID-244",
    "name": "Lab Plugins Bundle",
    "kind": "bundle"
  },
  {
    "id": "VOID-250",
    "name": "Lab Research Lab",
    "kind": "service"
  },
  {
    "id": "VOID-251",
    "name": "HGPU Research",
    "kind": "service"
  },
  {
    "id": "VOID-252",
    "name": "ZK/STARK Research",
    "kind": "service"
  },
  {
    "id": "VOID-253",
    "name": "WASM Deep Research",
    "kind": "service"
  },
  {
    "id": "VOID-254",
    "name": "Animus Bootstrap",
    "kind": "service"
  },
  {
    "id": "VOID-255",
    "name": "Animus Substrates Lib",
    "kind": "service"
  },
  {
    "id": "VOID-256",
    "name": "Void Animus Plugin",
    "kind": "service"
  },
  {
    "id": "VOID-257",
    "name": "Module Reality Backend",
    "kind": "service"
  },
  {
    "id": "VOID-258",
    "name": "Omega Research UI",
    "kind": "service"
  },
  {
    "id": "VOID-259",
    "name": "Void Protocol Core",
    "kind": "service"
  },
  {
    "id": "VOID-260",
    "name": "useVhgpuFarm Hook",
    "kind": "service"
  },
  {
    "id": "VOID-261",
    "name": "useLua Runtime",
    "kind": "service"
  },
  {
    "id": "VOID-262",
    "name": "Mobile WebView Guard",
    "kind": "service"
  },
  {
    "id": "VOID-263",
    "name": "R&D Full Bundle",
    "kind": "bundle"
  },
  {
    "id": "VOID-264",
    "name": "ZK Research Bundle",
    "kind": "bundle"
  },
  {
    "id": "VOID-270",
    "name": "Payment Gateway Core",
    "kind": "service"
  },
  {
    "id": "VOID-271",
    "name": "Chimera Exchange Core",
    "kind": "service"
  },
  {
    "id": "VOID-272",
    "name": "Nostr DEX Core",
    "kind": "service"
  },
  {
    "id": "VOID-273",
    "name": "Sovereign Pools Core",
    "kind": "service"
  },
  {
    "id": "VOID-274",
    "name": "RWA Tokenization Core",
    "kind": "service"
  },
  {
    "id": "VOID-275",
    "name": "Collapse Finance Core",
    "kind": "service"
  },
  {
    "id": "VOID-276",
    "name": "Janus Finance Core",
    "kind": "service"
  },
  {
    "id": "VOID-277",
    "name": "Ghost Locker Core",
    "kind": "service"
  },
  {
    "id": "VOID-278",
    "name": "PoW Faucet Core",
    "kind": "service"
  },
  {
    "id": "VOID-279",
    "name": "Finance Engines Bundle",
    "kind": "bundle"
  },
  {
    "id": "VOID-280",
    "name": "Production Preflight",
    "kind": "service"
  },
  {
    "id": "VOID-281",
    "name": "Sovereign Preflight",
    "kind": "service"
  },
  {
    "id": "VOID-282",
    "name": "Real+ Preflight",
    "kind": "service"
  },
  {
    "id": "VOID-283",
    "name": "Stack Status",
    "kind": "service"
  },
  {
    "id": "VOID-284",
    "name": "PMU Audit (full)",
    "kind": "service"
  },
  {
    "id": "VOID-285",
    "name": "PMU Anchor Propose/Finalize",
    "kind": "service"
  },
  {
    "id": "VOID-286",
    "name": "Anchor Local/Sepolia",
    "kind": "service"
  },
  {
    "id": "VOID-287",
    "name": "Android Build Suite",
    "kind": "service"
  },
  {
    "id": "VOID-288",
    "name": "BB84 (retirado)",
    "kind": "service"
  },
  {
    "id": "VOID-289",
    "name": "NWC Dev Toolkit",
    "kind": "service"
  },
  {
    "id": "VOID-290",
    "name": "LND Wallet Bootstrap",
    "kind": "service"
  },
  {
    "id": "VOID-291",
    "name": "Relay Health SLA",
    "kind": "service"
  },
  {
    "id": "VOID-292",
    "name": "Sepolia Dev Bootstrap",
    "kind": "service"
  },
  {
    "id": "VOID-293",
    "name": "Sourcify Verify",
    "kind": "service"
  },
  {
    "id": "VOID-294",
    "name": "Certification Bundle",
    "kind": "bundle"
  },
  {
    "id": "VOID-295",
    "name": "Anchor Ops Bundle",
    "kind": "bundle"
  },
  {
    "id": "VOID-296",
    "name": "Mobile Release Bundle",
    "kind": "bundle"
  },
  {
    "id": "VOID-297",
    "name": "Dev CQR Quick",
    "kind": "service"
  },
  {
    "id": "VOID-298",
    "name": "Lab Docker Prepare",
    "kind": "service"
  },
  {
    "id": "VOID-299",
    "name": "Ops Master Bundle",
    "kind": "bundle"
  },
  {
    "id": "VOID-300",
    "name": "Managed Sovereign Stack",
    "kind": "service"
  },
  {
    "id": "VOID-301",
    "name": "Managed CQR Gateway",
    "kind": "service"
  },
  {
    "id": "VOID-302",
    "name": "Managed void-runner Farm",
    "kind": "service"
  },
  {
    "id": "VOID-303",
    "name": "PMU Audit-as-a-Service",
    "kind": "service"
  },
  {
    "id": "VOID-304",
    "name": "Anchor Ceremony",
    "kind": "service"
  },
  {
    "id": "VOID-305",
    "name": "White-label PWA Build",
    "kind": "service"
  },
  {
    "id": "VOID-306",
    "name": "Android Soberano MDM",
    "kind": "service"
  },
  {
    "id": "VOID-307",
    "name": "Tailnet Harmonia",
    "kind": "service"
  },
  {
    "id": "VOID-308",
    "name": "Research Archive License",
    "kind": "service"
  },
  {
    "id": "VOID-309",
    "name": "Bruno Theory Consulting",
    "kind": "service"
  },
  {
    "id": "VOID-310",
    "name": "Compliance Harvest Audit",
    "kind": "service"
  },
  {
    "id": "VOID-311",
    "name": "Nostr Relay Dedicated",
    "kind": "service"
  },
  {
    "id": "VOID-312",
    "name": "LND Operations",
    "kind": "service"
  },
  {
    "id": "VOID-313",
    "name": "Training & Certification",
    "kind": "service"
  },
  {
    "id": "VOID-314",
    "name": "SDK Integration Support",
    "kind": "service"
  },
  {
    "id": "VOID-315",
    "name": "STARK/ZK Integration",
    "kind": "service"
  },
  {
    "id": "VOID-316",
    "name": "Supply Chain Attestation",
    "kind": "service"
  },
  {
    "id": "VOID-317",
    "name": "Mixnet Operations",
    "kind": "service"
  },
  {
    "id": "VOID-318",
    "name": "Full Managed Appliance",
    "kind": "service"
  },
  {
    "id": "VOID-319",
    "name": "Enterprise Success (24/7)",
    "kind": "bundle"
  },
  {
    "id": "VOID-320",
    "name": "App Layout Shell",
    "kind": "service"
  },
  {
    "id": "VOID-321",
    "name": "Router Hub System",
    "kind": "service"
  },
  {
    "id": "VOID-322",
    "name": "HTTP JSON Client",
    "kind": "service"
  },
  {
    "id": "VOID-323",
    "name": "QR Code Utils",
    "kind": "service"
  },
  {
    "id": "VOID-324",
    "name": "Dev Log & Telemetry (local)",
    "kind": "service"
  },
  {
    "id": "VOID-325",
    "name": "White-label Theme Pack",
    "kind": "service"
  },
  {
    "id": "VOID-326",
    "name": "Multi-tenant SKU Manifest",
    "kind": "service"
  },
  {
    "id": "VOID-327",
    "name": "Landing Page Only SKU",
    "kind": "bundle"
  },
  {
    "id": "VOID-328",
    "name": "Messenger-only SKU",
    "kind": "bundle"
  },
  {
    "id": "VOID-329",
    "name": "UX White-label Bundle",
    "kind": "bundle"
  },
  {
    "id": "VOID-500",
    "name": "Ising Server (legado)",
    "kind": "route",
    "path": "/compute/isossupra"
  },
  {
    "id": "VOID-501",
    "name": "Sensor GPIO (legado)",
    "kind": "route",
    "path": "/compute/isossupra"
  },
  {
    "id": "VOID-502",
    "name": "Helmholtz Model",
    "kind": "route",
    "path": "/compute/isossupra"
  },
  {
    "id": "VOID-503",
    "name": "TF Local",
    "kind": "route",
    "path": "/compute/isossupra"
  },
  {
    "id": "VOID-504",
    "name": "Chaos-Bell Authenticator",
    "kind": "route",
    "path": "/compute/isossupra"
  },
  {
    "id": "VOID-505",
    "name": "Vortex Memory Store",
    "kind": "route",
    "path": "/compute/isossupra"
  },
  {
    "id": "VOID-506",
    "name": "Homotopy Compiler",
    "kind": "route",
    "path": "/compute/isossupra"
  },
  {
    "id": "VOID-510",
    "name": "Sensor Entropy Mesh",
    "kind": "route",
    "path": "/compute/imc"
  },
  {
    "id": "VOID-511",
    "name": "Ising Mesh",
    "kind": "route",
    "path": "/compute/imc"
  },
  {
    "id": "VOID-512",
    "name": "Acoustic Room Key",
    "kind": "route",
    "path": "/compute/imc"
  },
  {
    "id": "VOID-513",
    "name": "Chaos Mesh Sync",
    "kind": "route",
    "path": "/compute/imc"
  },
  {
    "id": "VOID-514",
    "name": "Thomas-Fermi Sharded",
    "kind": "route",
    "path": "/compute/imc"
  },
  {
    "id": "VOID-515",
    "name": "Entropy Mesh Sync",
    "kind": "route",
    "path": "/compute/imc"
  },
  {
    "id": "VOID-516",
    "name": "Distributed Compute Scheduler",
    "kind": "route",
    "path": "/compute/imc"
  },
  {
    "id": "VOID-517",
    "name": "Compute Marketplace Engine",
    "kind": "route",
    "path": "/compute/imc"
  },
  {
    "id": "VOID-518",
    "name": "Entropy-as-a-Service API",
    "kind": "route",
    "path": "/compute/imc"
  },
  {
    "id": "VOID-519",
    "name": "ZK Proof Pipeline",
    "kind": "route",
    "path": "/compute/imc"
  },
  {
    "id": "VOID-520",
    "name": "Compute Marketplace",
    "kind": "route",
    "path": "/compute/imc"
  },
  {
    "id": "VOID-521",
    "name": "Entropy-as-a-Service",
    "kind": "route",
    "path": "/compute/imc"
  },
  {
    "id": "VOID-522",
    "name": "ZK Aggregate Mesh",
    "kind": "route",
    "path": "/compute/imc"
  },
  {
    "id": "VOID-600",
    "name": "VOID Sovereign Stack Core",
    "kind": "route",
    "path": "/compute/imc"
  },
  {
    "id": "VOID-700",
    "name": "Silent Mesh Hosting",
    "kind": "route",
    "path": "/network/silent-hosting"
  },
  {
    "id": "VOID-701",
    "name": "Mesh CDN",
    "kind": "route",
    "path": "/network/mesh-cdn"
  },
  {
    "id": "VOID-702",
    "name": "Web Node Manager",
    "kind": "route",
    "path": "/network/silent-hosting"
  },
  {
    "id": "VOID-703",
    "name": "Binary Bazaar",
    "kind": "route",
    "path": "/terminal/marketplace"
  },
  {
    "id": "VOID-704",
    "name": "Hosting Revenue",
    "kind": "route",
    "path": "/finance/sov-economy"
  },
  {
    "id": "VOID-705",
    "name": "Ethical Mining Pool",
    "kind": "route",
    "path": "/finance/sov-economy"
  },
  {
    "id": "VOID-710",
    "name": "SOV Ledger",
    "kind": "route",
    "path": "/finance/sov-economy"
  },
  {
    "id": "VOID-721",
    "name": "Mesh Liquidity",
    "kind": "route",
    "path": "/mesh/liquidity"
  },
  {
    "id": "AMP-GOVERNANCE-PACK",
    "name": "AMP Governance Pack",
    "kind": "bundle"
  },
  {
    "id": "ANIMUS-OS-PREVIEW",
    "name": "Animus OS Preview",
    "kind": "bundle"
  },
  {
    "id": "CERTIFIED-PRODUCTION",
    "name": "Certified Production",
    "kind": "bundle"
  },
  {
    "id": "COMPUTE-WORKER",
    "name": "Compute Worker",
    "kind": "bundle"
  },
  {
    "id": "CRYPTO-LAB",
    "name": "Crypto Lab",
    "kind": "bundle"
  },
  {
    "id": "EDGE-INTELLIGENCE",
    "name": "Edge Intelligence",
    "kind": "bundle"
  },
  {
    "id": "ENTROPY-APPLIANCE",
    "name": "Entropy Appliance",
    "kind": "bundle"
  },
  {
    "id": "FINANCE-NODE",
    "name": "Finance Node",
    "kind": "bundle"
  },
  {
    "id": "FULL-ENTERPRISE",
    "name": "Full VOID Enterprise",
    "kind": "bundle"
  },
  {
    "id": "GPU-ORCHESTRATION",
    "name": "GPU Orchestration",
    "kind": "bundle"
  },
  {
    "id": "MESSENGER-ENTERPRISE",
    "name": "Messenger Enterprise",
    "kind": "bundle"
  },
  {
    "id": "PERFIL-B-HOME",
    "name": "Perfil B Home Lab",
    "kind": "bundle"
  },
  {
    "id": "PRIVACY-MAX",
    "name": "Privacy Max",
    "kind": "bundle"
  },
  {
    "id": "QUANTUM-LAB-PACK",
    "name": "IMC Lab Pack (ex-Quantum)",
    "kind": "bundle"
  },
  {
    "id": "RESEARCH-INSTITUTE",
    "name": "Research Institute",
    "kind": "bundle"
  },
  {
    "id": "SOVEREIGN-CITIZEN",
    "name": "Sovereign Citizen",
    "kind": "bundle"
  },
  {
    "id": "VPS-OPERATOR-PACK",
    "name": "VPS Operator Pack",
    "kind": "bundle"
  },
  {
    "id": "WHITE-LABEL-OEM",
    "name": "White-label OEM",
    "kind": "bundle"
  }
] as const;

/** Todos os VOID-00…VOID-329 (e bundles comerciais) definidos no catálogo. */
export const MASTER_SKU_IDS: readonly string[] = SKU_CATALOG.map((s) => s.id);

export const SKU_BY_ID: Record<string, SkuCatalogEntry> = Object.fromEntries(
  SKU_CATALOG.map((s) => [s.id, s]),
);
