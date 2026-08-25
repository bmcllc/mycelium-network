/**
 * Deploy — ETRNETAnchor.sol (CommonJS: compatível com package.json "type":"module")
 *
 *   npm run anchor:deploy:local
 * Env: DAO_MULTISIG (obrigatório fora de localhost)
 */
const hre = require("hardhat");
const { mkdirSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");

const { ethers, network, run } = hre;

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log(`\n[ETRNETAnchor] Deploy iniciado`);
  console.log(`  Network:  ${network.name}`);
  console.log(`  Deployer: ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`  Balance:  ${ethers.formatEther(balance)} ETH`);

  const daoMultisig =
    process.env.DAO_MULTISIG ||
    (network.name === "localhost" ? deployer.address : null);

  if (!daoMultisig) {
    throw new Error(
      "DAO_MULTISIG não definido. Em produção, defina o endereço do Safe no .env"
    );
  }

  console.log(`  DAO:      ${daoMultisig}`);

  const Anchor = await ethers.getContractFactory("ETRNETAnchor");
  const anchor = await Anchor.deploy(daoMultisig);
  await anchor.waitForDeployment();

  const address = await anchor.getAddress();
  console.log(`\n✅ ETRNETAnchor deployado em: ${address}`);

  if (network.name === "sepolia") {
    console.log("\n[Sourcify] Verificação OSS (sem API key)...");
    await new Promise((resolve) => setTimeout(resolve, 15_000));
    try {
      await run("verify:verify", {
        address,
        constructorArguments: [daoMultisig],
        contract: "contracts/ETRNETAnchor.sol:ETRNETAnchor",
      });
      console.log("✅ Contrato enviado à Sourcify");
    } catch (err) {
      if (err.message?.includes("Already Verified") || err.message?.includes("already verified")) {
        console.log("ℹ Contrato já verificado na Sourcify");
      } else {
        console.warn("⚠ Sourcify:", err.message);
        console.warn("  Repetir: npm run anchor:verify-sepolia");
      }
    }
  }

  const deployInfo = {
    network: network.name,
    address,
    daoMultisig,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    txHash: anchor.deploymentTransaction()?.hash,
  };

  const vaultDir = join(__dirname, "..", "vault");
  mkdirSync(vaultDir, { recursive: true });
  const vaultPath = join(vaultDir, "etrnet-anchor-deploy.json");
  writeFileSync(vaultPath, JSON.stringify(deployInfo, null, 2));
  console.log("\n[Deploy Info]\n" + JSON.stringify(deployInfo, null, 2));
  console.log(`\n[vault] ${vaultPath}`);
  if (network.name === "sepolia") {
    console.log("\nSincronizar env:\n  npm run anchor:sync-env -- " + address + " --sepolia");
  } else {
    console.log("\nSincronizar env:\n  npm run anchor:sync-env -- --local-hardhat-key");
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
