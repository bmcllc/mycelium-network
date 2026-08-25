/**
 * Registo de DATs mintados — persistência opcional.
 */
import crypto from "crypto";
import { createPersistedStore, registerEconomyFlusher } from "../economy/economyPersistence.js";

const datStore = createPersistedStore("mesh-dats.json", { idField: "datId" });
registerEconomyFlusher(datStore.flush);

export function registerDat(dat) {
  const datId = dat.datId ?? `dat-${crypto.randomBytes(8).toString("hex")}`;
  const record = {
    ...dat,
    datId,
    consumedUnits: 0,
    status: "active",
    registeredAt: Date.now(),
  };
  datStore.map.set(datId, record);
  datStore.schedule();
  return record;
}

export function getDat(datId) {
  const dat = datStore.map.get(datId);
  if (!dat) return { error: "DAT_NOT_FOUND" };
  return dat;
}

export function markDatConsumed(datId, units) {
  const dat = datStore.map.get(datId);
  if (!dat) return { error: "DAT_NOT_FOUND" };
  dat.consumedUnits = (dat.consumedUnits ?? 0) + units;
  datStore.schedule();
  return dat;
}

export function listDats(limit = 50) {
  return [...datStore.map.values()]
    .sort((a, b) => (b.registeredAt ?? 0) - (a.registeredAt ?? 0))
    .slice(0, limit);
}
