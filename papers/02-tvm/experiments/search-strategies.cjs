/*
 * Experiment behind a sentence in Part 6 of the TVM lesson.
 *
 * Question: on the toy schedule space from sim.js (9,000 schedules), how fast do three search
 * strategies find a good schedule, counting every real measurement as one trial?
 *   random       pick schedules at random
 *   annealing    simulated annealing where every step is a real measurement
 *   model        measure in batches, train the boosted-tree model, let the model rank unmeasured
 *                candidates (annealing on the model), measure the best few, repeat
 *
 * Run:  node papers/02-tvm/experiments/search-strategies.cjs
 * Output: for several trial budgets, the geometric mean of (best cost found / true optimum)
 * over several runs. 1.00 means the optimum was found.
 */
const S = require('../sim.js');

const space = S.buildSpace();
const costs = space.map((c) => c.cost);
const best = Math.min(...costs);
const F = space.map(S.features);
const TRIALS = Number(process.env.TRIALS || 400);
const RUNS = Number(process.env.RUNS || 10);
const BATCH = Number(process.env.BATCH || 16);

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* neighbors: change one knob to an adjacent value */
const key = (c) => [c.oi, c.ti, c.tj, c.tk, c.vec, c.unroll].join('|');
const index = new Map(space.map((c, i) => [key(c), i]));
function neighbors(i) {
  const c = space[i];
  const out = [];
  for (let q = 0; q < S.PERMS.length; q++) if (q !== c.oi) out.push(index.get(key({ ...c, oi: q })));
  [['ti', S.TILES], ['tj', S.TILES], ['tk', S.TILES], ['vec', S.VECS], ['unroll', S.UNROLLS]].forEach(([k, values]) => {
    const p = values.indexOf(c[k]);
    [p - 1, p + 1].forEach((q) => {
      if (q >= 0 && q < values.length) out.push(index.get(key({ ...c, [k]: values[q] })));
    });
  });
  return out;
}
const NB = space.map((_, i) => neighbors(i));

function randomSearch(seed) {
  const r = rng(seed);
  const seen = new Set();
  const curve = [];
  let b = Infinity;
  while (curve.length < TRIALS) {
    const i = Math.floor(r() * space.length);
    if (seen.has(i)) continue;
    seen.add(i);
    b = Math.min(b, costs[i]);
    curve.push(b);
  }
  return curve;
}

function annealing(seed) {
  const r = rng(seed);
  let cur = Math.floor(r() * space.length);
  let curCost = costs[cur];
  const seen = new Set([cur]);
  const curve = [curCost];
  let b = curCost;
  let T = 0.5;
  while (curve.length < TRIALS) {
    let cand;
    let tries = 0;
    do {
      const nb = NB[cur];
      cand = nb[Math.floor(r() * nb.length)];
      tries++;
    } while (seen.has(cand) && tries < 20);
    if (seen.has(cand)) cand = Math.floor(r() * space.length);
    seen.add(cand);
    const d = Math.log(costs[cand] / curCost);
    if (d < 0 || r() < Math.exp(-d / T)) {
      cur = cand;
      curCost = costs[cand];
    }
    b = Math.min(b, costs[cand]);
    curve.push(b);
    T = Math.max(0.05, T * 0.96);
  }
  return curve;
}

function modelGuided(seed) {
  const r = rng(seed);
  const measured = new Map();
  const curve = [];
  let b = Infinity;
  const measure = (i) => {
    if (measured.has(i)) return;
    measured.set(i, costs[i]);
    b = Math.min(b, costs[i]);
    curve.push(b);
  };
  while (measured.size < BATCH) measure(Math.floor(r() * space.length));
  while (measured.size < TRIALS) {
    const idx = [...measured.keys()];
    const model = S.fitBoost(idx.map((i) => F[i]), idx.map((i) => Math.log(measured.get(i))));
    const pool = new Map();
    for (let w = 0; w < 24; w++) {
      let cur = Math.floor(r() * space.length);
      let cp = model(F[cur]);
      let T = 0.5;
      for (let s = 0; s < 80; s++) {
        const nb = NB[cur];
        const cand = nb[Math.floor(r() * nb.length)];
        const p = model(F[cand]);
        if (p < cp || r() < Math.exp(-(p - cp) / T)) {
          cur = cand;
          cp = p;
        }
        T = Math.max(0.02, T * 0.95);
        if (!measured.has(cur)) pool.set(cur, cp);
      }
    }
    const ranked = [...pool.entries()].sort((a, b2) => a[1] - b2[1]).slice(0, BATCH).map((e) => e[0]);
    let added = 0;
    for (const i of ranked) {
      if (measured.size >= TRIALS) break;
      measure(i);
      added++;
    }
    if (!added) measure(Math.floor(r() * space.length));
  }
  return curve.slice(0, TRIALS);
}

function average(fn) {
  const acc = new Array(TRIALS).fill(0);
  for (let s = 1; s <= RUNS; s++) {
    const curve = fn(s * 7919);
    for (let t = 0; t < TRIALS; t++) acc[t] += Math.log(curve[t] / best);
  }
  return acc.map((v) => Math.exp(v / RUNS));
}

const R = average(randomSearch);
const A = average(annealing);
const M = average(modelGuided);
console.log(`schedules: ${space.length}, optimum: ${Math.round(best)} cycles, runs per strategy: ${RUNS}, model batch: ${BATCH}`);
console.log('trials | random | annealing | model     (best found / optimum, geometric mean)');
[16, 32, 64, 96, 128, 200, 300, 400].filter((t) => t <= TRIALS).forEach((t) => {
  console.log(String(t).padStart(6), R[t - 1].toFixed(2).padStart(8), A[t - 1].toFixed(2).padStart(10), M[t - 1].toFixed(2).padStart(9));
});
