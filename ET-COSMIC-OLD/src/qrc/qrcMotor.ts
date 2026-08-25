/**
 * Motor QRC — plano de rota STA + Lieb-Robinson → Anderson.
 */
import type { DistanceBridgeChannel } from "../network/distanceBridge";
import {
  estimateShardDistance,
  estimateSpreadRate,
  evaluateLiebRobinson,
  type LiebRobinsonResult,
  type SafetyState,
  type StaGeodesicResult,
} from "./staGeodesic";
import { resolveStaGeodesic } from "./trajectoryLut.generated";

export interface QrcRoutePlan {
  geodesic: StaGeodesicResult;
  liebRobinson: LiebRobinsonResult;
  safetyState: SafetyState;
  preferredChannel: DistanceBridgeChannel;
  channelOrder: DistanceBridgeChannel[];
  andersonCollapse: boolean;
}

const CHANNEL_BY_COST: DistanceBridgeChannel[] = ["BLE", "LoRa", "HCN_MESH", "WEBRTC"];

function channelOrderForCost(cost: number, safety: SafetyState): DistanceBridgeChannel[] {
  if (safety === "anderson_cage") {
    return ["HCN_MESH", "WEBRTC", "LoRa", "BLE"];
  }
  const idx = Math.min(CHANNEL_BY_COST.length - 1, Math.floor(cost * 2));
  const preferred = CHANNEL_BY_COST[idx] ?? "HCN_MESH";
  const rest = CHANNEL_BY_COST.filter((c) => c !== preferred);
  return [preferred, ...rest];
}

export interface PlanQrcRouteInput {
  shardIndex: number;
  commitment: string;
  J?: number;
  distanceOverride?: number;
}

export function planQrcRoute(input: PlanQrcRouteInput): QrcRoutePlan {
  const distance =
    input.distanceOverride ??
    estimateShardDistance(input.shardIndex, input.commitment);
  const geodesic = resolveStaGeodesic(distance);
  const spreadRate = estimateSpreadRate(input.shardIndex, geodesic.sin2);
  const liebRobinson = evaluateLiebRobinson(spreadRate, input.J ?? 1.0);
  const safetyState = liebRobinson.safetyState;
  const channelOrder = channelOrderForCost(geodesic.effectiveCost, safetyState);
  return {
    geodesic,
    liebRobinson,
    safetyState,
    preferredChannel: channelOrder[0] ?? "HCN_MESH",
    channelOrder,
    andersonCollapse: safetyState === "anderson_cage",
  };
}
