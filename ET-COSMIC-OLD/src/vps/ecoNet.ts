/**
 * EcoNet client — ipfs://ETRNET/<GhostID>/<cid> (store local por nó).
 */

const PREFIX = "ipfs://ETRNET/";

export interface EcoNetEntry {
  ghostId: string;
  cid: string;
  data: Uint8Array;
  ttlMs: number;
  lastAccess: number;
}

export class EcoNetClient {
  private store = new Map<string, EcoNetEntry>();

  async putAsync(ghostId: string, data: Uint8Array, ttlMs = 3_600_000): Promise<string> {
    const hash = await crypto.subtle.digest("SHA-256", new Uint8Array(data));
    const cid = Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const uri = `${PREFIX}${ghostId}/${cid}`;
    this.store.set(uri, {
      ghostId,
      cid,
      data,
      ttlMs,
      lastAccess: Date.now(),
    });
    return uri;
  }

  /** Liberta entradas em RAM entre ciclos Harmonia (evita crescimento no Android). */
  clear(): void {
    this.store.clear();
  }

  get(uri: string): Uint8Array {
    const entry = this.store.get(uri);
    if (!entry) throw new Error(`EcoNet: não encontrado ${uri}`);
    if (Date.now() - entry.lastAccess > entry.ttlMs) {
      this.store.delete(uri);
      throw new Error(`EcoNet: expirado ${uri}`);
    }
    entry.lastAccess = Date.now();
    return entry.data;
  }

  static parseUri(uri: string): { ghostId: string; cid: string } {
    if (!uri.startsWith(PREFIX)) throw new Error(`URI inválida: ${uri}`);
    const rest = uri.slice(PREFIX.length);
    const slash = rest.indexOf("/");
    if (slash < 0) throw new Error(`URI malformada: ${uri}`);
    return { ghostId: rest.slice(0, slash), cid: rest.slice(slash + 1) };
  }
}
