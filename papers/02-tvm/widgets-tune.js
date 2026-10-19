/*
 * Widget for Paper 2 (TVM): costModelLab.
 * Trains a small gradient-boosted tree model on schedules you "measure" (looked up in the cache
 * simulation from sim.js), then uses it to rank all 9,000 schedules without measuring them.
 * It compares the model's picks against random picks only. It does not claim anything about
 * stronger baselines, which the paper compares against in its own experiments.
 */
(function () {
  'use strict';
  var MLS = window.MLS;
  var h = MLS.h;
  var s = MLS.s;
  var ui = MLS.ui;
  var fmt = MLS.fmt;
  var SIM = window.TVMSIM;

  MLS.widgets.costModelLab = function (host) {
    var SIZES = [8, 16, 32, 64, 128, 256, 512];
    var K = 16; /* how many model-picked schedules we would measure next */
    var cfg = { m: 3, seed: 1 };
    var space = null;
    var feats = null;
    var truth = null; /* true cost of every schedule */
    var trueRank = null;
    var best = 0;
    var perm = null;
    var randomK = 0;

    var holder = h('div.scroll');
    var statM = ui.stat('Schedules measured', '');
    var statRho = ui.stat('Rank correlation, all 9,000', '');
    var statPick = ui.stat('Best of model\'s top 16', 'x optimum');
    var statRand = ui.stat('Best of 16 random', 'x optimum');
    var statTime = ui.stat('Time to rank all 9,000', '');
    var message = ui.msg('Preparing the 9,000-schedule space...');

    function makePerm(seed) {
      var r = MLS.rng(seed * 7919 + 13);
      var a = space.map(function (_, i) { return i; });
      for (var i = a.length - 1; i > 0; i--) {
        var j = Math.floor(r() * (i + 1));
        var t = a[i];
        a[i] = a[j];
        a[j] = t;
      }
      return a;
    }
    function ranksOf(v) {
      var idx = v.map(function (x, i) { return [x, i]; }).sort(function (p, q) { return p[0] - q[0]; });
      var r = new Array(v.length);
      idx.forEach(function (p, k) { r[p[1]] = k; });
      return r;
    }
    function prepare() {
      space = SIM.buildSpace();
      feats = space.map(SIM.features);
      truth = space.map(function (c) { return c.cost; });
      trueRank = ranksOf(truth);
      best = Math.min.apply(null, truth);
      cfg.seed = cfg.seed || 1;
      perm = makePerm(cfg.seed);
      /* average best-of-16 for random picks among schedules outside the training pool */
      var r = MLS.rng(99);
      var sum = 0;
      for (var d = 0; d < 300; d++) {
        var b = Infinity;
        for (var k = 0; k < K; k++) b = Math.min(b, truth[Math.floor(r() * truth.length)]);
        sum += Math.log(b / best);
      }
      randomK = Math.exp(sum / 300);
    }

    function paint() {
      if (!space) return;
      var M = SIZES[cfg.m];
      var train = perm.slice(0, M);
      var inTrain = {};
      train.forEach(function (i) { inTrain[i] = true; });
      var model = SIM.fitBoost(train.map(function (i) { return feats[i]; }), train.map(function (i) { return Math.log(truth[i]); }));
      var t0 = performance.now();
      var pred = feats.map(function (f) { return model(f); });
      var ms = performance.now() - t0;
      var rho = SIM.spearman(pred, truth);
      var predRank = ranksOf(pred);

      /* the model's 16 best unmeasured picks, measured for real */
      var order = pred.map(function (p, i) { return [p, i]; }).filter(function (p) { return !inTrain[p[1]]; }).sort(function (a, b) { return a[0] - b[0]; }).slice(0, K);
      var pick = Math.min.apply(null, order.map(function (p) { return truth[p[1]]; })) / best;
      var measuredBest = Math.min.apply(null, train.map(function (i) { return truth[i]; })) / best;

      /* scatter of 300 schedules the model has never seen */
      var width = 420;
      var height = 320;
      var l = 46;
      var b = 40;
      var svg = s('svg', { class: 'chart', viewBox: '0 0 ' + width + ' ' + height, role: 'img', 'aria-label': 'Model rank against true rank for 300 unseen schedules', style: 'min-width:0;max-width:' + width + 'px' });
      svg.appendChild(s('rect', { x: l, y: 10, width: width - l - 10, height: height - b - 10, fill: 'none', stroke: 'var(--line-strong)' }));
      svg.appendChild(s('line', { x1: l, y1: height - b, x2: width - 10, y2: 10, stroke: 'var(--good)', 'stroke-width': 2, 'stroke-dasharray': '6 4' }));
      var shown = 0;
      for (var q = SIZES[SIZES.length - 1]; q < perm.length && shown < 300; q++, shown++) {
        var id = perm[q];
        var x = l + (trueRank[id] / truth.length) * (width - l - 10);
        var y = height - b - (predRank[id] / truth.length) * (height - b - 10);
        svg.appendChild(s('circle', { cx: x, cy: y, r: 2.6, fill: 'var(--accent)', opacity: 0.55 }));
      }
      svg.appendChild(s('text', { x: (l + width) / 2, y: height - 8, 'text-anchor': 'middle' }, 'true rank (fastest on the left)'));
      var yl = s('text', { x: 12, y: (height - b) / 2, 'text-anchor': 'middle', transform: 'rotate(-90 12 ' + (height - b) / 2 + ')' }, 'model\'s rank (fastest at the bottom)');
      svg.appendChild(yl);
      svg.appendChild(s('text', { x: l + 10, y: 28, style: 'fill:var(--good);font-weight:700' }, 'dashed line: perfect model'));
      holder.innerHTML = '';
      holder.appendChild(svg);

      statM.set(String(M));
      statRho.set(rho.toFixed(2), rho > 0.8 ? 'good' : rho < 0.5 ? 'bad' : 'warn');
      statPick.set(pick.toFixed(2), pick < randomK * 0.95 ? 'good' : '');
      statRand.set(randomK.toFixed(2));
      statTime.set(fmt(ms, 0) + ' ms');
      var lines = [];
      if (rho < 0.5) lines.push('With only ' + M + ' measurements the model has learned very little. Its ranking is close to a guess, so the dots form a cloud.');
      else if (rho < 0.8) lines.push('The model has picked up the main trends. The dots hug the dashed line more, but there is still plenty of scatter.');
      else lines.push('The model ranks the schedules it has never seen quite well. The dots follow the dashed line.');
      if (pick < randomK * 0.95) lines.push('Its top 16 picks, once measured, beat 16 random picks.');
      else lines.push('At this size, its top 16 picks are no better than 16 random picks. More data is the fix.');
      lines.push('The best schedule among the ' + M + ' you measured is ' + measuredBest.toFixed(2) + 'x the optimum.');
      lines.push('Ranking all 9,000 took the model ' + fmt(ms, 0) + ' ms. Measuring all of them would take ' + MLS.fmtDuration(space.length) + ' if each run took 1 second.');
      message.set(lines.join(' '), rho > 0.8 ? 'good' : '');
    }

    var slider = ui.slider({ label: 'Hardware measurements used for training', min: 0, max: SIZES.length - 1, value: cfg.m, format: function (v) { return SIZES[v]; }, onInput: function (v) { cfg.m = v; paint(); } });
    var reroll = ui.btn('Measure different schedules', function () {
      cfg.seed++;
      perm = makePerm(cfg.seed);
      paint();
    });
    host.appendChild(h('p', { html: MLS.rich('In the lab before, you could try any schedule, and the simulator told you its cost. On real hardware, each try (compile, run, time) takes seconds. Here, **you pay for measurements**. A model learns from them, then **predicts** the cost of schedules nobody has measured.') }));
    host.appendChild(h('div.controls', slider.el, h('div.ctrl', h('div.lab', h('span', ' ')), reroll)));
    host.appendChild(holder);
    host.appendChild(h('div.readout', statM.el, statRho.el, statPick.el, statRand.el, statTime.el));
    host.appendChild(message.el);
    host.appendChild(h('p', { style: { fontSize: '0.84rem', color: 'var(--ink-3)' }, html: MLS.rich('Toy model: gradient-boosted trees (40 small trees) trained with a plain regression on log cost, then judged by ranking. The paper also uses gradient-boosted trees but trains them with a ranking loss, on real hardware, with far larger spaces. This widget compares the model only with random picks, which is the weakest baseline. The paper tests stronger ones.') }));
    /* the space takes a third of a second to build, so give the page a chance to paint first */
    setTimeout(function () {
      prepare();
      paint();
    }, 30);
  };
})();
