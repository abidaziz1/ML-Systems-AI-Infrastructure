/*
 * Widgets for Paper 2 (TVM): productCalc, sharedMemCalc, tensorizeCalc, latencyLab.
 * All of them are toy models for teaching and are labeled that way in the lesson.
 */
(function () {
  'use strict';
  var MLS = window.MLS;
  var h = MLS.h;
  var s = MLS.s;
  var ui = MLS.ui;
  var fmt = MLS.fmt;

  function big(n) {
    if (n >= 1e12) return fmt(n / 1e12, 1) + ' trillion';
    if (n >= 1e9) return fmt(n / 1e9, 1) + ' billion';
    if (n >= 1e6) return fmt(n / 1e6, 1) + ' million';
    if (n >= 1e4) return fmt(n / 1e3, 0) + ' thousand';
    return Math.round(n).toLocaleString('en-US');
  }
  function duration(seconds) {
    if (seconds < 90) return fmt(seconds, 0) + ' seconds';
    if (seconds < 5400) return fmt(seconds / 60, 0) + ' minutes';
    if (seconds < 172800) return fmt(seconds / 3600, 1) + ' hours';
    if (seconds < 86400 * 365) return fmt(seconds / 86400, 0) + ' days';
    return fmt(seconds / (86400 * 365), 1) + ' years';
  }
  MLS.fmtBig = big;
  MLS.fmtDuration = duration;

  /* ======================================================================
   * 1. productCalc: several sliders, one product, and what it means
   *    opts: { intro, factors:[{key,label,min,max,value,step}], resultLabel,
   *            secondary(values, product) -> [{k, v, cls}], message(values, product) -> string, footnote }
   * ==================================================================== */
  MLS.widgets.productCalc = function (host, opts) {
    var values = {};
    var sliders = [];
    var result = ui.stat(opts.resultLabel, '');
    var secondary = h('div.readout');
    var message = ui.msg('');
    opts.factors.forEach(function (f) {
      values[f.key] = f.value;
      sliders.push(
        ui.slider({
          label: f.label,
          min: f.min,
          max: f.max,
          step: f.step || 1,
          value: f.value,
          onInput: function (v) {
            values[f.key] = v;
            paint();
          }
        }).el
      );
    });
    function paint() {
      var product = 1;
      opts.factors.forEach(function (f) { product *= Math.pow(values[f.key], f.power || 1); });
      result.set(big(product), 'warn');
      secondary.innerHTML = '';
      (opts.secondary ? opts.secondary(values, product) : []).forEach(function (row) {
        var st = ui.stat(row.k, row.u || '');
        st.set(row.v, row.cls);
        secondary.appendChild(st.el);
      });
      message.set(opts.message ? opts.message(values, product) : '');
    }
    if (opts.intro) host.appendChild(h('p', { html: MLS.rich(opts.intro) }));
    host.appendChild(h('div.controls', sliders));
    host.appendChild(h('div.readout', result.el));
    host.appendChild(secondary);
    host.appendChild(message.el);
    if (opts.footnote) host.appendChild(h('p', { style: { fontSize: '0.84rem', color: 'var(--ink-3)' }, html: MLS.rich(opts.footnote) }));
    paint();
  };

  /* ======================================================================
   * 2. sharedMemCalc: global loads with and without a shared-memory tile
   * ==================================================================== */
  MLS.widgets.sharedMemCalc = function (host) {
    var SIZES = [256, 512, 1024, 2048, 4096];
    var TILES = [1, 2, 4, 8, 16, 32, 64, 128];
    var BW = 300e9; /* bytes per second from global memory */
    var SHARED_LIMIT = 48 * 1024;
    var cfg = { n: 1024, t: 1 };
    var statNaive = ui.stat('Global loads, no sharing', '');
    var statTiled = ui.stat('Global loads, shared tiles', '');
    var statShared = ui.stat('Shared memory per block', '');
    var statTime = ui.stat('Time moving data (toy)', '');
    var message = ui.msg('');
    function paint() {
      var n = cfg.n;
      var t = cfg.t;
      var naive = 2 * n * n * n;
      var tiled = naive / t;
      var sharedBytes = 2 * t * t * 4;
      var tNaive = (naive * 4) / BW;
      var tTiled = (tiled * 4) / BW;
      statNaive.set(big(naive));
      statTiled.set(big(tiled), t > 1 ? 'good' : '');
      statShared.set(fmt(sharedBytes / 1024, 1) + ' KB', sharedBytes > SHARED_LIMIT ? 'bad' : '');
      statTime.set(fmt(tNaive * 1000, 1) + ' ms to ' + fmt(tTiled * 1000, 1) + ' ms', t > 1 ? 'good' : '');
      if (t === 1) {
        message.set('Tile size 1 means no sharing. Every thread fetches its own row and column from slow global memory, so each loaded number is used once. Pick a bigger tile.');
      } else if (sharedBytes > SHARED_LIMIT) {
        message.set('A ' + t + ' x ' + t + ' tile needs ' + fmt(sharedBytes / 1024, 1) + ' KB of shared memory per block, over the toy limit of 48 KB. Pick a smaller tile.', 'bad');
      } else {
        message.set('With a ' + t + ' x ' + t + ' tile, each number fetched into shared memory is used by ' + t + ' threads. Global loads fall by **' + t + 'x**, and the block needs ' + fmt(sharedBytes / 1024, 1) + ' KB of shared memory.', 'good');
      }
    }
    var sizeSlider = ui.slider({ label: 'Matrix size (N x N)', min: 0, max: SIZES.length - 1, value: SIZES.indexOf(cfg.n), format: function (v) { return SIZES[v]; }, onInput: function (v) { cfg.n = SIZES[v]; paint(); } });
    var tileSlider = ui.slider({ label: 'Tile size per thread block (T x T)', min: 0, max: TILES.length - 1, value: 0, format: function (v) { return TILES[v]; }, onInput: function (v) { cfg.t = TILES[v]; paint(); } });
    host.appendChild(h('p', { html: MLS.rich('A thread block computes a **T x T** piece of the result. Tile size 1 means no sharing. A bigger tile means each number loaded into shared memory is reused by more threads.') }));
    host.appendChild(h('div.controls', sizeSlider.el, tileSlider.el));
    host.appendChild(h('div.readout', statNaive.el, statTiled.el, statShared.el, statTime.el));
    host.appendChild(message.el);
    host.appendChild(h('p', { style: { fontSize: '0.84rem', color: 'var(--ink-3)' }, html: MLS.rich('Toy model: counts loads for C = A x B, assumes 4-byte numbers and 300 GB/s of global memory bandwidth, and ignores everything else. Real GPUs differ.') }));
    paint();
  };

  /* ======================================================================
   * 3. tensorizeCalc: scalar instructions versus one tensor instruction
   * ==================================================================== */
  MLS.widgets.tensorizeCalc = function (host) {
    var SIZES = [16, 32, 64, 128, 256];
    var BLOCKS = [1, 2, 4, 8, 16];
    var cfg = { n: 64, b: 8 };
    var grid = h('div.scroll');
    var statScalar = ui.stat('Multiply-adds to do', '');
    var statCalls = ui.stat('Hardware instructions', '');
    var statEach = ui.stat('Work per instruction', 'multiply-adds');
    var message = ui.msg('');
    function paint() {
      var n = cfg.n;
      var b = cfg.b;
      var scalar = n * n * n;
      var per = b * b * b;
      var calls = scalar / per;
      statScalar.set(big(scalar));
      statCalls.set(big(calls), b > 1 ? 'good' : '');
      statEach.set(String(per));
      var cells = Math.min(n / b, 16);
      var size = 18;
      var svg = s('svg', { class: 'chart', viewBox: '0 0 ' + (cells * size + 20) + ' ' + (cells * size + 22), role: 'img', 'aria-label': 'The result matrix split into ' + n / b + ' by ' + n / b + ' blocks', style: 'min-width:0;max-width:' + (cells * size + 20) + 'px' });
      for (var y = 0; y < cells; y++) {
        for (var x = 0; x < cells; x++) {
          var hot = x === 0 && y === 0;
          svg.appendChild(s('rect', { x: 10 + x * size, y: 10 + y * size, width: size - 2, height: size - 2, rx: 3, fill: hot ? 'var(--grad)' : 'var(--accent)', opacity: hot ? 1 : 0.35 }));
        }
      }
      svg.appendChild(s('text', { x: 10, y: cells * size + 20 }, cells < n / b ? 'showing ' + cells + ' x ' + cells + ' of ' + n / b + ' x ' + n / b + ' blocks' : n / b + ' x ' + n / b + ' blocks of the result'));
      grid.innerHTML = '';
      grid.appendChild(svg);
      if (b === 1) {
        message.set('Block size 1 is plain scalar code: one instruction per multiply-add. Pick a bigger block to match what a tensor unit offers.');
      } else {
        var blocks = (n / b) * (n / b);
        message.set('The result splits into **' + big(blocks) + '** blocks. Each block (the orange one is an example) takes **' + n / b + '** instructions, one per step along the shared dimension. In total the job needs **' + big(calls) + '** instructions instead of **' + big(scalar) + '**, which is **' + per + 'x** fewer. The block size has to match what your target chip actually provides. TVM lets you describe that instruction yourself.');
      }
    }
    var nSlider = ui.slider({ label: 'Matrix size (N x N x N multiply)', min: 0, max: SIZES.length - 1, value: SIZES.indexOf(cfg.n), format: function (v) { return SIZES[v]; }, onInput: function (v) { cfg.n = SIZES[v]; paint(); } });
    var bSeg = ui.seg(BLOCKS.map(function (b) { return { label: b + ' x ' + b + ' x ' + b, value: b }; }), cfg.b, function (v) { cfg.b = v; paint(); }, 'Hardware block size');
    host.appendChild(h('p', { html: MLS.rich('Suppose the chip has an instruction that multiplies a **B x B** block by another **B x B** block in one go. Choose B and the matrix size.') }));
    host.appendChild(h('div.controls', nSlider.el, h('div.ctrl', h('div.lab', h('span', 'Instruction block size')), bSeg.el)));
    host.appendChild(h('div.readout', statScalar.el, statCalls.el, statEach.el));
    host.appendChild(grid);
    host.appendChild(message.el);
    paint();
  };

  /* ======================================================================
   * 4. latencyLab: overlapping loads with compute
   * ==================================================================== */
  MLS.widgets.latencyLab = function (host) {
    var cfg = { tiles: 6, load: 4, compute: 3, threads: 1 };
    var holder = h('div.scroll');
    var statTotal = ui.stat('Total time', 'units');
    var statUtil = ui.stat('Compute unit busy', '%');
    var statSave = ui.stat('Time saved', '');
    var message = ui.msg('');

    function schedule() {
      var n = cfg.tiles;
      var L = cfg.load;
      var C = cfg.compute;
      var loads = [];
      var comps = [];
      var t = 0;
      if (cfg.threads === 1) {
        for (var i = 0; i < n; i++) {
          loads.push([t, t + L]);
          t += L;
          comps.push([t, t + C]);
          t += C;
        }
        return { loads: loads, comps: comps, total: t };
      }
      /* two virtual threads: the load of tile i+1 overlaps the compute of tile i */
      var loadEnd = 0;
      var compEnd = 0;
      for (var j = 0; j < n; j++) {
        var ls = loadEnd;
        loadEnd = ls + L;
        loads.push([ls, loadEnd]);
        var cs = Math.max(loadEnd, compEnd);
        compEnd = cs + C;
        comps.push([cs, compEnd]);
      }
      return { loads: loads, comps: comps, total: compEnd };
    }

    function paint() {
      var sched = schedule();
      var single = cfg.tiles * (cfg.load + cfg.compute);
      var util = (cfg.tiles * cfg.compute) / sched.total;
      statTotal.set(String(sched.total));
      statUtil.set(fmt(util * 100, 0), util > 0.85 ? 'good' : util < 0.6 ? 'bad' : 'warn');
      statSave.set(cfg.threads === 1 ? '0%' : fmt(((single - sched.total) / single) * 100, 0) + '%', cfg.threads === 1 ? '' : 'good');
      var width = 720;
      var left = 110;
      var scale = (width - left - 14) / sched.total;
      var svg = s('svg', { class: 'chart', viewBox: '0 0 ' + width + ' 130', role: 'img', 'aria-label': 'Timeline of loads and compute', style: 'min-width:560px' });
      svg.appendChild(s('text', { x: left - 10, y: 36, 'text-anchor': 'end' }, 'Memory (load)'));
      svg.appendChild(s('text', { x: left - 10, y: 78, 'text-anchor': 'end' }, 'Compute'));
      sched.loads.forEach(function (b, i) {
        svg.appendChild(s('rect', { x: left + b[0] * scale, y: 20, width: Math.max(1, (b[1] - b[0]) * scale - 2), height: 24, rx: 4, fill: 'var(--purple)' }));
        svg.appendChild(s('text', { x: left + ((b[0] + b[1]) / 2) * scale, y: 37, 'text-anchor': 'middle', style: 'fill:#fff;font-weight:700' }, String(i + 1)));
      });
      sched.comps.forEach(function (b, i) {
        svg.appendChild(s('rect', { x: left + b[0] * scale, y: 62, width: Math.max(1, (b[1] - b[0]) * scale - 2), height: 24, rx: 4, fill: 'var(--accent)' }));
        svg.appendChild(s('text', { x: left + ((b[0] + b[1]) / 2) * scale, y: 79, 'text-anchor': 'middle', style: 'fill:#fff;font-weight:700' }, String(i + 1)));
      });
      svg.appendChild(s('line', { class: 'axis', x1: left, x2: width - 14, y1: 100, y2: 100 }));
      svg.appendChild(s('text', { x: left, y: 118 }, '0'));
      svg.appendChild(s('text', { x: width - 14, y: 118, 'text-anchor': 'end' }, String(sched.total) + ' time units'));
      holder.innerHTML = '';
      holder.appendChild(svg);
      if (cfg.threads === 1) {
        message.set('One virtual thread: load tile 1, compute tile 1, load tile 2, and so on. The compute unit sits idle for **' + fmt((1 - util) * 100, 0) + '%** of the time, waiting for data.', util < 0.6 ? 'bad' : 'warn');
      } else if (cfg.load > cfg.compute) {
        message.set('Two virtual threads overlap loading with computing. Loads take longer than compute here, so the job is now **limited by memory**: the compute unit still waits. Hiding latency cannot beat the slower of the two units.', 'warn');
      } else {
        message.set('Two virtual threads overlap loading the next tile with computing the current one. The compute unit is busy **' + fmt(util * 100, 0) + '%** of the time. The first load cannot be hidden, so you never reach 100%.', 'good');
      }
    }
    var sT = ui.slider({ label: 'Tiles to process', min: 2, max: 12, value: cfg.tiles, onInput: function (v) { cfg.tiles = v; paint(); } });
    var sL = ui.slider({ label: 'Time to load one tile', min: 1, max: 8, value: cfg.load, onInput: function (v) { cfg.load = v; paint(); } });
    var sC = ui.slider({ label: 'Time to compute one tile', min: 1, max: 8, value: cfg.compute, onInput: function (v) { cfg.compute = v; paint(); } });
    var seg = ui.seg([{ label: '1 virtual thread', value: 1 }, { label: '2 virtual threads', value: 2 }], cfg.threads, function (v) { cfg.threads = v; paint(); }, 'Virtual threads');
    host.appendChild(h('p', { html: MLS.rich('Set how many tiles to process and how long each load and each compute takes. Then switch between one and two virtual threads.') }));
    host.appendChild(h('div.controls', sT.el, sL.el, sC.el));
    host.appendChild(h('div.btnrow', h('b', 'Schedule:'), seg.el));
    host.appendChild(holder);
    host.appendChild(h('div.readout', statTotal.el, statUtil.el, statSave.el));
    host.appendChild(message.el);
    host.appendChild(h('p', { style: { fontSize: '0.84rem', color: 'var(--ink-3)' }, html: MLS.rich('Toy model: one load engine, one compute engine, and a buffer for one tile ahead. Real accelerators have more engines and more detail.') }));
    paint();
  };
})();
