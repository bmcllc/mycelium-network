/**
 * Lieb-Robinson + colapso Anderson (server AQRE).
 */

export function liebRobinsonLimit(J = 1) {
  return 2 * J;
}

export function evaluateLiebRobinson(spreadRate, J = 1) {
  const vLR = liebRobinsonLimit(J);
  const violated = spreadRate > vLR;
  return {
    vLR,
    spreadRate,
    violated,
    safetyState: violated ? "anderson_cage" : "normal",
  };
}

export function andersonCollapseRoute() {
  return {
    safetyState: "anderson_cage",
    channelOrder: ["HCN_MESH", "WEBRTC", "LoRa", "BLE"],
    disclaimer: "Colapso para Jaula de Anderson — rota conservadora",
  };
}
