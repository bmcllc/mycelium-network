import { Router } from "express";
import {
  silentMeshStatus,
  registerNode,
  heartbeatNode,
  recordNodeWork,
  listNodes,
  publishMeshCdn,
  getMeshCdnSite,
  listMeshCdnSites,
} from "./void700.js";
import { storeCdnBlob, getCdnBlob, listCdnBlobs } from "./cdnStore.js";
import { registerSymbiont, listSymbionts, reportSymbiontWork, getSymbiontStatus } from "./symbioticHost.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok", engine: "SilentMesh", version: "1.0.0", ...silentMeshStatus() });
});

router.get("/status", (_req, res) => {
  res.json(silentMeshStatus());
});

router.get("/nodes", (_req, res) => {
  res.json({ sku: "VOID-702", nodes: listNodes() });
});

router.post("/nodes/register", (req, res) => {
  res.json(registerNode(req.body ?? {}));
});

router.post("/nodes/:nodeId/heartbeat", (req, res) => {
  res.json(heartbeatNode(req.params.nodeId, req.body ?? {}));
});

router.post("/nodes/:nodeId/work", (req, res) => {
  res.json(recordNodeWork(req.params.nodeId, req.body ?? {}));
});

router.get("/cdn/sites", (_req, res) => {
  res.json({ sku: "VOID-701", sites: listMeshCdnSites() });
});

router.post("/cdn/publish", (req, res) => {
  res.json(publishMeshCdn(req.body ?? {}));
});

router.get("/cdn/sites/:siteId", (req, res) => {
  res.json(getMeshCdnSite(req.params.siteId));
});

// ─── CDN Blob Serving (for mesh-served content) ─────────────────────────────

router.post("/cdn/blob", (req, res) => {
  const { cid, data, mime, origin } = req.body ?? {};
  if (!cid || !data) return res.status(400).json({ error: "MISSING_CID_OR_DATA" });
  const blob = storeCdnBlob(cid, data, mime, origin);
  res.json(blob);
});

router.get("/cdn/blob/:cid", (req, res) => {
  const blob = getCdnBlob(req.params.cid);
  if (!blob) return res.status(404).json({ error: "NOT_FOUND" });
  res.set("Content-Type", blob.mime || "application/octet-stream");
  res.set("X-VOID-CDN-CID", blob.cid);
  res.set("X-VOID-CDN-Origin", blob.origin || "unknown");
  res.send(blob.data);
});

router.get("/cdn/blobs", (_req, res) => {
  res.json(listCdnBlobs());
});

// ─── Symbiotic Hosting: borrow resources from other sites ────────────────────

router.get("/symbiotic/status", (_req, res) => {
  res.json(getSymbiontStatus());
});

router.post("/symbiotic/register", (req, res) => {
  res.json(registerSymbiont(req.body ?? {}));
});

router.get("/symbiotic/nodes", (_req, res) => {
  res.json(listSymbionts());
});

router.post("/symbiotic/work", (req, res) => {
  res.json(reportSymbiontWork(req.body ?? {}));
});

export default router;
