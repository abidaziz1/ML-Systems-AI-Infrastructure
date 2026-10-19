/*
 * graphkit.js
 * Draws a small directed graph as inline SVG and returns a handle so lessons and widgets
 * can change node and edge states (active, done, dim, cut, selected...).
 *
 *   var g = MLS.graph(host, {
 *     width: 680, height: 260,
 *     nodes: [{ id: 'x', label: 'x', sub: 'input', cx: 70, cy: 60, w: 84, h: 40, kind: 'input' }],
 *     edges: [{ from: 'x', to: 'matmul', label: '[2]' }],
 *     onNodeClick: function (id) {}
 *   });
 *   g.node('x').cls('is-active', true);   g.edge('x', 'matmul').state('active');
 *
 * Node kinds (colors come from CSS): input, var, op, queue, grad, io, device.
 */
(function () {
  'use strict';
  var MLS = window.MLS;
  var s = MLS.s;
  var uid = 0;

  var MARKERS = { neutral: 'mk-n', active: 'mk-a', done: 'mk-g', dim: 'mk-d', cut: 'mk-w', grad: 'mk-r' };

  function graph(host, spec) {
    var id = 'gk' + ++uid;
    var width = spec.width || 680;
    var height = spec.height || 260;
    var svg = s('svg', {
      class: 'graph',
      viewBox: '0 0 ' + width + ' ' + height,
      role: 'img',
      'aria-label': spec.ariaLabel || 'Diagram',
      style: spec.minWidth ? 'min-width:' + spec.minWidth + 'px' : null
    });

    function marker(kind, cls) {
      return s(
        'marker',
        { id: id + '-' + kind, viewBox: '0 0 10 10', refX: '9', refY: '5', markerWidth: '7', markerHeight: '7', orient: 'auto-start-reverse' },
        s('path', { d: 'M0,0 L10,5 L0,10 z', class: 'arrowhead ' + cls })
      );
    }
    var defs = s('defs');
    Object.keys(MARKERS).forEach(function (k) {
      defs.appendChild(marker(k, MARKERS[k]));
    });
    svg.appendChild(defs);

    var edgeLayer = s('g', { class: 'edges' });
    var nodeLayer = s('g', { class: 'nodes' });
    var labelLayer = s('g', { class: 'elabels' });
    svg.appendChild(edgeLayer);
    svg.appendChild(labelLayer);
    svg.appendChild(nodeLayer);

    var nodes = {};
    var edges = {};
    var edgeList = [];

    (spec.nodes || []).forEach(function (n) {
      var w = n.w || 84;
      var hgt = n.h || 40;
      var g = s('g', {
        class: 'gnode k-' + (n.kind || 'op'),
        transform: 'translate(' + (n.cx - w / 2) + ',' + (n.cy - hgt / 2) + ')',
        'data-id': n.id
      });
      var rect = s('rect', { width: w, height: hgt, rx: n.round ? hgt / 2 : 10 });
      var hasSub = n.sub !== undefined && n.sub !== '';
      var label = s('text', { class: 'nlabel', x: w / 2, y: hasSub ? hgt / 2 - 3 : hgt / 2 + 1, 'text-anchor': 'middle', 'dominant-baseline': 'middle' }, n.label);
      var sub = s('text', { class: 'nsub', x: w / 2, y: hgt / 2 + 12, 'text-anchor': 'middle', 'dominant-baseline': 'middle' }, hasSub ? n.sub : '');
      var badge = s('text', { class: 'nbadge', x: w - 6, y: -5, 'text-anchor': 'end' }, '');
      g.appendChild(rect);
      g.appendChild(label);
      g.appendChild(sub);
      g.appendChild(badge);
      if (spec.onNodeClick && n.clickable !== false) {
        g.setAttribute('tabindex', '0');
        g.setAttribute('role', 'button');
        g.setAttribute('aria-label', (n.aria || n.label) + (n.sub ? ', ' + n.sub : ''));
        g.classList.add('clickable');
        g.addEventListener('click', function () {
          spec.onNodeClick(n.id);
        });
        g.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            spec.onNodeClick(n.id);
          }
        });
      }
      nodeLayer.appendChild(g);
      nodes[n.id] = {
        spec: n,
        el: g,
        cls: function (name, on) {
          g.classList.toggle(name, on === undefined ? true : !!on);
        },
        label: function (t) {
          label.textContent = t;
        },
        sub: function (t) {
          sub.textContent = t;
        },
        badge: function (t, cls) {
          badge.textContent = t || '';
          badge.setAttribute('class', 'nbadge' + (cls ? ' ' + cls : ''));
        },
        aria: function (t) {
          g.setAttribute('aria-label', t);
        }
      };
    });

    function anchor(n, side) {
      var w = n.w || 84;
      var hgt = n.h || 40;
      if (side === 'r') return [n.cx + w / 2, n.cy];
      if (side === 'l') return [n.cx - w / 2, n.cy];
      if (side === 'b') return [n.cx, n.cy + hgt / 2];
      return [n.cx, n.cy - hgt / 2];
    }

    (spec.edges || []).forEach(function (e) {
      var a = nodes[e.from].spec;
      var b = nodes[e.to].spec;
      var d;
      var lx;
      var ly;
      if (e.path) {
        d = e.path;
        lx = e.labelAt ? e.labelAt[0] : (a.cx + b.cx) / 2;
        ly = e.labelAt ? e.labelAt[1] : (a.cy + b.cy) / 2;
      } else {
        var dx = b.cx - a.cx;
        var dy = b.cy - a.cy;
        var horizontal = Math.abs(dx) >= ((a.w || 84) + (b.w || 84)) / 2 + 8;
        var p1;
        var p2;
        if (horizontal) {
          p1 = anchor(a, dx > 0 ? 'r' : 'l');
          p2 = anchor(b, dx > 0 ? 'l' : 'r');
          var mx = (p1[0] + p2[0]) / 2;
          d = 'M' + p1[0] + ',' + p1[1] + ' C' + mx + ',' + p1[1] + ' ' + mx + ',' + p2[1] + ' ' + p2[0] + ',' + p2[1];
          lx = mx;
          ly = (p1[1] + p2[1]) / 2 - 7;
        } else {
          p1 = anchor(a, dy > 0 ? 'b' : 't');
          p2 = anchor(b, dy > 0 ? 't' : 'b');
          var my = (p1[1] + p2[1]) / 2;
          d = 'M' + p1[0] + ',' + p1[1] + ' C' + p1[0] + ',' + my + ' ' + p2[0] + ',' + my + ' ' + p2[0] + ',' + p2[1];
          lx = (p1[0] + p2[0]) / 2 + 6;
          ly = my;
        }
        if (e.labelAt) {
          lx = e.labelAt[0];
          ly = e.labelAt[1];
        }
      }
      var path = s('path', { class: 'edge', d: d, 'marker-end': 'url(#' + id + '-neutral)' });
      var text = s('text', { class: 'elabel', x: lx, y: ly, 'text-anchor': 'middle' }, e.label || '');
      edgeLayer.appendChild(path);
      labelLayer.appendChild(text);
      var key = e.from + '>' + e.to;
      var handle = {
        spec: e,
        el: path,
        state: function (st) {
          ['is-active', 'is-done', 'is-dim', 'is-cut', 'is-grad'].forEach(function (c) {
            path.classList.remove(c);
          });
          var kind = 'neutral';
          if (st && st !== 'neutral') {
            path.classList.add('is-' + st);
            kind = MARKERS[st] ? st : 'neutral';
          }
          path.setAttribute('marker-end', 'url(#' + id + '-' + kind + ')');
        },
        label: function (t) {
          text.textContent = t;
        },
        labelClass: function (name, on) {
          text.classList.toggle(name, !!on);
        }
      };
      edges[key] = handle;
      edgeList.push(handle);
    });

    host.appendChild(svg);

    return {
      svg: svg,
      node: function (nid) {
        return nodes[nid];
      },
      edge: function (from, to) {
        return edges[from + '>' + to];
      },
      nodeIds: function () {
        return Object.keys(nodes);
      },
      edges: function () {
        return edgeList;
      },
      /* clear every state class and edge state */
      reset: function (classes) {
        var list = classes || ['is-active', 'is-done', 'is-dim', 'is-selected', 'is-fetch', 'is-feed', 'is-skip', 'is-bad', 'is-good'];
        Object.keys(nodes).forEach(function (k) {
          list.forEach(function (c) {
            nodes[k].el.classList.remove(c);
          });
        });
        edgeList.forEach(function (e) {
          e.state('');
        });
      }
    };
  }

  MLS.graph = graph;
})();
