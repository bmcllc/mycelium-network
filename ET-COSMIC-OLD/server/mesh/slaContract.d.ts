export function createSlaCommitment(body?: Record<string, unknown>): Record<string, unknown>;
export function submitUptimeProof(body?: Record<string, unknown>): Record<string, unknown>;
export function evaluateSlaCommitment(commitmentId: string, now?: number): Record<string, unknown>;
export function getSlaCommitment(commitmentId: string): Record<string, unknown>;
export function listSlaCommitments(providerId?: string): Record<string, unknown>[];
