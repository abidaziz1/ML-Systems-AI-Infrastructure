/*
 * core.js
 * Tiny helpers shared by every page: DOM builder, SVG builder, safe text markup,
 * storage that never throws, and a seeded random number generator.
 * No dependencies. Works from file:// as well as from a web server.
 */
(function (root) {
  'use strict';

  var MLS = (root.MLS = root.MLS || {});
  var SVG_NS = 'http://www.w3.org/2000/svg';

  /* ---------- DOM builder: h('div.card#id', {attrs}, ...children) ---------- */
  function applyAttrs(el, attrs) {
    if (!attrs) return;
    Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'class') el.setAttribute('class', v);
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k === 'html') el.innerHTML = v;
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, v);
    });
  }

  function append(el, kids) {
    for (var i = 0; i < kids.length; i++) {
      var c = kids[i];
      if (c === null || c === undefined || c === false) continue;
      if (Array.isArray(c)) append(el, c);
      else if (c.nodeType) el.appendChild(c);
      else el.appendChild(document.createTextNode(String(c)));
    }
  }

  function h(sel, attrs) {
    var m = /^([a-z0-9]*)((?:[.#][\w-]+)*)$/i.exec(sel);
    var tag = (m && m[1]) || 'div';
    var el = document.createElement(tag);
    if (m && m[2]) {
      m[2].replace(/([.#])([\w-]+)/g, function (_, kind, name) {
        if (kind === '#') el.id = name;
        else el.classList.add(name);
        return '';
      });
    }
    var rest = 2;
    if (attrs && (typeof attrs !== 'object' || attrs.nodeType || Array.isArray(attrs))) {
      rest = 1;
      attrs = null;
    }
    applyAttrs(el, attrs);
    append(el, Array.prototype.slice.call(arguments, rest));
    return el;
  }

  function s(tag, attrs) {
    var el = document.createElementNS(SVG_NS, tag);
    var rest = 2;
    if (attrs && (typeof attrs !== 'object' || attrs.nodeType || Array.isArray(attrs))) {
      rest = 1;
      attrs = null;
    }
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === null || v === undefined || v === false) return;
        if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else if (k === 'class') el.setAttribute('class', v);
        else el.setAttribute(k, v);
      });
    }
    append(el, Array.prototype.slice.call(arguments, rest));
    return el;
  }

  /* ---------- Safe text markup ----------
   * Escapes HTML first, then supports:
   *   **bold**   `code`   __emphasis__   [text](https://url)   {{glossary-key|shown text}}
   */
  function esc(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function rich(text) {
    var out = esc(text);
    out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
    out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    out = out.replace(/__([^_]+)__/g, '<em>$1</em>');
    out = out.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    out = out.replace(/\{\{([\w-]+)(?:\|([^}]+))?\}\}/g, function (_, key, shown) {
      return '<button type="button" class="term" data-term="' + key + '">' + (shown || key) + '</button>';
    });
    return out;
  }

  /* ---------- Storage that never throws ---------- */
  var memory = {};
  var store = {
    get: function (key, fallback) {
      try {
        var raw = root.localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) {
        return key in memory ? memory[key] : fallback;
      }
    },
    set: function (key, value) {
      memory[key] = value;
      try {
        root.localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        /* private mode or blocked storage: keep the in-memory copy */
      }
    }
  };

  /* ---------- Seeded random numbers (mulberry32) ---------- */
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function fmt(n, digits) {
    if (!isFinite(n)) return '-';
    var d = digits === undefined ? 1 : digits;
    return Number(n.toFixed(d)).toString();
  }

  function reducedMotion() {
    return !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  /* ---------- Theme: follows the system until the reader picks one ---------- */
  var theme = {
    init: function () {
      var saved = store.get('mls:theme', null);
      if (saved) document.documentElement.setAttribute('data-theme', saved);
    },
    isDark: function () {
      var attr = document.documentElement.getAttribute('data-theme');
      if (attr) return attr === 'dark';
      return !!(root.matchMedia && root.matchMedia('(prefers-color-scheme: dark)').matches);
    },
    toggle: function () {
      var next = theme.isDark() ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      store.set('mls:theme', next);
    }
  };
  theme.init();

  MLS.theme = theme;
  MLS.h = h;
  MLS.s = s;
  MLS.esc = esc;
  MLS.rich = rich;
  MLS.store = store;
  MLS.rng = rng;
  MLS.clamp = clamp;
  MLS.fmt = fmt;
  MLS.reducedMotion = reducedMotion;
  MLS.widgets = MLS.widgets || {};
  MLS.blocks = MLS.blocks || {};
})(window);
