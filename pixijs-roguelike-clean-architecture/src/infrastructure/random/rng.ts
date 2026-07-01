// ============================================================================
// INFRASTRUCTURE LAYER — seeded pseudo-random number generator.
// Pure technical utility, no game rules here.
// ============================================================================

export class RNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /** Returns a float in [0, 1). */
  next(): number {
    // mulberry32
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /** Returns true with probability p (0..1). */
  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(arr: readonly T[]): T {
    return arr[this.int(0, arr.length - 1)];
  }

  pickWeighted<T>(entries: Array<{ item: T; weight: number }>): T {
    const total = entries.reduce((sum, e) => sum + e.weight, 0);
    let roll = this.next() * total;
    for (const entry of entries) {
      roll -= entry.weight;
      if (roll <= 0) return entry.item;
    }
    return entries[entries.length - 1].item;
  }

  static createSeed(): number {
    return Math.floor(Math.random() * 2 ** 31);
  }
}
