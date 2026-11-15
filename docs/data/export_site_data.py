# =============================================================================
# export_site_data.py
#
# Exports the data used by the project website (docs/index.html) into a single
# file, docs/data/site-data.js: trading dates, the regime decoded for each day
# (in-sample and walk-forward), the in-sample HMM parameters, the walk-forward
# refit log and the aggregate performance metrics.
#
# By design it does NOT export prices, returns, volatility or equity curves:
# the market data come from Yahoo Finance and are not redistributed. Section 5
# stops the script if a daily numeric series ends up in the file by mistake.
#
# HOW TO USE (Google Colab):
#   1. Open sp500_hmm_quant_strategy.ipynb and run ALL cells (Runtime > Run all).
#   2. Add a new code cell at the very end of the notebook.
#   3. Paste the whole content of this file into that cell and run it.
#   4. The file "site-data.js" is downloaded automatically: put it in docs/data/.
#
# The script only READS variables already created by the notebook: it does not
# change any of them and does not recompute the model. Every number it writes
# comes from the notebook's own objects (features, features_wf, model,
# refit_log_df, summary tables).
# =============================================================================

import json
import math
import datetime as _dt

import numpy as _np
import pandas as _pd

_REQUIRED = [
    "TICKER", "features", "features_wf", "model", "X_raw", "state_stats",
    "calm_state", "refit_log_df", "summary_df_full", "summary_df_rebased",
    "equity_bh_rebased", "equity_naive_rebased", "equity_wf_rebased",
    "equity_wf_lag1_rebased", "WARMUP_PERIOD", "REFIT_FREQUENCY_DAYS",
    "N_ITER_WF", "COST_PER_TRADE", "START_REBASED", "ROLLING_WINDOW",
    "N_STATES", "compute_metrics",
]
_missing = [name for name in _REQUIRED if name not in globals()]
if _missing:
    raise RuntimeError(
        "Missing notebook variables: " + ", ".join(_missing)
        + ". Run all the cells of the notebook first, then run this cell."
    )


def _dates(index):
    return [d.strftime("%Y-%m-%d") for d in _pd.DatetimeIndex(index)]


_METRIC_KEYS = ["total_return", "cagr", "ann_vol", "sharpe", "max_drawdown"]
_STRATEGY_KEYS = ["bh", "naive", "wf2", "wf1"]   # same column order as the notebook tables


def _metrics_table(df):
    if df.shape != (5, 4):
        raise RuntimeError(f"Unexpected metrics table shape {df.shape}, expected (5, 4).")
    table = {}
    for j, key in enumerate(_STRATEGY_KEYS):
        col = df.iloc[:, j]
        table[key] = {m: float(col.iloc[i]) for i, m in enumerate(_METRIC_KEYS)}
        table[key]["notebook_label"] = str(df.columns[j])
    return table


# ---------------------------------------------------------------------------
# 1. Daily regimes (features index: 2017-10-23 -> 2026-09-22 in the notebook run)
# ---------------------------------------------------------------------------
_idx = features.index
if not _idx.equals(features_wf.index):
    raise RuntimeError("features and features_wf do not share the same index.")

_regime_is = (features["hmm_state"].values == calm_state).astype(int)

_wf_state = features_wf["hmm_state_wf"].values
_wf_calm = features_wf["calm_state_wf"].values
_regime_wf = []
for s, c in zip(_wf_state, _wf_calm):
    if not (math.isfinite(s) and math.isfinite(c)):
        _regime_wf.append(None)          # warm-up: no model available yet
    else:
        _regime_wf.append(1 if s == c else 0)

# ---------------------------------------------------------------------------
# 2. In-sample HMM (fitted once on the whole series)
# ---------------------------------------------------------------------------
_mu = X_raw.mean(axis=0)
_sigma = X_raw.std(axis=0)
_states_order = [int(calm_state)] + [s for s in range(N_STATES) if s != int(calm_state)]

_hmm = {
    "calm_state_raw": int(calm_state),
    "transmat": [[float(v) for v in row] for row in model.transmat_],
    "startprob": [float(v) for v in model.startprob_],
    # emission parameters in the standardized (z-score) feature space used for the fit
    "means_z": [[float(v) for v in row] for row in model.means_],
    "covars_z": [[[float(v) for v in r] for r in m] for m in model.covars_],
    "feature_mean": [float(v) for v in _mu],
    "feature_std": [float(v) for v in _sigma],
    "em_iterations": int(model.monitor_.iter),
    "log_likelihood": float(model.score((X_raw - _mu) / _sigma)),
    "state_stats": [
        {
            "state_raw": int(s),
            "n_days": int(state_stats.loc[s, "n_giorni"]),
            "mean_log_return": float(state_stats.loc[s, "return_medio"]),
            "std_log_return": float(state_stats.loc[s, "return_std"]),
            "mean_vol20": float(state_stats.loc[s, "volatilita_media"]),
        }
        for s in state_stats.index
    ],
}

# ---------------------------------------------------------------------------
# 3. Walk-forward refit log
# ---------------------------------------------------------------------------
_refits = [
    {
        "date": _pd.Timestamp(row["data_refit"]).strftime("%Y-%m-%d"),
        "day_index": int(row["giorno_refit"]),
        "raw_calm_label": int(row["stato_calmo_grezzo"]),
        "consistent": bool(row["consistente"]),
        "em_iterations": int(row["iterazioni_em"]),
        "stop_max_iter": bool(row["stop_max_iter"]),
        "stop_ll_decrease": bool(row["stop_ll_in_calo"]),
    }
    for _, row in refit_log_df.iterrows()
]

