/*
 * engine.js
 * The lesson player. A lesson is plain data (see docs/AUTHORING.md):
 *
 *   MLS.start({ id, number, title, short, parts: [{ id, title, summary, steps: [{ id, title, blocks: [...] }] }] })
 *
 * The player gives every lesson the same behavior: Next/Back, a parts menu, saved progress,
 * a glossary, keyboard shortcuts, dark mode, and a set of block types (callouts, quizzes,
 * flip cards, tabs, graph walkthroughs, widgets...).
 */
(function () {
  'use strict';
  var MLS = window.MLS;
  var h = MLS.h;
  var rich = MLS.rich;
  var store = MLS.store;
  var blocks = MLS.blocks;

  var SRC_LABEL = {
    paper: 'From the paper',
    redrawn: 'Redrawn from the paper',
    toy: 'Toy model, not from the paper',
    original: 'Original diagram'
  };
  var CALLOUT_TITLE = {
    idea: 'Key idea',
    example: 'Real-life example',
    paper: 'In the paper',
    watch: 'Common trap',
    try: 'Try it',
    note: 'Note'
  };

  /* ====================================================================
   * Block renderers
   * ==================================================================== */
  function renderBlock(spec, ctx) {
    if (typeof spec === 'string') spec = { t: 'p', text: spec };
    var fn = blocks[spec.t];
    if (!fn) {
      return h('div.callout.watch', h('div.cbody', 'Unknown block type: ' + spec.t));
    }
    return fn(spec, ctx);
  }

  function renderBlocks(list, ctx) {
    var frag = document.createDocumentFragment();
    (list || []).forEach(function (b) {
      frag.appendChild(renderBlock(b, ctx));
    });
    return frag;
  }

  function body(spec, ctx, cls) {
    var box = h('div.' + (cls || 'cbody'));
    if (typeof spec === 'string') box.appendChild(h('p', { html: rich(spec) }));
    else box.appendChild(renderBlocks(spec, ctx));
    return box;
  }

  function srcTag(source) {
    if (!source) return null;
    return h('span.srctag.' + source, SRC_LABEL[source] || source);
  }

  blocks.p = function (spec) {
    return h('p' + (spec.lead ? '.lead' : ''), { html: rich(spec.text) });
  };
  blocks.h = function (spec) {
    return h('h2.sub', { html: rich(spec.text) });
  };
  blocks.divider = function () {
    return h('hr');
  };
  blocks.list = function (spec) {
    var list = h(spec.ordered ? 'ol' : 'ul');
    spec.items.forEach(function (it) {
      list.appendChild(h('li', { html: rich(it) }));
    });
    return list;
  };
  blocks.callout = function (spec, ctx) {
    var kind = spec.kind || 'note';
    return h(
      'div.callout.' + kind,
      h('div.ctitle', spec.title || CALLOUT_TITLE[kind]),
      body(spec.body, ctx)
    );
  };
  blocks.figure = function (spec, ctx) {
    var scroll = h('div.scroll');
    if (typeof spec.draw === 'function') spec.draw(scroll, ctx);
    else scroll.innerHTML = spec.svg;
    var fig = h(
      'figure.fig',
      { role: 'group', 'aria-label': spec.alt || spec.caption || 'Figure' },
      scroll,
      h('figcaption', srcTag(spec.source), h('span', { html: rich(spec.caption || '') }))
    );
    return fig;
  };
  blocks.table = function (spec) {
    var thead = h('thead', h('tr', spec.head.map(function (c) { return h('th', { scope: 'col', html: rich(c) }); })));
    var tbody = h('tbody');
    spec.rows.forEach(function (r) {
      tbody.appendChild(h('tr', r.map(function (c) { return h('td', { html: rich(String(c)) }); })));
    });
    var wrap = h('div.tablewrap', h('table', thead, tbody));
    if (spec.caption || spec.source) {
      wrap.appendChild(h('div.cap', srcTag(spec.source), h('span', { html: rich(spec.caption || '') })));
    }
    return wrap;
  };

  function colorizePython(text) {
    var re = /(#.*$)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')|\b(import|from|as|def|return|for|in|with|if|else|while|class|lambda|None|True|False)\b/gm;
    var out = '';
    var last = 0;
    var m;
    while ((m = re.exec(text))) {
      out += MLS.esc(text.slice(last, m.index));
      var cls = m[1] ? 'c' : m[2] ? 's' : 'k';
      out += '<span class="' + cls + '">' + MLS.esc(m[0]) + '</span>';
      last = m.index + m[0].length;
    }
    return out + MLS.esc(text.slice(last));
  }
  blocks.code = function (spec) {
    var pre = h('pre.code', { tabindex: 0, 'aria-label': spec.caption || 'Code example' });
    pre.innerHTML = spec.lang === 'plain' ? MLS.esc(spec.code) : colorizePython(spec.code);
    var wrap = h('div', pre);
    if (spec.caption) wrap.appendChild(h('div.codecap', { html: rich(spec.caption) }));
    return wrap;
  };

  blocks.reveal = function (spec, ctx) {
    return h('details.reveal', h('summary', spec.label || 'Show the answer'), body(spec.body, ctx));
  };

  blocks.facts = function (spec) {
    var dl = h('dl.facts');
    spec.rows.forEach(function (r) {
      dl.appendChild(h('dt', r[0]));
      dl.appendChild(h('dd', { html: rich(r[1]) }));
    });
    return dl;
  };

  blocks.flip = function (spec) {
    var wrap = h('div.flips');
    spec.cards.forEach(function (c) {
      var b = h(
        'button.flip',
        { type: 'button', 'aria-pressed': 'false' },
        h('span.front', { html: rich(c.front) }),
        h('span.back', { html: rich(c.back) }),
        h('span.hintline', spec.hint || 'Click to flip')
      );
      b.addEventListener('click', function () {
        b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
      });
      wrap.appendChild(b);
    });
    return wrap;
  };

  blocks.tabs = function (spec, ctx) {
    var root = h('div.tabs');
    var list = h('div.tablist', { role: 'tablist' });
    var panels = [];
    var tabs = [];
    function select(i) {
      tabs.forEach(function (t, j) {
        t.setAttribute('aria-selected', j === i ? 'true' : 'false');
        t.tabIndex = j === i ? 0 : -1;
        panels[j].hidden = j !== i;
      });
    }
    spec.tabs.forEach(function (t, i) {
      var tab = h('button', { type: 'button', role: 'tab', 'aria-selected': 'false' }, t.label);
      tab.addEventListener('click', function () {
        select(i);
      });
      tab.addEventListener('keydown', function (e) {
        var n = spec.tabs.length;
        var to = null;
        if (e.key === 'ArrowRight') to = (i + 1) % n;
        if (e.key === 'ArrowLeft') to = (i - 1 + n) % n;
        if (to !== null) {
          e.preventDefault();
          e.stopPropagation();
          select(to);
          tabs[to].focus();
        }
      });
      tabs.push(tab);
      list.appendChild(tab);
      var panel = h('div', { role: 'tabpanel' });
      panel.appendChild(renderBlocks(t.body, ctx));
      panels.push(panel);
    });
    root.appendChild(list);
    panels.forEach(function (p) {
      root.appendChild(p);
    });
    select(0);
    return root;
  };

  blocks.compare = function (spec, ctx) {
    function side(s) {
      return h('div', h('h3', s.title), body(s.body, ctx));
    }
    return h('div.compare', side(spec.left), side(spec.right));
  };

  /* ---------- Graph walkthrough: frames set the absolute state of a graph ---------- */
  blocks.walk = function (spec, ctx) {
    var root = h('div.walk');
    var host = h('div.scroll');
    var figure = h('figure.fig', { role: 'group', 'aria-label': spec.alt || 'Step-by-step diagram' }, host);
    root.appendChild(figure);
    var gspec = Object.assign({}, spec.graph);
    var g = MLS.graph(host, gspec);
    var cap = h('div.wcap', { 'aria-live': 'polite' });
    var pos = h('span.wpos');
    var prev = h('button.btn.small', { type: 'button' }, 'Previous step');
    var next = h('button.btn.small.primary', { type: 'button' }, 'Next step');
    var play = h('button.btn.small', { type: 'button' }, 'Play');
    var i = 0;
    var timer = null;

    function show(k) {
      i = MLS.clamp(k, 0, spec.frames.length - 1);
      var f = spec.frames[i];
      g.reset();
      (f.dim || []).forEach(function (id) { g.node(id).cls('is-dim', true); });
      (f.done || []).forEach(function (id) { g.node(id).cls('is-done', true); });
      (f.active || []).forEach(function (id) { g.node(id).cls('is-active', true); });
      Object.keys(f.edges || {}).forEach(function (k2) {
        var parts = k2.split('>');
        var e = g.edge(parts[0], parts[1]);
        if (e) e.state(f.edges[k2]);
      });
      Object.keys(f.subs || {}).forEach(function (id) { g.node(id).sub(f.subs[id]); });
      Object.keys(f.labels || {}).forEach(function (id) { g.node(id).label(f.labels[id]); });
      Object.keys(f.badges || {}).forEach(function (id) { g.node(id).badge(f.badges[id]); });
      cap.innerHTML = rich(f.caption);
      pos.textContent = 'Step ' + (i + 1) + ' of ' + spec.frames.length;
      prev.disabled = i === 0;
      next.disabled = i === spec.frames.length - 1;
    }
    function stop() {
      if (timer) clearInterval(timer);
      timer = null;
      play.textContent = 'Play';
    }
    prev.addEventListener('click', function () { stop(); show(i - 1); });
    next.addEventListener('click', function () { stop(); show(i + 1); });
    play.addEventListener('click', function () {
      if (timer) return stop();
      if (i >= spec.frames.length - 1) show(0);
      play.textContent = 'Pause';
      timer = setInterval(function () {
        if (i >= spec.frames.length - 1) return stop();
        show(i + 1);
      }, 2600);
    });
    if (MLS.reducedMotion()) play.hidden = true;
    ctx.onCleanup(stop);
    root.appendChild(cap);
    root.appendChild(h('div.wnav', prev, next, play, pos));
    show(0);
    return root;
  };

  /* ---------- Widgets ---------- */
  blocks.widget = function (spec, ctx) {
    var fn = MLS.widgets[spec.name];
    var bodyEl = h('div.wbody');
    var wrap = h(
      'div.widget',
      h('div.whead', h('span', spec.title || 'Interactive'), spec.tag ? h('span.srctag.toy', spec.tag) : h('span', 'Interactive')),
      bodyEl
    );
    if (!fn) {
      bodyEl.appendChild(h('p', 'Missing widget: ' + spec.name));
      return wrap;
    }
    fn(bodyEl, spec.opts || {}, ctx);
    return wrap;
  };

  /* ---------- Quiz ---------- */
  function buildQuestion(spec, saved, onResolve) {
    var multi = Array.isArray(spec.answer);
    var answers = multi ? spec.answer.slice().sort() : [spec.answer];
    var tries = saved ? saved.tries : 0;
    var resolved = !!(saved && saved.resolved);
    var picks = [];
    var buttons = [];
    var uidq = 'q' + Math.random().toString(36).slice(2, 8);
    var root = h('div.quiz', { role: 'group', 'aria-labelledby': uidq });
    root.appendChild(h('div.qtag', spec.kind === 'predict' ? 'Predict first' : spec.tag || 'Check yourself'));
    root.appendChild(h('div.q#' + uidq, { html: rich(spec.q) }));
    var opts = h('div.opts');
    var feedback = h('div.feedback', { 'aria-live': 'polite', hidden: true });
    var actions = h('div.actions');
    var check = h('button.btn.small.primary', { type: 'button' }, 'Check answer');
    if (multi) actions.appendChild(check);

    function setFeedback(kind, html) {
      feedback.hidden = false;
      feedback.className = 'feedback ' + kind;
      feedback.innerHTML = html;
    }
    function finish(correctOnFirst) {
      resolved = true;
      buttons.forEach(function (b, i) {
        b.disabled = true;
        b.classList.remove('wrong');
        b.setAttribute('aria-pressed', 'false');
        b.classList.toggle('right', answers.indexOf(i) >= 0);
        b.querySelector('.mark').textContent = answers.indexOf(i) >= 0 ? '✓' : '';
      });
      check.hidden = true;
      setFeedback('ok', '<strong>Correct.</strong> ' + rich(spec.explain || ''));
      onResolve({ tries: tries, resolved: true, first: correctOnFirst });
    }

    spec.options.forEach(function (text, i) {
      var mark = h('span.mark', '');
      var b = h('button.opt' + (multi ? '.multi' : ''), { type: 'button', 'aria-pressed': 'false' }, mark, h('span', { html: rich(text) }));
      b.addEventListener('click', function () {
        if (resolved) return;
        if (multi) {
          var at = picks.indexOf(i);
          if (at >= 0) picks.splice(at, 1);
          else picks.push(i);
          b.setAttribute('aria-pressed', at >= 0 ? 'false' : 'true');
          b.classList.remove('wrong');
          return;
        }
        tries++;
        if (i === answers[0]) return finish(tries === 1);
        b.classList.add('wrong');
        b.disabled = true;
        mark.textContent = 'X';
        var why = spec.whyNot && spec.whyNot[i];
        setFeedback('no', '<strong>Not quite.</strong> ' + rich(why || 'Try another option.'));
        onResolve({ tries: tries, resolved: false, first: false });
      });
      buttons.push(b);
      opts.appendChild(b);
    });

    check.addEventListener('click', function () {
      if (resolved) return;
      if (!picks.length) return setFeedback('no', '<strong>Pick at least one option.</strong>');
      tries++;
      var sorted = picks.slice().sort();
      var ok = sorted.length === answers.length && sorted.every(function (v, k) { return v === answers[k]; });
      if (ok) return finish(tries === 1);
      var tooMany = picks.some(function (p) { return answers.indexOf(p) < 0; });
      setFeedback('no', '<strong>Not quite.</strong> ' + (tooMany ? 'At least one selected option does not belong.' : 'You are missing at least one correct option.') + ' Adjust your picks and check again.');
      onResolve({ tries: tries, resolved: false, first: false });
    });

    root.appendChild(opts);
    root.appendChild(actions);
    root.appendChild(feedback);
    if (resolved) finish(saved.first);
    return root;
  }

  blocks.quiz = function (spec, ctx) {
    var saved = ctx.state.quiz[spec.id];
    return buildQuestion(spec, saved, function (r) {
      ctx.state.quiz[spec.id] = r;
      ctx.save();
    });
  };

  /* ---------- Final quiz: one question at a time, score, and parts to revisit ---------- */
  blocks.finalquiz = function (spec, ctx) {
    var root = h('div.finalquiz');
    var qs = spec.questions;
    var idx = 0;
    var firstTry = {};
    function showQuestion() {
      root.innerHTML = '';
      var q = qs[idx];
      root.appendChild(h('div.chip.accent', 'Question ' + (idx + 1) + ' of ' + qs.length));
      var node = buildQuestion(q, null, function (r) {
        if (r.resolved) {
          firstTry[idx] = r.first;
          nextBtn.hidden = false;
          nextBtn.textContent = idx === qs.length - 1 ? 'See my score' : 'Next question';
        }
      });
      root.appendChild(h('div', { style: { marginTop: '12px' } }, node));
      var nextBtn = h('button.btn.primary', { type: 'button', hidden: true }, 'Next question');
      nextBtn.addEventListener('click', function () {
        idx++;
        if (idx < qs.length) showQuestion();
        else showScore();
      });
      root.appendChild(h('div.actions', { style: { marginTop: '12px' } }, nextBtn));
    }
    function showScore() {
      root.innerHTML = '';
      var score = 0;
      var weak = {};
      qs.forEach(function (q, i) {
        if (firstTry[i]) score++;
        else if (q.part) weak[q.part] = true;
      });
      ctx.state.final = { score: score, total: qs.length };
      ctx.save();
      root.appendChild(h('div.score', score + ' / ' + qs.length + ' correct on the first try'));
      var weakKeys = Object.keys(weak);
      if (!weakKeys.length) {
        root.appendChild(h('p', 'Clean sweep. You are ready to read the paper itself.'));
      } else {
        var list = h('ul.revisit');
        weakKeys.forEach(function (pid) {
          var part = ctx.player.findPart(pid);
          if (!part) return;
          var b = h('button.btn.small', { type: 'button' }, 'Revisit: ' + part.title);
          b.addEventListener('click', function () { ctx.player.goTo(pid, 0); });
          list.appendChild(h('li', b));
        });
        root.appendChild(h('p', 'Revisit these parts, then try the quiz again:'));
        root.appendChild(list);
      }
      var again = h('button.btn.small', { type: 'button', style: { marginTop: '12px' } }, 'Retake the quiz');
      again.addEventListener('click', function () { idx = 0; firstTry = {}; showQuestion(); });
      root.appendChild(again);
    }
    var prior = ctx.state.final;
    if (prior) {
      root.appendChild(h('p', 'Your last score: ' + prior.score + ' / ' + prior.total + '.'));
      var go = h('button.btn.primary', { type: 'button' }, 'Retake the quiz');
      go.addEventListener('click', showQuestion);
      root.appendChild(go);
    } else {
      showQuestion();
    }
    return root;
  };

  /* ---------- Course map, reading map, teach-back ---------- */
  blocks.partmap = function (spec, ctx) {
    var wrap = h('div.partmap');
    ctx.player.def.parts.forEach(function (part, pi) {
      if (spec.skipFirst && pi === 0) return;
      var b = h(
        'button',
        { type: 'button' },
        h('span.pn', 'Part ' + pi),
        h('b', part.title),
        h('span', part.summary || '')
      );
      b.addEventListener('click', function () { ctx.player.goTo(part.id, 0); });
      wrap.appendChild(b);
    });
    return wrap;
  };

  blocks.readmap = function (spec, ctx) {
    var table = h('table');
    table.appendChild(h('thead', h('tr', ['Paper section', 'What to do', 'Why', 'Practice it here'].map(function (c) { return h('th', { scope: 'col' }, c); }))));
    var tb = h('tbody');
    spec.rows.forEach(function (r) {
      var jump = h('button.btn.small', { type: 'button' }, 'Part: ' + (ctx.player.findPart(r.part) || { title: r.part }).title);
      jump.addEventListener('click', function () { ctx.player.goTo(r.part, 0); });
      tb.appendChild(h('tr', h('td', { html: rich(r.section) }), h('td', h('b', r.how)), h('td', { html: rich(r.note) }), h('td', jump)));
    });
    table.appendChild(tb);
    return h('div.tablewrap', table);
  };

  blocks.teachback = function (spec, ctx) {
    var key = spec.id;
    var area = h('textarea', { 'aria-label': spec.prompt, placeholder: 'Write in your own words...' });
    area.value = ctx.state.notes[key] || '';
    var saved = h('div.saved', area.value ? 'Saved on this device.' : 'Saved on this device as you type.');
    var t = null;
    area.addEventListener('input', function () {
      clearTimeout(t);
      t = setTimeout(function () {
        ctx.state.notes[key] = area.value;
        ctx.save();
        saved.textContent = 'Saved on this device.';
      }, 300);
    });
    var root = h('div.teach', h('p', h('b', { html: rich(spec.prompt) })), area, saved);
    if (spec.checklist) {
      var ul = h('ul.check');
      spec.checklist.forEach(function (item, i) {
        var ck = h('input', { type: 'checkbox', id: key + '-c' + i });
        ck.checked = !!ctx.state.notes[key + ':c' + i];
        ck.addEventListener('change', function () {
          ctx.state.notes[key + ':c' + i] = ck.checked;
          ctx.save();
        });
        ul.appendChild(h('li', h('label', ck, h('span', { html: rich(item) }))));
      });
      root.appendChild(h('p', { style: { marginTop: '12px' } }, 'Did your explanation cover these points?'));
      root.appendChild(ul);
    }
    return root;
  };

  /* ====================================================================
   * Player
   * ==================================================================== */
  function start(def) {
    var KEY = 'mls:lesson:' + def.id;
    var state = Object.assign({ visited: {}, quiz: {}, notes: {}, last: null, final: null }, store.get(KEY, {}));
    state.visited = state.visited || {};
    state.quiz = state.quiz || {};
    state.notes = state.notes || {};

    var flat = [];
    def.parts.forEach(function (part, pi) {
      part.steps.forEach(function (st, si) {
        flat.push({ pi: pi, si: si, part: part, step: st });
      });
    });

    var glossary = Object.assign({}, MLS.commonGlossary || {}, def.glossary || {});
    MLS.glossary = glossary;
    var cleanups = [];
    var current = -1;

    var player = {
      def: def,
      flat: flat,
      findPart: function (pid) {
        return def.parts.filter(function (p) { return p.id === pid; })[0];
      },
      goTo: function (pid, si) {
        for (var i = 0; i < flat.length; i++) {
          if (flat[i].part.id === pid && flat[i].si === (si || 0)) return go(i);
        }
      }
    };

    function save() {
      store.set(KEY, state);
    }
    function keyOf(f) {
      return f.part.id + '/' + f.step.id;
    }

    /* ---------- Shell ---------- */
    var app = document.getElementById('app');
    app.innerHTML = '';
    document.title = def.title + ' | Interactive lesson';

    var fill = h('div.fill');
    var count = h('span.count');
    var tocBtn = h('button.btn.ghost.small.only-mobile', { type: 'button', 'aria-expanded': 'false', 'aria-controls': 'toc' }, 'Parts');
    var gloBtn = h('button.btn.ghost.small', { type: 'button', 'aria-expanded': 'false', 'aria-controls': 'drawer' }, 'Glossary');
    var themeBtn = h('button.btn.ghost.small', { type: 'button', 'aria-label': 'Toggle dark mode' }, 'Theme');
    var topbar = h(
      'header.topbar',
      tocBtn,
      h('a.home', { href: def.home || '../../index.html', 'aria-label': 'ML Systems Course home' }, h('span.long', 'ML Systems Course'), h('span.short', 'Home')),
      h('span.papername', 'Paper ' + def.number + ': ' + def.short),
      h('div.progress', h('div.track', { role: 'progressbar', 'aria-label': 'Lesson progress', 'aria-valuemin': 0, 'aria-valuemax': 100 }, fill), count),
      h('div.tools', gloBtn, themeBtn)
    );

    var toc = h('nav.toc#toc', { 'aria-label': 'Lesson parts' });
    var card = h('article.card');
    var stage = h('main.stage#main', { tabindex: '-1' }, card);
    var layout = h('div.layout', toc, stage);

    var prevBtn = h('button.btn', { type: 'button' }, 'Back');
    var nextBtn = h('button.btn.primary', { type: 'button' }, 'Next');
    var where = h('div.where');
    var pager = h('div.pager', h('div.inner', prevBtn, where, nextBtn));

    var drawer = h('aside.drawer#drawer', { 'aria-label': 'Glossary' });
    app.appendChild(h('a.skip-link', { href: '#main' }, 'Skip to lesson'));
    app.appendChild(topbar);
    app.appendChild(layout);
    app.appendChild(pager);
    app.appendChild(drawer);

    /* ---------- Table of contents ---------- */
    function buildToc() {
      toc.innerHTML = '';
      toc.appendChild(h('h2', 'Parts'));
      var gi = 0;
      def.parts.forEach(function (part, pi) {
        var details = h('details', { 'data-part': part.id });
        details.appendChild(h('summary', h('span.pn', String(pi)), h('span', part.title)));
        var ol = h('ol');
        part.steps.forEach(function (st, si) {
          var idx = gi++;
          var a = h('a', { href: '#' + part.id + '/' + (si + 1), 'data-idx': idx }, h('span.dot'), h('span', st.title));
          a.addEventListener('click', function (e) {
            e.preventDefault();
            go(idx);
            toc.classList.remove('open');
            tocBtn.setAttribute('aria-expanded', 'false');
          });
          ol.appendChild(h('li', a));
        });
        details.appendChild(ol);
        toc.appendChild(details);
      });
    }
    function refreshToc() {
      var links = toc.querySelectorAll('a[data-idx]');
      Array.prototype.forEach.call(links, function (a) {
        var i = +a.getAttribute('data-idx');
        a.querySelector('.dot').classList.toggle('seen', !!state.visited[keyOf(flat[i])]);
        if (i === current) a.setAttribute('aria-current', 'step');
        else a.removeAttribute('aria-current');
      });
      var cur = flat[current];
      Array.prototype.forEach.call(toc.querySelectorAll('details'), function (d) {
        if (d.getAttribute('data-part') === cur.part.id) d.open = true;
      });
      var seen = flat.filter(function (f) { return state.visited[keyOf(f)]; }).length;
      var pct = Math.round((seen / flat.length) * 100);
      fill.style.width = pct + '%';
      count.textContent = seen + ' of ' + flat.length + ' steps';
      fill.parentNode.setAttribute('aria-valuenow', pct);
    }

    /* ---------- Navigation ---------- */
    function runCleanups() {
      cleanups.forEach(function (fn) {
        try { fn(); } catch (e) { /* ignore */ }
      });
      cleanups = [];
    }

    function go(i, opts) {
      i = MLS.clamp(i, 0, flat.length - 1);
      runCleanups();
      current = i;
      var f = flat[i];
      state.visited[keyOf(f)] = true;
      state.last = keyOf(f);
      state.total = flat.length;
      save();

      var ctx = {
        player: player,
        state: state,
        save: save,
        onCleanup: function (fn) { cleanups.push(fn); }
      };

      card.innerHTML = '';
      var kicker = h(
        'div.kicker',
        h('span', 'Part ' + f.pi + ' of ' + (def.parts.length - 1) + ': ' + f.part.title),
        f.step.min ? h('span.time', '~' + f.step.min + ' min') : null
      );
      var title = h('h1', { tabindex: '-1' }, f.step.title);
      card.appendChild(kicker);
      card.appendChild(title);
      var bl = h('div.blocks');
      try {
        bl.appendChild(renderBlocks(f.step.blocks, ctx));
      } catch (err) {
        bl.appendChild(h('div.callout.watch', h('div.cbody', 'This step failed to render: ' + err.message)));
        if (window.console) console.error(err);
      }
      card.appendChild(bl);

      prevBtn.disabled = i === 0;
      var nf = flat[i + 1];
      nextBtn.textContent = nf ? 'Next' : 'Back to course home';
      where.innerHTML = '';
      where.appendChild(h('span', 'Step ' + (i + 1) + ' of ' + flat.length + (nf ? '. Next: ' + nf.step.title : '')));
      where.appendChild(h('span.hint', 'Tip: use the left and right arrow keys'));

      var hash = '#' + f.part.id + '/' + (f.si + 1);
      if (location.hash !== hash) {
        suppressHash = true;
        if (opts && opts.replace) history.replaceState(null, '', hash);
        else history.pushState(null, '', hash);
        setTimeout(function () { suppressHash = false; }, 0);
      }
      refreshToc();
      if (!(opts && opts.noScroll)) window.scrollTo(0, 0);
      if (!(opts && opts.noFocus)) title.focus({ preventScroll: true });
    }
    player.go = go;

    var suppressHash = false;
    function fromHash() {
      var m = /^#([\w-]+)\/(\d+)$/.exec(location.hash);
      if (!m) return -1;
      for (var i = 0; i < flat.length; i++) {
        if (flat[i].part.id === m[1] && flat[i].si === +m[2] - 1) return i;
      }
      return -1;
    }
    window.addEventListener('popstate', function () {
      if (suppressHash) return;
      var i = fromHash();
      if (i >= 0) go(i, { noFocus: true });
    });
    window.addEventListener('hashchange', function () {
      if (suppressHash) return;
      var i = fromHash();
      if (i >= 0 && i !== current) go(i, { noFocus: true });
    });

    prevBtn.addEventListener('click', function () { go(current - 1); });
    nextBtn.addEventListener('click', function () {
      if (current < flat.length - 1) go(current + 1);
      else location.href = def.home || '../../index.html';
    });
    document.addEventListener('keydown', function (e) {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      var t = e.target;
      var tag = t && t.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
      if (e.key === 'ArrowRight' && current < flat.length - 1) go(current + 1);
      else if (e.key === 'ArrowLeft' && current > 0) go(current - 1);
      else if (e.key === 'Escape') {
        closePopover();
        drawer.classList.remove('open');
        gloBtn.setAttribute('aria-expanded', 'false');
      }
    });

    tocBtn.addEventListener('click', function () {
      var open = toc.classList.toggle('open');
      tocBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    /* ---------- Theme ---------- */
    themeBtn.addEventListener('click', function () { MLS.theme.toggle(); });

    /* ---------- Glossary: inline pop-ups and the drawer ---------- */
    var popover = null;
    function closePopover() {
      if (popover) popover.remove();
      popover = null;
    }
    document.addEventListener('click', function (e) {
      var term = e.target.closest && e.target.closest('button.term');
      if (!term) {
        if (popover && !popover.contains(e.target)) closePopover();
        return;
      }
      var key = term.getAttribute('data-term');
      var entry = glossary[key];
      closePopover();
      popover = h('div.popover', { role: 'dialog', 'aria-label': 'Definition' }, h('b', entry ? entry.t : key), h('span', { html: rich(entry ? entry.d : 'No definition yet.') }));
      document.body.appendChild(popover);
      var r = term.getBoundingClientRect();
      var left = Math.min(window.scrollX + r.left, window.scrollX + document.documentElement.clientWidth - popover.offsetWidth - 12);
      popover.style.left = Math.max(8, left) + 'px';
      popover.style.top = window.scrollY + r.bottom + 8 + 'px';
    });

    function buildDrawer() {
      drawer.innerHTML = '';
      var search = h('input', { type: 'search', placeholder: 'Search terms', 'aria-label': 'Search glossary' });
      var dl = h('dl');
      Object.keys(glossary)
        .sort(function (a, b) { return glossary[a].t.localeCompare(glossary[b].t); })
        .forEach(function (k) {
          dl.appendChild(h('dt', { 'data-k': (glossary[k].t + ' ' + glossary[k].d).toLowerCase() }, glossary[k].t));
          dl.appendChild(h('dd', { 'data-k': (glossary[k].t + ' ' + glossary[k].d).toLowerCase(), html: rich(glossary[k].d) }));
        });
      search.addEventListener('input', function () {
        var q = search.value.toLowerCase();
        Array.prototype.forEach.call(dl.children, function (el) {
          el.hidden = q && el.getAttribute('data-k').indexOf(q) < 0;
        });
      });
      drawer.appendChild(h('h2', 'Glossary'));
      drawer.appendChild(search);
      drawer.appendChild(dl);
    }
    gloBtn.addEventListener('click', function () {
      var open = drawer.classList.toggle('open');
      gloBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    buildToc();
    buildDrawer();

    var start0 = fromHash();
    if (start0 < 0 && state.last) {
      for (var i = 0; i < flat.length; i++) {
        if (keyOf(flat[i]) === state.last) start0 = i;
      }
    }
    go(start0 < 0 ? 0 : start0, { noFocus: true, noScroll: true, replace: true });
    MLS.player = player;
    return player;
  }

  MLS.start = start;
  MLS.renderBlocks = renderBlocks;
})();
