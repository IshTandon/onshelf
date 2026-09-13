// Quick trace — run with: node debug-facing.mjs
import { createRequire } from "module";
const require = createRequire(import.meta.url);

// Inline minimal reproduction
const BASE = new Date(2026, 8, 13);
function hourToTs(h, m = 0) {
  const d = new Date(BASE);
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

function createRng(seed) {
  let s = seed >>> 0;
  return {
    next() {
      s += 0x6d2b79f5;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    int(min, max) { return Math.floor(this.next() * (max - min + 1)) + min; },
    float(min, max) { return this.next() * (max - min) + min; },
    chance(p) { return this.next() < p; },
    gaussian(mean, std) {
      const u1 = this.next(), u2 = this.next();
      return mean + Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * std;
    },
  };
}

const SEED = 42;
const rng = createRng(SEED);
const dropRate = 0.08 + rng.float(-0.03, 0.04);
const dayStart = hourToTs(6);
const dayEnd = hourToTs(22);
const CHECK = 3 * 60 * 1000;
const gapStart = hourToTs(14, 58);
const currentTs = hourToTs(15, 10);
const GAP_THRESHOLD = 0.6;

const checkTimes = [];
let t = dayStart;
while (t < dayEnd) {
  checkTimes.push(t + rng.int(-45, 45) * 1000);
  t += CHECK;
}

const zoneSignals = [];
for (const checkTs of checkTimes) {
  if (rng.chance(dropRate)) continue;
  const scripted = checkTs >= gapStart && checkTs < hourToTs(16, 0);
  let gapRatio = scripted ? 0.72 + rng.float(-0.05, 0.05) : (rng.chance(0.08) ? rng.float(0.65, 0.9) : rng.float(0, 0.3));
  zoneSignals.push({ ts: checkTs, gapRatio });
}

const recent = zoneSignals.filter(s => s.ts <= currentTs).sort((a,b) => b.ts - a.ts).slice(0, 5);
const seen = recent.filter(s => s.gapRatio > GAP_THRESHOLD).length;
console.log("dropRate", dropRate);
console.log("Recent 5 checks at 15:10:");
for (const s of recent) {
  const d = new Date(s.ts);
  console.log(`  ${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')} gap=${s.gapRatio.toFixed(2)} ${s.gapRatio > GAP_THRESHOLD ? 'SEEN' : ''}`);
}
console.log(`seen=${seen} checks=${recent.length} sustained=${recent.length >= 3 && seen >= 3}`);
