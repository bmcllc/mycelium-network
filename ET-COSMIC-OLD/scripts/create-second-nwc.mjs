async function main() {
  const password = "Bruana<3";
  const url = "http://localhost:8085";

  // 1. Unlock to get JWT
  const unlockRes = await fetch(`${url}/api/unlock`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      unlockPassword: password,
      permission: "full",
      tokenExpiryDays: 30,
    }),
  });

  if (!unlockRes.ok) {
    throw new Error(`Failed to unlock Alby Hub: ${unlockRes.status} ${await unlockRes.text()}`);
  }

  const { token } = await unlockRes.json();
  console.log("✓ Unlocked Alby Hub and obtained JWT.");

  // 2. Create second connection
  const createAppRes = await fetch(`${url}/api/apps`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: "ET-COSMIC-2",
      pubkey: "",
      maxAmountSat: 50000,
      budgetRenewal: "daily",
      scopes: ["get_info", "get_balance", "list_transactions", "make_invoice"],
      isolated: false,
    }),
  });

  if (!createAppRes.ok) {
    throw new Error(`Failed to create app connection: ${createAppRes.status} ${await createAppRes.text()}`);
  }

  const appData = await createAppRes.json();
  console.log("✓ Created second NWC app connection.");
  console.log(`Pairing URI: ${appData.pairingUri}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
