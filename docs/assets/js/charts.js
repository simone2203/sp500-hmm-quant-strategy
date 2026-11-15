/* ==========================================================================
   charts.js
   A small SVG charting layer written for this page (no dependencies).
   Every chart reads its numbers from window.SITE_DATA, which is exported
   from the notebook by data/export_site_data.py.
   ========================================================================== */
(function () {
  'use strict';

  var SVG_NS = 'http://www.w3.org/2000/svg';
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var uid = 0;

  function reducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  /* ---------- DOM helpers ---------- */
  function s(tag, attrs, parent) {
    var node = document.createElementNS(SVG_NS, tag);
    if (attrs) {
      for (var k in attrs) {
        if (Object.prototype.hasOwnProperty.call(attrs, k) && attrs[k] !== null && attrs[k] !== undefined) {
          node.setAttribute(k, attrs[k]);
        }
      }
    }
    if (parent) parent.appendChild(node);
    return node;
  }
  function h(tag, className, parent, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    if (parent) parent.appendChild(node);
    return node;
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

  /* ---------- Formatting ---------- */
  function parseDate(iso) {
    return Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
  }
  function fmtDate(ms) {
    var d = new Date(ms);
    return d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()] + ' ' + d.getUTCFullYear();
  }
  function minus(str) { return str.replace(/^-/, '−'); }
  function fmtFixed(v, digits) { return minus(Number(v).toFixed(digits)); }
  function fmtPct(v, digits) { return minus((v * 100).toFixed(digits === undefined ? 1 : digits)) + '%'; }
  function fmtInt(v) { return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

  /* ---------- Scales and ticks ---------- */
  function niceStep(span, count) {
    var raw = span / Math.max(1, count);
    var p = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10));
    var r = raw / p;
    var m = r < 1.5 ? 1 : r < 2.25 ? 2 : r < 3.5 ? 2.5 : r < 7.5 ? 5 : 10;
    return m * p;
  }
  function niceTicks(min, max, count) {
    if (!(max > min)) return [min];
    var step = niceStep(max - min, count);
    var start = Math.ceil(min / step - 1e-9) * step;
    var out = [];
    for (var v = start; v <= max + step * 1e-9; v += step) out.push(Math.round(v / step) * step);
    return out;
  }
  function stepTicks(min, max, step) {
    var out = [];
    var start = Math.ceil(min / step - 1e-9);
    for (var k = start; k * step <= max + step * 1e-9; k++) out.push(Math.round(k * step * 1e9) / 1e9);
    return out;
  }
  function decimalsFor(step) {
    for (var d = 0; d < 6; d++) {
      var scaled = step * Math.pow(10, d);
      if (Math.abs(scaled - Math.round(scaled)) < 1e-6) return d;
    }
    return 6;
  }
  function yearTicks(t0, t1, plotW) {
    var y0 = new Date(t0).getUTCFullYear();
    var y1 = new Date(t1).getUTCFullYear();
    var years = [];
    for (var y = y0; y <= y1 + 1; y++) {
      var t = Date.UTC(y, 0, 1);
      if (t >= t0 && t <= t1) years.push(t);
    }
    var every = 1;
    while (years.length / every > Math.max(2, Math.floor(plotW / 62))) every++;
    return years.filter(function (_, i) { return i % every === 0; });
  }
  function runs(values) {
    var out = [];
    var start = 0;
    for (var i = 1; i <= values.length; i++) {
      if (i === values.length || values[i] !== values[start]) {
        out.push({ v: values[start], a: start, b: i - 1 });
        start = i;
      }
    }
    return out;
  }
  function hatchPattern(defs, id) {
    var p = s('pattern', { id: id, patternUnits: 'userSpaceOnUse', width: 6, height: 6, patternTransform: 'rotate(45)' }, defs);
    var ln = s('line', { x1: 0, y1: 0, x2: 0, y2: 6 }, p);
    ln.style.stroke = 'var(--ink-3)';
    ln.style.strokeOpacity = '0.55';
    ln.style.strokeWidth = '1.6';
    return 'url(#' + id + ')';
  }

  /* ---------- Tooltip helpers ---------- */
  function tipDate(parent, text) { return h('div', 'tooltip-date', parent, text); }
  function tipRow(parent, keyType, color, label, value, dashed) {
    var row = h('div', 'tooltip-row', parent);
    var key = h('span', keyType === 'swatch' ? 'swatch' : ('line-key' + (dashed ? ' dashed' : '')), row);
    if (keyType === 'swatch') {
      if (color === 'hatch') key.classList.add('hatch'); else key.style.background = color;
    } else {
      key.style.color = color;
    }
    h('span', 'lab', row, label);
    h('span', 'val', row, value);
    return row;
  }

  function placeTooltip(host, tip, anchorX, anchorY, plotLeft, plotRight) {
    var hostW = host.clientWidth;
    var tw = tip.offsetWidth;
    var th = tip.offsetHeight;
    var left = anchorX + 16;
    if (left + tw > Math.min(hostW, plotRight + 24)) left = anchorX - 16 - tw;
    if (left < 0) left = Math.max(0, Math.min(hostW - tw, anchorX - tw / 2));
    var top = Math.max(0, anchorY - th / 2);
    tip.style.transform = 'translate(' + Math.round(left) + 'px,' + Math.round(top) + 'px)';
  }

  /* ======================================================================
     RegimeTimeline: the regime decoded for each trading day, one band per
     model, on a shared time axis. Values: 1 = calm, 0 = volatile,
     null = no model yet (warm-up). It draws regimes only, no market data.
     ====================================================================== */
  function pick(v, W, fallback) {
    var out = typeof v === 'function' ? v(W) : v;
    return out === undefined ? fallback : out;
  }

  function RegimeTimeline(host, opts) {
    this.host = host;
    this.opts = opts;
    this.x = opts.x;
    this.n = opts.x.length;
    this.idx = null;
    this.revealDone = !opts.reveal || reducedMotion();
    this.id = 'rg' + (++uid);
    clear(host);
    this.svg = s('svg', { 'aria-hidden': 'true', focusable: 'false' }, host);
    this.tip = h('div', 'tooltip', host);
    this.tip.setAttribute('aria-hidden', 'true');
    this.live = h('p', 'visually-hidden', host);
    this.live.setAttribute('aria-live', 'polite');
    this._bind();
    this.render();
    if (!this.revealDone) this._reveal();
  }

  RegimeTimeline.prototype.render = function () {
    var o = this.opts;
    var W = Math.max(260, Math.floor(this.host.clientWidth));
    var m = { top: 0, right: 0, bottom: 30, left: 0 };
    var labelH = pick(o.labelH, W, 24);
    var barH = pick(o.barH, W, 14);
    var rowGap = pick(o.rowGap, W, 16);
    var rows = o.rows;
    var plotH = rows.length * (labelH + barH) + (rows.length - 1) * rowGap;
    var H = m.top + plotH + m.bottom;

    var svg = this.svg;
    clear(svg);
    svg.setAttribute('width', W);
    svg.setAttribute('height', H);
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    this.host.style.height = H + 'px';
    var defs = s('defs', null, svg);
    var hatch = hatchPattern(defs, this.id + '-hatch');

    // day i occupies [px[i], px[i + 1]); the last day ends one trading gap after its start
    var xs = this.x;
    var n = this.n;
    var t0 = xs[0];
    var tEnd = xs[n - 1] + (n > 1 ? xs[n - 1] - xs[n - 2] : 86400000);
    var plotW = W - m.left - m.right;
    var sx = function (t) { return m.left + (t - t0) / (tEnd - t0) * plotW; };
    var px = new Float64Array(n + 1);
    for (var i = 0; i < n; i++) px[i] = sx(xs[i]);
    px[n] = sx(tEnd);
    this.px = px;
    this.m = m;
    this.W = W;

    var axisLayer = s('g', { 'class': 'axis' }, svg);
    var dataLayer = s('g', { 'class': 'data' }, svg);
    this.dataLayer = dataLayer;
    var barTop = null;
    var barBottom = 0;
    rows.forEach(function (row, ri) {
      var ry = m.top + ri * (labelH + barH + rowGap);
      var label = s('text', { 'class': 'panel-title', x: m.left, y: ry + labelH - 9 }, axisLayer);
      label.textContent = typeof row.label === 'function' ? row.label(W) : row.label;
      var by = ry + labelH;
      if (barTop === null) barTop = by;
      barBottom = by + barH;
      runs(row.values).forEach(function (run) {
        var xa = px[run.a];
        var xb = px[run.b + 1];
        // runs overlap the next one by half a pixel, so anti-aliasing leaves no hairline gaps
        var over = run.b + 1 < n ? 0.5 : 0;
        var rect = s('rect', { x: xa.toFixed(2), y: by, width: Math.max(0.6, xb - xa + over).toFixed(2), height: barH }, dataLayer);
        if (run.v === null || run.v === undefined) {
          rect.setAttribute('fill', hatch);
        } else {
          rect.style.fill = row.colors[run.v];
        }
      });
    });
    this.plotTop = barTop;
    this.plotBottom = barBottom;

    // x axis
    var axisY = m.top + plotH;
    s('line', { 'class': 'baseline', x1: m.left, x2: W - m.right, y1: axisY + 3.5, y2: axisY + 3.5 }, axisLayer);
    yearTicks(t0, tEnd, plotW).forEach(function (t) {
      var xt = Math.round(sx(t)) + 0.5;
      s('line', { 'class': 'baseline', x1: xt, x2: xt, y1: axisY + 4, y2: axisY + 9 }, axisLayer);
      var xl = Math.max(m.left + 15, Math.min(W - m.right - 15, xt));
      s('text', { x: xl, y: axisY + 24, 'text-anchor': 'middle' }, axisLayer).textContent = new Date(t).getUTCFullYear();
    });

    // hover layer: a dark halo under a light rule keeps the crosshair visible on both colours
    this.hover = s('g', { 'class': 'hover', visibility: 'hidden' }, svg);
    this.crossHalo = s('line', { 'class': 'crosshair-halo', x1: 0, x2: 0, y1: barTop - 6, y2: axisY + 3 }, this.hover);
    this.cross = s('line', { 'class': 'crosshair strong', x1: 0, x2: 0, y1: barTop - 6, y2: axisY + 3 }, this.hover);

    if (!this.revealDone && this.clipRect) this._attachClip(defs);
    if (this.idx !== null && this.active) this._show(this.idx);
  };

  RegimeTimeline.prototype._attachClip = function (defs) {
    var cp = s('clipPath', { id: this.id + '-clip' }, defs);
    this.clipRect = s('rect', { x: 0, y: 0, width: this.m.left, height: this.plotBottom + 10 }, cp);
    this.dataLayer.setAttribute('clip-path', 'url(#' + this.id + '-clip)');
    this.edge = s('line', { 'class': 'reveal-edge', y1: this.plotTop, y2: this.plotBottom }, this.svg);
  };

  RegimeTimeline.prototype._reveal = function () {
    var self = this;
    var defs = this.svg.querySelector('defs');
    this._attachClip(defs);
    var duration = this.opts.revealDuration || 2200;
    var start = null;
    function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
    function frame(ts) {
      if (start === null) start = ts;
      var p = Math.min(1, (ts - start) / duration);
      var e = ease(p);
      var xr = self.m.left + (self.W - self.m.left - self.m.right) * e;
      self.clipRect.setAttribute('width', xr.toFixed(1));
      self.edge.setAttribute('x1', xr.toFixed(1));
      self.edge.setAttribute('x2', xr.toFixed(1));
      self.edge.style.opacity = String(0.65 * (1 - Math.pow(p, 6)));
      if (p < 1) {
        requestAnimationFrame(frame);
      } else {
        self.revealDone = true;
        self.dataLayer.removeAttribute('clip-path');
        if (self.edge && self.edge.parentNode) self.edge.parentNode.removeChild(self.edge);
        self.clipRect = null;
      }
    }
    requestAnimationFrame(frame);
  };

  RegimeTimeline.prototype._dayAt = function (xpos) {
    var px = this.px;
    var lo = 0, hi = this.n - 1;
    if (xpos <= px[0]) return 0;
    if (xpos >= px[hi]) return hi;
    while (hi - lo > 1) {
      var mid = (lo + hi) >> 1;
      if (px[mid] <= xpos) lo = mid; else hi = mid;
    }
    return lo;
  };

  RegimeTimeline.prototype._bind = function () {
    var self = this;
    var host = this.host;
    var onPointer = function (ev) {
      var rect = host.getBoundingClientRect();
      var xpos = ev.clientX - rect.left;
      var ypos = ev.clientY - rect.top;
      if (ypos < self.plotTop - 30 || ypos > self.plotBottom + 30 || xpos < self.m.left - 8 || xpos > self.W - self.m.right + 8) {
        if (!self.keyboard) self._hide();
        return;
      }
      self.keyboard = false;
      self.active = true;
      self._show(self._dayAt(xpos));
    };
    host.addEventListener('pointermove', onPointer);
    host.addEventListener('pointerdown', onPointer);
    host.addEventListener('pointerleave', function (ev) {
      if (ev.pointerType === 'touch') return;
      if (!self.keyboard) self._hide();
    });
    document.addEventListener('pointerdown', function (ev) {
      if (!host.contains(ev.target)) self._hide();
    });
    host.addEventListener('focus', function () {
      if (self.idx === null) self.idx = self.n - 1;
      self.keyboard = true;
      self.active = true;
      self._show(self.idx);
      self._announce(self.idx);
    });
    host.addEventListener('blur', function () { self.keyboard = false; self._hide(); });
    host.addEventListener('keydown', function (ev) {
      var step = 0;
      switch (ev.key) {
        case 'ArrowRight': step = ev.shiftKey ? 21 : 1; break;
        case 'ArrowLeft': step = ev.shiftKey ? -21 : -1; break;
        case 'PageUp': step = -21; break;
        case 'PageDown': step = 21; break;
        case 'Home': step = -Infinity; break;
        case 'End': step = Infinity; break;
        case 'Escape': self._hide(); return;
        default: return;
      }
      ev.preventDefault();
      var cur = self.idx === null ? self.n - 1 : self.idx;
      var next = step === -Infinity ? 0 : step === Infinity ? self.n - 1 : Math.max(0, Math.min(self.n - 1, cur + step));
      self.keyboard = true;
      self.active = true;
      self._show(next);
      self._announce(next);
    });
    if (window.ResizeObserver) {
      var lastW = 0;
      var pending = false;
      new ResizeObserver(function () {
        var w = Math.floor(host.clientWidth);
        if (w === lastW || pending) return;
        pending = true;
        requestAnimationFrame(function () {
          pending = false;
          lastW = Math.floor(host.clientWidth);
          self.render();
        });
      }).observe(host);
    } else {
      window.addEventListener('resize', function () { self.render(); });
    }
  };

  RegimeTimeline.prototype._show = function (i) {
    this.idx = i;
    var x = Math.round((this.px[i] + this.px[i + 1]) / 2) + 0.5;
    this.hover.setAttribute('visibility', 'visible');
    [this.cross, this.crossHalo].forEach(function (ln) {
      ln.setAttribute('x1', x);
      ln.setAttribute('x2', x);
    });
    clear(this.tip);
    this.opts.tooltip(i, this.tip, this);
    this.tip.classList.add('is-visible');
    var anchorY = this.plotTop + this.tip.offsetHeight / 2 - 10;
    placeTooltip(this.host, this.tip, x, anchorY, this.m.left, this.W - this.m.right);
  };
  RegimeTimeline.prototype._hide = function () {
    this.active = false;
    if (this.hover) this.hover.setAttribute('visibility', 'hidden');
    this.tip.classList.remove('is-visible');
  };
  RegimeTimeline.prototype._announce = function (i) {
    var self = this;
    clearTimeout(this._liveTimer);
    this._liveTimer = setTimeout(function () {
      self.live.textContent = self.opts.describe ? self.opts.describe(i) : '';
    }, 180);
  };

  /* ======================================================================
     GaussianStates: the bivariate normal distribution fitted to each state,
     drawn as its one- and two-standard-deviation ellipses. It draws model
     parameters only, no daily observations.
     ====================================================================== */
  function GaussianStates(host, opts) {
    this.host = host;
    this.opts = opts;
    clear(host);
    this.svg = s('svg', { 'aria-hidden': 'true', focusable: 'false' }, host);
    var self = this;
    if (window.ResizeObserver) {
      var lastW = 0;
      new ResizeObserver(function () {
        var w = Math.floor(host.clientWidth);
        if (w === lastW) return;
        lastW = w;
        requestAnimationFrame(function () { self.render(); });
      }).observe(host);
    }
    this.render();
  }

  function ellipsePoints(mean, cov, k, steps) {
    var a = cov[0][0], b = cov[0][1], d = cov[1][1];
    var tr = a + d;
    var det = a * d - b * b;
    var disc = Math.sqrt(Math.max(0, tr * tr / 4 - det));
    var l1 = tr / 2 + disc;
    var l2 = Math.max(0, tr / 2 - disc);
    var v1 = Math.abs(b) > 1e-15 ? [l1 - d, b] : (a >= d ? [1, 0] : [0, 1]);
    var norm = Math.sqrt(v1[0] * v1[0] + v1[1] * v1[1]);
    v1 = [v1[0] / norm, v1[1] / norm];
    var v2 = [-v1[1], v1[0]];
    var r1 = k * Math.sqrt(l1);
    var r2 = k * Math.sqrt(l2);
    var pts = [];
    for (var i = 0; i <= steps; i++) {
      var th = (i / steps) * Math.PI * 2;
      var c = Math.cos(th), sn = Math.sin(th);
      pts.push([mean[0] + r1 * c * v1[0] + r2 * sn * v2[0], mean[1] + r1 * c * v1[1] + r2 * sn * v2[1]]);
    }
    return pts;
  }

  GaussianStates.prototype.render = function () {
    var o = this.opts;
    var W = Math.max(260, Math.floor(this.host.clientWidth));
    var Hh = W < 560 ? Math.round(W * 0.86) : Math.round(Math.min(460, W * 0.46));
    var m = { top: 30, right: 14, bottom: 46, left: W < 560 ? 46 : 58 };
    var svg = this.svg;
    clear(svg);
    svg.setAttribute('width', W);
    svg.setAttribute('height', Hh);
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + Hh);
    this.host.style.height = Hh + 'px';
    var xd = o.xDomain, yd = o.yDomain;
    var sx = function (v) { return m.left + (v - xd[0]) / (xd[1] - xd[0]) * (W - m.left - m.right); };
    var sy = function (v) { return Hh - m.bottom - (v - yd[0]) / (yd[1] - yd[0]) * (Hh - m.top - m.bottom); };

    var grid = s('g', { 'class': 'grid' }, svg);
    var axis = s('g', { 'class': 'axis' }, svg);
    stepTicks(xd[0], xd[1], W < 560 ? o.xStep * 2 : o.xStep).forEach(function (t) {
      var xx = Math.round(sx(t)) + 0.5;
      s('line', { x1: xx, x2: xx, y1: m.top, y2: Hh - m.bottom }, grid);
      s('text', { x: xx, y: Hh - m.bottom + 18, 'text-anchor': 'middle' }, axis).textContent = fmtPct(t, decimalsFor(o.xStep * 100));
    });
    stepTicks(Math.max(0, yd[0]), yd[1], o.yStep).forEach(function (t) {
      var yy = Math.round(sy(t)) + 0.5;
      s('line', { x1: m.left, x2: W - m.right, y1: yy, y2: yy }, grid);
      s('text', { x: m.left - 8, y: yy + 4, 'text-anchor': 'end' }, axis).textContent = fmtPct(t, decimalsFor(o.yStep * 100));
    });
    s('line', { 'class': 'baseline', x1: Math.round(sx(0)) + 0.5, x2: Math.round(sx(0)) + 0.5, y1: m.top, y2: Hh - m.bottom }, axis);
    s('line', { 'class': 'baseline', x1: m.left, x2: W - m.right, y1: Hh - m.bottom + 0.5, y2: Hh - m.bottom + 0.5 }, axis);
    s('text', { x: W - m.right, y: Hh - 6, 'text-anchor': 'end' }, axis).textContent = 'Daily log return';
    s('text', { x: m.left, y: m.top - 12, 'class': 'panel-title' }, axis).textContent = '20-day volatility';

    var ell = s('g', null, svg);
    var labels = s('g', null, svg);
    o.ellipses.forEach(function (e) {
      [2, 1].forEach(function (k) {
        var d = '';
        ellipsePoints(e.mean, e.cov, k, 120).forEach(function (p, idx) {
          d += (idx ? 'L' : 'M') + sx(p[0]).toFixed(1) + ',' + sy(p[1]).toFixed(1);
        });
        var halo = s('path', { d: d + 'Z', fill: 'none' }, ell);
        halo.style.stroke = 'var(--bg)';
        halo.style.strokeWidth = k === 1 ? '6px' : '4.5px';
        halo.style.strokeOpacity = '0.85';
        var path = s('path', { d: d + 'Z', fill: 'none' }, ell);
        path.style.stroke = e.color;
        path.style.strokeWidth = k === 1 ? '2px' : '1.4px';
        path.style.strokeOpacity = k === 1 ? '1' : '0.85';
        path.style.strokeDasharray = k === 2 ? '5 4' : '';
        if (k === 1) {
          path.style.fill = e.color;
          path.style.fillOpacity = '0.10';
        }
      });
      var cx = sx(e.mean[0]), cy = sy(e.mean[1]);
      var dot = s('circle', { cx: cx, cy: cy, r: 4.5 }, ell);
      dot.style.fill = e.color;
      dot.style.stroke = 'var(--bg)';
      dot.style.strokeWidth = '2px';

      // direct label: right of the outer contour, or above the inner one
      var sdx = Math.sqrt(e.cov[0][0]), sdy = Math.sqrt(e.cov[1][1]);
      var lx, ly, anchor;
      if (e.labelAt === 'top') {
        lx = cx; ly = sy(e.mean[1] + sdy) - 10; anchor = 'middle';
      } else {
        lx = sx(e.mean[0] + 2 * sdx) + 8; ly = cy + 4; anchor = 'start';
      }
      var t = s('text', { x: lx, y: ly, 'text-anchor': anchor, 'class': 'direct-label' }, labels);
      t.textContent = e.label;
    });
  };

  /* ======================================================================
     MetricBars: the four strategies on each aggregate metric, one small
     panel per metric. Bars start at zero; drawdowns are drawn by depth.
     ====================================================================== */
  function MetricBars(host, opts) {
    this.host = host;
    this.opts = opts;
    var self = this;
    clear(host);
    var grid = h('div', 'mb-grid', host);
    this.panels = opts.metrics.map(function (mt) {
      var el = h('div', 'mb-panel', grid);
      h('p', 'mb-title', el, mt.title);
      var svg = s('svg', { role: 'img' }, el);
      return { el: el, svg: svg, metric: mt };
    });
    if (window.ResizeObserver) {
      var lastW = 0;
      new ResizeObserver(function () {
        var w = Math.floor(host.clientWidth);
        if (w === lastW) return;
        lastW = w;
        requestAnimationFrame(function () { self.render(); });
      }).observe(host);
    }
    this.render();
  }
  MetricBars.prototype.setRows = function (rows, windowLabel) {
    this.opts.rows = rows;
    this.opts.windowLabel = windowLabel;
    this.render();
  };
  MetricBars.prototype.render = function () {
    var o = this.opts;
    var rows = o.rows;
    this.panels.forEach(function (p, pi) {
      var mt = p.metric;
      var svg = p.svg;
      clear(svg);
      var W = Math.max(220, Math.floor(p.el.clientWidth));
      var labelW = W < 330 ? 86 : 104;
      var valueW = 54;
      var rowH = 30, barH = 14, top = 2, bottom = 2;
      var Hh = top + rows.length * rowH + bottom;
      svg.setAttribute('width', W);
      svg.setAttribute('height', Hh);
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + Hh);
      var defs = s('defs', null, svg);
      var x0 = labelW, x1 = W - valueW;
      var sx = function (v) { return x0 + Math.abs(v) / mt.max * (x1 - x0); };
      rows.forEach(function (r, i) {
        var v = r.values[mt.key];
        var cy = top + i * rowH + rowH / 2;
        var lab = s('text', { x: x0 - 10, y: cy + 4, 'text-anchor': 'end', 'class': 'mb-label' + (r.main ? ' is-main' : '') }, svg);
        lab.textContent = r.short;
        var xe = sx(v);
        var y = cy - barH / 2;
        var rad = Math.min(3, Math.max(0, xe - x0));
        var d = 'M' + x0 + ',' + y + 'H' + (xe - rad).toFixed(1) +
          'Q' + xe.toFixed(1) + ',' + y + ' ' + xe.toFixed(1) + ',' + (y + rad) +
          'V' + (y + barH - rad) +
          'Q' + xe.toFixed(1) + ',' + (y + barH) + ' ' + (xe - rad).toFixed(1) + ',' + (y + barH) +
          'H' + x0 + 'Z';
        var bar = s('path', { d: d }, svg);
        if (r.hatched) {
          var pid = 'mb' + (++uid) + '-hatch';
          var pat = s('pattern', { id: pid, patternUnits: 'userSpaceOnUse', width: 5, height: 5, patternTransform: 'rotate(45)' }, defs);
          var ln = s('line', { x1: 0, y1: 0, x2: 0, y2: 5 }, pat);
          ln.style.stroke = r.color;
          ln.style.strokeWidth = '2.2';
          bar.setAttribute('fill', 'url(#' + pid + ')');
          bar.style.stroke = r.color;
          bar.style.strokeWidth = '1.2px';
        } else {
          bar.style.fill = r.color;
        }
        var val = s('text', { x: xe + 7, y: cy + 4, 'class': 'mb-value' + (r.main ? ' is-main' : '') }, svg);
        val.textContent = mt.format(v);
      });
      s('line', { 'class': 'baseline', x1: x0 + 0.5, x2: x0 + 0.5, y1: top, y2: Hh - bottom }, svg);
      svg.setAttribute('aria-label', mt.title + ', ' + o.windowLabel + ': ' + rows.map(function (r) {
        return r.label + ' ' + mt.format(r.values[mt.key]);
      }).join(', ') + '.');
      void pi;
    });
  };

  /* ======================================================================
     RiskReturn: four strategies, annualized volatility vs CAGR
     ====================================================================== */
  function RiskReturn(host, opts) {
    this.host = host;
    this.opts = opts;
    clear(host);
    this.svg = s('svg', { role: 'img' }, host);
    this.tip = h('div', 'tooltip', host);
    this.tip.setAttribute('aria-hidden', 'true');
    var self = this;
    document.addEventListener('pointerdown', function (ev) {
      if (!host.contains(ev.target)) self.hide();
    });
    if (window.ResizeObserver) {
      var lastW = 0;
      new ResizeObserver(function () {
        var w = Math.floor(host.clientWidth);
        if (w === lastW) return;
        lastW = w;
        requestAnimationFrame(function () { self.render(); });
      }).observe(host);
    }
    this.render();
  }
  RiskReturn.prototype.setPoints = function (points) { this.opts.points = points; this.render(); };
  RiskReturn.prototype.hide = function () { this.tip.classList.remove('is-visible'); };
  RiskReturn.prototype.render = function () {
    var self = this;
    var o = this.opts;
    var W = Math.max(240, Math.floor(this.host.clientWidth));
    var Hh = Math.round(Math.min(360, Math.max(250, W * 0.68)));
    var m = { top: 16, right: 16, bottom: 44, left: 46 };
    var svg = this.svg;
    clear(svg);
    svg.setAttribute('width', W);
    svg.setAttribute('height', Hh);
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + Hh);
    this.host.style.height = Hh + 'px';
    var pts = o.points;
    svg.setAttribute('aria-label', 'Annualized volatility against CAGR: ' + pts.map(function (p) {
      return p.label + ', volatility ' + fmtPct(p.vol) + ', CAGR ' + fmtPct(p.cagr);
    }).join('; ') + '.');
    var xmax = 0.2, ymax = 0.2;
    pts.forEach(function (p) { xmax = Math.max(xmax, p.vol * 1.12); ymax = Math.max(ymax, p.cagr * 1.12); });
    var sx = function (v) { return m.left + v / xmax * (W - m.left - m.right); };
    var sy = function (v) { return Hh - m.bottom - v / ymax * (Hh - m.top - m.bottom); };
    var grid = s('g', { 'class': 'grid' }, svg);
    var axis = s('g', { 'class': 'axis' }, svg);
    niceTicks(0, xmax, W < 420 ? 3 : 4).forEach(function (t) {
      var xx = Math.round(sx(t)) + 0.5;
      s('line', { x1: xx, x2: xx, y1: m.top, y2: Hh - m.bottom }, grid);
      s('text', { x: xx, y: Hh - m.bottom + 18, 'text-anchor': 'middle' }, axis).textContent = fmtPct(t, 0);
    });
    niceTicks(0, ymax, 4).forEach(function (t) {
      var yy = Math.round(sy(t)) + 0.5;
      s('line', { x1: m.left, x2: W - m.right, y1: yy, y2: yy }, grid);
      s('text', { x: m.left - 8, y: yy + 4, 'text-anchor': 'end' }, axis).textContent = fmtPct(t, 0);
    });
    s('line', { 'class': 'baseline', x1: m.left, x2: W - m.right, y1: Hh - m.bottom + 0.5, y2: Hh - m.bottom + 0.5 }, axis);
    s('text', { x: W - m.right, y: Hh - 6, 'text-anchor': 'end' }, axis).textContent = 'Annualized volatility';
    s('text', { 'class': 'panel-title', x: m.left + 8, y: m.top + 12 }, axis).textContent = 'CAGR';

    var layer = s('g', null, svg);
    pts.forEach(function (p) {
      var cx = sx(p.vol), cy = sy(p.cagr);
      var g = s('g', { tabindex: '0', role: 'img', 'aria-label': p.label + ': CAGR ' + fmtPct(p.cagr) + ', volatility ' + fmtPct(p.vol) + ', Sharpe ' + fmtFixed(p.sharpe, 2) + ', maximum drawdown ' + fmtPct(p.mdd) }, layer);
      g.style.cursor = 'default';
      g.style.outline = 'none';
      var hit = s('circle', { cx: cx, cy: cy, r: 14, fill: 'transparent' }, g);
      var dot = s('circle', { cx: cx, cy: cy, r: 6 }, g);
      dot.style.fill = p.color;
      dot.style.stroke = 'var(--bg)';
      dot.style.strokeWidth = '2px';
      var lx = cx + (p.dx || 10), ly = cy + (p.dy || 4);
      var t = s('text', { x: lx, y: ly, 'text-anchor': p.anchor || 'start' }, g);
      t.style.fill = 'var(--ink-2)';
      t.style.fontSize = '12.5px';
      t.textContent = p.short || p.label;
      var show = function () {
        clear(self.tip);
        tipDate(self.tip, p.label);
        tipRow(self.tip, 'line', p.color, 'CAGR', fmtPct(p.cagr), p.dashed);
        tipRow(self.tip, 'line', p.color, 'Volatility', fmtPct(p.vol), p.dashed);
        tipRow(self.tip, 'line', p.color, 'Sharpe ratio', fmtFixed(p.sharpe, 2), p.dashed);
        tipRow(self.tip, 'line', p.color, 'Max drawdown', fmtPct(p.mdd), p.dashed);
        self.tip.classList.add('is-visible');
        placeTooltip(self.host, self.tip, cx, cy, m.left, W - m.right);
        dot.setAttribute('r', 7.5);
      };
      var hide = function () { self.tip.classList.remove('is-visible'); dot.setAttribute('r', 6); };
      g.addEventListener('pointerenter', show);
      g.addEventListener('pointerdown', show);
      g.addEventListener('pointerleave', function (ev) { if (ev.pointerType !== 'touch') hide(); });
      g.addEventListener('focus', function () { show(); dot.style.stroke = 'var(--ink)'; });
      g.addEventListener('blur', function () { hide(); dot.style.stroke = 'var(--bg)'; });
      void hit;
    });
  };

  /* ======================================================================
     RefitTimeline: the walk-forward schedule, one refit at a time
     ====================================================================== */
  function RefitTimeline(host, opts) {
    this.host = host;
    this.opts = opts;
    this.k = opts.initial || 1;
    this.id = 'rt' + (++uid);
    clear(host);
    this.svg = s('svg', { 'aria-hidden': 'true', focusable: 'false' }, host);
    var self = this;
    host.addEventListener('click', function (ev) {
      var r = host.getBoundingClientRect();
      var x = ev.clientX - r.left;
      var y = ev.clientY - r.top;
      if (y < self.tickTop - 10) return;
      var best = 0, bd = Infinity;
      self.refitX.forEach(function (xx, i) { var d = Math.abs(xx - x); if (d < bd) { bd = d; best = i; } });
      if (bd < 14 && opts.onPick) opts.onPick(best + 1);
    });
    if (window.ResizeObserver) {
      var lastW = 0;
      new ResizeObserver(function () {
        var w = Math.floor(host.clientWidth);
        if (w === lastW) return;
        lastW = w;
        requestAnimationFrame(function () { self.render(); });
      }).observe(host);
    }
    this.render();
  }
  RefitTimeline.prototype.select = function (k) { this.k = k; this.render(); };
  RefitTimeline.prototype.render = function () {
    var o = this.opts;
    var W = Math.max(260, Math.floor(this.host.clientWidth));
    var narrow = W < 560;
    var m = { top: 8, right: 12, bottom: 30, left: 12 };
    var rowModel = 72, gap = 34, rowTicks = 30, rowLabel = 78;
    var Hh = m.top + rowModel + gap + rowTicks + gap + rowLabel + m.bottom;
    var svg = this.svg;
    clear(svg);
    svg.setAttribute('width', W);
    svg.setAttribute('height', Hh);
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + Hh);
    this.host.style.height = Hh + 'px';
    var defs = s('defs', null, svg);
    var hatch = hatchPattern(defs, this.id + '-hatch');

    var xs = o.x;
    var n = xs.length;
    var t0 = xs[0], t1 = xs[n - 1];
    var plotW = W - m.left - m.right;
    var sx = function (t) { return m.left + (t - t0) / (t1 - t0) * plotW; };
    var dayEnd = function (i) { return i + 1 < n ? sx(xs[i + 1]) : sx(xs[n - 1]) + (sx(xs[n - 1]) - sx(xs[n - 2])); };
    var refits = o.refits;
    var k = this.k;
    var ref = refits[k - 1];
    var r = ref.day_index;
    var end = Math.min(r + o.refitEvery, n) - 1;
    var axisLayer = s('g', { 'class': 'axis' }, svg);
    var grid = s('g', { 'class': 'grid' }, svg);

    // Row 1: training window and decoded window of the selected model
    var y1 = m.top + 22;
    var barH = 26;
    s('text', { 'class': 'panel-title', x: m.left, y: m.top + 10 }, axisLayer).textContent = 'Model ' + k + ' of ' + refits.length;
    var train = s('rect', { x: sx(xs[0]), y: y1, width: Math.max(1, dayEnd(r - 1) - sx(xs[0])), height: barH, rx: 3 }, svg);
    train.style.fill = 'rgba(193, 200, 208, 0.16)';
    train.style.stroke = 'var(--ink-3)';
    train.style.strokeWidth = '1px';
    var warm = s('rect', { x: sx(xs[0]), y: y1 + barH + 4, width: dayEnd(o.warmup - 1) - sx(xs[0]), height: 6 }, svg);
    warm.setAttribute('fill', hatch);
    var dec = s('rect', { x: sx(xs[r]), y: y1, width: Math.max(2, dayEnd(end) - sx(xs[r])), height: barH, rx: 2 }, svg);
    dec.style.fill = 'var(--calm)';
    var future = s('rect', { x: dayEnd(end), y: y1, width: Math.max(0, sx(xs[n - 1]) - dayEnd(end) + 1), height: barH, rx: 3, fill: 'none' }, svg);
    future.style.stroke = 'var(--rule)';
    future.style.strokeDasharray = '3 3';
    var trainLabel = s('text', { x: sx(xs[0]) + 10, y: y1 + 17 }, axisLayer);
    trainLabel.style.fill = 'var(--ink)';
    trainLabel.textContent = narrow ? fmtInt(r) + ' days' : 'Training: ' + fmtInt(r) + ' days';
    var wl = s('text', { x: sx(xs[0]), y: y1 + barH + 22 }, axisLayer);
    wl.textContent = narrow ? 'Warm-up' : 'Warm-up, 756 days';
    var decX = dayEnd(end);
    var decLabel = s('text', { x: decX + 8, y: y1 + 17 }, axisLayer);
    decLabel.style.fill = 'var(--ink-2)';
    decLabel.textContent = narrow ? 'decoded' : 'decoded day by day';
    if (decX + 8 + (narrow ? 52 : 120) > W - m.right) {
      decLabel.setAttribute('x', sx(xs[r]) - 8);
      decLabel.setAttribute('text-anchor', 'end');
    }

    // Row 2: refit ticks
    var y2 = m.top + rowModel + gap;
    this.tickTop = y2;
    s('text', { 'class': 'panel-title', x: m.left, y: y2 + 2 }, axisLayer).textContent = narrow ? 'Refits' : 'Refit dates (every 21 trading days)';
    var self = this;
    this.refitX = [];
    refits.forEach(function (rf, i) {
      var xx = Math.round(sx(xs[rf.day_index])) + 0.5;
      self.refitX.push(xx);
      var sel = i === k - 1;
      var ln = s('line', { x1: xx, x2: xx, y1: y2 + (sel ? 6 : 12), y2: y2 + rowTicks }, svg);
      ln.style.stroke = sel ? 'var(--ink)' : 'var(--ink-3)';
      ln.style.strokeWidth = sel ? '2px' : '1px';
      ln.style.strokeOpacity = sel ? '1' : '0.7';
    });

    // Row 3: raw label of the calm state at each refit (step line)
    var y3 = m.top + rowModel + gap + rowTicks + gap;
    s('text', { 'class': 'panel-title', x: m.left, y: y3 + 2 }, axisLayer).textContent = narrow ? 'Raw calm label' : 'Raw label of the calm state at each refit';
    var lvl = function (v) { return y3 + 24 + (v === 1 ? 0 : 36); };
    var firstX = this.refitX[0];
    [0, 1].forEach(function (v) {
      var yy = Math.round(lvl(v)) + 0.5;
      s('line', { x1: firstX, x2: W - m.right, y1: yy, y2: yy }, grid);
      var lab = s('text', { x: firstX - 8, y: yy + 4, 'text-anchor': 'end' }, axisLayer);
      lab.textContent = String(v);
    });
    var d = '';
    refits.forEach(function (rf, i) {
      var xa = self.refitX[i];
      var xb = i + 1 < refits.length ? self.refitX[i + 1] : sx(xs[n - 1]);
      var yy = lvl(rf.raw_calm_label);
      d += (i === 0 ? 'M' : 'L') + xa + ',' + yy + 'L' + xb + ',' + yy;
    });
    var step = s('path', { d: d, fill: 'none' }, svg);
    step.style.stroke = 'var(--ink-2)';
    step.style.strokeWidth = '1.5px';
    refits.forEach(function (rf, i) {
      var sel = i === k - 1;
      var c = s('circle', { cx: self.refitX[i], cy: lvl(rf.raw_calm_label), r: sel ? 5.5 : 2.6 }, svg);
      c.style.fill = sel ? 'var(--ink)' : 'var(--ink-2)';
      c.style.stroke = 'var(--bg)';
      c.style.strokeWidth = sel ? '2px' : '1px';
    });

    // x axis
    var axisY = Hh - m.bottom;
    s('line', { 'class': 'baseline', x1: m.left, x2: W - m.right, y1: axisY + 0.5, y2: axisY + 0.5 }, axisLayer);
    yearTicks(t0, t1, plotW).forEach(function (t) {
      var xt = Math.round(sx(t)) + 0.5;
      s('line', { 'class': 'baseline', x1: xt, x2: xt, y1: axisY, y2: axisY + 5 }, axisLayer);
      s('text', { x: xt, y: axisY + 20, 'text-anchor': 'middle' }, axisLayer).textContent = new Date(t).getUTCFullYear();
    });
    // selected refit guide line
    var gx = this.refitX[k - 1];
    var guide = s('line', { x1: gx, x2: gx, y1: y1 - 4, y2: axisY }, svg);
    guide.style.stroke = 'var(--ink-3)';
    guide.style.strokeWidth = '1px';
    guide.style.strokeOpacity = '0.5';
  };

  window.HMMCharts = {
    RegimeTimeline: RegimeTimeline,
    GaussianStates: GaussianStates,
    MetricBars: MetricBars,
    RiskReturn: RiskReturn,
    RefitTimeline: RefitTimeline,
    parseDate: parseDate,
    fmtDate: fmtDate,
    fmtPct: fmtPct,
    fmtFixed: fmtFixed,
    fmtInt: fmtInt,
    tipDate: tipDate,
    tipRow: tipRow,
    h: h,
    clear: clear
  };
})();
