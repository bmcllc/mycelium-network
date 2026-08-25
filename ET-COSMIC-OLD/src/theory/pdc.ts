/**
 * PDC 5.2 — bare-metal: PRNG, ECS, Morton 2D/3D, arena, Kalman, Bresenham voxel.
 */

export const PDC_ARENA_SLOTS = 256;

function popcount32(n: number): number {
  let v = n >>> 0;
  let c = 0;
  while (v) {
    c += v & 1;
    v >>>= 1;
  }
  return c;
}

export function pdcXorshift(state: number): { value: number; state: number } {
  let x = state >>> 0 || 0x9e3779b9;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return { value: (x >>> 0) / 0xffffffff, state: x >>> 0 };
}

export function pdcEcsMatch(entityMask: number, systemMask: number): boolean {
  return (entityMask & systemMask) === systemMask;
}

export function pdcMorton2D(x: number, y: number, bits = 8): number {
  let z = 0;
  const mx = Math.max(0, Math.min((1 << bits) - 1, x | 0));
  const my = Math.max(0, Math.min((1 << bits) - 1, y | 0));
  for (let i = 0; i < bits; i++) {
    z |= ((mx >> i) & 1) << (2 * i);
    z |= ((my >> i) & 1) << (2 * i + 1);
  }
  return z;
}

export function pdcMorton3D(x: number, y: number, z: number, bits = 6): number {
  let m = 0;
  const cx = Math.max(0, Math.min((1 << bits) - 1, x | 0));
  const cy = Math.max(0, Math.min((1 << bits) - 1, y | 0));
  const cz = Math.max(0, Math.min((1 << bits) - 1, z | 0));
  for (let i = 0; i < bits; i++) {
    m |= ((cx >> i) & 1) << (3 * i);
    m |= ((cy >> i) & 1) << (3 * i + 1);
    m |= ((cz >> i) & 1) << (3 * i + 2);
  }
  return m;
}

export function pdcJustPressed(current: number, previous: number): number {
  return (current >>> 0) & ~(previous >>> 0);
}

export function q16FromFloat(f: number): number {
  return (Math.round(f * 65536) | 0) >>> 0;
}

export function q16ToFloat(q: number): number {
  const signed = (q | 0) >> 16;
  return signed + ((q & 0xffff) / 65536);
}

export function pdcKalmanPoor(state: number, raw: number, shift = 3): number {
  return state + ((raw - state) >> shift);
}

export function pdcArenaAlloc(bitmap: number): { slot: number; bitmap: number } | null {
  const inv = (~bitmap) >>> 0;
  if (inv === 0) return null;
  const slot = Math.clz32(inv) ^ 31;
  return { slot, bitmap: bitmap | (1 << slot) };
}

export function pdcArenaFree(bitmap: number, slot: number): number {
  if (slot < 0 || slot >= 32) return bitmap;
  return (bitmap & ~(1 << slot)) >>> 0;
}

