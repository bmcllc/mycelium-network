/** Gerado por scripts/generate-sku-artifacts.mjs */
export type SkuDeliveryKind = "code" | "bundle" | "service" | "meta";

export interface SkuArtifactEntry {
  id: string;
  artifacts: readonly string[];
  delivery: SkuDeliveryKind;
}

export const SERVICE_SKU_IDS: readonly string[] = ["VOID-300","VOID-301","VOID-302","VOID-303","VOID-304","VOID-305","VOID-306","VOID-307","VOID-308","VOID-309","VOID-310","VOID-311","VOID-312","VOID-313","VOID-314","VOID-315","VOID-316","VOID-317","VOID-318","VOID-319"];

export const BUNDLE_SKU_IDS: readonly string[] = ["ANIMUS-OS-PREVIEW","CERTIFIED-PRODUCTION","COMPUTE-WORKER","CRYPTO-LAB","EDGE-INTELLIGENCE","ENTROPY-APPLIANCE","FINANCE-NODE","FULL-ENTERPRISE","GPU-ORCHESTRATION","MESSENGER-ENTERPRISE","PERFIL-B-HOME","PRIVACY-MAX","QUANTUM-LAB-PACK","RESEARCH-INSTITUTE","SOVEREIGN-CITIZEN","VOID-00","VOID-100","VOID-160","VOID-180","VOID-189","VOID-190","VOID-200","VOID-210","VOID-230","VOID-250","VOID-264","VOID-270","VOID-280","VOID-295","VOID-296","VOID-297","VOID-30","VOID-300","VOID-320","VOID-328","VOID-329","VOID-40","VOID-50","VOID-500","VOID-70","VOID-90","VPS-OPERATOR-PACK","WHITE-LABEL-OEM"];

