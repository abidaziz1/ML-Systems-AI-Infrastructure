/*
 * sim.js: shared toy simulation for Paper 2 (TVM).
 *
 * A 16 x 16 matrix multiply C += A * B is run as a loop nest, and every memory access goes
 * through a small fully associative LRU cache. That gives real cache-miss counts for any loop
 * order and tile sizes. Vectorizing and unrolling are added with simple analytic rules.
 * Together they form a "schedule space" of 6 orders x 125 tilings x 3 vector widths x 4 unroll
 * factors = 9000 configurations. This is a teaching model, not a hardware model.
 *
 * The module works in the browser (window.TVMSIM) and in Node (module.exports) so it can be tested.
 */
(function (root) {
  'use strict';

  var N = 16; /* matrix size */
  var LINE = 4; /* elements per cache line */
  var CAP = 16; /* cache capacity in lines */
  var MISS = 20; /* cycles for a miss, a hit costs 1 */
  var TILES = [1, 2, 4, 8, 16];
  var VECS = [1, 4, 8];
  var UNROLLS = [1, 2, 4, 8];
  var VARS = ['i', 'j', 'k'];

  function perms(a) {
    if (a.length <= 1) return [a];
    var out = [];
    a.forEach(function (x, i) {
      perms(a.filter(function (_, j) { return j !== i; })).forEach(function (p) {
        out.push([x].concat(p));
      });
    });
    return out;
  }
  var PERMS = perms(VARS);

  /* ---------- Cache simulation of the tiled loop nest ---------- */
  var memo = {};
  function simulate(order, t) {
    var key = order.join('') + '|' + t.i + ',' + t.j + ',' + t.k;
    if (memo[key]) return memo[key];
    var lines = new Int32Array(CAP).fill(-1); /* most recently used first */
    var misses = 0;
    var accesses = 0;
    function touch(addr) {
      var line = (addr / LINE) | 0;
      accesses++;
      var pos = -1;
      for (var q = 0; q < CAP; q++) {
        if (lines[q] === line) {
          pos = q;
          break;
        }
      }
      if (pos === -1) {
        misses++;
        pos = CAP - 1;
      }
      for (var r = pos; r > 0; r--) lines[r] = lines[r - 1];
      lines[0] = line;
    }
    var A = 0;
    var B = N * N;
    var C = 2 * N * N;
    var idx = { i: 0, j: 0, k: 0 };
    var base = { i: 0, j: 0, k: 0 };
    var o = order;
    for (var a = 0; a < N; a += t[o[0]]) {
      base[o[0]] = a;
      for (var b = 0; b < N; b += t[o[1]]) {
        base[o[1]] = b;
        for (var c = 0; c < N; c += t[o[2]]) {
          base[o[2]] = c;
          for (var a2 = 0; a2 < t[o[0]]; a2++) {
            idx[o[0]] = base[o[0]] + a2;
            for (var b2 = 0; b2 < t[o[1]]; b2++) {
              idx[o[1]] = base[o[1]] + b2;
              for (var c2 = 0; c2 < t[o[2]]; c2++) {
                idx[o[2]] = base[o[2]] + c2;
                touch(A + idx.i * N + idx.k);
                touch(B + idx.k * N + idx.j);
                touch(C + idx.i * N + idx.j);
              }
            }
          }
        }
      }
    }
    var res = { misses: misses, accesses: accesses };
    memo[key] = res;
    return res;
  }

  /* ---------- Cost of a full schedule ---------- */
  function cost(order, t, vec, unroll) {
    var s = simulate(order, t);
    var iters = N * N * N;
    var innerVar = order[2];
    var innerTile = t[innerVar];
    var vecEff = innerVar === 'j' ? Math.min(vec, innerTile) : 1; /* only unit-stride j vectorizes */
    var unrEff = Math.min(unroll, innerTile);
    var hits = s.accesses - s.misses;
    var parts = {
      compute: iters / vecEff,
      overhead: iters / (unrEff * vecEff),
      hits: hits,
      misses: s.misses * MISS
    };
    parts.total = parts.compute + parts.overhead + parts.hits + parts.misses;
    parts.missCount = s.misses;
    parts.accesses = s.accesses;
    parts.vecEff = vecEff;
    parts.unrEff = unrEff;
    return parts;
  }

  /* ---------- The whole schedule space (9000 configs), built once on demand ---------- */
  var space = null;
  function buildSpace() {
    if (space) return space;
    var out = [];
    PERMS.forEach(function (order, oi) {
      TILES.forEach(function (ti) {
        TILES.forEach(function (tj) {
          TILES.forEach(function (tk) {
            VECS.forEach(function (vec) {
              UNROLLS.forEach(function (unroll) {
                var t = { i: ti, j: tj, k: tk };
                out.push({ oi: oi, order: order, ti: ti, tj: tj, tk: tk, vec: vec, unroll: unroll, cost: cost(order, t, vec, unroll).total });
              });
            });
          });
        });
      });
    });
    space = out;
    return out;
  }

  function features(c) {
    var lg = Math.log2;
    var f = [];
    for (var q = 0; q < PERMS.length; q++) f.push(c.oi === q ? 1 : 0);
    var inner = c.order[2];
    VARS.forEach(function (v) { f.push(inner === v ? 1 : 0); });
    f.push(lg(c.ti), lg(c.tj), lg(c.tk));
    f.push(lg(c.ti * c.tk + c.tk * c.tj + c.ti * c.tj)); /* tile working set */
    f.push(lg(c.vec), lg(c.unroll));
    var innerTile = c['t' + inner];
    f.push(lg(innerTile));
    f.push(inner === 'j' ? lg(Math.min(c.vec, innerTile)) : 0);
    return f;
  }

  /* ---------- A small gradient-boosted regression tree model ---------- */
  function fitTree(X, y, depth) {
    function build(idx, d) {
      var sum = 0;
      idx.forEach(function (i) { sum += y[i]; });
      var mean = sum / idx.length;
      if (d === 0 || idx.length < 4) return { leaf: mean };
      var bestGain = 0;
      var bestF = -1;
      var bestT = 0;
      var base = 0;
      idx.forEach(function (i) { base += (y[i] - mean) * (y[i] - mean); });
      for (var f = 0; f < X[0].length; f++) {
        var seen = {};
        var vals = [];
        idx.forEach(function (i) {
          var v = X[i][f];
          if (!seen[v]) {
            seen[v] = true;
            vals.push(v);
          }
        });
        vals.sort(function (p, q) { return p - q; });
        for (var v = 0; v < vals.length - 1; v++) {
          var thr = (vals[v] + vals[v + 1]) / 2;
          var sl = 0;
          var sr = 0;
          var nl = 0;
          var nr = 0;
          idx.forEach(function (i) {
            if (X[i][f] <= thr) {
              sl += y[i];
              nl++;
            } else {
              sr += y[i];
              nr++;
            }
          });
          if (!nl || !nr) continue;
          var ml = sl / nl;
          var mr = sr / nr;
          var sse = 0;
          idx.forEach(function (i) {
            var m = X[i][f] <= thr ? ml : mr;
            sse += (y[i] - m) * (y[i] - m);
          });
          if (base - sse > bestGain) {
            bestGain = base - sse;
            bestF = f;
            bestT = thr;
          }
        }
      }
      if (bestF < 0) return { leaf: mean };
      var L = [];
      var R = [];
      idx.forEach(function (i) { (X[i][bestF] <= bestT ? L : R).push(i); });
      return { f: bestF, t: bestT, l: build(L, d - 1), r: build(R, d - 1) };
    }
    return build(X.map(function (_, i) { return i; }), depth);
  }
  function predictTree(t, x) {
    while (t.leaf === undefined) t = x[t.f] <= t.t ? t.l : t.r;
    return t.leaf;
  }
  function fitBoost(X, y, rounds, lr, depth) {
    rounds = rounds || 40;
    lr = lr || 0.3;
    depth = depth || 3;
    var mean = y.reduce(function (a, b) { return a + b; }, 0) / y.length;
    var trees = [];
    var res = y.map(function (v) { return v - mean; });
    for (var r = 0; r < rounds; r++) {
      var t = fitTree(X, res, depth);
      trees.push(t);
      res = res.map(function (v, i) { return v - lr * predictTree(t, X[i]); });
    }
    return function (x) {
      var s = mean;
      for (var q = 0; q < trees.length; q++) s += lr * predictTree(trees[q], x);
      return s;
    };
  }

  function spearman(a, b) {
    function ranks(v) {
      var idx = v.map(function (x, i) { return [x, i]; }).sort(function (p, q) { return p[0] - q[0]; });
      var r = new Array(v.length);
      idx.forEach(function (p, k) { r[p[1]] = k; });
      return r;
    }
    var ra = ranks(a);
    var rb = ranks(b);
    var n = a.length;
    var d = 0;
    for (var i = 0; i < n; i++) d += (ra[i] - rb[i]) * (ra[i] - rb[i]);
    return 1 - (6 * d) / (n * (n * n - 1));
  }

  var api = {
    N: N, LINE: LINE, CAP: CAP, MISS: MISS, TILES: TILES, VECS: VECS, UNROLLS: UNROLLS, VARS: VARS, PERMS: PERMS,
    simulate: simulate, cost: cost, buildSpace: buildSpace, features: features, fitBoost: fitBoost, spearman: spearman
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TVMSIM = api;
})(typeof window !== 'undefined' ? window : globalThis);
