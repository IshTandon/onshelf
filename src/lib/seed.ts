/** Mulberry32 seeded PRNG */
export function createRng(seed: number) {
  let s = seed >>> 0;
  return {
    next(): number {
      s += 0x6d2b79f5;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    int(min: number, max: number): number {
      return Math.floor(this.next() * (max - min + 1)) + min;
    },
    float(min: number, max: number): number {
      return this.next() * (max - min) + min;
    },
    pick<T>(arr: T[]): T {
      return arr[this.int(0, arr.length - 1)];
    },
    chance(p: number): boolean {
      return this.next() < p;
    },
    gaussian(mean: number, std: number): number {
      const u1 = this.next();
      const u2 = this.next();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      return mean + z * std;
    },
  };
}

export function parseSeedFromUrl(): number {
  if (typeof window === "undefined") return 42;
  const params = new URLSearchParams(window.location.search);
  const s = params.get("seed");
  if (s) {
    const n = parseInt(s, 10);
    if (!isNaN(n)) return n;
  }
  return 42;
}
