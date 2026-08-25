#!/usr/bin/env node
/** Exemplo VOID-VPS: auditoria PMU no motor ET-RNET. */
import { fetchPmuAuditFull } from "../dist/pmu/pmuAuditClient.js";

const report = await fetchPmuAuditFull(256);
console.log(JSON.stringify(report, null, 2));
