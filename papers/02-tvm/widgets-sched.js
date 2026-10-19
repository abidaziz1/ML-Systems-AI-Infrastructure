/*
 * Widgets for Paper 2 (TVM): fusionLab and cacheLab.
 * fusionLab: group a chain of operators with the paper's fusion rules and count memory traffic.
 * cacheLab: choose loop order, tiling, vectorizing and unrolling for a matrix multiply and see
 *           real cache misses from a small cache simulation (see sim.js).
 */
(function () {
  'use strict';
  var MLS = window.MLS;
  var h = MLS.h;
  var ui = MLS.ui;
  var fmt = MLS.fmt;
  var SIM = window.TVMSIM;

  /* ======================================================================
   * 1. fusionLab
   * ==================================================================== */
  var OPS = {
    conv: { label: 'Conv2D', kind: 'complex', flops: 1152, what: 'complex-out-fusable' },
    bn: { label: 'Batch norm', kind: 'injective', flops: 4, what: 'injective' },
    relu: { label: 'ReLU', kind: 'injective', flops: 1, what: 'injective' },
    add: { label: 'Add bias', kind: 'injective', flops: 1, what: 'injective' },
    sum: { label: 'Sum', kind: 'reduction', flops: 1, what: 'reduction' },
    sort: { label: 'Sort', kind: 'opaque', flops: 20, what: 'opaque' }
  };
  var GROUP_COLORS = ['var(--accent)', 'var(--grad)', 'var(--good)', 'var(--purple)', 'var(--warn)', 'var(--bad)'];
  var PEAK = 4e12; /* flops per second */
  var BW = 250e9; /* bytes per second */
  var LAUNCH = 5e-6; /* seconds per kernel launch */
  var REDUCE_BY = 64;

  /* Group a chain with the fusion rules from the paper. Returns groups and a reason for every op. */
  function group(chain, fuse) {
    var groups = [];
    var reasons = [];
    chain.forEach(function (id, i) {
      var op = OPS[id];
      var g = groups[groups.length - 1];
      var why;
      var join = false;
      if (fuse && g) {
        if (op.kind === 'injective' && (g.type === 'inj' || g.type === 'conv')) {
          join = true;
          why = g.type === 'conv' ? op.label + ' is injective, so it fuses onto the output of the Conv2D before it.' : op.label + ' is injective and the group before it is injective, so they fuse into one.';
        } else if (op.kind === 'reduction' && g.type === 'inj') {
          join = true;
          why = 'A reduction can absorb the injective operators in front of it, so ' + op.label + ' joins the group.';
        }
      }
      if (!join) {
        if (!fuse) why = 'Fusion is off, so ' + op.label + ' gets its own kernel.';
        else if (op.kind === 'opaque') why = op.label + ' is opaque and cannot be fused with anything.';
        else if (op.kind === 'complex') why = i === 0 ? 'Conv2D starts a new group. Injective operators after it can fuse onto its output.' : 'A Conv2D cannot be fused into the previous group, so it starts a new one.';
        else if (g && g.type === 'red') why = op.label + ' comes after a reduction, and nothing fuses onto a reduction\'s output, so it starts a new group.';
        else if (g && g.type === 'opaque') why = 'Nothing fuses with an opaque operator, so ' + op.label + ' starts a new group.';
        else if (g && op.kind === 'reduction' && g.type === 'conv') why = 'Only injective operators fuse onto a Conv2D output, and Sum is a reduction, so it starts a new group.';
        else why = op.label + ' starts a new group.';
        g = { type: op.kind === 'injective' ? 'inj' : op.kind === 'complex' ? 'conv' : op.kind === 'reduction' ? 'red' : 'opaque', ops: [] };
        groups.push(g);
      } else if (op.kind === 'reduction') {
        g.type = 'red'; /* a reduction closes its group */
      }
      g.ops.push(id);
      reasons.push(why);
    });
    return { groups: groups, reasons: reasons };
  }

  /* Cost of a grouping in the toy hardware model. */
  function measure(groups, elems) {
    var bytes = 0;
    var time = 0;
    var cur = elems;
    groups.forEach(function (g) {
      var inElems = cur;
      var flops = 0;
      g.ops.forEach(function (id) {
        flops += OPS[id].flops * cur;
        if (OPS[id].kind === 'reduction') cur = Math.max(1, cur / REDUCE_BY);
      });
      var b = (inElems + cur) * 4;
      bytes += b;
      time += Math.max(flops / PEAK, b / BW) + LAUNCH;
    });
    return { kernels: groups.length, bytes: bytes, time: time };
  }

  MLS.widgets.fusionLab = function (host) {
    var cfg = { chain: ['conv', 'bn', 'relu'], fuse: true, size: 4 };
    var chainBox = h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'stretch', minHeight: '70px' } });
    var reasonList = h('ul', { style: { margin: 0, paddingLeft: '1.2em', fontSize: '0.92rem' } });
    var table = h('tbody');
    var message = ui.msg('');

    function paint() {
      var elems = cfg.size * 1e6;
      var off = group(cfg.chain, false);
      var on = group(cfg.chain, true);
      var shown = cfg.fuse ? on : off;
      var mOff = measure(off.groups, elems);
      var mOn = measure(on.groups, elems);

      chainBox.innerHTML = '';
      if (!cfg.chain.length) chainBox.appendChild(h('span', { style: { color: 'var(--ink-3)' } }, 'Add operators below to build a chain.'));
      shown.groups.forEach(function (g, gi) {
        var color = GROUP_COLORS[gi % GROUP_COLORS.length];
        chainBox.appendChild(
          h('div', { style: { border: '2.5px solid ' + color, borderRadius: '12px', padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: '4px' }, 'aria-label': 'Kernel ' + (gi + 1) },
            h('div', { style: { fontSize: '0.72rem', fontWeight: 800, color: color, textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Kernel ' + (gi + 1)),
            h('div', { style: { display: 'flex', gap: '4px', flexWrap: 'wrap' } }, g.ops.map(function (id) {
              return h('span.chip', { title: OPS[id].what }, OPS[id].label + ' (' + OPS[id].what + ')');
            }))
          )
        );
      });
      reasonList.innerHTML = '';
      shown.reasons.forEach(function (r, i) {
        reasonList.appendChild(h('li', { html: MLS.rich('**' + (i + 1) + '. ' + OPS[cfg.chain[i]].label + ':** ' + r) }));
      });

      table.innerHTML = '';
      function row(name, a, b, change, good) {
        table.appendChild(h('tr', h('td', name), h('td', a), h('td', b), h('td', { style: { color: good ? 'var(--good)' : '' } }, change)));
      }
      var saved = mOff.bytes ? 1 - mOn.bytes / mOff.bytes : 0;
      row('Kernels launched', String(mOff.kernels), String(mOn.kernels), mOff.kernels === mOn.kernels ? 'same' : mOff.kernels - mOn.kernels + ' fewer', mOff.kernels !== mOn.kernels);
      row('Memory traffic', fmt(mOff.bytes / 1e6, 0) + ' MB', fmt(mOn.bytes / 1e6, 0) + ' MB', saved > 0.005 ? fmt(saved * 100, 0) + '% less' : 'same', saved > 0.005);
      var sp = mOff.time ? mOff.time / mOn.time : 1;
      row('Time (toy model)', fmt(mOff.time * 1e6, 0) + ' us', fmt(mOn.time * 1e6, 0) + ' us', sp > 1.005 ? fmt(sp, 2) + 'x faster' : 'same', sp > 1.005);

      if (!cfg.chain.length) message.set('Pick a preset or add operators.');
      else if (mOff.kernels === mOn.kernels) message.set('Nothing could be fused in this chain, so fusion changes nothing. Look at the reasons below to see which rule blocked it.', 'warn');
      else message.set('Fusion cuts the chain from **' + mOff.kernels + '** kernels to **' + mOn.kernels + '**. Each fused-away boundary removes one write and one read of the whole tensor. The operators that were memory-bound gain the most. Conv2D is compute-bound, so only the cheap operators fused onto it get cheaper.', 'good');
    }

    function setChain(c) {
      cfg.chain = c.slice();
      paint();
    }
    var palette = h('div.btnrow', h('b', 'Add:'));
    Object.keys(OPS).forEach(function (id) {
      palette.appendChild(ui.btn(OPS[id].label, function () {
        if (cfg.chain.length < 8) cfg.chain.push(id);
        paint();
      }));
    });
    palette.appendChild(ui.btn('Remove last', function () { cfg.chain.pop(); paint(); }));
    palette.appendChild(ui.btn('Clear', function () { cfg.chain = []; paint(); }));

    var presets = h('div.btnrow', h('b', 'Presets:'),
      ui.btn('Conv, Batch norm, ReLU', function () { setChain(['conv', 'bn', 'relu']); }),
      ui.btn('Two conv blocks', function () { setChain(['conv', 'bn', 'relu', 'conv', 'bn', 'relu']); }),
      ui.btn('Add, ReLU, Sum', function () { setChain(['add', 'relu', 'sum']); }),
      ui.btn('Sort in the middle', function () { setChain(['conv', 'relu', 'sort', 'relu']); })
    );
    var fuseSeg = ui.seg([{ label: 'Fusion off', value: false }, { label: 'Fusion on (paper rules)', value: true }], cfg.fuse, function (v) { cfg.fuse = v; paint(); }, 'Fusion');
    var sizeSeg = ui.seg([{ label: '1 M', value: 1 }, { label: '4 M', value: 4 }, { label: '16 M', value: 16 }], cfg.size, function (v) { cfg.size = v; paint(); }, 'Tensor size in millions of numbers');

    host.appendChild(h('p', { html: MLS.rich('Build a chain of operators. TVM groups neighbors that follow the paper\'s rules into one **kernel**, so the intermediate result stays in fast on-chip memory instead of travelling to main memory and back.') }));
    host.appendChild(presets);
    host.appendChild(palette);
    host.appendChild(h('div.btnrow', fuseSeg.el, h('span', 'Tensor size:'), sizeSeg.el, h('span', 'million numbers')));
    host.appendChild(chainBox);
    host.appendChild(h('div.tablewrap', h('table', h('thead', h('tr', h('th', 'Per run'), h('th', 'No fusion'), h('th', 'Fusion'), h('th', 'Change'))), table)));
    host.appendChild(message.el);
    host.appendChild(h('details.reveal', h('summary', 'Why each operator was or was not fused'), h('div.cbody', reasonList)));
    host.appendChild(h('p', { style: { fontSize: '0.84rem', color: 'var(--ink-3)' }, html: MLS.rich('Toy hardware: 4 teraflops of compute, 250 GB/s of memory bandwidth, 5 microseconds to launch a kernel, 4-byte numbers. Sum shrinks the tensor 64 times. Conv2D does 1,152 operations per output number. The rules are the paper\'s. The numbers are invented.') }));
    paint();
  };

  /* ======================================================================
   * 2. cacheLab
   * ==================================================================== */
  var N = SIM.N;

  function loopNest(order, t, vec, unroll) {
    var lines = [];
    var depth = 0;
    var name = {};
    var expr = {};
    var loops = [];
    order.forEach(function (v) {
      if (t[v] === N) {
        name[v] = v;
      } else if (t[v] === 1) {
        loops.push({ v: v, text: 'for ' + v + ' in range(' + N + '):' });
        name[v] = v;
      } else {
        loops.push({ v: v, text: 'for ' + v + 'o in range(0, ' + N + ', ' + t[v] + '):' });
        name[v] = v + 'o';
      }
    });
    order.forEach(function (v) {
      if (t[v] === N) {
        loops.push({ v: v, inner: true, text: 'for ' + v + ' in range(' + N + '):' });
        expr[v] = v;
      } else if (t[v] === 1) {
        expr[v] = v;
      } else {
        loops.push({ v: v, inner: true, text: 'for ' + v + 'i in range(' + t[v] + '):' });
        expr[v] = v + 'o + ' + v + 'i';
      }
    });
    var innerVar = order[2];
    var innerTile = t[innerVar];
    var vecActive = vec > 1 && innerVar === 'j' && innerTile > 1;
    var unrollActive = unroll > 1 && innerTile > 1;
    var header = [];
    header.push(vec > 1 ? (vecActive ? '# vectorize x' + Math.min(vec, innerTile) + ' on the innermost loop' : '# vectorize x' + vec + ' ignored: needs the last loop variable to be j with a tile above 1') : '# no vectorization');
    header.push(unroll > 1 ? (unrollActive ? '# unroll x' + Math.min(unroll, innerTile) + ' on the innermost loop' : '# unroll x' + unroll + ' ignored: the innermost variable has tile size 1') : '# no unrolling');
    loops.forEach(function (l) {
      lines.push('  '.repeat(depth) + l.text);
      depth++;
    });
    lines.push('  '.repeat(depth) + 'C[' + expr.i + '][' + expr.j + '] += A[' + expr.i + '][' + expr.k + '] * B[' + expr.k + '][' + expr.j + ']');
    return header.concat(lines).join('\n');
  }

  MLS.widgets.cacheLab = function (host) {
    var cfg = { oi: 0, ti: N, tj: N, tk: N, vec: 1, unroll: 1 };
    var ORDER_LABELS = SIM.PERMS.map(function (p) { return p.join(' '); });
    var code = h('pre.code', { tabindex: 0, 'aria-label': 'Generated loop nest' });
    var statMiss = ui.stat('Cache misses', '');
    var statRate = ui.stat('Miss rate', '%');
    var statCycles = ui.stat('Estimated cycles', '');
    var statSpeed = ui.stat('Speedup vs naive', 'x');
    var bar = h('div', { style: { display: 'flex', height: '26px', borderRadius: '8px', overflow: 'hidden', background: 'var(--surface-3)' }, role: 'img', 'aria-label': 'Where the cycles go' });
    var legend = h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '4px 16px', fontSize: '0.84rem', color: 'var(--ink-2)' } });
    var message = ui.msg('');
    var segs = {};
    var naiveTotal = SIM.cost(SIM.PERMS[0], { i: N, j: N, k: N }, 1, 1).total;
    var best = null;

    function tile() { return { i: cfg.ti, j: cfg.tj, k: cfg.tk }; }
    function paint() {
      var order = SIM.PERMS[cfg.oi];
      var c = SIM.cost(order, tile(), cfg.vec, cfg.unroll);
      code.textContent = loopNest(order, tile(), cfg.vec, cfg.unroll);
      statMiss.set(String(c.missCount), c.missCount < 800 ? 'good' : c.missCount > 3000 ? 'bad' : 'warn');
      statRate.set(fmt((c.missCount / c.accesses) * 100, 1));
      statCycles.set(Math.round(c.total).toLocaleString('en-US'));
      var sp = naiveTotal / c.total;
      statSpeed.set(fmt(sp, 2), sp > 3 ? 'good' : sp < 0.95 ? 'bad' : '');
      var parts = [
        ['compute', c.compute, 'var(--accent)', 'Arithmetic'],
        ['overhead', c.overhead, 'var(--warn)', 'Loop control'],
        ['hits', c.hits, 'var(--good)', 'Cache hits'],
        ['misses', c.misses, 'var(--bad)', 'Cache misses']
      ];
      bar.innerHTML = '';
      legend.innerHTML = '';
      var scale = Math.max(naiveTotal, c.total);
      parts.forEach(function (p) {
        bar.appendChild(h('div', { style: { width: (p[1] / scale) * 100 + '%', background: p[2] }, title: p[3] + ': ' + Math.round(p[1]) + ' cycles' }));
        legend.appendChild(h('span', h('span', { style: { display: 'inline-block', width: '10px', height: '10px', borderRadius: '3px', background: p[2], marginRight: '6px' } }), p[3] + ' ' + Math.round(p[1]).toLocaleString('en-US')));
      });
      var parts2 = [];
      if (c.missCount / c.accesses > 0.3) parts2.push('More than 3 in 10 memory accesses miss the cache. The loops keep reaching for data that was evicted before it could be reused.');
      else if (c.missCount / c.accesses > 0.1) parts2.push('The cache helps, but about ' + fmt((c.missCount / c.accesses) * 100, 0) + '% of accesses still miss. Try tiling so the working set fits in the cache.');
      else parts2.push('Only ' + fmt((c.missCount / c.accesses) * 100, 1) + '% of accesses miss. The tiles fit in the cache and get reused.');
      if (cfg.vec > 1 && c.vecEff === 1) parts2.push('Vectorizing did nothing here (see the note in the code).');
      message.set(parts2.join(' '), sp > 3 ? 'good' : '');
    }
    function set(o) {
      Object.assign(cfg, o);
      segs.order.set(cfg.oi);
      segs.ti.set(cfg.ti);
      segs.tj.set(cfg.tj);
      segs.tk.set(cfg.tk);
      segs.vec.set(cfg.vec);
      segs.unroll.set(cfg.unroll);
      paint();
    }
    function tileOpts() { return SIM.TILES.map(function (t) { return { label: t === N ? t + ' (off)' : String(t), value: t }; }); }
    segs.order = ui.seg(ORDER_LABELS.map(function (l, i) { return { label: l, value: i }; }), cfg.oi, function (v) { cfg.oi = v; paint(); }, 'Loop order');
    segs.ti = ui.seg(tileOpts(), cfg.ti, function (v) { cfg.ti = v; paint(); }, 'Tile size for i');
    segs.tj = ui.seg(tileOpts(), cfg.tj, function (v) { cfg.tj = v; paint(); }, 'Tile size for j');
    segs.tk = ui.seg(tileOpts(), cfg.tk, function (v) { cfg.tk = v; paint(); }, 'Tile size for k');
    segs.vec = ui.seg(SIM.VECS.map(function (v) { return { label: v === 1 ? 'off' : 'x' + v, value: v }; }), cfg.vec, function (v) { cfg.vec = v; paint(); }, 'Vectorize');
    segs.unroll = ui.seg(SIM.UNROLLS.map(function (v) { return { label: v === 1 ? 'off' : 'x' + v, value: v }; }), cfg.unroll, function (v) { cfg.unroll = v; paint(); }, 'Unroll');
    function labeled(text, el) { return h('div.ctrl', h('div.lab', h('span', text)), el); }

    var bestMsg = h('div');
    function showBest() {
      if (!best) best = SIM.buildSpace().reduce(function (a, b) { return a.cost < b.cost ? a : b; });
      set({ oi: best.oi, ti: best.ti, tj: best.tj, tk: best.tk, vec: best.vec, unroll: best.unroll });
      bestMsg.textContent = 'The best of all 9,000 schedules in this toy space is ' + Math.round(best.cost).toLocaleString('en-US') + ' cycles, ' + fmt(naiveTotal / best.cost, 1) + 'x faster than naive. It is loop order ' + best.order.join(' ') + ', tiles ' + best.ti + '/' + best.tj + '/' + best.tk + ', vector x' + best.vec + ', unroll x' + best.unroll + '.';
    }

    host.appendChild(h('p', { html: MLS.rich('The **what** is fixed: multiply two 16 x 16 matrices, `C[i][j] += A[i][k] * B[k][j]`. You choose the **how**. A small cache (16 lines of 4 numbers) sits in front of memory, and every access is simulated for real. Misses cost 20 cycles, hits cost 1.') }));
    host.appendChild(h('div.controls', labeled('Loop order (outermost first)', segs.order.el)));
    host.appendChild(h('div.controls', labeled('Tile size for i', segs.ti.el), labeled('Tile size for j', segs.tj.el), labeled('Tile size for k', segs.tk.el)));
    host.appendChild(h('div.controls', labeled('Vectorize the innermost loop', segs.vec.el), labeled('Unroll the innermost loop', segs.unroll.el)));
    host.appendChild(code);
    host.appendChild(h('div.readout', statMiss.el, statRate.el, statCycles.el, statSpeed.el));
    host.appendChild(bar);
    host.appendChild(legend);
    host.appendChild(message.el);
    host.appendChild(h('div.btnrow',
      ui.btn('Naive: i j k, no tiling', function () { set({ oi: 0, ti: N, tj: N, tk: N, vec: 1, unroll: 1 }); }),
      ui.btn('Swap loop order only (i k j)', function () { set({ oi: 1, ti: N, tj: N, tk: N, vec: 1, unroll: 1 }); }),
      ui.btn('A reasonable tiled schedule', function () { set({ oi: 1, ti: 4, tj: 8, tk: 4, vec: 1, unroll: 1 }); }),
      ui.btn('Show the best of all 9,000', showBest, 'primary')
    ));
    host.appendChild(bestMsg);
    host.appendChild(h('p', { style: { fontSize: '0.84rem', color: 'var(--ink-3)' }, html: MLS.rich('Toy model: a fully associative LRU cache, 20-cycle misses, one cycle per multiply-add and per loop-control step. Vectorizing helps only when the last loop variable is `j` (it walks memory in order). Unrolling cuts loop-control cycles. A real chip is far more complicated.') }));
    paint();
  };
})();
