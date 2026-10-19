/*
 * Widgets for Paper 1 that are built around small dataflow graphs.
 * graphPlayground, variableDemo, partialExec, placementLab, autodiff.
 */
(function () {
  'use strict';
  var MLS = window.MLS;
  var h = MLS.h;
  var ui = MLS.ui;
  var fmt = MLS.fmt;

  function f2(n) {
    return fmt(n, 2);
  }

  /* ======================================================================
   * 1. graphPlayground: run y = ReLU(x . W + b) wave by wave
   * ==================================================================== */
  MLS.widgets.graphPlayground = function (host) {
    var v = { x1: 2, x2: 1, w1: 1.5, w2: -0.5, b: 0.5 };
    var wave = 0;
    var waves = [['x', 'W', 'b'], ['mm'], ['add'], ['relu']];
    var holder = h('div.scroll');
    var g = MLS.graph(holder, {
      width: 660,
      height: 270,
      ariaLabel: 'Dataflow graph for y equals ReLU of x times W plus b',
      nodes: [
        { id: 'x', label: 'x', sub: 'input', cx: 70, cy: 55, kind: 'input' },
        { id: 'W', label: 'W', sub: 'variable', cx: 70, cy: 135, kind: 'var' },
        { id: 'b', label: 'b', sub: 'variable', cx: 70, cy: 225, kind: 'var' },
        { id: 'mm', label: 'MatMul', sub: 'x . W', cx: 260, cy: 95, kind: 'op' },
        { id: 'add', label: 'Add', sub: '+ b', cx: 410, cy: 150, kind: 'op' },
        { id: 'relu', label: 'ReLU', sub: 'max(0, z)', cx: 570, cy: 150, kind: 'op' }
      ],
      edges: [
        { from: 'x', to: 'mm' },
        { from: 'W', to: 'mm' },
        { from: 'mm', to: 'add' },
        { from: 'b', to: 'add' },
        { from: 'add', to: 'relu' }
      ]
    });
    var message = ui.msg('');
    var formula = h('p', { style: { fontFamily: 'var(--mono)', fontSize: '0.9rem' } });

    function values() {
      var mm = v.x1 * v.w1 + v.x2 * v.w2;
      var z = mm + v.b;
      return { mm: mm, z: z, y: Math.max(0, z) };
    }
    function executed(id) {
      for (var i = 0; i < wave; i++) if (waves[i].indexOf(id) >= 0) return true;
      return false;
    }
    function render() {
      var c = values();
      g.reset();
      var showSub = {
        x: '[' + v.x1 + ', ' + v.x2 + ']',
        W: '[' + v.w1 + ', ' + v.w2 + ']',
        b: String(v.b),
        mm: executed('mm') ? '= ' + f2(c.mm) : 'x . W',
        add: executed('add') ? '= ' + f2(c.z) : '+ b',
        relu: executed('relu') ? 'y = ' + f2(c.y) : 'max(0, z)'
      };
      Object.keys(showSub).forEach(function (id) {
        g.node(id).sub(showSub[id]);
      });
      Object.keys(showSub).forEach(function (id) {
        if (executed(id)) g.node(id).cls('is-done', true);
      });
      if (wave > 0) waves[wave - 1].forEach(function (id) { g.node(id).cls('is-active', true); });
      var lab = {
        'x>mm': '[' + v.x1 + ', ' + v.x2 + ']',
        'W>mm': '[' + v.w1 + ', ' + v.w2 + ']',
        'mm>add': f2(c.mm),
        'b>add': String(v.b),
        'add>relu': f2(c.z)
      };
      g.edges().forEach(function (e) {
        var key = e.spec.from + '>' + e.spec.to;
        if (executed(e.spec.from)) {
          e.state('done');
          e.label(lab[key]);
        } else {
          e.state('');
          e.label('');
        }
      });
      var text = [
        'Nothing has run yet. The graph is only a description of the computation. Press **Run next wave**.',
        '**Wave 1.** x, W and b have no inputs, so all three are ready at the same moment. TensorFlow is free to run them in parallel.',
        '**Wave 2.** MatMul had to wait for x and W. It computes ' + v.x1 + ' x ' + v.w1 + ' + ' + v.x2 + ' x ' + v.w2 + ' = ' + f2(c.mm) + '.',
        '**Wave 3.** Add needs MatMul\'s result and b: ' + f2(c.mm) + ' + ' + v.b + ' = ' + f2(c.z) + '.',
        '**Wave 4.** ReLU keeps positive numbers and turns negative ones into 0, so y = ' + f2(c.y) + '. Six nodes finished in four waves because independent nodes share a wave.'
      ];
      message.set(text[wave], wave === 4 ? 'good' : '');
      formula.textContent = 'y = ReLU(' + v.x1 + ' x ' + v.w1 + ' + ' + v.x2 + ' x ' + v.w2 + ' + ' + v.b + ') = ReLU(' + f2(c.z) + ') = ' + f2(c.y);
      next.disabled = wave >= 4;
    }

    function mk(label, key, min, max) {
      return ui.slider({
        label: label,
        min: min,
        max: max,
        step: 0.5,
        value: v[key],
        onInput: function (val) {
          v[key] = val;
          render();
        }
      });
    }
    var controls = h('div.controls', [
      mk('x1', 'x1', -3, 3).el,
      mk('x2', 'x2', -3, 3).el,
      mk('w1', 'w1', -2, 2).el,
      mk('w2', 'w2', -2, 2).el,
      mk('b', 'b', -2, 2).el
    ]);
    var next = ui.btn('Run next wave', function () {
      if (wave < 4) wave++;
      render();
    }, 'primary');
    var all = ui.btn('Run everything', function () {
      wave = 4;
      render();
    });
    var reset = ui.btn('Reset', function () {
      wave = 0;
      render();
    });
    host.appendChild(controls);
    host.appendChild(holder);
    host.appendChild(h('div.btnrow', next, all, reset));
    host.appendChild(message.el);
    host.appendChild(formula);
    render();
  };

  /* ======================================================================
   * 2. variableDemo: state that survives between Run calls
   * ==================================================================== */
  MLS.widgets.variableDemo = function (host, opts, ctx) {
    var X = 2;
    var T = 6;
    var LR = 0.05;
    var w = 0;
    var runs = 0;
    var logItems = [];
    var board = ui.stat('Variable w (lives inside the session)', '');
    var predStat = ui.stat('Prediction w x 2 (target is 6)', '');
    var log = h('ol', { style: { margin: 0, paddingLeft: '1.3em', fontSize: '0.92rem' } });
    var empty = h('p', { style: { color: 'var(--ink-3)', fontSize: '0.92rem' } }, 'No Run calls yet.');

    function paint() {
      board.set(f2(w), 'warn');
      predStat.set(f2(w * X), Math.abs(w * X - T) < 0.1 ? 'good' : '');
      log.innerHTML = '';
      logItems.slice(-6).forEach(function (it) {
        log.appendChild(h('li', { html: MLS.rich(it) }));
      });
      empty.hidden = logItems.length > 0;
    }
    function train() {
      runs++;
      var p = w * X;
      var grad = 2 * (p - T) * X;
      var before = w;
      w = w - LR * grad;
      logItems.push('**Run ' + runs + ' (train step).** Read w = ' + f2(before) + ', prediction = ' + f2(p) + ', gradient = ' + f2(grad) + '. Wrote w = ' + f2(w) + '.');
      paint();
    }
    function predict() {
      runs++;
      logItems.push('**Run ' + runs + ' (predict).** Read w = ' + f2(w) + ', prediction = ' + f2(w * X) + '. Wrote nothing, so w is unchanged.');
      paint();
    }
    function close() {
      w = 0;
      runs = 0;
      logItems.push('**Session closed.** The variable is gone. A new session starts again at w = 0.');
      paint();
    }
    host.appendChild(h('p', { html: MLS.rich('The graph is tiny: `prediction = w x 2`, `loss = (prediction - 6)^2`, and the train step moves `w` by `0.05 x gradient`. The point is where `w` lives.') }));
    host.appendChild(h('div.readout', board.el, predStat.el));
    host.appendChild(h('div.btnrow', ui.btn('Run: train step', train, 'primary'), ui.btn('Run: predict only', predict), ui.btn('Close session', close)));
    host.appendChild(h('div', empty, log));
    paint();
  };

  /* ======================================================================
   * 3. partialExec: fetch and feed, and which nodes actually run
   * ==================================================================== */
  MLS.widgets.partialExec = function (host) {
    var nodes = [
      { id: 'read', label: 'Read', sub: 'file reader', cx: 60, cy: 50, kind: 'io' },
      { id: 'decode', label: 'Decode', sub: 'x, preprocess', cx: 180, cy: 50, kind: 'op' },
      { id: 'labels', label: 'Labels', sub: 'input', cx: 660, cy: 50, kind: 'input' },
      { id: 'W', label: 'W', sub: 'variable', cx: 60, cy: 130, kind: 'var' },
      { id: 'mm', label: 'MatMul', sub: '', cx: 300, cy: 130, kind: 'op' },
      { id: 'add', label: 'Add', sub: '+ b', cx: 420, cy: 130, kind: 'op' },
      { id: 'pred', label: 'ReLU', sub: 'prediction', cx: 540, cy: 130, kind: 'op' },
      { id: 'loss', label: 'Loss', sub: '', cx: 660, cy: 130, kind: 'op' },
      { id: 'b', label: 'b', sub: 'variable', cx: 60, cy: 215, kind: 'var' },
      { id: 'grad', label: 'Gradients', sub: '', cx: 540, cy: 215, kind: 'grad' },
      { id: 'update', label: 'Update', sub: 'W, b', cx: 420, cy: 295, kind: 'op' },
      { id: 'save', label: 'Save', sub: 'checkpoint', cx: 180, cy: 295, kind: 'io' }
    ];
    var deps = {
      decode: ['read'],
      mm: ['decode', 'W'],
      add: ['mm', 'b'],
      pred: ['add'],
      loss: ['pred', 'labels'],
      grad: ['loss'],
      update: ['grad', 'W', 'b'],
      save: ['W', 'b']
    };
    var edges = [];
    Object.keys(deps).forEach(function (to) {
      deps[to].forEach(function (from) {
        edges.push({ from: from, to: to });
      });
    });
    var mode = 'fetch';
    var fetch = {};
    var feed = {};
    var total = nodes.length;

    var holder = h('div.scroll');
    var g = MLS.graph(holder, {
      width: 740,
      height: 340,
      ariaLabel: 'A simplified training graph. Click a node to fetch it or feed it.',
      nodes: nodes,
      edges: edges,
      onNodeClick: function (id) {
        var set = mode === 'fetch' ? fetch : feed;
        if (set[id]) delete set[id];
        else set[id] = true;
        render();
      }
    });
    var message = ui.msg('');
    var statRun = ui.stat('Nodes that run', '');
    var statSkip = ui.stat('Nodes skipped', '');

    function plan() {
      var run = {};
      var fed = {};
      function visit(id) {
        if (run[id] || fed[id]) return;
        if (feed[id]) {
          fed[id] = true;
          return;
        }
        run[id] = true;
        (deps[id] || []).forEach(visit);
      }
      Object.keys(fetch).forEach(visit);
      return { run: run, fed: fed };
    }
    function render() {
      var p = plan();
      g.reset();
      var runCount = Object.keys(p.run).length;
      var any = Object.keys(fetch).length > 0;
      nodes.forEach(function (n) {
        var node = g.node(n.id);
        node.badge('');
        if (p.run[n.id]) node.cls('is-active', true);
        else if (p.fed[n.id]) node.cls('is-feed', true);
        else node.cls('is-skip', true);
        if (fetch[n.id]) node.badge('FETCH');
        if (feed[n.id]) node.badge(fetch[n.id] ? 'FETCH + FEED' : 'FEED');
        node.aria(n.label + (p.run[n.id] ? ', runs' : p.fed[n.id] ? ', fed by you' : ', skipped'));
      });
      g.edges().forEach(function (e) {
        var a = e.spec.from;
        var b = e.spec.to;
        e.state(p.run[b] && (p.run[a] || p.fed[a]) ? 'active' : 'dim');
      });
      statRun.set(String(runCount) + ' of ' + total, runCount ? 'good' : '');
      statSkip.set(String(total - runCount - Object.keys(p.fed).length));
      if (!any) {
        message.set('Click a node to **fetch** it. A fetch means: "give me this node\'s value." Only the nodes it depends on will run.');
      } else {
        var skipped = nodes.filter(function (n) { return !p.run[n.id] && !p.fed[n.id]; }).map(function (n) { return n.label; });
        var fedList = Object.keys(p.fed);
        message.set(
          '**' + runCount + ' of ' + total + ' nodes run.** ' +
            (fedList.length ? 'You supplied ' + fedList.join(', ') + ' yourself, so everything upstream of it is skipped. ' : '') +
            (skipped.length ? 'Not needed this time: ' + skipped.join(', ') + '.' : 'Every node was needed.'),
          'good'
        );
      }
    }
    function preset(fetchIds, feedIds) {
      fetch = {};
      feed = {};
      fetchIds.forEach(function (i) { fetch[i] = true; });
      (feedIds || []).forEach(function (i) { feed[i] = true; });
      render();
    }
    var modeSeg = ui.seg([{ label: 'Click to fetch', value: 'fetch' }, { label: 'Click to feed', value: 'feed' }], 'fetch', function (m) { mode = m; }, 'What a click does');
    host.appendChild(h('div.btnrow', h('b', 'Quick setups:'),
      ui.btn('Predict', function () { preset(['pred']); }),
      ui.btn('Train one step', function () { preset(['update']); }),
      ui.btn('Save a checkpoint', function () { preset(['save']); }),
      ui.btn('Predict on my own input (feed Decode)', function () { preset(['pred'], ['decode']); }),
      ui.btn('Clear', function () { preset([]); })
    ));
    host.appendChild(h('div.btnrow', h('b', 'Or build your own:'), modeSeg.el));
    host.appendChild(holder);
    host.appendChild(h('div.readout', statRun.el, statSkip.el));
    host.appendChild(message.el);
    preset(['pred']);
  };

  /* ======================================================================
   * 4. placementLab: assign nodes to two GPUs, see Send/Recv nodes appear
   * ==================================================================== */
  MLS.widgets.placementLab = function (host) {
    var NODES = [
      { id: 'in', label: 'Input', cost: 2, cx: 60, cy: 150 },
      { id: 'a1', label: 'Conv A1', cost: 8, cx: 190, cy: 80 },
      { id: 'a2', label: 'Conv A2', cost: 8, cx: 340, cy: 80 },
      { id: 'b1', label: 'Conv B1', cost: 8, cx: 190, cy: 230 },
      { id: 'b2', label: 'Conv B2', cost: 8, cx: 340, cy: 230 },
      { id: 'cat', label: 'Concat', cost: 3, cx: 480, cy: 150 },
      { id: 'fc', label: 'Dense', cost: 6, cx: 630, cy: 150 },
      { id: 'loss', label: 'Loss', cost: 2, cx: 750, cy: 150 }
    ];
    /* labels of edges between nodes in the same row sit above the row so they never cover a node */
    var LABEL_AT = { 'a1>a2': [265, 44], 'b1>b2': [265, 194], 'cat>fc': [555, 114], 'fc>loss': [690, 114] };
    var E = [
      ['in', 'a1', 4], ['in', 'b1', 4], ['a1', 'a2', 6], ['b1', 'b2', 6],
      ['a2', 'cat', 2], ['b2', 'cat', 2], ['cat', 'fc', 4], ['fc', 'loss', 1]
    ];
    var ORDER = ['in', 'a1', 'b1', 'a2', 'b2', 'cat', 'fc', 'loss'];
    var MS_PER_MB = 1;
    var cost = {};
    NODES.forEach(function (n) { cost[n.id] = n.cost; });
    var preds = {};
    E.forEach(function (e) {
      (preds[e[1]] = preds[e[1]] || []).push([e[0], e[2]]);
    });
    var dev = {};
    NODES.forEach(function (n) { dev[n.id] = 0; });

    function evaluate(assign) {
      var finish = {};
      var free = [0, 0];
      var busy = [0, 0];
      ORDER.forEach(function (id) {
        var d = assign[id];
        var ready = 0;
        (preds[id] || []).forEach(function (p) {
          var t = finish[p[0]] + (assign[p[0]] !== d ? p[1] * MS_PER_MB : 0);
          if (t > ready) ready = t;
        });
        var start = Math.max(ready, free[d]);
        finish[id] = start + cost[id];
        free[d] = finish[id];
        busy[d] += cost[id];
      });
      var traffic = 0;
      var cuts = 0;
      E.forEach(function (e) {
        if (assign[e[0]] !== assign[e[1]]) {
          traffic += e[2];
          cuts++;
        }
      });
      return { time: finish.loss, busy: busy, traffic: traffic, cuts: cuts };
    }
    function bestPlacement() {
      var best = null;
      for (var mask = 0; mask < 1 << ORDER.length; mask++) {
        var a = {};
        ORDER.forEach(function (id, i) { a[id] = (mask >> i) & 1; });
        var r = evaluate(a);
        if (!best || r.time < best.r.time - 1e-9) best = { a: a, r: r };
      }
      return best;
    }
    var best = bestPlacement();
    var single = evaluate(dev).time;

    var holder = h('div.scroll');
    var g = MLS.graph(holder, {
      width: 800,
      height: 290,
      minWidth: 640,
      ariaLabel: 'A small network. Click a node to move it between GPU 0 and GPU 1.',
      nodes: NODES.map(function (n) {
        return { id: n.id, label: n.label, sub: n.cost + ' ms', cx: n.cx, cy: n.cy, w: 84, h: 44, kind: 'op' };
      }),
      edges: E.map(function (e) { return { from: e[0], to: e[1], labelAt: LABEL_AT[e[0] + '>' + e[1]] }; }),
      onNodeClick: function (id) {
        dev[id] = dev[id] ? 0 : 1;
        render();
      }
    });
    var statTime = ui.stat('Estimated step time', 'ms');
    var statSpeed = ui.stat('Speedup vs one GPU', 'x');
    var statLoad = ui.stat('GPU 0 / GPU 1 busy', 'ms');
    var statCut = ui.stat('Send/Recv pairs (traffic)', '');
    var message = ui.msg('');

    function render() {
      var r = evaluate(dev);
      NODES.forEach(function (n) {
        var node = g.node(n.id);
        node.cls('dev-a', dev[n.id] === 0);
        node.cls('dev-b', dev[n.id] === 1);
        node.badge(dev[n.id] === 0 ? 'GPU 0' : 'GPU 1');
        node.aria(n.label + ', ' + n.cost + ' milliseconds, on GPU ' + dev[n.id] + '. Press to move it.');
      });
      E.forEach(function (e) {
        var edge = g.edge(e[0], e[1]);
        var cut = dev[e[0]] !== dev[e[1]];
        edge.state(cut ? 'cut' : '');
        edge.label(cut ? 'Send/Recv ' + e[2] + ' MB' : e[2] + ' MB');
      });
      statTime.set(fmt(r.time, 0), r.time <= best.r.time + 1e-9 ? 'good' : '');
      statSpeed.set(fmt(single / r.time, 2), single / r.time > 1.05 ? 'good' : '');
      statLoad.set(r.busy[0] + ' / ' + r.busy[1]);
      statCut.set(r.cuts + ' (' + r.traffic + ' MB)', r.cuts > 3 ? 'warn' : '');
      if (r.time <= best.r.time + 1e-9) {
        message.set('**You matched the best placement in this toy model** (' + fmt(best.r.time, 0) + ' ms). Notice how few edges you had to cut.', 'good');
      } else if (r.time >= single) {
        message.set('One GPU does everything in ' + fmt(single, 0) + ' ms. Click nodes to move work to GPU 1. The best possible is ' + fmt(best.r.time, 0) + ' ms (but no peeking yet).');
      } else {
        message.set('You are at ' + fmt(r.time, 0) + ' ms. Can you beat that? Moving work across costs transfer time, so cut as few heavy edges as you can.');
      }
    }
    function greedy() {
      var a = {};
      var finish = {};
      var free = [0, 0];
      ORDER.forEach(function (id) {
        var bestD = 0;
        var bestF = Infinity;
        [0, 1].forEach(function (d) {
          var ready = 0;
          (preds[id] || []).forEach(function (p) {
            var t = finish[p[0]] + (a[p[0]] !== d ? p[1] * MS_PER_MB : 0);
            if (t > ready) ready = t;
          });
          var fin = Math.max(ready, free[d]) + cost[id];
          if (fin < bestF - 1e-9) {
            bestF = fin;
            bestD = d;
          }
        });
        a[id] = bestD;
        finish[id] = bestF;
        free[bestD] = bestF;
      });
      dev = a;
      render();
    }
    host.appendChild(h('p', { html: MLS.rich('**Your job:** spread this network over two GPUs to make one training step finish sooner. Click a node to move it between GPU 0 (blue) and GPU 1 (orange). Moving a node can create **Send/Recv** pairs on the edges you cut.') }));
    host.appendChild(holder);
    host.appendChild(h('div.readout', statTime.el, statSpeed.el, statLoad.el, statCut.el));
    host.appendChild(message.el);
    host.appendChild(h('div.btnrow',
      ui.btn('Everything on GPU 0', function () { NODES.forEach(function (n) { dev[n.id] = 0; }); render(); }),
      ui.btn('Greedy auto-place', greedy),
      ui.btn('Show the best placement', function () { dev = Object.assign({}, best.a); render(); })
    ));
    host.appendChild(h('p', { style: { fontSize: '0.86rem', color: 'var(--ink-3)' }, html: MLS.rich('Toy cost model: each node has a compute time, each edge a size in MB, moving 1 MB between GPUs adds 1 ms, and a GPU runs one node at a time. The numbers are invented for teaching.') }));
    render();
  };

  /* ======================================================================
   * 5. autodiff: forward pass, then gradient nodes added to the same graph
   * ==================================================================== */
  MLS.widgets.autodiff = function (host) {
    var X = 2;
    var v = { w: 3, b: -1, t: 4, lr: 0.1 };
    var step = 0;
    var LAST = 5;
    var holder = h('div.scroll');
    var g = MLS.graph(holder, {
      width: 740,
      height: 340,
      ariaLabel: 'Forward graph on top, gradient nodes below',
      nodes: [
        { id: 'x', label: 'x', sub: '2', cx: 70, cy: 60, kind: 'input' },
        { id: 'mul', label: 'Mul', sub: 'w * x', cx: 210, cy: 60, kind: 'op' },
        { id: 'add', label: 'Add', sub: '+ b = z', cx: 350, cy: 60, kind: 'op' },
        { id: 'relu', label: 'ReLU', sub: 'a', cx: 490, cy: 60, kind: 'op' },
        { id: 'loss', label: 'Loss', sub: '(a - t)^2', cx: 630, cy: 60, kind: 'op' },
        { id: 'w', label: 'w', sub: '', cx: 210, cy: 140, kind: 'var' },
        { id: 'b', label: 'b', sub: '', cx: 350, cy: 140, kind: 'var' },
        { id: 't', label: 't', sub: 'target', cx: 540, cy: 140, kind: 'input' },
        { id: 'da', label: 'dL/da', sub: 'needs a, t', cx: 630, cy: 250, kind: 'grad' },
        { id: 'dz', label: 'dL/dz', sub: 'needs z', cx: 490, cy: 250, kind: 'grad' },
        { id: 'db', label: 'dL/db', sub: '', cx: 350, cy: 250, kind: 'grad' },
        { id: 'dw', label: 'dL/dw', sub: 'needs x', cx: 210, cy: 250, kind: 'grad' }
      ],
      edges: [
        { from: 'x', to: 'mul' }, { from: 'w', to: 'mul' }, { from: 'mul', to: 'add' }, { from: 'b', to: 'add' },
        { from: 'add', to: 'relu' }, { from: 'relu', to: 'loss' }, { from: 't', to: 'loss' },
        { from: 'loss', to: 'da' }, { from: 'da', to: 'dz' }, { from: 'dz', to: 'db' },
        { from: 'dz', to: 'dw', path: 'M 490,272 C 490,325 210,325 210,272', labelAt: [350, 322] }
      ]
    });
    var message = ui.msg('');
    var statLoss = ui.stat('Loss now', '');
    var statAfter = ui.stat('Loss after one update', '');

    function calc() {
      var m = v.w * X;
      var z = m + v.b;
      var a = Math.max(0, z);
      var L = (a - v.t) * (a - v.t);
      var da = 2 * (a - v.t);
      var dz = z > 0 ? da : 0;
      var db = dz;
      var dw = dz * X;
      var w2 = v.w - v.lr * dw;
      var b2 = v.b - v.lr * db;
      var a2 = Math.max(0, w2 * X + b2);
      return { m: m, z: z, a: a, L: L, da: da, dz: dz, db: db, dw: dw, w2: w2, b2: b2, L2: (a2 - v.t) * (a2 - v.t) };
    }
    var GRAD_EDGES = [['loss', 'da'], ['da', 'dz'], ['dz', 'db'], ['dz', 'dw']];
    function render() {
      var c = calc();
      g.reset();
      var fwd = ['x', 'mul', 'add', 'relu', 'loss', 'w', 'b', 't'];
      g.node('x').sub(String(X));
      g.node('w').sub(String(v.w));
      g.node('b').sub(String(v.b));
      g.node('t').sub(String(v.t));
      g.node('mul').sub(step >= 1 ? '= ' + f2(c.m) : 'w * x');
      g.node('add').sub(step >= 1 ? 'z = ' + f2(c.z) : '+ b = z');
      g.node('relu').sub(step >= 1 ? 'a = ' + f2(c.a) : 'a');
      g.node('loss').sub(step >= 1 ? '= ' + f2(c.L) : '(a - t)^2');
      ['da', 'dz', 'db', 'dw'].forEach(function (id) {
        g.node(id).cls('is-dim', true);
        g.node(id).badge('');
      });
      g.edges().forEach(function (e) {
        var isGrad = GRAD_EDGES.some(function (p) { return p[0] === e.spec.from && p[1] === e.spec.to; });
        e.state(isGrad ? 'dim' : '');
      });
      if (step >= 1) {
        fwd.forEach(function (id) { g.node(id).cls('is-done', true); });
        ['x', 'add', 'relu'].forEach(function (id) { g.node(id).badge('kept in memory'); });
      }
      function reveal(id, text, activeNow) {
        var n = g.node(id);
        n.cls('is-dim', false);
        n.sub(text);
        if (activeNow) n.cls('is-active', true);
        else n.cls('is-done', true);
      }
      var revealed = [];
      if (step >= 2) { reveal('da', '= ' + f2(c.da), step === 2); revealed.push('da'); }
      if (step >= 3) { reveal('dz', '= ' + f2(c.dz), step === 3); revealed.push('dz'); }
      if (step >= 4) { reveal('db', '= ' + f2(c.db), step === 4); reveal('dw', '= ' + f2(c.dw), step === 4); revealed.push('db', 'dw'); }
      g.edges().forEach(function (e) {
        var inGrad = GRAD_EDGES.some(function (p) { return p[0] === e.spec.from && p[1] === e.spec.to; });
        if (inGrad && (revealed.indexOf(e.spec.to) >= 0)) e.state('grad');
      });
      if (step >= 2) g.edge('loss', 'da').state('grad');
      if (step >= 5) {
        g.node('w').badge('new w = ' + f2(c.w2));
        g.node('b').badge('new b = ' + f2(c.b2));
        g.node('w').cls('is-active', true);
        g.node('b').cls('is-active', true);
      }
      var caps = [
        'We have a one-neuron model with a loss. So far TensorFlow only has the forward graph. Press **Next** to run it.',
        '**Forward pass.** w x x = ' + f2(c.m) + ', plus b gives z = ' + f2(c.z) + ', ReLU gives a = ' + f2(c.a) + ', and the loss is (' + f2(c.a) + ' - ' + v.t + ')^2 = ' + f2(c.L) + '. The nodes marked "kept in memory" hold values the backward pass will need.',
        '**Gradient node 1.** TensorFlow added a new node to the same graph: dL/da = 2 x (a - t) = ' + f2(c.da) + '. It reads a and t from the forward pass.',
        '**Gradient node 2.** Chain rule through ReLU: dL/dz = dL/da x (1 if z > 0, else 0) = ' + f2(c.dz) + '. It needs z, which is why z was kept.',
        '**Gradient nodes 3 and 4.** dL/db = dL/dz x 1 = ' + f2(c.db) + ' and dL/dw = dL/dz x x = ' + f2(c.dw) + '. The second one needs x from the forward pass.',
        '**Update.** w = ' + v.w + ' - ' + v.lr + ' x ' + f2(c.dw) + ' = ' + f2(c.w2) + ' and b = ' + v.b + ' - ' + v.lr + ' x ' + f2(c.db) + ' = ' + f2(c.b2) + '. Run the forward pass again with these values and the loss is ' + f2(c.L2) + '.'
      ];
      message.set(caps[step], step === LAST ? 'good' : '');
      statLoss.set(f2(c.L));
      statAfter.set(step >= LAST ? f2(c.L2) : '?', step >= LAST && c.L2 < c.L ? 'good' : '');
      prev.disabled = step === 0;
      next.disabled = step === LAST;
    }
    function mk(label, key, min, max, stepv) {
      return ui.slider({ label: label, min: min, max: max, step: stepv, value: v[key], onInput: function (val) { v[key] = val; render(); } }).el;
    }
    var prev = ui.btn('Previous', function () { step = Math.max(0, step - 1); render(); });
    var next = ui.btn('Next', function () { step = Math.min(LAST, step + 1); render(); }, 'primary');
    host.appendChild(h('div.controls', [mk('w', 'w', -2, 5, 0.5), mk('b', 'b', -3, 3, 0.5), mk('target t', 't', 0, 8, 1), mk('learning rate', 'lr', 0.05, 0.5, 0.05)]));
    host.appendChild(holder);
    host.appendChild(h('div.btnrow', prev, next, ui.btn('Restart', function () { step = 0; render(); })));
    host.appendChild(message.el);
    host.appendChild(h('div.readout', statLoss.el, statAfter.el));
    render();
  };
})();