export const SKU_ARTIFACTS: Record<string, readonly string[]> = {
  "VOID-00": [
    "void_core/",
    "void_core/pkg",
    "void_core/pkg/*.wasm",
    "void_core/src"
  ],
  "VOID-01": [
    "eternet_ts/",
    "eternet_ts/package.json",
    "eternet_ts/src"
  ],
  "VOID-02": [
    "void_runner/",
    "void_runner/Cargo.toml",
    "void_runner/src"
  ],
  "VOID-03": [
    "Dockerfile.quantum",
    "core/"
  ],
  "VOID-04": [
    "server/server.js"
  ],
  "VOID-05": [
    "docker-compose.sovereign.yml"
  ],
  "VOID-06": [
    "contracts/"
  ],
  "VOID-07": [
    "android/",
    "capacitor.config.ts"
  ],
  "VOID-08": [
    "src/App.tsx",
    "vite.config.ts"
  ],
  "VOID-09": [
    "docs/archive/bruno-theory/"
  ],
  "VOID-0A": [
    "artifacts/pi_worker.wasm",
    "void_runner/src"
  ],
  "VOID-0B": [
    "docs/ARCH-EVOLUTION.md",
    "eternet_ts/package.json"
  ],
  "VOID-0C": [
    "docs/master-sku-list.pdf",
    "public/*.pdf"
  ],
  "VOID-0D": [
    "Cargo.toml"
  ],
  "VOID-0E": [
    "Dockerfile.production"
  ],
  "VOID-0F": [
    "DOC/DEPLOY-PRODUCTION.md",
    "docker-compose.sovereign.yml"
  ],
  "VOID-10": [],
  "VOID-11": [],
  "VOID-12": [
    "src/components/PhantomHarvesterPanel.tsx"
  ],
  "VOID-13": [
    "src/AppLanding.tsx"
  ],
  "VOID-14": [
    "src/App.tsx",
    "src/components/Onboarding.tsx"
  ],
  "VOID-15": [
    "src/components/GhostIDSetup.tsx"
  ],
  "VOID-16": [
    "src/components/DevSetupBanner.tsx"
  ],
  "VOID-17": [
    "src/components/PanelTierBadge.tsx",
    "src/panelTiers.ts"
  ],
  "VOID-18": [
    "src/components/NetworkSimCore.tsx"
  ],
  "VOID-20": [
    "src/components/ZKPLab.tsx"
  ],
  "VOID-21": [
    "src/components/GhostVPNPanel.tsx"
  ],
  "VOID-22": [
    "src/components/PqcDeveloperDashboard.tsx"
  ],
  "VOID-23": [
    "src/components/CQRPqcPanel.tsx"
  ],
  "VOID-24": [
    "src/components/CryptoTestamentLab.tsx"
  ],
  "VOID-25": [],
  "VOID-26": [],
  "VOID-30": [
    "src/components/DEXPanel.tsx"
  ],
  "VOID-31": [
    "src/components/ChimeraExchangePanel.tsx"
  ],
  "VOID-32": [
    "src/components/NostrDEXPanel.tsx"
  ],
  "VOID-33": [
    "src/components/StablecoinPanel.tsx"
  ],
  "VOID-34": [
    "src/components/RwaTokenizationPanel.tsx"
  ],
  "VOID-35": [
    "src/components/SovereignPoolsPanel.tsx"
  ],
  "VOID-36": [
    "src/components/JanusFinancePanel.tsx"
  ],
  "VOID-37": [
    "src/components/PaymentGatewayPanel.tsx"
  ],
  "VOID-38": [
    "src/collapse/",
    "src/components/CollapseFinancePanel.tsx"
  ],
  "VOID-39": [
    "docker-compose.sovereign.yml"
  ],
  "VOID-40": [],
  "VOID-41": [],
  "VOID-42": [
    "src/components/EcoNetPanel.tsx"
  ],
  "VOID-43": [
    "src/components/NostrSyncPanel.tsx"
  ],
  "VOID-44": [
    "src/components/AcousticHandshakePanel.tsx"
  ],
  "VOID-45": [],
  "VOID-46": [],
  "VOID-50": [
    "src/components/MirageComputePanel.tsx"
  ],
  "VOID-51": [],
  "VOID-52": [
    "src/components/VhgpuFarmPanel.tsx"
  ],
  "VOID-53": [
    "src/components/PmuVhgpuCoresPanel.tsx"
  ],
  "VOID-54": [
    "src/theory/*"
  ],
  "VOID-55": [
    "src/components/PmuTruthOmegaPanel.tsx"
  ],
  "VOID-56": [
    "src/components/PmuRoadmapPanel.tsx"
  ],
  "VOID-57": [],
  "VOID-58": [
    "src/components/AnimusSubstratesPanel.tsx"
  ],
  "VOID-59": [],
  "VOID-60": [],
  "VOID-61": [
    "src/components/HGPUComputePanel.tsx"
  ],
  "VOID-62": [],
  "VOID-70": [
    "src/components/LSCPanel.tsx"
  ],
  "VOID-71": [
    "src/components/QRCTopologyPanel.tsx"
  ],
  "VOID-72": [
    "src/components/PaleoPanel.tsx"
  ],
  "VOID-73": [
    "src/components/CollapseAlgebraPanel.tsx"
  ],
  "VOID-74": [
    "src/components/AnacroclastiaPanel.tsx"
  ],
  "VOID-75": [
    "src/components/NostrOraclePanel.tsx"
  ],
  "VOID-76": [
    "src/components/QRNGPanel.tsx"
  ],
  "VOID-77": [
    "src/components/QRStocksPanel.tsx"
  ],
  "VOID-78": [
    "src/components/HeptaryQuantumPanel.tsx"
  ],
  "VOID-79": [
    "src/components/AQREPanel.tsx"
  ],
  "VOID-80": [
    "src/components/LUSUSTerminalPanel.tsx"
  ],
  "VOID-81": [
    "Dockerfile.quantum"
  ],
  "VOID-90": [
    "src/components/QuantumDaoPanel.tsx"
  ],
  "VOID-91": [
    "src/components/AntiSybilLab.tsx"
  ],
  "VOID-92": [
    "src/components/DoubleSpendDefenseLab.tsx"
  ],
  "VOID-93": [
    "src/components/TemporalOracleLab.tsx"
  ],
  "VOID-94": [
    "src/components/SocialRecoveryPanel.tsx"
  ],
  "VOID-95": [
    "src/components/ConsentContractPanel.tsx"
  ],
  "VOID-96": [
    "src/components/SovereigntyPanel.tsx"
  ],
  "VOID-97": [],
  "VOID-100": [
    "src/components/PhantomShopperPanel.tsx"
  ],
  "VOID-101": [
    "src/components/AegisVaultPanel.tsx"
  ],
  "VOID-102": [
    "src/components/PaleoYieldPanel.tsx"
  ],
  "VOID-103": [
    "src/components/GhostLockerPanel.tsx"
  ],
  "VOID-104": [
    "src/components/PoWFaucetPanel.tsx"
  ],
  "VOID-110": [],
  "VOID-111": [],
  "VOID-112": [
    "src/components/LuaPluginPanel.tsx"
  ],
  "VOID-113": [
    "src/components/WatchtowerPanel.tsx"
  ],
  "VOID-114": [
    "src/components/SphinxMixnetPanel.tsx"
  ],
  "VOID-115": [
    "src/components/DifferentialCorePanel.tsx"
  ],
  "VOID-116": [
    "src/components/MiningPanel.tsx"
  ],
  "VOID-117": [
    "src/components/GPUMiningPanel.tsx"
  ],
  "VOID-118": [
    "src/components/HomotopyMiningPanel.tsx"
  ],
  "VOID-119": [
    "src/components/GhostMailboxPanel.tsx"
  ],
  "VOID-120": [
    "src/components/OctreeSDFPanel.tsx"
  ],
  "VOID-121": [
    "src/components/SocialFabricPanel.tsx"
  ],
  "VOID-122": [],
  "VOID-125": [],
  "VOID-130": [
    "src/layouts/AppLayout.tsx",
    "src/router.tsx"
  ],
  "VOID-131": [
    "src/App.tsx",
    "src/protocol/amp/slcc.ts"
  ],
  "VOID-132": [
    "src/core/cosmicVoidOrchestrator.ts",
    "src/theory/"
  ],
  "VOID-133": [
    "docker-compose.sovereign.yml",
    "src/App.tsx"
  ],
  "VOID-140": [
    "src/crypto/qel.ts"
  ],
  "VOID-141": [
    "src/crypto/doubleRatchet.ts"
  ],
  "VOID-142": [
    "src/crypto/utxo.ts"
  ],
  "VOID-143": [
    "src/crypto/entropyOrchestrator.ts"
  ],
  "VOID-144": [
    "src/utils/secureRandom.ts"
  ],
  "VOID-145": [
    "src/omega/steganography.ts"
  ],
  "VOID-146": [
    "src/crypto/fuzzyExtractor.ts"
  ],
  "VOID-147": [
    "src/crypto/signingKeys.ts"
  ],
  "VOID-148": [
    "src/crypto/matchmaker.ts"
  ],
  "VOID-149": [
    "src/crypto/topologyTracker.ts"
  ],
  "VOID-150": [
    "src/crypto/gf256.ts"
  ],
  "VOID-151": [
    "src/crypto/zkCompressor.ts"
  ],
  "VOID-152": [
    "src/lib/localCqrEngine.ts"
  ],
  "VOID-153": [
    "src/lib/remoteCqrConfig.ts"
  ],
  "VOID-154": [
    "src/crypto/antiHiggs.ts"
  ],
  "VOID-155": [
    "src/crypto/singularityHarvester.ts"
  ],
  "VOID-156": [
    "src/crypto/utuTokens.ts"
  ],
  "VOID-157": [
    "src/crypto/ldkBridge.ts"
  ],
  "VOID-158": [
    "src/crypto/nwcProtocol.ts"
  ],
  "VOID-159": [],
  "VOID-160": [
    "src/protocol/amp/ampPipeline.ts"
  ],
  "VOID-161": [
    "src/protocol/amp/slcc.ts"
  ],
  "VOID-162": [
    "src/protocol/amp/consentReceiptStore.ts"
  ],
  "VOID-163": [
    "src/protocol/amp/consentLattice.ts"
  ],
  "VOID-164": [
    "src/ethics/consentContract.ts"
  ],
  "VOID-165": [
    "src/protocol/amp/pmuOmegaPipeline.ts"
  ],
  "VOID-166": [
    "src/protocol/amp/pmuComputeOrchestrator.ts"
  ],
  "VOID-167": [
    "src/protocol/amp/vhgpuClient.ts"
  ],
  "VOID-168": [
    "src/protocol/amp/recursiveStark.ts"
  ],
  "VOID-169": [
    "src/protocol/amp/ldkWasmBridge.ts"
  ],
  "VOID-170": [
    "src/protocol/amp/knownLimitations.ts"
  ],
  "VOID-171": [
    "src/protocol/sovereignty/protocolRoyalty.ts"
  ],
  "VOID-172": [
    "src/hooks/useCoreConsent.ts"
  ],
  "VOID-173": [
    "src/config/sovereign.ts",
    "src/lib/cosmicSovereignMode.ts"
  ],
  "VOID-174": [],
  "VOID-180": [
    "src/harvesters/scrapScanner.ts"
  ],
  "VOID-181": [
    "scripts/scrapscanner.mjs",
    "src/harvesters/scrapScannerCli.ts"
  ],
  "VOID-182": [
    "src/harvesters/social/telegramScraper.ts"
  ],
  "VOID-183": [
    "src/harvesters/exchanges/binanceScraper.ts"
  ],
  "VOID-184": [
    "src/harvesters/exchanges/mercadoBitcoinScraper.ts"
  ],
  "VOID-185": [
    "src/harvesters/phantomHarvestHarmony.ts"
  ],
  "VOID-186": [
    "src/storage/contactDirectory.ts"
  ],
  "VOID-187": [
    "src/harvesters/scrapScanner.ts"
  ],
  "VOID-188": [],
  "VOID-189": [],
  "VOID-190": [
    "src/vps/ghostDockerBridge.ts"
  ],
  "VOID-191": [
    "src/vps/voidRunnerClient.ts"
  ],
  "VOID-192": [
    "src/vps/phantomPipeline.ts"
  ],
  "VOID-193": [
    "src/vps/higgsGit.ts"
  ],
  "VOID-194": [
    "src/core/ghostDock.ts"
  ],
  "VOID-195": [
    "src/vps/ecoNet.ts"
  ],
  "VOID-196": [
    "scripts/cosmic-harmony.mjs"
  ],
  "VOID-197": [
    "scripts/cosmic-harmony-vps.sh"
  ],
  "VOID-198": [
    "scripts/build-vps.sh"
  ],
  "VOID-199": [],
  "VOID-200": [
    "src/storage/chatStore.ts"
  ],
  "VOID-201": [
    "src/storage/channelStore.ts"
  ],
  "VOID-202": [
    "src/storage/hcnStore.ts"
  ],
  "VOID-203": [
    "src/crdt/gCounterCrdt.ts"
  ],
  "VOID-204": [
    "src/storage/utxoStore.ts"
  ],
  "VOID-205": [],
  "VOID-210": [
    "src/network/NativeBridge.ts"
  ],
  "VOID-211": [
    "src/network/etrnetKinds.ts"
  ],
  "VOID-212": [
    "src/network/relayProbe.ts"
  ],
  "VOID-213": [
    "src/network/lightningNostrTransport.ts"
  ],
  "VOID-214": [
    "src/network/localDrivers.ts"
  ],
  "VOID-215": [
    "src/crypto/acousticHandshake.ts",
    "src/network/acousticDriver.ts"
  ],
  "VOID-216": [
    "src/network/distanceBridge.ts"
  ],
  "VOID-217": [
    "scripts/mesh-preflight.sh"
  ],
  "VOID-218": [
    "scripts/cqr-tunnel-quick.sh"
  ],
  "VOID-219": [],
  "VOID-230": [],
  "VOID-231": [],
  "VOID-232": [],
  "VOID-233": [],
  "VOID-234": [],
  "VOID-235": [
    "src/qrc/quantumSwitch.ts"
  ],
  "VOID-236": [
    "src/qrc/webgpuTensorEngine.ts"
  ],
  "VOID-237": [
    "src/lib/aqreClient.ts"
  ],
  "VOID-238": [
    "src/lib/lususClient.ts"
  ],
  "VOID-239": [
    "src/lib/anacrocasticLimits.ts"
  ],
  "VOID-240": [
    "src/paleo/paleoEntropyFossil.ts"
  ],
  "VOID-241": [],
  "VOID-242": [],
  "VOID-243": [],
  "VOID-244": [],
  "VOID-250": [
    "src/research/quantumResearch.ts"
  ],
  "VOID-251": [
    "src/research/hgpuResearch.ts"
  ],
  "VOID-252": [
    "src/research/zkStarkResearch.ts"
  ],
  "VOID-253": [
    "src/omega/wasmDeepResearch.ts"
  ],
  "VOID-254": [
    "src/omega/AnimusBootstrap.ts"
  ],
  "VOID-255": [
    "src/omega/animusSubstrates.ts"
  ],
  "VOID-256": [
    "src/plugins/voidAnimus.ts"
  ],
  "VOID-257": [
    "src/lib/moduleRealityBackend.ts"
  ],
  "VOID-258": [
    "src/components/OmegaResearchLab.tsx"
  ],
  "VOID-259": [
    "src/core/VoidProtocol.ts"
  ],
  "VOID-260": [
    "src/core/useVhgpuFarm.ts"
  ],
  "VOID-261": [
    "src/core/useLua.ts"
  ],
  "VOID-262": [
    "src/lib/mobileWebViewGuard.ts"
  ],
  "VOID-263": [],
  "VOID-264": [],
  "VOID-270": [
    "src/crypto/paymentGateway.ts"
  ],
  "VOID-271": [
    "src/crypto/chimeraExchange.ts"
  ],
  "VOID-272": [
    "src/crypto/nostrDEX.ts"
  ],
  "VOID-273": [
    "src/crypto/sovereignPools.ts"
  ],
  "VOID-274": [
    "src/crypto/rwaTokenization.ts"
  ],
  "VOID-275": [
    "src/crypto/collapseFinance.ts"
  ],
  "VOID-276": [
    "src/components/JanusFinancePanel.tsx",
    "src/crypto/janusFinance.ts"
  ],
  "VOID-277": [
    "src/crypto/ghostLocker.ts"
  ],
  "VOID-278": [
    "src/crypto/powFaucet.ts"
  ],
  "VOID-279": [],
  "VOID-280": [
    "scripts/production-preflight.sh"
  ],
  "VOID-281": [
    "scripts/sovereign-preflight.sh"
  ],
  "VOID-282": [
    "scripts/realplus-preflight.sh"
  ],
  "VOID-283": [
    "scripts/stack-status.sh"
  ],
  "VOID-284": [
    "scripts/pmu-audit.mjs"
  ],
  "VOID-285": [
    "scripts/pmu-anchor-finalize-node.mjs",
    "scripts/pmu-anchor-propose.mjs"
  ],
  "VOID-286": [
    "scripts/anchor-local.sh"
  ],
  "VOID-287": [
    "scripts/android-build-sovereign.sh",
    "scripts/android-sync.sh"
  ],
  "VOID-288": [
    "scripts/sync-theory-archive.sh"
  ],
  "VOID-289": [
    "scripts/load-nwc-uri.mjs",
    "scripts/nwc-interop.sh",
    "scripts/validate-nwc-uri.mjs"
  ],
  "VOID-290": [
    "scripts/lnd-create-wallet.sh",
    "scripts/lnd-entrypoint.sh"
  ],
  "VOID-291": [
    "scripts/relay-health.mjs"
  ],
  "VOID-292": [
    "scripts/bootstrap-sepolia-dev.mjs"
  ],
  "VOID-293": [
    "scripts/verify-anchor-sourcify.sh"
  ],
  "VOID-294": [],
  "VOID-295": [],
  "VOID-296": [],
  "VOID-297": [
    "scripts/dev-cqr.sh"
  ],
  "VOID-298": [
    "scripts/docker-quantum-prepare.sh",
    "scripts/quantum-docker-entrypoint.sh"
  ],
  "VOID-299": [],
  "VOID-300": [
    "docker-compose.sovereign.yml",
    "scripts/stack-status.sh"
  ],
  "VOID-301": [
    "Dockerfile.quantum",
    "scripts/docker-quantum-prepare.sh"
  ],
  "VOID-302": [
    "core/"
  ],
  "VOID-303": [
    "scripts/pmu-audit.mjs"
  ],
  "VOID-304": [
    "scripts/pmu-anchor-finalize-node.mjs",
    "scripts/pmu-anchor-propose.mjs"
  ],
  "VOID-305": [
    "scripts/build-b2b.sh",
    "vite.config.ts"
  ],
  "VOID-306": [
    "scripts/android-build-b2b.sh"
  ],
  "VOID-307": [
    "DOC/FILOSOFIA-DEPLOY.md",
    "scripts/cqr-tunnel-quick.sh"
  ],
  "VOID-308": [
    "docs/archive/bruno-theory/",
    "scripts/sync-theory-archive.sh"
  ],
  "VOID-309": [
    "src/theory/brunoTheoryEngine.ts"
  ],
  "VOID-310": [
    "src/harvesters/scrapScanner.ts"
  ],
  "VOID-311": [
    "docker-compose.sovereign.yml"
  ],
  "VOID-312": [
    "scripts/lnd-create-wallet.sh",
    "scripts/lnd-entrypoint.sh"
  ],
  "VOID-313": [
    "scripts/production-preflight.sh"
  ],
  "VOID-314": [
    "eternet_ts/README.md"
  ],
  "VOID-315": [
    "src/components/ZKPLab.tsx",
    "src/protocol/amp/recursiveStark.ts"
  ],
  "VOID-316": [
    "src/components/SupplyChainSecurity.tsx"
  ],
  "VOID-317": [
    "src/components/SphinxMixnetPanel.tsx"
  ],
  "VOID-318": [
    "docker-compose.sovereign.yml",
    "scripts/production-preflight.sh"
  ],
  "VOID-319": [
    "docs/B2B-PRODUCT-LINES.md",
    "scripts/b2b-production-ready.mjs"
  ],
  "VOID-500": [
    "server/isossupra/ising_solver.js"
  ],
  "VOID-501": [
    "server/isossupra/qrng_thermal.js"
  ],
  "VOID-502": [
    "server/isossupra/acoustic_handshake.js"
  ],
  "VOID-503": [
    "server/isossupra/thomas_fermi_sdf.js"
  ],
  "VOID-504": [
    "server/isossupra/chaos_bell_auth.js"
  ],
  "VOID-505": [
    "server/isossupra/vortex_store.js"
  ],
  "VOID-506": [
    "server/isossupra/homotopy_compiler.js"
  ],
  "VOID-600": [
    "server/imc/core.js",
    "src/components/IMCCorePanel.tsx",
    "src/components/IsossupraCorePanel.tsx"
  ],
  "VOID-510": [
    "server/imc/sensor_entropy_mesh.js",
    "src/imc/sensorEntropy.ts"
  ],
  "VOID-511": [
    "server/imc/ising_mesh.js"
  ],
  "VOID-512": [
    "server/imc/acoustic_room.js",
    "src/imc/acousticRoom.ts"
  ],
  "VOID-513": [
    "server/imc/chaos_mesh.js"
  ],
  "VOID-514": [
    "server/imc/thomas_distributed.js"
  ],
  "VOID-520": [
    "server/imc/marketplace.js"
  ],
  "VOID-521": [
    "server/imc/entropy_service.js"
  ],
  "VOID-522": [
    "server/imc/zk_aggregate.js"
  ],
  "VOID-320": [
    "src/layouts/AppLayout.tsx"
  ],
  "VOID-321": [
    "src/b2b/",
    "src/router.tsx"
  ],
  "VOID-322": [
    "src/lib/httpJson.ts"
  ],
  "VOID-323": [
    "src/utils/qr.tsx"
  ],
  "VOID-324": [
    "src/utils/devLog.ts"
  ],
  "VOID-325": [
    "src/index.css"
  ],
  "VOID-326": [
    "scripts/vite-b2b-loaders.ts",
    "src/b2b/skuManifest.ts"
  ],
  "VOID-327": [],
  "VOID-328": [],
  "VOID-329": [],
  "SOVEREIGN-CITIZEN": [],
  "CRYPTO-LAB": [],
  "ENTROPY-APPLIANCE": [],
  "FINANCE-NODE": [],
  "COMPUTE-WORKER": [],
  "GPU-ORCHESTRATION": [],
  "RESEARCH-INSTITUTE": [],
  "EDGE-INTELLIGENCE": [],
  "PRIVACY-MAX": [],
  "MESSENGER-ENTERPRISE": [],
  "AMP-GOVERNANCE-PACK": [],
  "PERFIL-B-HOME": [],
  "CERTIFIED-PRODUCTION": [],
  "QUANTUM-LAB-PACK": [],
  "VPS-OPERATOR-PACK": [],
  "WHITE-LABEL-OEM": [],
  "ANIMUS-OS-PREVIEW": [],
  "FULL-ENTERPRISE": [
    "src/b2b/skuManifest.ts"
  ],
  "VOID-CATALOG-FULL": [
    "scripts/b2b-production-ready.mjs",
    "src/b2b/skuCatalog.generated.ts"
  ],
  "VOID-ALL": [
    "src/b2b/routeCatalog.ts"
  ]
};

export const SKU_ARTIFACT_INDEX: readonly SkuArtifactEntry[] = Object.entries(SKU_ARTIFACTS).map(
  ([id, artifacts]) => ({
    id,
    artifacts,
    delivery: SERVICE_SKU_IDS.includes(id)
      ? "service"
      : id.includes("-") && !id.startsWith("VOID-")
        ? "bundle"
        : artifacts.length > 0
          ? "code"
          : "meta",
  }),
);
