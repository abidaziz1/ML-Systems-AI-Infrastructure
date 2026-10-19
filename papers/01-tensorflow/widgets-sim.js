/*
 * Widgets for Paper 1 that run small simulations.
 * queueSim, syncSim, checkpointLab, activationMemory.
 * Everything here is a toy model for teaching and is labeled that way in the lesson.
 */
(function () {
  'use strict';
  var MLS = window.MLS;
  var h = MLS.h;
  var s = MLS.s;
  var ui = MLS.ui;
  var fmt = MLS.fmt;

  /* ======================================================================
   * 1. queueSim: input pipeline feeding a GPU through a queue
   * ==================================================================== */
  MLS.widgets.queueSim = function (host, opts, ctx) {
    var DT = 5; /* simulated milliseconds per tick */
    var WINDOW = 1000; /* ticks kept for the moving averages (5 simulated seconds) */
    var PREP_MS = 40; /* average time for one thread to prepare one batch */
    var HICCUP = 0.15; /* chance that a batch is slow (a big file, a cold disk) */
    var SLOW = 3.5;
    var FAST = 0.65;
    var NORM = HICCUP * SLOW + (1 - HICCUP) * FAST; /* keeps the average at PREP_MS */
    var cfg = { threads: 2, gpuMs: 10, cap: 20 };
    var rand;
    var st;
    var playing = false;
    var raf = null;
    var last = 0;

    function prepTime() {
      return (PREP_MS * (rand() < HICCUP ? SLOW : FAST)) / NORM;
    }
    function reset() {
      rand = MLS.rng(7);
      st = { q: 0, busyRem: 0, prod: [], busyHist: [], doneHist: [], qSum: 0, ticks: 0 };
      for (var i = 0; i < 8; i++) st.prod.push(prepTime() * rand());
    }
    function tick() {
      var i;
      for (i = 0; i < cfg.threads; i++) {
        st.prod[i] -= DT;
        if (st.prod[i] <= 0) {
          if (st.q < cfg.cap) {
            st.q++;
            st.prod[i] = prepTime();
          } else {
            st.prod[i] = 0; /* blocked: queue is full, try again next tick */
          }
        }
      }
      var done = 0;
      var working = st.busyRem > 0; /* the GPU spends this whole tick on its current batch */
      if (working) {
        st.busyRem -= DT;
        if (st.busyRem <= 0) {
          st.busyRem = 0;
          done = 1;
        }
      }
      if (st.busyRem <= 0 && st.q > 0) {
        st.q--;
        st.busyRem = cfg.gpuMs;
      }
      st.busyHist.push(working ? 1 : 0);
      st.doneHist.push(done);
      st.qSum += st.q;
      st.ticks++;
      if (st.busyHist.length > WINDOW) {
        st.busyHist.shift();
        st.doneHist.shift();
      }
    }
    function sum(a) {
      return a.reduce(function (x, y) { return x + y; }, 0);
    }

    var qRow = h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '3px', minHeight: '26px' }, 'aria-hidden': 'true' });
    var prodRow = h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' }, 'aria-hidden': 'true' });
    var gpuBox = h('div', { style: { padding: '8px 14px', borderRadius: '10px', fontWeight: '800', textAlign: 'center', minWidth: '110px' } }, 'GPU');
    var stage = h('div', { style: { display: 'grid', gridTemplateColumns: 'minmax(120px,1fr) minmax(160px,2fr) auto', gap: '14px', alignItems: 'center' } },
      h('div', h('div', { style: { fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: '4px' } }, 'Preprocessing threads'), prodRow),
      h('div', h('div', { style: { fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: '4px' } }, 'Queue (waiting batches)'), qRow),
      h('div', h('div', { style: { fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: '4px' } }, 'Training step'), gpuBox)
    );
    var statBusy = ui.stat('GPU busy', '%');
    var statRate = ui.stat('Images per second', '');
    var statQ = ui.stat('Queue length', '');
    var statCap = ui.stat('Supply / demand', 'img/s');
    var message = ui.msg('');

    function paint() {
      var w = Math.max(1, st.busyHist.length);
      var busy = (sum(st.busyHist) / w) * 100;
      var rate = (sum(st.doneHist) / (w * DT)) * 1000;
      prodRow.innerHTML = '';
      for (var i = 0; i < cfg.threads; i++) {
        var blocked = st.prod[i] === 0;
        prodRow.appendChild(h('span', { style: { width: '22px', height: '22px', borderRadius: '50%', background: blocked ? 'var(--warn)' : 'var(--accent)', display: 'inline-block' }, title: blocked ? 'blocked: queue full' : 'preparing a batch' }));
      }
      qRow.innerHTML = '';
      var cells = Math.min(cfg.cap, 40);
      var filled = cfg.cap > 40 ? Math.round((st.q / cfg.cap) * 40) : st.q;
      for (var j = 0; j < cells; j++) {
        qRow.appendChild(h('span', { style: { width: '14px', height: '22px', borderRadius: '4px', border: '1.5px solid var(--line-strong)', background: j < filled ? 'var(--purple)' : 'transparent', display: 'inline-block' } }));
      }
      var isBusy = st.busyRem > 0;
      gpuBox.textContent = isBusy ? 'GPU busy' : 'GPU idle';
      gpuBox.style.background = isBusy ? 'var(--good-soft)' : 'var(--bad-soft)';
      gpuBox.style.color = isBusy ? 'var(--good)' : 'var(--bad)';
      var supply = (cfg.threads * 1000) / PREP_MS;
      var demand = 1000 / cfg.gpuMs;
      statBusy.set(fmt(busy, 0), busy > 90 ? 'good' : busy < 70 ? 'bad' : 'warn');
      statRate.set(fmt(rate, 0));
      statQ.set(st.q + ' of ' + cfg.cap);
      statCap.set(fmt(supply, 0) + ' / ' + fmt(demand, 0));
      if (st.ticks < WINDOW / 2) {
        message.set('Warming up. Let it run for a few seconds, or press **Fast-forward 5 s**.');
      } else if (supply < demand * 0.95) {
        message.set('**The GPU is starving.** The pipeline can only make ' + fmt(supply, 0) + ' images per second but the GPU could eat ' + fmt(demand, 0) + '. The queue stays almost empty. Add preprocessing threads.', 'bad');
      } else if (supply > demand * 1.3) {
        message.set('**The GPU is the bottleneck now.** The queue is full, the threads are blocked (orange), and the extra threads add nothing. Fewer threads would do the same job.', 'warn');
      } else {
        message.set('**Roughly balanced.** The queue absorbs the slow batches. Set the queue capacity to 1 and watch the GPU idle more often.', 'good');
      }
    }

    function loop(now) {
      if (!playing) return;
      var dt = Math.min(100, now - last);
      last = now;
      var steps = Math.floor((dt * 3) / DT); /* 3x speed */
      for (var i = 0; i < steps; i++) tick();
      paint();
      raf = requestAnimationFrame(loop);
    }
    function play() {
      if (playing) return;
      playing = true;
      playBtn.textContent = 'Pause';
      last = performance.now();
      raf = requestAnimationFrame(loop);
    }
    function pause() {
      playing = false;
      playBtn.textContent = 'Play';
      if (raf) cancelAnimationFrame(raf);
    }
    function ff() {
      for (var i = 0; i < 1000; i++) tick();
      paint();
    }
    var playBtn = ui.btn('Pause', function () { if (playing) pause(); else play(); }, 'primary');
    function restart() {
      reset();
      paint();
    }
    var sThreads = ui.slider({ label: 'Preprocessing threads', min: 1, max: 8, value: cfg.threads, onInput: function (v) { cfg.threads = v; paint(); } });
    var sGpu = ui.slider({ label: 'GPU time per batch (ms)', min: 5, max: 40, step: 5, value: cfg.gpuMs, onInput: function (v) { cfg.gpuMs = v; paint(); } });
    var sCap = ui.slider({ label: 'Queue capacity', min: 1, max: 40, value: cfg.cap, onInput: function (v) { cfg.cap = v; if (st.q > v) st.q = v; paint(); } });

    host.appendChild(h('p', { html: MLS.rich('Each thread needs about 40 ms on average to prepare one batch (decode, resize, augment). Some batches are slow, like a big file or a cold disk. The GPU takes the time you choose below. Prepared batches wait in a queue.') }));
    host.appendChild(h('div.controls', sThreads.el, sGpu.el, sCap.el));
    host.appendChild(stage);
    host.appendChild(h('div.readout', statBusy.el, statRate.el, statQ.el, statCap.el));
    host.appendChild(message.el);
    host.appendChild(h('div.btnrow', playBtn, ui.btn('Fast-forward 5 s', ff), ui.btn('Restart', restart)));
    reset();
    ff();
    if (MLS.reducedMotion()) {
      playing = false;
      playBtn.textContent = 'Play';
    } else {
      play();
    }
    ctx.onCleanup(pause);
  };

  /* ======================================================================
   * 2. syncSim: asynchronous vs synchronous vs synchronous with backup workers
   * ==================================================================== */
  MLS.widgets.syncSim = function (host) {
    var cfg = { n: 16, p: 0.05, slow: 2.5, b: 2, mode: 'sync', seed: 11 };
    var ROUNDS = 300;

    function stepTime(rnd) {
      var base = 0.8 + 0.4 * rnd();
      return rnd() < cfg.p ? base * cfg.slow : base;
    }
    function compute() {
      var rnd = MLS.rng(cfg.seed);
      var rounds = [];
      var k;
      var i;
      for (k = 0; k < ROUNDS; k++) {
        var ts = [];
        for (i = 0; i < cfg.n; i++) ts.push(stepTime(rnd));
        rounds.push(ts);
      }
      var tSync = 0;
      var work = 0;
      var tBack = 0;
      var used = 0;
      var keep = cfg.n - cfg.b;
      rounds.forEach(function (ts) {
        var sorted = ts.slice().sort(function (a, b) { return a - b; });
        tSync += sorted[cfg.n - 1];
        work += ts.reduce(function (a, b) { return a + b; }, 0);
        var cut = sorted[keep - 1];
        tBack += cut;
        for (var j = 0; j < keep; j++) used += sorted[j];
      });
      /* asynchronous: event simulation over the same wall-clock length */
      var arnd = MLS.rng(cfg.seed + 1);
      var finish = [];
      var readV = [];
      for (i = 0; i < cfg.n; i++) {
        finish.push(stepTime(arnd));
        readV.push(0);
      }
      var updates = 0;
      var staleSum = 0;
      for (;;) {
        var m = 0;
        for (i = 1; i < cfg.n; i++) if (finish[i] < finish[m]) m = i;
        if (finish[m] > tSync) break;
        staleSum += updates - readV[m];
        updates++;
        readV[m] = updates;
        finish[m] += stepTime(arnd);
      }
      return {
        rounds: rounds,
        keep: keep,
        async: { updates: updates / tSync, grads: updates / tSync, idle: 0, stale: updates ? staleSum / updates : 0 },
        sync: { updates: ROUNDS / tSync, grads: (cfg.n * ROUNDS) / tSync, idle: 1 - work / (cfg.n * tSync), stale: 0 },
        backup: { updates: ROUNDS / tBack, grads: (keep * ROUNDS) / tBack, idle: 1 - used / (cfg.n * tBack), stale: 0 }
      };
    }

    var MODES = [
      { id: 'async', label: 'Asynchronous', color: 'var(--grad)' },
      { id: 'sync', label: 'Synchronous', color: 'var(--accent)' },
      { id: 'backup', label: 'Synchronous + backup workers', color: 'var(--good)' }
    ];
    var cards = {};
    var cardsRow = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: '12px' } });
    MODES.forEach(function (m) {
      var rows = { grads: ui.meterRow('Gradients/s'), idle: ui.meterRow('Idle or wasted'), stale: ui.meterRow('Staleness') };
      var title = h('div', { style: { fontWeight: '800', color: m.color, marginBottom: '6px' } }, m.label);
      var el = h('div', { style: { border: '1.5px solid var(--line)', borderRadius: '12px', padding: '10px 12px', display: 'grid', gap: '6px' } }, title, rows.grads.el, rows.idle.el, rows.stale.el);
      cards[m.id] = { el: el, rows: rows, color: m.color };
      cardsRow.appendChild(el);
    });
    var ganttHost = h('div.scroll');
    var message = ui.msg('');
    var modeSeg;

    function gantt(data) {
      var W = 8;
      var rows = Math.min(cfg.n, 8);
      var width = 720;
      var left = 70;
      var rowH = 22;
      var height = rows * rowH + 52;
      var sx = function (t) { return left + (t / W) * (width - left - 10); };
      var svg = s('svg', { class: 'chart', viewBox: '0 0 ' + width + ' ' + height, role: 'img', 'aria-label': 'Timeline of worker activity for the selected mode', style: 'min-width:560px' });
      var i;
      for (i = 0; i <= W; i++) {
        svg.appendChild(s('line', { class: 'grid', x1: sx(i), x2: sx(i), y1: 10, y2: 10 + rows * rowH }));
        svg.appendChild(s('text', { x: sx(i), y: 10 + rows * rowH + 16, 'text-anchor': 'middle' }, String(i)));
      }
      svg.appendChild(s('text', { x: sx(W / 2), y: height - 6, 'text-anchor': 'middle' }, 'time (1 unit is a typical step)'));
      for (i = 0; i < rows; i++) {
        svg.appendChild(s('text', { x: left - 8, y: 10 + i * rowH + 15, 'text-anchor': 'end' }, 'worker ' + (i + 1)));
      }
      function bar(i2, t0, t1, fill, extra) {
        if (t0 >= W) return;
        var e = Math.min(t1, W);
        svg.appendChild(s('rect', { x: sx(t0), y: 10 + i2 * rowH + 3, width: Math.max(1, sx(e) - sx(t0) - 1), height: rowH - 6, rx: 3, fill: fill, opacity: extra && extra.opacity ? extra.opacity : 1 }));
      }
      if (cfg.mode === 'async') {
        var rnd = MLS.rng(cfg.seed + 99);
        for (i = 0; i < rows; i++) {
          var t = 0;
          var k = 0;
          while (t < W) {
            var d = stepTime(rnd);
            bar(i, t, t + d, k % 2 ? 'var(--grad)' : 'var(--accent)');
            t += d;
            k++;
          }
        }
      } else {
        var t0 = 0;
        var r = 0;
        while (t0 < W && r < data.rounds.length) {
          var ts = data.rounds[r];
          var sorted = ts.slice().sort(function (a, b) { return a - b; });
          var end = cfg.mode === 'sync' ? sorted[cfg.n - 1] : sorted[data.keep - 1];
          for (i = 0; i < rows; i++) {
            if (cfg.mode === 'backup' && ts[i] > end) {
              bar(i, t0, t0 + end, 'var(--bad)');
              if (t0 + end < W) svg.appendChild(s('text', { x: sx(t0 + end) - 4, y: 10 + i * rowH + 16, 'text-anchor': 'end', style: 'fill:#fff;font-weight:800' }, 'x'));
            } else {
              bar(i, t0, t0 + ts[i], 'var(--accent)');
              bar(i, t0 + ts[i], t0 + end, 'var(--ink-3)', { opacity: 0.25 });
            }
          }
          t0 += end;
          if (t0 < W) svg.appendChild(s('line', { x1: sx(t0), x2: sx(t0), y1: 6, y2: 10 + rows * rowH, stroke: 'var(--ink)', 'stroke-dasharray': '4 3', 'stroke-width': 1.4 }));
          r++;
        }
      }
      ganttHost.innerHTML = '';
      ganttHost.appendChild(svg);
    }

    function paint() {
      var data = compute();
      var maxG = Math.max(data.async.grads, data.sync.grads, data.backup.grads);
      MODES.forEach(function (m) {
        var d = data[m.id];
        var c = cards[m.id];
        c.rows.grads.set(d.grads / maxG, fmt(d.grads, 1), m.color);
        c.rows.idle.set(d.idle, fmt(d.idle * 100, 0) + '%', 'var(--warn)');
        c.rows.stale.set(Math.min(1, d.stale / 20), fmt(d.stale, 1), 'var(--bad)');
        c.el.style.borderColor = cfg.mode === m.id ? m.color : 'var(--line)';
      });
      gantt(data);
      var A = data.async;
      var S = data.sync;
      var B = data.backup;
      message.set(
        '**Asynchronous** applies the most gradients per second (' + fmt(A.grads, 1) + ') and nobody waits, but each gradient was computed from parameters that are about **' + fmt(A.stale, 1) + ' updates old**. ' +
          '**Synchronous** has fresh parameters but wastes **' + fmt(S.idle * 100, 0) + '%** of worker time waiting for the slowest worker. ' +
          '**Backup workers** (drop the ' + cfg.b + ' slowest each round) cut the waste to **' + fmt(B.idle * 100, 0) + '%** and raise gradients per second from ' + fmt(S.grads, 1) + ' to ' + fmt(B.grads, 1) + '.'
      );
    }

    var sN = ui.slider({ label: 'Workers (N)', min: 4, max: 32, value: cfg.n, onInput: function (v) { cfg.n = v; sB.setMax(Math.floor(v / 2)); cfg.b = sB.get(); paint(); } });
    var sP = ui.slider({ label: 'Chance a step is slow', min: 0, max: 30, value: cfg.p * 100, format: function (v) { return v + '%'; }, onInput: function (v) { cfg.p = v / 100; paint(); } });
    var sSlow = ui.slider({ label: 'How much slower', min: 1.5, max: 6, step: 0.5, value: cfg.slow, format: function (v) { return v + 'x'; }, onInput: function (v) { cfg.slow = v; paint(); } });
    var sB = ui.slider({ label: 'Backup workers (b)', min: 0, max: Math.floor(cfg.n / 2), value: cfg.b, onInput: function (v) { cfg.b = v; paint(); } });
    modeSeg = ui.seg(MODES.map(function (m) { return { label: m.label, value: m.id }; }), cfg.mode, function (m) { cfg.mode = m; paint(); }, 'Mode shown in the timeline');

    host.appendChild(h('div.controls', sN.el, sP.el, sSlow.el, sB.el));
    host.appendChild(cardsRow);
    host.appendChild(h('div.btnrow', h('b', 'Timeline for:'), modeSeg.el, ui.btn('Re-roll the luck', function () { cfg.seed = Math.floor(Math.random() * 100000); paint(); })));
    host.appendChild(ganttHost);
    host.appendChild(h('p', { style: { fontSize: '0.84rem', color: 'var(--ink-3)' }, html: MLS.rich('Blue: a worker computing. Gray: a worker waiting for the others. Red with x: a backup-mode worker whose result is thrown away. Dashed line: the moment the shared parameters are updated. Showing the first 8 workers.') }));
    host.appendChild(message.el);
    paint();
  };

  /* ======================================================================
   * 3. checkpointLab: how often to save, and what a crash costs
   * ==================================================================== */
  MLS.widgets.checkpointLab = function (host) {
    var TOTAL = 100;
    var CKPT_COST = 0.5; /* in units of one training step */
    var cfg = { k: 10, crash: 63 };
    var holder = h('div.scroll');
    var statLost = ui.stat('Steps lost by this crash', '');
    var statLast = ui.stat('Restart from step', '');
    var statOver = ui.stat('Time spent saving', '%');
    var statAvg = ui.stat('Average loss, random crash', 'steps');
    var message = ui.msg('');

    function lastCkpt(c, k) {
      return k ? Math.floor(c / k) * k : 0;
    }
    function avgLoss(k) {
      var tot = 0;
      for (var c = 1; c <= TOTAL; c++) tot += c - lastCkpt(c, k);
      return tot / TOTAL;
    }
    function overhead(k) {
      return k ? ((Math.floor(TOTAL / k) * CKPT_COST) / TOTAL) * 100 : 0;
    }
    function draw() {
      var width = 720;
      var left = 14;
      var bw = (width - 2 * left) / TOTAL;
      var svg = s('svg', { class: 'chart', viewBox: '0 0 ' + width + ' 120', role: 'img', 'aria-label': 'Training steps. Green steps are safe, red steps are lost in the crash.', style: 'min-width:560px;cursor:pointer' });
      var lc = lastCkpt(cfg.crash, cfg.k);
      for (var i = 1; i <= TOTAL; i++) {
        var fill = 'var(--surface-3)';
        if (i <= lc) fill = 'var(--good)';
        else if (i <= cfg.crash) fill = 'var(--bad)';
        svg.appendChild(s('rect', { x: left + (i - 1) * bw + 0.5, y: 52, width: bw - 1, height: 30, fill: fill }));
      }
      if (cfg.k) {
        for (var c = cfg.k; c <= TOTAL; c += cfg.k) {
          var x = left + c * bw;
          svg.appendChild(s('line', { x1: x, x2: x, y1: 36, y2: 52, stroke: 'var(--purple)', 'stroke-width': 2 }));
          svg.appendChild(s('circle', { cx: x, cy: 34, r: 4, fill: c <= cfg.crash ? 'var(--purple)' : 'var(--surface)', stroke: 'var(--purple)', 'stroke-width': 2 }));
        }
      }
      var cx = left + cfg.crash * bw;
      svg.appendChild(s('line', { x1: cx, x2: cx, y1: 18, y2: 96, stroke: 'var(--bad)', 'stroke-width': 3 }));
      svg.appendChild(s('text', { x: cx, y: 12, 'text-anchor': 'middle', style: 'font-weight:800;fill:var(--bad)' }, 'crash at step ' + cfg.crash));
      svg.appendChild(s('text', { x: left, y: 112 }, 'step 1'));
      svg.appendChild(s('text', { x: width - left, y: 112, 'text-anchor': 'end' }, 'step ' + TOTAL));
      svg.appendChild(s('text', { x: width / 2, y: 112, 'text-anchor': 'middle' }, 'purple dots are checkpoints. Click the track to move the crash.'));
      svg.addEventListener('click', function (e) {
        var r = svg.getBoundingClientRect();
        var px = ((e.clientX - r.left) / r.width) * width;
        cfg.crash = MLS.clamp(Math.round((px - left) / bw), 1, TOTAL);
        sCrash.set(cfg.crash);
        paint();
      });
      holder.innerHTML = '';
      holder.appendChild(svg);
    }
    function paint() {
      var lc = lastCkpt(cfg.crash, cfg.k);
      var lost = cfg.crash - lc;
      draw();
      statLost.set(String(lost), lost > 25 ? 'bad' : lost > 10 ? 'warn' : 'good');
      statLast.set(String(lc));
      statOver.set(fmt(overhead(cfg.k), 1), overhead(cfg.k) > 6 ? 'warn' : '');
      statAvg.set(fmt(avgLoss(cfg.k), 1));
      table.innerHTML = '';
      [5, 10, 25, 50, 0].forEach(function (k) {
        table.appendChild(h('tr', cfg.k === k ? { style: { background: 'var(--accent-soft)' } } : {},
          h('td', k ? 'every ' + k + ' steps' : 'never'),
          h('td', fmt(avgLoss(k), 1) + ' steps'),
          h('td', fmt(overhead(k), 1) + '%')
        ));
      });
      message.set(
        cfg.k
          ? 'The crash at step ' + cfg.crash + ' sends you back to step **' + lc + '**. You redo **' + lost + '** steps. Saving every ' + cfg.k + ' steps costs **' + fmt(overhead(cfg.k), 1) + '%** of your time.'
          : 'With no checkpoints, a crash at step ' + cfg.crash + ' means starting again from step 0. All **' + lost + '** steps are lost.',
        lost > 25 ? 'bad' : lost > 10 ? 'warn' : 'good'
      );
    }
    var table = h('tbody');
    var sCrash = ui.slider({ label: 'Crash happens at step', min: 1, max: TOTAL, value: cfg.crash, onInput: function (v) { cfg.crash = v; paint(); } });
    var seg = ui.seg([5, 10, 25, 50, 0].map(function (k) { return { label: k ? 'every ' + k : 'never', value: k }; }), cfg.k, function (k) { cfg.k = k; paint(); }, 'Checkpoint interval');
    host.appendChild(h('div.controls', h('div.ctrl', h('div.lab', h('span', 'Save a checkpoint'), h('span')), seg.el), sCrash.el));
    host.appendChild(holder);
    host.appendChild(h('div.readout', statLost.el, statLast.el, statOver.el, statAvg.el));
    host.appendChild(message.el);
    host.appendChild(h('div.tablewrap', h('table', h('thead', h('tr', h('th', 'Interval'), h('th', 'Average steps lost per crash'), h('th', 'Time spent saving'))), table)));
    host.appendChild(h('p', { style: { fontSize: '0.84rem', color: 'var(--ink-3)' }, html: MLS.rich('Toy model: each checkpoint costs half a training step. Real checkpoints can cost much more or much less, depending on model size and storage.') }));
    paint();
  };

  /* ======================================================================
   * 4. activationMemory: why gradients need memory, and how recomputing helps
   * ==================================================================== */
  MLS.widgets.activationMemory = function (host) {
    var GPU_GB = 12;
    var cfg = { layers: 32, gb: 0.5 };
    var holder = h('div.scroll');
    var statAll = ui.stat('Peak, keep everything', 'GB');
    var statCk = ui.stat('Peak, recompute some', 'GB');
    var statExtra = ui.stat('Extra compute for recomputing', '');
    var message = ui.msg('');

    function timelineAll(L) {
      var m = [0];
      var t;
      for (t = 1; t <= L; t++) m.push(t);
      for (t = 1; t <= L; t++) m.push(L - t);
      return m;
    }
    function timelineCk(L, k) {
      var m = [0];
      var t;
      for (t = 1; t <= L; t++) m.push(Math.ceil(t / k));
      var nseg = Math.ceil(L / k);
      for (var sg = nseg - 1; sg >= 0; sg--) {
        var len = Math.min(L, (sg + 1) * k) - sg * k;
        var j;
        for (j = 1; j <= len; j++) m.push(sg + 1 + j);
        for (j = 1; j <= len; j++) m.push(sg + 1 + (len - j));
      }
      return m;
    }
    function draw(all, ck) {
      var width = 720;
      var height = 270;
      var l = 52;
      var r = 14;
      var top = 16;
      var bot = 40;
      var peakGB = Math.max.apply(null, all) * cfg.gb;
      var ymax = Math.max(peakGB, GPU_GB) * 1.12;
      var xmax = Math.max(all.length, ck.length) - 1;
      var sx = function (i) { return l + (i / xmax) * (width - l - r); };
      var sy = function (gb) { return top + (1 - gb / ymax) * (height - top - bot); };
      var svg = s('svg', { class: 'chart', viewBox: '0 0 ' + width + ' ' + height, role: 'img', 'aria-label': 'GPU memory use during one training step', style: 'min-width:560px' });
      var step = ymax > 24 ? 8 : 4;
      for (var g = 0; g <= ymax; g += step) {
        svg.appendChild(s('line', { class: 'grid', x1: l, x2: width - r, y1: sy(g), y2: sy(g) }));
        svg.appendChild(s('text', { x: l - 6, y: sy(g) + 4, 'text-anchor': 'end' }, g + ' GB'));
      }
      svg.appendChild(s('line', { class: 'axis', x1: l, x2: width - r, y1: sy(0), y2: sy(0) }));
      svg.appendChild(s('line', { x1: l, x2: width - r, y1: sy(GPU_GB), y2: sy(GPU_GB), stroke: 'var(--bad)', 'stroke-width': 2, 'stroke-dasharray': '6 4' }));
      svg.appendChild(s('text', { x: width - r, y: sy(GPU_GB) - 6, 'text-anchor': 'end', style: 'fill:var(--bad);font-weight:700' }, 'GPU memory: ' + GPU_GB + ' GB'));
      function line(arr, color) {
        var pts = arr.map(function (v, i) { return sx(i) + ',' + sy(v * cfg.gb); }).join(' ');
        svg.appendChild(s('polyline', { points: pts, fill: 'none', stroke: color, 'stroke-width': 3, 'stroke-linejoin': 'round' }));
      }
      line(all, 'var(--accent)');
      line(ck, 'var(--good)');
      svg.appendChild(s('text', { x: width / 2, y: height - 8, 'text-anchor': 'middle' }, 'time during one training step (forward pass, then backward pass)'));
      svg.appendChild(s('text', { x: l + 8, y: top + 12, style: 'fill:var(--accent);font-weight:700' }, 'blue: keep every activation'));
      svg.appendChild(s('text', { x: l + 8, y: top + 28, style: 'fill:var(--good);font-weight:700' }, 'green: keep a few, recompute the rest'));
      holder.innerHTML = '';
      holder.appendChild(svg);
    }
    function paint() {
      var L = cfg.layers;
      var k = Math.max(1, Math.round(Math.sqrt(L)));
      var all = timelineAll(L);
      var ck = timelineCk(L, k);
      var pa = Math.max.apply(null, all) * cfg.gb;
      var pc = Math.max.apply(null, ck) * cfg.gb;
      draw(all, ck);
      statAll.set(fmt(pa, 1), pa > GPU_GB ? 'bad' : 'good');
      statCk.set(fmt(pc, 1), pc > GPU_GB ? 'bad' : 'good');
      statExtra.set('about +33%', 'warn');
      if (pa > GPU_GB && pc <= GPU_GB) {
        message.set('Keeping every activation needs **' + fmt(pa, 1) + ' GB** and the GPU has ' + GPU_GB + '. The step **runs out of memory**. Keeping one checkpoint every ' + k + ' layers needs **' + fmt(pc, 1) + ' GB** and fits, at the price of redoing some forward work.', 'warn');
      } else if (pa > GPU_GB) {
        message.set('Neither option fits. Try fewer layers, a smaller activation size (a smaller batch), or both.', 'bad');
      } else {
        message.set('Everything fits in ' + GPU_GB + ' GB, so there is no reason to recompute. Raise the layer count or the activation size until the blue line crosses the red one.', 'good');
      }
    }
    var sL = ui.slider({ label: 'Layers', min: 4, max: 64, value: cfg.layers, onInput: function (v) { cfg.layers = v; paint(); } });
    var sS = ui.slider({ label: 'Saved values per layer (GB)', min: 0.1, max: 1, step: 0.1, value: cfg.gb, onInput: function (v) { cfg.gb = v; paint(); } });
    host.appendChild(h('div.controls', sL.el, sS.el));
    host.appendChild(holder);
    host.appendChild(h('div.readout', statAll.el, statCk.el, statExtra.el));
    host.appendChild(message.el);
    host.appendChild(h('p', { style: { fontSize: '0.84rem', color: 'var(--ink-3)' }, html: MLS.rich('Toy model: every layer saves the same amount, one extra forward pass is the cost of recomputing, and the GPU has 12 GB (a common size for 2016-era cards). The paper discusses GPU memory pressure from gradient computation. Recomputing is a technique popularized by later work.') }));
    paint();
  };
})();