/** Bresenham 3D — voxels ao longo do segmento. */
export function pdcBresenham3D(
  x0: number,
  y0: number,
  z0: number,
  x1: number,
  y1: number,
  z1: number,
): Array<[number, number, number]> {
  const pts: Array<[number, number, number]> = [];
  let x = x0 | 0;
  let y = y0 | 0;
  let z = z0 | 0;
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const dz = Math.abs(z1 - z0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  const sz = z0 < z1 ? 1 : -1;
  let err1 = (dx > dy ? dx : -dy) / 2;
  let err2 = (dx > dz ? dx : -dz) / 2;

  for (;;) {
    pts.push([x, y, z]);
    if (x === (x1 | 0) && y === (y1 | 0) && z === (z1 | 0)) break;
    const e2a = err1;
    const e2b = err2;
    if (e2a > -dx) {
      err1 -= dy;
      x += sx;
    }
    if (e2a < dy) {
      err1 += dx;
      y += sy;
    }
    if (e2b > -dx) {
      err2 -= dz;
      x += sx;
    }
    if (e2b < dz) {
      err2 += dx;
      z += sz;
    }
    if (pts.length > 512) break;
  }
  return pts;
}

export interface EcsEntity {
  id: number;
  mask: number;
  position: [number, number, number];
}

export interface PdcFrame {
  prngState: number;
  arenaBitmap: number;
  kalmanState: number;
  ecsMatches: number;
  mortonIndex: number;
  morton3d: number;
  justPressed: number;
  voxelCount: number;
  arenaSlotsUsed: number;
}

export interface PdcSubsystemState extends PdcFrame {
  entities: EcsEntity[];
  voxelKeys: number[];
  coroutineStep: number;
}

export class PdcSubsystem {
  prngState: number;
  arenaBitmap = 0;
  kalmanQ16 = 0;
  entities: EcsEntity[] = [];
  voxelKeys: number[] = [];
  coroutineStep = 0;

  constructor(seed: number) {
    this.prngState = seed >>> 0 || 0x9e3779b9;
  }

  /** Corrotina: um estágio por chamada (spawn → voxelize → ecs). */
  tick(material: Uint8Array, resolution: number): PdcSubsystemState {
    const u = (i: number) => (material[i % material.length] ?? 0) / 255;
    const stage = this.coroutineStep % 3;

    if (stage === 0) {
      const count = 4 + (resolution % 8);
      for (let i = 0; i < count; i++) {
        const a = pdcArenaAlloc(this.arenaBitmap);
        if (!a) break;
        this.arenaBitmap = a.bitmap;
        const { value, state } = pdcXorshift(this.prngState);
        this.prngState = state;
        this.entities.push({
          id: i,
          mask: (material[i]! << 4) | (i & 0xf),
          position: [value * 32, u(i + 1) * 32, u(i + 2) * 32],
        });
      }
    } else if (stage === 1) {
      const e = this.entities[0];
      if (e) {
        const [x0, y0, z0] = e.position.map((v) => Math.floor(v)) as [number, number, number];
        const voxels = pdcBresenham3D(x0, y0, z0, x0 + 8, y0 + 4, z0 + 6);
        this.voxelKeys = voxels.map(([x, y, z]) => pdcMorton3D(x, y, z));
      }
    } else {
      const systemMask = 0b0101;
      let matches = 0;
      for (const ent of this.entities) {
        if (pdcEcsMatch(ent.mask & 0xffff, systemMask)) matches++;
      }
      this.kalmanQ16 = pdcKalmanPoor(this.kalmanQ16, q16FromFloat(u(7)), 3);
    }

    this.coroutineStep++;

    const x = Math.floor(u(3) * 255);
    const y = Math.floor(u(4) * 255);
    const z = Math.floor(u(5) * 63);
    const current = material[5]!;
    const previous = material[6]!;
    let ecsMatches = 0;
    const systemMask = 0b0101;
    for (const ent of this.entities) {
      if (pdcEcsMatch(ent.mask & 0xffff, systemMask)) ecsMatches++;
    }

    return {
      prngState: this.prngState,
      arenaBitmap: this.arenaBitmap,
      kalmanState: this.kalmanQ16,
      ecsMatches,
      mortonIndex: pdcMorton2D(x, y),
      morton3d: pdcMorton3D(x, y, z),
      justPressed: pdcJustPressed(current, previous),
      voxelCount: this.voxelKeys.length,
      arenaSlotsUsed: popcount32(this.arenaBitmap),
      entities: [...this.entities],
      voxelKeys: [...this.voxelKeys],
      coroutineStep: this.coroutineStep,
    };
  }
}

export function runPdcFrame(material: Uint8Array, resolution: number): PdcFrame {
  const sub = new PdcSubsystem((resolution * 0x9e3779b9) ^ (material[0]! << 24));
  for (let i = 0; i < 3; i++) sub.tick(material, resolution);
  const s = sub.tick(material, resolution);
  const { entities: _e, voxelKeys: _v, coroutineStep: _c, ...frame } = s;
  return frame;
}
