/**
 * Deterministic PRNG for consistent rendering between SSR and client.
 * Uses mulberry32 algorithm with fixed seed.
 */

export function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fixed seed for campus vegetation distribution */
export const CAMPUS_SEED = 0xc0ffee;

/** Create a seeded random function */
export const seededRandom = mulberry32(CAMPUS_SEED);

/** Hash a string to a number for deterministic per-entity randomness */
export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/** Create a deterministic random function from a string key */
export function keyedRandom(key: string): () => number {
  const seed = hashString(key);
  return mulberry32(seed);
}
