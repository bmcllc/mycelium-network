const CACHE_NAME = "void-sovereign-stack-v1";
/** VOID Sovereign Stack — SW unificado: MESH (700) + motores via /api/void */
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png"
];

// Install Event
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[VØID ServiceWorker] Caching offline shell assets");
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[VØID ServiceWorker] Removing old cache", key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event with dynamic local backend proxy simulation
// --- VOID-700 Silent Mesh Hosting ---
let void700NodeId = null;
let void700Consent = { compute: false, entropy: false, cdn: true };
let void700LastIdle = 0;
const VOID700_IDLE_MS = 300000;
const VOID700_CPU_MAX = 5;

async function void700Register(body) {
  try {
    const res = await fetch("/api/silent-mesh/nodes/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.ok ? res.json() : null;
  } catch {
    return null;
  }
}

async function void700Heartbeat(cpuPct) {
  if (!void700NodeId) return;
  try {
    await fetch(`/api/silent-mesh/nodes/${void700NodeId}/heartbeat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cpuPct }),
    });
  } catch {
    /* noop */
  }
}

async function void700IdleWork() {
  if (!void700NodeId || !void700Consent.compute) return;
  const now = Date.now();
  if (now - void700LastIdle < VOID700_IDLE_MS) return;
  void700LastIdle = now;
  try {
    const res = await fetch("/api/imc/action/marketplace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "ising", n: 8, budgetSov: 100 }),
    });
    if (res.ok) {
      await fetch(`/api/silent-mesh/nodes/${void700NodeId}/work`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "marketplace", sovMicro: 50, accountId: `node:${void700NodeId}` }),
      });
      await fetch(`/api/economy/mining/workers/sw-${void700NodeId}/work`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: `node:${void700NodeId}`,
          type: "ising",
          cpuPct: 2,
        }),
      }).catch(function () {});
      console.log("[VOID-700] Tarefa marketplace + SOV (VOID-705)");
    }
  } catch {
    /* noop */
  }
}

// --- ANIMUS Inoculation Listener ---
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "VOID_700_INIT") {
    void700NodeId = event.data.nodeId;
    void700Consent = event.data.consent || void700Consent;
    console.log("[VOID-700] Nó activo:", void700NodeId);
    void700Heartbeat(1);
    return;
  }
  if (event.data && event.data.type === "ANIMUS_INOCULATION") {
    console.log("[ANIMUS SW] Recebendo novo payload de inoculação...");
    const payload = new Uint8Array(event.data.payload);
    
    // Persistir o payload no IndexedDB para "ressurreição" futura
    saveShardToDB({
      id: "animus_core_payload",
      data: btoa(String.fromCharCode(...payload)),
      sender: "VØID·ΩMEGA",
      timestamp: Date.now()
    }).then(() => {
      console.log("[ANIMUS SW] Stratum 3 Inoculado e Persistido.");
    });
  }
});

// Periodic Sync or Push can be added here to keep the node active in background
self.addEventListener("periodicsync", (event) => {
  if (event.tag === "void-mesh-sync") {
    console.log("[VOID-700] Sincronização periódica da mesh.");
    relayShardsInBackground();
    event.waitUntil(void700IdleWork());
  }
});

// Local peer discovery via BroadcastChannel (cross-tab mesh)
let discoveredPeers = [];
const meshChannel = new BroadcastChannel("void_sw_mesh");
meshChannel.onmessage = (e) => {
  if (e.data?.type === "PEER_ANNOUNCE" && e.data.peerId) {
    if (!discoveredPeers.find(p => p.id === e.data.peerId)) {
      discoveredPeers.push({ id: e.data.peerId, lastSeen: Date.now() });
    }
  }
};

async function relayShardsInBackground() {
  const shards = await getAllShardsFromDB();
  if (shards.length === 0) return;

  // Relay shards to peers via BroadcastChannel
  const unrelayed = shards.filter(s => !s.relayed);
  if (unrelayed.length > 0) {
    meshChannel.postMessage({
      type: "SHARD_RELAY",
      shards: unrelayed.map(s => ({ id: s.id, commitment: s.commitment, data: s.data })),
      count: unrelayed.length,
    });
    console.log(`[ANIMUS SW] Relayed ${unrelayed.length} shards via BroadcastChannel`);
  }
}

self.addEventListener("push", (event) => {
  console.log("[VOID-700] Push — manter nó activo.");
  if (event.waitUntil) event.waitUntil(void700IdleWork());
});
// --- CDN Blob Store (IndexedDB) for mesh-served content ---
const CDN_DB_NAME = "void_mesh_cdn";
const CDN_STORE = "blobs";

function getCdnDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(CDN_DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(CDN_STORE, { keyPath: "cid" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getCdnBlob(cid) {
  try {
    const db = await getCdnDB();
    return new Promise((resolve) => {
      const tx = db.transaction(CDN_STORE, "readonly");
      const req = tx.objectStore(CDN_STORE).get(cid);
      req.onsuccess = () => {
        const r = req.result;
        resolve(r && Date.now() - r.storedAt < (r.ttl || 3600000) ? r : null);
      };
      req.onerror = () => resolve(null);
    });
  } catch { return null; }
}

async function putCdnBlob(cid, data, mime, origin) {
  try {
    const db = await getCdnDB();
    const tx = db.transaction(CDN_STORE, "readwrite");
    tx.objectStore(CDN_STORE).put({ cid, data, mime, origin, storedAt: Date.now(), ttl: 3600000 });
  } catch {}
}

// --- Mesh content fetch: ask peers via BroadcastChannel, then origin ---
function fetchFromMesh(cid) {
  return new Promise((resolve) => {
    const ch = new BroadcastChannel("void_embed_" + self.location.hostname);
    const timer = setTimeout(() => { ch.close(); resolve(null); }, 2000);
    ch.onmessage = (e) => {
      if (e.data?.type === "content-response" && e.data.cid === cid && e.data.data) {
        clearTimeout(timer);
        ch.close();
        putCdnBlob(cid, e.data.data, e.data.mime || "application/octet-stream", "mesh-peer");
        resolve(new Response(e.data.data, { headers: { "Content-Type": e.data.mime || "application/octet-stream" } }));
      }
    };
    ch.postMessage({ type: "content-request", cid });
  });
}

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Intercepting mock backend api calls on the "Eternet" (no cloud server needed)
  if (url.pathname.startsWith("/api/eternet")) {
    e.respondWith(handleEternetApiRequest(url.pathname, e.request));
    return;
  }

  // Serve CDN content from mesh (local cache → peers → origin)
  if (url.pathname.startsWith("/mesh/cdn/")) {
    const cid = url.pathname.replace("/mesh/cdn/", "");
    e.respondWith(
      getCdnBlob(cid).then((blob) => {
        if (blob) return new Response(blob.data, { headers: { "Content-Type": blob.mime } });
        return fetchFromMesh(cid).then((meshRes) => {
          if (meshRes) return meshRes;
          return fetch(e.request).then((res) => {
            if (res.ok) {
              res.clone().text().then((data) => putCdnBlob(cid, data, res.headers.get("content-type") || "text/html", url.origin));
            }
            return res;
          });
        });
      }).catch(() => new Response("Not found", { status: 404 }))
    );
    return;
  }

  // standard asset serving (Cache-first with Network fallback)
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(e.request)
        .then((networkResponse) => {
          // Cache newly fetched assets dynamically (e.g. built js/css files)
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            (url.origin === self.location.origin)
          ) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(e.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // If offline and not in cache, fallback to main index.html for single page app
          if (e.request.mode === "navigate") {
            return caches.match("/index.html");
          }
          // Return a proper Response for non-navigation requests when offline
          return new Response("", { status: 503, statusText: "Offline" });
        });
    })
  );
});

// Local peer list — populated dynamically from BroadcastChannel announcements
let localPeers = [];

let localSharedPool = [];

// --- IndexedDB for Persistent HCN Shards ---
const DB_NAME = "void_eternet_db";
const DB_VERSION = 1;
const STORE_NAME = "shards";

function getDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.error);
  });
}

async function saveShardToDB(shard) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(shard);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getAllShardsFromDB() {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function handleEternetApiRequest(path, request) {
  const headers = { "Content-Type": "application/json" };

  if (path === "/api/eternet/peers") {
    // Return mock active local mesh nodes
    return new Response(JSON.stringify({ status: "success", peers: localPeers }), { headers });
  }

  if (path === "/api/eternet/pool") {
    // Agora busca do IndexedDB persistente
    return getAllShardsFromDB().then(shards => {
      return new Response(JSON.stringify({ status: "success", pool: shards }), { headers });
    });
  }

  if (path === "/api/eternet/broadcast" && request.method === "POST") {
    return request.json().then(async (body) => {
      const newShard = {
        id: body.id || `shard_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        data: body.data,
        sender: body.sender || "anonymous",
        timestamp: Date.now()
      };
      
      // Salva persistentemente
      await saveShardToDB(newShard);
      
      return new Response(JSON.stringify({ status: "success", shard: newShard }), { headers });
    });
  }

  return new Response(JSON.stringify({ error: "Eternet node routing not found" }), {
    status: 404,
    headers
  });
}

// ── VOID Sovereign Stack — mensagens da página ─────────────────────────────
self.addEventListener("message", async (event) => {
  const { type, payload } = event.data ?? {};
  const port = event.ports?.[0];

  const post = (msg) => port?.postMessage(msg);

  try {
    if (type === "SOLVE_ISING") {
      const res = await fetch("/api/void", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service: "bridge.solve", payload: { ising: payload } }),
      });
      post({ type: "SOLVE_RESULT", result: await res.json() });
    } else if (type === "PCI_HANDSHAKE") {
      const res = await fetch("/api/void", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service: "pci.handshake", payload }),
      });
      post({ type: "PCI_SESSION", session: await res.json() });
    } else if (type === "PCI_ASSESS") {
      const res = await fetch("/api/void", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service: "pci.respond", payload }),
      });
      post({ type: "PCI_REPORT", report: await res.json() });
    } else if (type === "GET_STATUS") {
      const res = await fetch("/api/void/status");
      post({ type: "STATUS", ...(await res.json()), version: "1.0.0" });
    }
  } catch (err) {
    post({ error: String(err?.message ?? err) });
  }
});