# ---------------------------------------------------------------------------
# 4. Assemble
# ---------------------------------------------------------------------------
_rebased_index = equity_bh_rebased.index
for _s in (equity_naive_rebased, equity_wf_rebased, equity_wf_lag1_rebased):
    if not _s.index.equals(_rebased_index):
        raise RuntimeError("Rebased equity curves do not share the same index.")

SITE_DATA = {
    "meta": {
        "generated_at": _dt.datetime.now(_dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source": "sp500_hmm_quant_strategy.ipynb",
        "ticker": str(TICKER),
        "n_days": int(len(_idx)),
        "first_date": _idx[0].strftime("%Y-%m-%d"),
        "last_date": _idx[-1].strftime("%Y-%m-%d"),
        "rolling_window": int(ROLLING_WINDOW),
        "n_states": int(N_STATES),
        "warmup_period": int(WARMUP_PERIOD),
        "warmup_end_date": _idx[int(WARMUP_PERIOD)].strftime("%Y-%m-%d"),
        "refit_frequency_days": int(REFIT_FREQUENCY_DAYS),
        "n_iter_wf": int(N_ITER_WF),
        "cost_per_trade": float(COST_PER_TRADE),
        "rebased_first_date": _rebased_index[0].strftime("%Y-%m-%d"),
        "n_rebased_days": int(len(_rebased_index)),
    },
    "dates": _dates(_idx),
    "regime_insample": [int(v) for v in _regime_is],      # 1 = calm, 0 = volatile
    "regime_wf": _regime_wf,                               # 1 = calm, 0 = volatile, null = warm-up
    "metrics": {
        "full": _metrics_table(summary_df_full),
        "rebased": _metrics_table(summary_df_rebased),
    },
    "hmm_insample": _hmm,
    "refits": _refits,
    "trades": {
        "wf2": int(features_wf["trades_wf"].sum()),
        "wf1": int(features_wf["trades_wf_lag1"].sum()),
    },
}

# ---------------------------------------------------------------------------
# 5. Checks before writing
# ---------------------------------------------------------------------------
_problems = []

# 5a. The metrics tables must match the notebook's own equity curves. The curves
#     are only read here; they are not written to the file.
for _key, _series in (("bh", equity_bh_rebased), ("naive", equity_naive_rebased),
                      ("wf2", equity_wf_rebased), ("wf1", equity_wf_lag1_rebased)):
    _expected_final = 1.0 + SITE_DATA["metrics"]["rebased"][_key]["total_return"]
    if abs(float(_series.iloc[-1]) - _expected_final) > 5e-6:
        _problems.append(f"rebased {_key}: final equity {float(_series.iloc[-1])} vs {_expected_final}")
for _key, _col in (("bh", features["equity_buy_hold"]), ("naive", features["equity_strategy"]),
                   ("wf2", features_wf["equity_wf"]), ("wf1", features_wf["equity_wf_lag1"])):
    _expected_final = 1.0 + SITE_DATA["metrics"]["full"][_key]["total_return"]
    if abs(float(_col.iloc[-1]) - _expected_final) > 5e-6:
        _problems.append(f"full {_key}: final equity {float(_col.iloc[-1])} vs {_expected_final}")


# 5b. No daily numeric series: every long list must hold only dates or regime codes.
def _check_no_series(obj, path):
    if isinstance(obj, dict):
        for _k, _v in obj.items():
            _check_no_series(_v, f"{path}.{_k}")
    elif isinstance(obj, list):
        if len(obj) > 100:
            _ok = all(v is None or v in (0, 1) and not isinstance(v, float) for v in obj) \
                or all(isinstance(v, str) for v in obj)
            if not _ok:
                _problems.append(f"{path}: a list of {len(obj)} values that are not dates or regime codes")
        else:
            for _j, _v in enumerate(obj):
                _check_no_series(_v, f"{path}[{_j}]")


_check_no_series(SITE_DATA, "SITE_DATA")
for _name in ("adj_close", "log_return", "vol20", "equity_full", "equity_rebased"):
    if _name in SITE_DATA:
        _problems.append(f"{_name} must not be exported")

if _problems:
    raise RuntimeError("Check failed, site-data.js not written:\n" + "\n".join(_problems))

# ---------------------------------------------------------------------------
# 6. Write docs/data/site-data.js
# ---------------------------------------------------------------------------
_payload = json.dumps(SITE_DATA, separators=(",", ":"), allow_nan=False)
_header = (
    "/* Generated by export_site_data.py from sp500_hmm_quant_strategy.ipynb on "
    + SITE_DATA["meta"]["generated_at"]
    + ". Do not edit by hand: re-run the script instead. */\n"
)
with open("site-data.js", "w", encoding="utf-8") as _f:
    _f.write(_header + "window.SITE_DATA = " + _payload + ";\n")

print("site-data.js written")
print(f"  days: {SITE_DATA['meta']['n_days']}  ({SITE_DATA['meta']['first_date']} -> {SITE_DATA['meta']['last_date']})")
print(f"  rebased window: {SITE_DATA['meta']['n_rebased_days']} days from {SITE_DATA['meta']['rebased_first_date']}")
print(f"  refits: {len(_refits)}  |  size: {len(_payload) / 1024:.0f} KB")
for _key in _STRATEGY_KEYS:
    _m = SITE_DATA["metrics"]["rebased"][_key]
    print(f"  {_key:>5}: CAGR {_m['cagr']:.4f}  Sharpe {_m['sharpe']:.4f}  MaxDD {_m['max_drawdown']:.4f}")

try:
    from google.colab import files as _colab_files
    _colab_files.download("site-data.js")
    print("Download started: move site-data.js into the docs/data/ folder of the repository.")
except ImportError:
    print("Not running in Colab: the file is in the current working directory.")
