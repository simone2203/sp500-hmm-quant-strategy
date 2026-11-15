/* ==========================================================================
   main.js — page behaviour and chart set-up
   ========================================================================== */
(function () {
  'use strict';

  /* ---------- Navigation ---------- */
  var nav = document.querySelector('.site-nav');
  var toggle = document.querySelector('.nav-toggle');
  var links = document.getElementById('nav-links');

  function closeMenu() {
    if (!links) return;
    links.classList.remove('is-open');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  }
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    links.addEventListener('click', function (ev) {
      if (ev.target.closest('a')) closeMenu();
    });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && links.classList.contains('is-open')) {
        closeMenu();
        toggle.focus();
      }
    });
  }
  function onScroll() {
    if (nav) nav.classList.toggle('is-scrolled', window.scrollY > 8);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if (links && 'IntersectionObserver' in window) {
    var sectionLinks = Array.prototype.slice.call(links.querySelectorAll('a[href^="#"]'));
    var byId = {};
    sectionLinks.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        sectionLinks.forEach(function (a) { a.removeAttribute('aria-current'); });
        var a = byId[entry.target.id];
        if (a) a.setAttribute('aria-current', 'location');
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    Object.keys(byId).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) observer.observe(el);
    });
  }

  /* ---------- Data ---------- */
  var D = window.SITE_DATA;
  var C = window.HMMCharts;
  var chartIds = ['chart-hero', 'chart-states', 'chart-refits', 'chart-metrics', 'chart-riskreturn'];

  if (!D || !C) {
    chartIds.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      while (el.firstChild) el.removeChild(el.firstChild);
      var p = document.createElement('p');
      p.className = 'chart-empty';
      p.textContent = 'The data for this figure (data/site-data.js) could not be loaded. The same results are in the notebook.';
      el.appendChild(p);
      el.removeAttribute('tabindex');
    });
    return;
  }

  var x = D.dates.map(C.parseDate);
  var n = x.length;
  var WARMUP = D.meta.warmup_period;

  function regimeName(v) { return v === 1 ? 'Calm' : v === 0 ? 'Volatile' : 'Warm-up'; }
  function regimeColor(v) { return v === 1 ? 'var(--calm)' : v === 0 ? 'var(--volatile)' : 'hatch'; }
  var REGIME_COLORS = { 1: 'var(--calm)', 0: 'var(--volatile)' };

  /* ---------- Figure 1: regimes decoded by the in-sample and walk-forward models ---------- */
  new C.RegimeTimeline(document.getElementById('chart-hero'), {
    x: x,
    rows: [
      { values: D.regime_insample, colors: REGIME_COLORS,
        label: function (w) { return w < 640 ? 'In-sample model, with hindsight' : 'In-sample model, fitted once on the full history (hindsight)'; } },
      { values: D.regime_wf, colors: REGIME_COLORS,
        label: function (w) { return w < 640 ? 'Walk-forward models, past data only' : 'Walk-forward models, refitted on past data only (real time)'; } }
    ],
    labelH: 26,
    barH: function (w) { return w < 560 ? 34 : w < 900 ? 44 : 56; },
    rowGap: function (w) { return w < 560 ? 18 : 26; },
    reveal: true,
    revealDuration: 2400,
    tooltip: function (i, tip) {
      C.tipDate(tip, C.fmtDate(x[i]));
      C.tipRow(tip, 'swatch', regimeColor(D.regime_insample[i]), 'In-sample', regimeName(D.regime_insample[i]));
      C.tipRow(tip, 'swatch', regimeColor(D.regime_wf[i]), 'Walk-forward', regimeName(D.regime_wf[i]));
    },
    describe: function (i) {
      return C.fmtDate(x[i]) + '. In-sample regime: ' + regimeName(D.regime_insample[i]) +
        '. Walk-forward regime: ' + regimeName(D.regime_wf[i]) + '.';
    }
  });

  /* ---------- Figure 4: the fitted Gaussian of each state ---------- */
  (function () {
    var hm = D.hmm_insample;
    var mu = hm.feature_mean;
    var sd = hm.feature_std;
    var calm = hm.calm_state_raw;
    var order = [1 - calm, calm];   // volatile underneath, calm on top
    var ellipses = order.map(function (state) {
      var mz = hm.means_z[state];
      var cz = hm.covars_z[state];
      return {
        mean: [mu[0] + sd[0] * mz[0], mu[1] + sd[1] * mz[1]],
        cov: [[cz[0][0] * sd[0] * sd[0], cz[0][1] * sd[0] * sd[1]],
              [cz[1][0] * sd[1] * sd[0], cz[1][1] * sd[1] * sd[1]]],
        color: state === calm ? 'var(--calm)' : 'var(--volatile)',
        label: state === calm ? 'Calm' : 'Volatile',
        labelAt: state === calm ? 'right' : 'top'
      };
    });
    new C.GaussianStates(document.getElementById('chart-states'), {
      ellipses: ellipses,
      xDomain: [-0.045, 0.045],
      yDomain: [-0.0015, 0.036],
      xStep: 0.01,
      yStep: 0.005
    });
  })();

  /* ---------- Figure 5: walk-forward schedule ---------- */
  (function () {
    var refits = D.refits;
    var slider = document.getElementById('refit-slider');
    var prev = document.getElementById('refit-prev');
    var next = document.getElementById('refit-next');
    var host = document.getElementById('chart-refits');
    if (!slider || !host) return;
    var firstSwitch = 1;
    for (var j = 1; j < refits.length; j++) {
      if (refits[j].raw_calm_label !== refits[j - 1].raw_calm_label) { firstSwitch = j + 1; break; }
    }
    slider.max = String(refits.length);
    slider.value = String(firstSwitch);
    var every = D.meta.refit_frequency_days;
    var timeline = new C.RefitTimeline(host, {
      x: x, refits: refits, warmup: WARMUP, refitEvery: every, initial: firstSwitch,
      onPick: function (k) { setRefit(k); }
    });
    function setText(id, text) { var el = document.getElementById(id); if (el) el.textContent = text; }
    function setRefit(k) {
      k = Math.max(1, Math.min(refits.length, k));
      slider.value = String(k);
      slider.setAttribute('aria-valuetext', 'Refit ' + k + ' of ' + refits.length + ', ' + C.fmtDate(x[refits[k - 1].day_index]));
      timeline.select(k);
      var rf = refits[k - 1];
      var r = rf.day_index;
      var end = Math.min(r + every, n) - 1;
      setText('ro-refit', k + ' of ' + refits.length + ', on ' + C.fmtDate(x[r]));
      setText('ro-train', C.fmtInt(r) + ' days, ' + C.fmtDate(x[0]) + ' to ' + C.fmtDate(x[r - 1]));
      setText('ro-decode', (end - r + 1) + ' days, ' + C.fmtDate(x[r]) + ' to ' + C.fmtDate(x[end]));
      var note = '';
      if (k > 1) note = refits[k - 2].raw_calm_label !== rf.raw_calm_label ? ', switched since the previous refit' : ', same as the previous refit';
      setText('ro-label', rf.raw_calm_label + note);
      setText('ro-em', rf.em_iterations + ' (limit ' + D.meta.n_iter_wf + ')');
      prev.disabled = k === 1;
      next.disabled = k === refits.length;
    }
    slider.addEventListener('input', function () { setRefit(+slider.value); });
    prev.addEventListener('click', function () { setRefit(+slider.value - 1); });
    next.addEventListener('click', function () { setRefit(+slider.value + 1); });
    setRefit(firstSwitch);
  })();

  /* ---------- Figure 7, Table 3, Figure 8: results ---------- */
  (function () {
    var KEYS = ['bh', 'naive', 'wf1', 'wf2'];
    var NAMES = { bh: 'Buy & Hold', naive: 'In-sample', wf1: 'WF shift(1)', wf2: 'WF shift(2)' };
    var LONG = { bh: 'Buy & Hold', naive: 'In-sample (look-ahead)', wf1: 'Walk-forward shift(1)', wf2: 'Walk-forward shift(2)' };
    var COLORS = { bh: 'var(--market)', naive: 'var(--naive)', wf1: 'var(--wf1)', wf2: 'var(--calm)' };
    var WINDOW_LABEL = { rebased: 'common window', full: 'full sample' };

    function pct1(v) { return C.fmtPct(v, 1); }
    function maxAbs(field) {
      var out = 0;
      ['rebased', 'full'].forEach(function (w) {
        KEYS.forEach(function (k) { out = Math.max(out, Math.abs(D.metrics[w][k][field])); });
      });
      return out;
    }
    var METRICS = [
      { key: 'cagr', title: 'CAGR', max: maxAbs('cagr'), format: pct1 },
      { key: 'ann_vol', title: 'Annualized volatility', max: maxAbs('ann_vol'), format: pct1 },
      { key: 'sharpe', title: 'Sharpe ratio (rf = 0)', max: maxAbs('sharpe'), format: function (v) { return C.fmtFixed(v, 2); } },
      { key: 'max_drawdown', title: 'Maximum drawdown', max: maxAbs('max_drawdown'), format: pct1 }
    ];
    function barRows(w) {
      var m = D.metrics[w];
      return KEYS.map(function (k) {
        return {
          key: k, short: NAMES[k], label: LONG[k], color: COLORS[k], hatched: k === 'naive', main: k === 'wf2',
          values: { cagr: m[k].cagr, ann_vol: m[k].ann_vol, sharpe: m[k].sharpe, max_drawdown: m[k].max_drawdown }
        };
      });
    }
    var bars = new C.MetricBars(document.getElementById('chart-metrics'), {
      metrics: METRICS, rows: barRows('rebased'), windowLabel: WINDOW_LABEL.rebased
    });

    function points(w) {
      var m = D.metrics[w];
      var place = {
        bh: { dx: -11, dy: -10, anchor: 'end' },
        naive: { dx: 11, dy: 4, anchor: 'start' },
        wf1: { dx: -11, dy: -4, anchor: 'end' },
        wf2: { dx: 11, dy: 13, anchor: 'start' }
      };
      return KEYS.map(function (k) {
        return {
          key: k, label: LONG[k], short: NAMES[k], color: COLORS[k], dashed: k === 'naive',
          vol: m[k].ann_vol, cagr: m[k].cagr, sharpe: m[k].sharpe, mdd: m[k].max_drawdown,
          dx: place[k].dx, dy: place[k].dy, anchor: place[k].anchor
        };
      });
    }
    var rr = new C.RiskReturn(document.getElementById('chart-riskreturn'), { points: points('rebased') });

    function setWindow(w) {
      Array.prototype.forEach.call(document.querySelectorAll('[data-window]'), function (b) {
        b.setAttribute('aria-pressed', b.getAttribute('data-window') === w ? 'true' : 'false');
      });
      Array.prototype.forEach.call(document.querySelectorAll('[data-window-body]'), function (tb) {
        tb.hidden = tb.getAttribute('data-window-body') !== w;
      });
      Array.prototype.forEach.call(document.querySelectorAll('[data-window-text]'), function (sp) {
        sp.hidden = sp.getAttribute('data-window-text') !== w;
      });
      bars.setRows(barRows(w), WINDOW_LABEL[w]);
      rr.setPoints(points(w));
    }
    Array.prototype.forEach.call(document.querySelectorAll('[data-window]'), function (b) {
      b.addEventListener('click', function () { setWindow(b.getAttribute('data-window')); });
    });

    /* Consistency check: the figures printed in the page must match the data file. */
    var EXPECTED = {
      rebased: { bh: [1.42502, 0.16245, 0.16639, 0.90466, -0.24496], naive: [0.97795, 0.12288, 0.10462, 1.10777, -0.10437],
                 wf1: [0.66646, 0.09066, 0.09721, 0.89273, -0.12145], wf2: [0.61563, 0.08493, 0.09847, 0.82781, -0.14704] },
      full: { bh: [2.45238, 0.14958, 0.18878, 0.73839, -0.33717], naive: [1.64087, 0.11544, 0.09836, 1.11067, -0.10437],
              wf1: [0.66646, 0.05914, 0.07913, 0.72608, -0.12145], wf2: [0.61563, 0.05545, 0.08015, 0.67333, -0.14704] }
    };
    var FIELDS = ['total_return', 'cagr', 'ann_vol', 'sharpe', 'max_drawdown'];
    var mismatches = [];
    Object.keys(EXPECTED).forEach(function (w) {
      KEYS.forEach(function (k) {
        FIELDS.forEach(function (f, j) {
          if (Math.abs(D.metrics[w][k][f] - EXPECTED[w][k][j]) > 6e-6) mismatches.push(w + '.' + k + '.' + f);
        });
      });
    });
    if (mismatches.length && window.console) {
      console.warn('site-data.js does not match the figures printed on the page:', mismatches.join(', '));
    }
  })();
})();
