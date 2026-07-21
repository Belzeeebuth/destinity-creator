// PRNG déterministe (mulberry32) : permet de rejouer une carrière à l'identique
// à partir d'une seed (défi quotidien, défi entre amis, mode histoire).
export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(input: string): number {
  let h = 1779033703 ^ input.length;
  for (let i = 0; i < input.length; i++) {
    h = Math.imul(h ^ input.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

export function newRandomSeed(): number {
  return Math.floor(Math.random() * 4294967296);
}

export function randInt(rng: Rng, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

export function pick<T>(rng: Rng, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

export function weightedPick<T>(rng: Rng, items: { item: T; weight: number }[]): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = rng() * total;
  for (const i of items) {
    r -= i.weight;
    if (r <= 0) return i.item;
  }
  return items[items.length - 1].item;
}

export function chance(rng: Rng, probability: number): boolean {
  return rng() < probability;
}

// --- Variante "carrier" : l'état aléatoire vit dans un objet simple (state.rngState),
// ce qui rend toute la simulation de carrière trivialement sérialisable en JSON
// (sauvegarde localStorage, reprise de partie, défi entre amis via seed partagée).
export interface RngCarrier {
  rngState: number;
}

export function nextFloat(carrier: RngCarrier): number {
  let a = carrier.rngState | 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  carrier.rngState = a;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function nextInt(carrier: RngCarrier, min: number, max: number): number {
  return Math.floor(nextFloat(carrier) * (max - min + 1)) + min;
}

export function nextChance(carrier: RngCarrier, probability: number): boolean {
  return nextFloat(carrier) < probability;
}

export function nextPick<T>(carrier: RngCarrier, arr: T[]): T {
  return arr[Math.floor(nextFloat(carrier) * arr.length)];
}

export function nextWeightedPick<T>(carrier: RngCarrier, items: { item: T; weight: number }[]): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = nextFloat(carrier) * total;
  for (const i of items) {
    r -= i.weight;
    if (r <= 0) return i.item;
  }
  return items[items.length - 1].item;
}

// Adapte un état sérialisable (portant rngState) en Rng "classique" à passer partout
// où une simple fonction rng() est attendue : chaque appel avance et persiste l'état.
export function rngFromCarrier(carrier: RngCarrier): Rng {
  return () => nextFloat(carrier);
}
