/**
 * DAT — Dynamic Access Token (protocol-first, sem contrato jurídico).
 * Assinatura = prova criptográfica de uso + stream de pagamento $SOV.
 */

export type LiquidityPoolId =
  | "POOL-COMPUTE"
  | "POOL-STORAGE"
  | "POOL-AI"
  | "POOL-QUANTUM"
  | "POOL-IDENTITY";

export type AccessTierId = "citizen" | "builder" | "enterprise" | "sovereign";

/** Prova ZK placeholder — integração futura com void_core / PMU. */
export interface ZKProofStub {
  scheme: "ml-dsa" | "pmu-audit" | "stub";
  digestHex: string;
  verified: boolean;
}

export interface DynamicAccessToken {
  /** Identificador único — gerado no mint. */
  datId: string;
  resourceId: string;
  poolId: LiquidityPoolId;
  proofOfWork: ZKProofStub;
  /** Micro-SOV debitados por unidade de uso (pay-per-use). */
  paymentStreamMicro: number;
  expiryBlock: number;
  reputationScore: number;
  tier: AccessTierId;
  issuedAt: number;
}

export interface DATConsumption {
  datId: string;
  units: number;
  grossMicro: number;
  poolFeeMicro: number;
  protocolFeeMicro: number;
  netMicro: number;
  bootstrapBonusMicro?: number;
}

/** SLA code-based — contrato executado por código, sem papel. */
export interface SlaCommitment {
  commitmentId: string;
  providerId: string;
  poolId: LiquidityPoolId;
  /** Uptime mínimo exigido (0–100). */
  uptimeMinPct: number;
  windowMs: number;
  stakeMicro: number;
  heartbeatIntervalMs: number;
  createdAt: number;
  status: "active" | "violated" | "fulfilled";
}

export interface UptimeProof {
  commitmentId: string;
  providerId: string;
  timestamp: number;
  latencyMs: number;
  ok: boolean;
}

export interface SlaVerdict {
  commitmentId: string;
  uptimePct: number;
  requiredPct: number;
  fulfilled: boolean;
  slashedMicro: number;
  bonusMicro: number;
}

/** Registo de provedor para liquidity mining bootstrap. */
export interface LiquidityProvider {
  providerId: string;
  accountId: string;
  poolId: LiquidityPoolId;
  bootstrapEligible: boolean;
  registeredAt: number;
  earnedMicro: number;
  bonusMicro: number;
}
