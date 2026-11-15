# Data for the website

`site-data.js` holds the data behind the interactive figures of `docs/index.html`:
the trading dates, the regime decoded for each day (in-sample and walk-forward),
the in-sample HMM parameters, the walk-forward refit log and the aggregate
performance metrics. It is generated from the notebook and must not be edited by hand.

It contains no prices, returns, volatility or equity curves. The market data come
from Yahoo Finance through yfinance and are not redistributed here: running the
notebook downloads them and reproduces every chart.

## How to regenerate it

1. Open `sp500_hmm_quant_strategy.ipynb` in Google Colab and run all cells.
2. Add a code cell at the end, paste the content of `export_site_data.py` and run it.
   The script only reads the notebook's variables; it does not change the analysis.
3. A file called `site-data.js` is downloaded. Replace `docs/data/site-data.js` with it.

Before writing the file, the script checks that the metrics tables match the
notebook's equity curves, which it reads but does not export, and it stops if a
daily numeric series would end up in the file. The page also compares the metrics
with the figures printed in its text and logs a warning in the browser console if
they differ: if the notebook is re-run with a different data window, the numbers in
`index.html` must be updated too.
