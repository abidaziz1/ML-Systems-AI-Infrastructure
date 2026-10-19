/* landing.js: builds the course home page from MLS.papers and shows saved progress. */
(function () {
  'use strict';
  var MLS = window.MLS;
  var h = MLS.h;

  var filter = 'all';
  var host = document.getElementById('papers');
  var filtersHost = document.getElementById('filters');

  function progressOf(p) {
    if (!p.id) return null;
    var st = MLS.store.get('mls:lesson:' + p.id, null);
    if (!st || !st.visited) return null;
    var seen = Object.keys(st.visited).length;
    var total = st.total || 0;
    return { seen: seen, total: total, pct: total ? Math.min(100, Math.round((seen / total) * 100)) : 0 };
  }

  function matches(p) {
    if (filter === 'all') return true;
    if (filter === 'starter') return !!p.starter;
    return p.f === filter;
  }

  function card(p) {
    var ready = !!p.lesson;
    var tag = ready ? 'a.pcard' : 'div.pcard.soon';
    var attrs = ready ? { href: p.lesson + 'index.html' } : {};
    var prog = progressOf(p);
    var meta = [p.authors, p.venue].filter(Boolean).join(' · ');
    var chips = [h('span.chip', MLS.foundations[p.f])];
    if (p.starter) chips.unshift(h('span.chip.accent', 'Starter 10'));
    if (ready) chips.push(h('span.chip.good', prog && prog.pct ? prog.pct + '% done' : 'Lesson ready'));
    else if (p.revisit) chips.push(h('span.chip', 'Revisit paper ' + p.revisit));
    else chips.push(h('span.chip', 'Coming soon'));
    var kids = [h('span.num', 'Paper ' + p.n), h('h3', p.title), h('div.meta', meta)];
    if (prog && prog.pct) kids.push(h('div.pbar', { role: 'progressbar', 'aria-valuenow': prog.pct, 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-label': 'Progress' }, h('i', { style: { width: prog.pct + '%' } })));
    kids.push(h('div.row', chips));
    return h(tag, attrs, kids);
  }

  function render() {
    host.innerHTML = '';
    MLS.tiers.forEach(function (tier) {
      var list = MLS.papers.filter(function (p) { return p.tier === tier.id && matches(p); });
      if (!list.length) return;
      var grid = h('div.papers');
      list.forEach(function (p) { grid.appendChild(card(p)); });
      host.appendChild(h('section.tier', h('h2', tier.title), h('p', tier.blurb), grid));
    });
  }

  function chip(label, key) {
    var b = h('button.chip', { type: 'button', 'aria-pressed': key === filter ? 'true' : 'false' }, label);
    b.addEventListener('click', function () {
      filter = key;
      Array.prototype.forEach.call(filtersHost.querySelectorAll('button.chip'), function (c) {
        c.setAttribute('aria-pressed', c === b ? 'true' : 'false');
      });
      render();
    });
    return b;
  }

  filtersHost.appendChild(h('span.label', 'Show'));
  filtersHost.appendChild(chip('All 24', 'all'));
  filtersHost.appendChild(chip('Starter 10', 'starter'));
  Object.keys(MLS.foundations).forEach(function (k) {
    filtersHost.appendChild(chip(MLS.foundations[k], k));
  });

  var themeBtn = document.getElementById('theme');
  if (themeBtn) themeBtn.addEventListener('click', function () { MLS.theme.toggle(); });

  render();
})();
