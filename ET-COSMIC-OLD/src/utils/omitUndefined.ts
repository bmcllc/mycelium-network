/**
 * Remove chaves `undefined` — necessário com exactOptionalPropertyTypes.
 */
export function omitUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(obj) as (keyof T)[]) {
    const v = obj[key];
    if (v !== undefined) out[key as string] = v;
  }
  return out as Partial<T>;
}
