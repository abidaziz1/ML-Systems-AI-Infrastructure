/*
 * Widgets for Paper 1: shardLab (sharded embeddings), layerExplorer (the runtime stack),
 * benchChart (the paper's single-machine benchmark table).
 */
(function () {
  'use strict';
  var MLS = window.MLS;
  var h = MLS.h;
  var s = MLS.s;
  var ui = MLS.ui;
  var fmt = MLS.fmt;

  /* ======================================================================
   * 1. shardLab: Part, Gather, Stitch for a sharded embedding table
   * ==================================================================== */
  MLS.widgets.shardLab = function (host) {
    var VOCAB = ['the', 'cat', 'sat', 'on', 'mat', 'dog', 'ran', 'to', 'a', 'park', 'and', 'he', 'she', 'big', 'red', 'ball'];
    var COLORS = ['var(--accent)', 'var(--grad)', 'var(--good)', 'var(--purple)'];
    var cfg = { k: 2, ids: [0, 1, 2, 3, 0, 4], stage: 3 };
    var STAGES = ['1. Your batch', '2. Part: route each id', '3. Gather: each shard looks up rows', '4. Stitch: restore the order'];
    var out = h('div', { 'aria-live': 'polite' });
    var message = ui.msg('');

    function chip(text, color, filled) {
      return h('span', {
        style: {
          display: 'inline-block',
          padding: '2px 9px',
          margin: '2px 4px 2px 0',
          borderRadius: '8px',
          border: '2px solid ' + color,
          background: filled ? color : 'transparent',
          color: filled ? 'var(--accent-ink)' : 'var(--ink)',
          fontWeight: 700,
          fontSize: '0.88rem'
        }
      }, text);
    }
    function paint() {
      out.innerHTML = '';
      var k = cfg.k;
      var ids = cfg.ids;
      out.appendChild(h('p', h('b', 'Batch in original order: '), ids.length ? ids.map(function (id, i) { return chip(i + ': ' + VOCAB[id] + ' (id ' + id + ')', 'var(--line-strong)', false); }) : 'Pick some words above.'));
      var cols = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: '10px', marginTop: '8px' } });
      for (var sh = 0; sh < k; sh++) {
        var mine = [];
        ids.forEach(function (id, pos) {
          if (id % k === sh) mine.push({ id: id, pos: pos });
        });
        var held = [];
        for (var id = 0; id < VOCAB.length; id++) if (id % k === sh) held.push(id);
        var box = h('div', { style: { border: '2px solid ' + COLORS[sh], borderRadius: '12px', padding: '10px 12px' } });
        box.appendChild(h('div', { style: { fontWeight: 800, color: COLORS[sh] } }, 'Shard ' + sh + ' (parameter task ' + sh + ')'));
        box.appendChild(h('div', { style: { fontSize: '0.8rem', color: 'var(--ink-3)', margin: '2px 0 6px' } }, 'Holds rows ' + held.join(', ') + ' (' + held.length + ' of ' + VOCAB.length + ')'));
        if (cfg.stage >= 1) {
          box.appendChild(h('div', { style: { fontSize: '0.8rem', fontWeight: 700 } }, 'Part sends here:'));
          box.appendChild(h('div', mine.length ? mine.map(function (m) { return chip('pos ' + m.pos + ' to id ' + m.id, COLORS[sh], false); }) : h('span', { style: { color: 'var(--ink-3)', fontSize: '0.85rem' } }, 'nothing, so no work')));
        }
        if (cfg.stage >= 2) {
          box.appendChild(h('div', { style: { fontSize: '0.8rem', fontWeight: 700, marginTop: '6px' } }, 'Gather returns:'));
          box.appendChild(h('div', mine.length ? mine.map(function (m) { return chip('row ' + m.id + ' (' + VOCAB[m.id] + ')', COLORS[sh], true); }) : h('span', { style: { color: 'var(--ink-3)', fontSize: '0.85rem' } }, 'nothing')));
        }
        cols.appendChild(box);
      }
      out.appendChild(cols);
      if (cfg.stage >= 3) {
        out.appendChild(h('p', { style: { marginTop: '10px' } }, h('b', 'Stitch output, back in your order: '), ids.map(function (id, pos) { return chip(pos + ': row ' + id + ' (' + VOCAB[id] + ')', COLORS[id % k], true); })));
      }
      var moved = ids.length;
      message.set(
        ids.length
          ? 'Only **' + moved + ' rows** crossed the network, not all ' + VOCAB.length + '. With a real vocabulary of tens of thousands of words, that is the difference between moving a few kilobytes and moving the whole table on every step.'
          : 'Click words to build a batch.'
      );
      stageLabel.textContent = STAGES[cfg.stage];
      prev.disabled = cfg.stage === 0;
      next.disabled = cfg.stage === 3;
    }
    var stageLabel = h('b');
    var prev = ui.btn('Previous stage', function () { cfg.stage = Math.max(0, cfg.stage - 1); paint(); });
    var next = ui.btn('Next stage', function () { cfg.stage = Math.min(3, cfg.stage + 1); paint(); }, 'primary');
    var chips = h('div.chipgrid');
    VOCAB.forEach(function (word, id) {
      var b = h('button.chip', { type: 'button', title: 'Add "' + word + '" to the batch' }, word + ' (' + id + ')');
      b.addEventListener('click', function () {
        if (cfg.ids.length < 10) cfg.ids.push(id);
        paint();
      });
      chips.appendChild(b);
    });
    var shardSeg = ui.seg([{ label: '2 shards', value: 2 }, { label: '4 shards', value: 4 }], cfg.k, function (v) { cfg.k = v; paint(); }, 'Number of shards');
    host.appendChild(h('p', { html: MLS.rich('A model has an embedding table with one row per word. It is too big for one machine, so its rows are split across **shards**. Here, row `id` lives on shard `id mod number-of-shards`. Click words to build a batch (up to 10).') }));
    host.appendChild(chips);
    host.appendChild(h('div.btnrow',
      shardSeg.el,
      ui.btn('The cat sat on the mat', function () { cfg.ids = [0, 1, 2, 3, 0, 4]; paint(); }),
      ui.btn('A dog ran to the park', function () { cfg.ids = [8, 5, 6, 7, 0, 9]; paint(); }),
      ui.btn('Clear', function () { cfg.ids = []; paint(); })
    ));
    host.appendChild(h('div.btnrow', prev, next, ui.btn('Show all stages', function () { cfg.stage = 3; paint(); }), stageLabel));
    host.appendChild(out);
    host.appendChild(message.el);
    paint();
  };

  /* ======================================================================
   * 2. layerExplorer: the layered runtime, one layer at a time
   * ==================================================================== */
  MLS.widgets.layerExplorer = function (host) {
    var LAYERS = [
      {
        name: 'Client (Python, C++)',
        what: 'Where you write the model. The client builds the dataflow graph and calls Run on a session. Training and inference libraries are built on top.',
        kitchen: 'A customer writing down an order.',
        paper: 'Several client languages sit on one core runtime.'
      },
      {
        name: 'C API',
        what: 'A narrow, stable boundary between user code in any language and the core runtime. It is why Python and C++ can drive the same engine.',
        kitchen: 'The standard order form every customer fills in, whatever language they speak.',
        paper: 'The C API separates user-level code from the core runtime.'
      },
      {
        name: 'Distributed master',
        what: 'Turns a Run request into work for a set of tasks. It prunes the graph down to what is needed, splits it into one subgraph per device, and caches those subgraphs so the next Run of the same shape is cheap.',
        kitchen: 'The head chef reads the order, throws away steps that are not needed, splits the rest among stations, and remembers the split for repeat orders.',
        paper: 'Prunes and partitions the graph into per-device subgraphs and caches them for later steps.'
      },
      {
        name: 'Dataflow executor',
        what: 'Runs inside each worker. It receives a subgraph, starts every kernel as soon as its inputs arrive, and runs independent kernels in parallel (several CPU cores, or several streams on a GPU).',
        kitchen: 'The station lead who starts each step the moment its ingredients arrive and lets two cooks work side by side when steps do not depend on each other.',
        paper: 'Schedules kernels on local devices and runs them in parallel when possible.'
      },
      {
        name: 'Kernel implementations',
        what: 'The actual math for each operation on each device type. The runtime ships more than 200 standard operations. Many kernels are written with the Eigen tensor library, some use cuDNN where a specialized version pays off, and quantized inference uses gemmlowp.',
        kitchen: 'The practiced technique for each tool: one way to chop with a knife, another with a food processor.',
        paper: 'Over 200 standard operations. Eigen::Tensor, cuDNN and gemmlowp are named as building blocks.'
      },
      {
        name: 'Networking layer',
        what: 'Moves tensors between devices. Send and Recv are specialized per pair of device types: asynchronous copies between CPU and GPU so copying overlaps with computing, direct memory transfers between GPUs in one machine, and gRPC over TCP or RDMA over Converged Ethernet between machines.',
        kitchen: 'Runners between stations in one building, couriers between buildings.',
        paper: 'Send/Recv implementations differ by device pair. Cross-machine transfers use gRPC or RDMA.'
      },
      {
        name: 'Devices (CPU, GPU, ...)',
        what: 'The hardware that runs kernels. The design goal is a small, common device interface, so adding a new kind of accelerator means implementing kernels for it rather than rewriting the system.',
        kitchen: 'The stoves and ovens.',
        paper: 'CPUs, GPUs and custom accelerators such as TPUs are all treated as devices.'
      }
    ];
    var detail = h('div', { 'aria-live': 'polite', style: { border: '1.5px solid var(--line)', borderRadius: '12px', padding: '14px 16px', background: 'var(--surface-2)' } });
    var stack = h('div', { style: { display: 'grid', gap: '6px' } });
    var btns = [];
    function select(i) {
      btns.forEach(function (b, j) { b.setAttribute('aria-pressed', i === j ? 'true' : 'false'); });
      var L = LAYERS[i];
      detail.innerHTML = '';
      detail.appendChild(h('h3', { style: { fontSize: '1.05rem', marginBottom: '6px' } }, L.name));
      detail.appendChild(h('p', { html: MLS.rich(L.what) }));
      detail.appendChild(h('p', { style: { marginTop: '8px' }, html: MLS.rich('**In a restaurant:** ' + L.kitchen) }));
      detail.appendChild(h('p', { style: { marginTop: '8px', color: 'var(--purple)' }, html: MLS.rich('**Paper:** ' + L.paper) }));
    }
    LAYERS.forEach(function (L, i) {
      var b = h('button.btn', { type: 'button', 'aria-pressed': 'false', style: { justifyContent: 'center', width: '100%', borderWidth: '2px' } }, L.name);
      b.addEventListener('click', function () { select(i); });
      btns.push(b);
      stack.appendChild(b);
    });
    stack.classList.add('layerstack');
    host.appendChild(h('p', { html: MLS.rich('Top of the stack is closest to you. Click a layer.') }));
    host.appendChild(h('div', { style: { display: 'grid', gridTemplateColumns: 'minmax(190px,1fr) minmax(220px,2fr)', gap: '14px', alignItems: 'start' } }, stack, detail));
    select(2);
  };

  /* ======================================================================
   * 3. benchChart: the paper's single-machine benchmark table
   * ==================================================================== */
  MLS.widgets.benchChart = function (host) {
    var LIBS = ['Caffe', 'Neon', 'Torch', 'TensorFlow'];
    var DATA = {
      AlexNet: [324, 87, 81, 81],
      Overfeat: [823, 211, 268, 279],
      OxfordNet: [1068, 320, 529, 540],
      GoogleNet: [1935, 270, 470, 445]
    };
    var cfg = { model: 'AlexNet', view: 'ms' };
    var holder = h('div.scroll');
    var message = ui.msg('');

    function paint() {
      var vals = DATA[cfg.model];
      var tf = vals[3];
      var shown = vals.map(function (v) { return cfg.view === 'ms' ? v : v / tf; });
      var max = Math.max.apply(null, shown);
      var best = Math.min.apply(null, vals);
      var width = 700;
      var left = 110;
      var rowH = 46;
      var svg = s('svg', { class: 'chart', viewBox: '0 0 ' + width + ' ' + (rowH * 4 + 36), role: 'img', 'aria-label': 'Training step time per library for ' + cfg.model, style: 'min-width:520px' });
      LIBS.forEach(function (lib, i) {
        var y = 10 + i * rowH;
        var w = (shown[i] / max) * (width - left - 90);
        var isTF = lib === 'TensorFlow';
        svg.appendChild(s('text', { x: left - 10, y: y + 24, 'text-anchor': 'end', style: isTF ? 'font-weight:800;fill:var(--accent)' : '' }, lib));
        svg.appendChild(s('rect', { x: left, y: y + 6, width: Math.max(2, w), height: 28, rx: 5, class: isTF ? 'tf' : 'other' }));
        if (vals[i] === best) svg.appendChild(s('rect', { x: left, y: y + 6, width: Math.max(2, w), height: 28, rx: 5, fill: 'none', class: 'best' }));
        svg.appendChild(s('text', { x: left + w + 8, y: y + 25, style: 'font-weight:700' }, cfg.view === 'ms' ? vals[i] + ' ms' : fmt(shown[i], 2) + 'x'));
      });
      svg.appendChild(s('text', { x: left, y: rowH * 4 + 28, style: 'fill:var(--good);font-weight:700' }, 'green outline: fastest for this model'));
      holder.innerHTML = '';
      holder.appendChild(svg);
      var fastestLib = LIBS[vals.indexOf(best)];
      var tie = vals.filter(function (v) { return v === best; }).length > 1;
      var torch = vals[2];
      var vsTorch = ((tf - torch) / torch) * 100;
      var vsBest = ((tf - best) / best) * 100;
      message.set(
        '**' + cfg.model + ':** ' + (tie ? 'Torch and TensorFlow tie for fastest' : fastestLib + ' is fastest') + '. TensorFlow is ' +
          (vsBest <= 0.01 ? 'at the front' : fmt(vsBest, 0) + '% slower than the fastest') + ', ' +
          (Math.abs(vsTorch) < 0.5 ? 'level with Torch' : vsTorch > 0 ? fmt(vsTorch, 1) + '% slower than Torch' : fmt(-vsTorch, 1) + '% faster than Torch') +
          ', and ' + fmt(vals[0] / tf, 1) + 'x faster than Caffe.'
      );
    }
    var modelSeg = ui.seg(Object.keys(DATA).map(function (k) { return { label: k, value: k }; }), cfg.model, function (m) { cfg.model = m; paint(); }, 'Model');
    var viewSeg = ui.seg([{ label: 'Milliseconds', value: 'ms' }, { label: 'Relative to TensorFlow', value: 'rel' }], cfg.view, function (m) { cfg.view = m; paint(); }, 'Units');
    host.appendChild(h('div.btnrow', h('b', 'Model:'), modelSeg.el, viewSeg.el));
    host.appendChild(holder);
    host.appendChild(message.el);
    paint();
  };
})();
