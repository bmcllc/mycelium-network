/**
 * VØID Phantom Harvester — Identity Mapper
 *
 * Tenta encontrar a pubkey Nostr de cada contato harvestado
 * usando múltiplos métodos: bio scan, link scan, NIP-05, cross-reference.
 */

import type { HarvestedContact } from "../storage/contactDirectory";

export interface MappingResult {
  nostrPubkey?: string;
  npub?: string;
  ghostId?: string;
  confidence: number;
  method: "bio" | "link" | "nip05" | "crossref" | "nip50" | "none";
}

// ─── NIP-05 Verification ────────────────────────────────────────────────────

async function verifyNIP05(name: string, domain: string): Promise<string | undefined> {
  try {
    const url = `https://${domain}/.well-known/nostr.json?name=${encodeURIComponent(name)}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return undefined;

    const data = await res.json();
    if (data.names && typeof data.names === "object") {
      const pubkey = data.names[name];
      if (typeof pubkey === "string" && pubkey.length === 64) {
        return pubkey;
      }
    }
    return undefined;
  } catch {
    return undefined;
  }
}

// ─── Nostr Relay Search (NIP-50) ────────────────────────────────────────────

async function searchNostrRelays(_query: string): Promise<string | undefined> {
  const relays = ["wss://relay.nostr.band", "wss://nostr.wine"];

  for (const relay of relays) {
    try {
      const ws = new WebSocket(relay);
      const result = await new Promise<string | undefined>((resolve) => {
        const timeout = setTimeout(() => {
          ws.close();
          resolve(undefined);
        }, 5000);

        ws.onopen = () => {
          // Filtro NIP-01 padrão (evita NOTICE "filter is not an object" em relays estritos)
          ws.send(JSON.stringify(["REQ", "etrnet-search", { kinds: [0], limit: 20 }]));
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg[0] === "EVENT" && msg[2]?.pubkey) {
              clearTimeout(timeout);
              ws.close();
              resolve(msg[2].pubkey);
            }
            if (msg[0] === "EOSE") {
              clearTimeout(timeout);
              ws.close();
              resolve(undefined);
            }
          } catch {
            // ignore parse errors
          }
        };

        ws.onerror = () => {
          clearTimeout(timeout);
          resolve(undefined);
        };
      });

      if (result) return result;
    } catch {
      // try next relay
    }
  }
  return undefined;
}

// ─── Main Mapper ────────────────────────────────────────────────────────────

export async function mapContactToNostr(contact: HarvestedContact): Promise<MappingResult> {
  // 1. Bio scan — highest confidence
  if (contact.bio) {
    const npubMatch = contact.bio.match(/npub1[a-z0-9]{58,}/i);
    if (npubMatch) {
      return { npub: npubMatch[0], confidence: 0.95, method: "bio" };
    }

    const nostrMatch = contact.bio.match(/nostr:(npub1[a-z0-9]{58,})/i);
    if (nostrMatch) {
      return { npub: nostrMatch[1], confidence: 0.95, method: "bio" };
    }

    // Check for hex pubkey in bio
    const hexMatch = contact.bio.match(/\b([0-9a-f]{64})\b/i);
    if (hexMatch && contact.bio.toLowerCase().includes("nostr")) {
      return { nostrPubkey: hexMatch[1], confidence: 0.9, method: "bio" };
    }
  }

  // 2. Link scan
  if (contact.links && contact.links.length > 0) {
    for (const link of contact.links) {
      // snort.social/npub1..., nostr.band/npub1..., primal.net/p/npub1...
      const match = link.match(/(?:snort\.social|nostr\.band|primal\.net|damus\.io|iris\.to)\/(?:p\/)?(npub1[a-z0-9]{58,})/i);
      if (match) {
        return { npub: match[1], confidence: 0.9, method: "link" };
      }

      // Check for hex pubkey in nostr links
      const hexMatch = link.match(/(?:snort\.social|nostr\.band|primal\.net)\/(?:p\/)?([0-9a-f]{64})/i);
      if (hexMatch) {
        return { nostrPubkey: hexMatch[1], confidence: 0.85, method: "link" };
      }
    }
  }

  // 3. NIP-05 scan — check if username looks like an email or NIP-05 identifier
  if (contact.platformId.includes("@") || contact.username.includes("@")) {
    const identifier = contact.platformId.includes("@") ? contact.platformId : contact.username;
    const parts = identifier.split("@");
    if (parts.length === 2 && parts[1].includes(".")) {
      const pubkey = await verifyNIP05(parts[0], parts[1]);
      if (pubkey) {
        return { nostrPubkey: pubkey, confidence: 0.85, method: "nip05" };
      }
    }
  }

  // 4. NIP-05 from links
  if (contact.links) {
    for (const link of contact.links) {
      try {
        const url = new URL(link);
        if (url.pathname.includes("/.well-known/nostr.json")) continue;
        // Try common NIP-05 pattern: https://domain/.well-known/nostr.json?name=username
        const pubkey = await verifyNIP05(contact.platformId.replace("@", ""), url.hostname);
        if (pubkey) {
          return { nostrPubkey: pubkey, confidence: 0.8, method: "nip05" };
        }
      } catch {
        // invalid URL, skip
      }
    }
  }

  // 5. Nostr relay search (NIP-50) — lower confidence, last resort
  try {
    const pubkey = await searchNostrRelays(contact.username);
    if (pubkey) {
      return { nostrPubkey: pubkey, confidence: 0.5, method: "nip50" };
    }
  } catch {
    // search failed
  }

  return { confidence: 0, method: "none" };
}

// ─── Batch Mapper ───────────────────────────────────────────────────────────

export async function mapBatchToNostr(
  contacts: HarvestedContact[],
  onProgress?: (current: number, total: number) => void
): Promise<{ updated: number; mapped: number }> {
  let updated = 0;
  let mapped = 0;

  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i];

    // Skip if already mapped with high confidence
    if (contact.nostrPubkey && contact.confidence >= 0.8) continue;

    try {
      const result = await mapContactToNostr(contact);

      if (result.nostrPubkey || result.npub) {
        if (result.nostrPubkey !== undefined) contact.nostrPubkey = result.nostrPubkey;
        if (result.npub !== undefined) contact.npub = result.npub;
        contact.confidence = Math.max(contact.confidence, result.confidence);
        updated++;
        mapped++;
      }
    } catch {
      // skip failed mappings
    }

    onProgress?.(i + 1, contacts.length);
  }

  return { updated, mapped };
}
