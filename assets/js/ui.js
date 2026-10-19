/*
 * ui.js
 * Small controls reused by widgets: slider, segmented buttons, stat boxes, message box, meter rows.
 */
(function () {
  'use strict';
  var MLS = window.MLS;
  var h = MLS.h;
  var n = 0;

  function uid(p) {
    return (p || 'u') + ++n;
  }

  /* slider({ label, min, max, step, value, format, onInput }) -> { el, get, set } */
  function slider(o) {
    var id = uid('sl');
    var format = o.format || function (v) { return String(v); };
    var out = h('output', { for: id }, format(o.value));
    var input = h('input', { type: 'range', id: id, min: o.min, max: o.max, step: o.step || 1, value: o.value });
    input.addEventListener('input', function () {
      out.textContent = format(+input.value);
      if (o.onInput) o.onInput(+input.value);
    });
    var el = h('div.ctrl', h('label.lab', { for: id }, h('span', o.label), out), input);
    return {
      el: el,
      input: input,
      get: function () { return +input.value; },
      set: function (v) {
        input.value = v;
        out.textContent = format(+input.value);
      },
      setMax: function (m) {
        input.max = m;
        if (+input.value > m) input.value = m;
        out.textContent = format(+input.value);
      }
    };
  }

  /* seg([{ label, value }], value, onChange) -> { el, get, set } */
  function seg(options, value, onChange, ariaLabel) {
    var cur = value;
    var buttons = [];
    var el = h('div.seg', { role: 'group', 'aria-label': ariaLabel || 'Options' });
    function paint() {
      buttons.forEach(function (b, i) {
        b.setAttribute('aria-pressed', options[i].value === cur ? 'true' : 'false');
      });
    }
    options.forEach(function (opt) {
      var b = h('button', { type: 'button' }, opt.label);
      b.addEventListener('click', function () {
        cur = opt.value;
        paint();
        if (onChange) onChange(cur);
      });
      buttons.push(b);
      el.appendChild(b);
    });
    paint();
    return {
      el: el,
      get: function () { return cur; },
      set: function (v) {
        cur = v;
        paint();
      }
    };
  }

  /* stat('Label', 'unit') -> { el, set(text, cls) } */
  function stat(label, unit) {
    var v = h('span.v', '-');
    var u = h('span.u', unit || '');
    var el = h('div.stat', h('div.k', label), h('div', v, u));
    return {
      el: el,
      set: function (text, cls) {
        v.textContent = text;
        el.className = 'stat' + (cls ? ' ' + cls : '');
      }
    };
  }

  /* msg() -> { el, set(html, cls) } ; html goes through MLS.rich */
  function msg(initial) {
    var el = h('div.msg', { 'aria-live': 'polite' });
    el.innerHTML = MLS.rich(initial || '');
    return {
      el: el,
      set: function (text, cls) {
        el.innerHTML = MLS.rich(text);
        el.className = 'msg' + (cls ? ' ' + cls : '');
      }
    };
  }

  /* meterRow('Label') -> { el, set(fraction 0..1, text, color) } */
  function meterRow(label) {
    var bar = h('i');
    var val = h('span.val', '');
    var el = h('div.meterrow', h('span', label), h('div.meter', bar), val);
    return {
      el: el,
      set: function (frac, text, color) {
        bar.style.width = Math.round(MLS.clamp(frac, 0, 1) * 100) + '%';
        bar.style.background = color || '';
        val.textContent = text;
      }
    };
  }

  function btn(label, onClick, cls) {
    var b = h('button.btn.small' + (cls ? '.' + cls : ''), { type: 'button' }, label);
    b.addEventListener('click', onClick);
    return b;
  }

  MLS.ui = { slider: slider, seg: seg, stat: stat, msg: msg, meterRow: meterRow, btn: btn, uid: uid };
})();
