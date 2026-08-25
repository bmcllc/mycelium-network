/**
 * Recibos de consentimento em OPFS (PMU §3.2 + §6)
 */

import {
  AMP_CONSENT_VERSION,
  canonicalReceipt,
  hashReceipt,
  type ConsentReceipt,
  type LatticeLevel,
} from "./consentLattice";

const OPFS_FILE = "amp_consent_receipt.json";
const LS_FALLBACK = "amp_consent_receipt_v1";

async function readOpfs(): Promise<ConsentReceipt | null> {
  if (typeof navigator === "undefined" || !navigator.storage?.getDirectory) {
    return null;
  }
  try {
    const root = await navigator.storage.getDirectory();
    const file = await root.getFileHandle(OPFS_FILE);
    const blob = await (await file.getFile()).text();
    const parsed = JSON.parse(blob) as ConsentReceipt;
    if (
      typeof parsed?.maxLevelGranted !== "number" ||
      parsed.revokedAt != null
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

async function writeOpfs(receipt: ConsentReceipt): Promise<void> {
  const root = await navigator.storage.getDirectory();
  const file = await root.getFileHandle(OPFS_FILE, { create: true });
  const w = await file.createWritable();
  await w.write(JSON.stringify(receipt));
  await w.close();
}

export class ConsentReceiptStore {
  private static instance: ConsentReceiptStore;
  private receipt: ConsentReceipt | null = null;

  public static getInstance(): ConsentReceiptStore {
    if (!ConsentReceiptStore.instance) {
      ConsentReceiptStore.instance = new ConsentReceiptStore();
    }
    return ConsentReceiptStore.instance;
  }

  private constructor() {
    this.loadSync();
  }

  private loadSync(): void {
    try {
      const raw = localStorage.getItem(LS_FALLBACK);
      if (raw) this.receipt = JSON.parse(raw) as ConsentReceipt;
    } catch {
      this.receipt = null;
    }
  }

  async hydrateFromOpfs(): Promise<void> {
    const opfs = await readOpfs();
    if (!opfs || opfs.revokedAt) return;
    this.receipt = opfs;
    try {
      localStorage.setItem(LS_FALLBACK, JSON.stringify(opfs));
    } catch {
      /* quota — recibo em RAM basta para este ciclo */
    }
  }

  getReceipt(): ConsentReceipt | null {
    return this.receipt?.revokedAt ? null : this.receipt;
  }

  getMaxLevel(): LatticeLevel {
    return this.getReceipt()?.maxLevelGranted ?? 0;
  }

  async sign(
    maxLevelGranted: LatticeLevel,
    grantedScopeKeys: string[] = [],
  ): Promise<ConsentReceipt> {
    const signedAt = Date.now();
    const payload = canonicalReceipt(maxLevelGranted, signedAt);
    this.receipt = {
      version: AMP_CONSENT_VERSION,
      maxLevelGranted,
      grantedScopeKeys,
      signedAt,
      locale: typeof navigator !== "undefined" ? navigator.language : "pt-BR",
      receiptHash: hashReceipt(payload),
      revokedAt: null,
    };
    localStorage.setItem(LS_FALLBACK, JSON.stringify(this.receipt));
    try {
      await writeOpfs(this.receipt);
    } catch {
      /* OPFS indisponível — localStorage basta em dev */
    }
    return this.receipt;
  }

  async revoke(): Promise<void> {
    if (this.receipt) {
      this.receipt.revokedAt = Date.now();
      localStorage.setItem(LS_FALLBACK, JSON.stringify(this.receipt));
    }
    this.receipt = null;
    localStorage.removeItem(LS_FALLBACK);
  }

  exportJson(): string {
    return JSON.stringify(this.getReceipt(), null, 2);
  }

  /** Apenas testes — zera singleton e persistência. */
  static resetForTests(): void {
    localStorage.removeItem(LS_FALLBACK);
    delete (ConsentReceiptStore as unknown as { instance?: ConsentReceiptStore }).instance;
  }
}

export const consentReceiptStore = ConsentReceiptStore.getInstance();
