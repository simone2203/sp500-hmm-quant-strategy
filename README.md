# Market Regime Detection Using Hidden Markov Models (HMM) on SPY

### Interactive Project Website

Explore the project through an interactive research presentation featuring market regime visualizations, walk-forward backtesting, strategy comparisons, and key findings.

**[Explore the Interactive Website](https://simone2203.github.io/sp500-hmm-quant-strategy/)**

### Project Overview

This project aims to identify different market regimes in the U.S. equity market using a **Hidden Markov Model (HMM)**, based on historical data from SPY, an exchange-traded fund (ETF) that tracks the S&P 500 Index.

The underlying idea is that financial markets alternate between periods characterized by different levels of volatility and returns. An HMM is employed to identify these regimes and investigate whether the resulting information can be used to develop a quantitative trading strategy focused on risk management.

The project evaluates the proposed strategy against a Buy & Hold benchmark through a walk-forward backtesting framework designed to mitigate look-ahead bias and assess historical performance under more realistic information constraints.

To reproduce the analysis, run the notebook cells sequentially, ensuring that the required Python libraries are installed and an active internet connection is available to download historical market data.

## Project Structure

The notebook is organized into five sections, covering data preparation, Hidden Markov Models, trading strategy development, and walk-forward backtesting. All five sections are now available.

Saved outputs containing daily market data have been removed. Run the notebook to regenerate the complete analysis.

### Notebook Sections

**1. Data Collection and Exploratory Analysis**

- Download of historical daily SPY prices from Yahoo Finance using yfinance.
- Use of adjusted closing prices to account for dividends and stock splits.
- Assessment of missing values and historical data continuity.
- Visualization and preliminary analysis of price movements.

**2. Feature Engineering**

- Computation of daily logarithmic returns.
- Estimation of historical rolling volatility using a 20-trading-day window.
- Handling of missing values introduced during feature construction.
- Descriptive analysis and visualization of the variables used as inputs to the HMM.

**3. Hidden Markov Model (HMM)**

- Preparation and standardization of the input features used by the model.
- Implementation of a Gaussian Hidden Markov Model with 2 hidden states.
- Model training and convergence assessment of the Expectation-Maximization (EM) algorithm.
- Analysis of the transition probability matrix and state persistence probabilities.
- Identification and visualization of market regimes using the Viterbi algorithm.
- Statistical analysis of the identified market regimes, with particular emphasis on returns and volatility.

**Methodological Note:** This initial implementation represents a retrospective (*in-sample*) analysis based on the entire historical dataset. Consequently, the identified market regimes cannot be directly interpreted as real-time trading signals. The walk-forward implementation presented in Section 5 addresses the look-ahead bias associated with training the model on the entire historical dataset.

**4. Trading Strategy and Preliminary Backtesting**

- Identification of the "calm" market regime by selecting the hidden state with the highest average return.
- Assessment of the economic consistency of the classification by verifying that the selected state also exhibits lower average volatility.
- Development of a long/cash trading strategy: fully invested in SPY during the calm regime and entirely in cash during the alternative regime.
- Calculation of strategy returns by applying a one-day lag to the trading position (`shift(1)`).
- Construction and comparison of the equity curves of the strategy and the Buy & Hold benchmark.
- Performance evaluation using CAGR, Sharpe ratio, and Maximum Drawdown.

**Methodological Note:** This backtest is intended solely as a preliminary analysis. The HMM is trained on the entire historical dataset, introducing look-ahead bias. Applying `shift(1)` prevents the same day's signal from being used to calculate that day's return, but does not eliminate the look-ahead bias arising from in-sample model training.

Furthermore, transaction costs and realistic order execution assumptions are not incorporated. The Sharpe ratio is calculated using logarithmic returns, assuming a zero risk-free rate.

**The results are purely illustrative and should not be interpreted as reliable estimates of the performance of a realistically implementable trading strategy.**

**5. Walk-Forward Backtesting**

- Implementation of a walk-forward backtesting framework to evaluate the trading strategy while mitigating look-ahead bias.
- Initial training period of 756 trading days (approximately three years), followed by periodic HMM retraining every 21 trading days.
- Use of an expanding training window, ensuring that model estimation and market regime identification rely exclusively on historically available observations.
- Dynamic identification and relabeling of hidden states after each model retraining, accounting for potential label switching.
- Implementation of a long/cash trading strategy based on the market regimes identified by the walk-forward HMM.
- Evaluation of two execution assumptions:
  - **Shift(1):** an optimistic execution assumption, retained as a sensitivity analysis.
  - **Shift(2):** a more conservative assumption, with trades executed at the following trading session's close.
- Inclusion of transaction costs of 0.10% per executed buy or sell.
- Comparison with the preliminary in-sample strategy and a Buy & Hold benchmark over the same evaluation period.
- Performance assessment using CAGR, Sharpe ratio, and Maximum Drawdown.

**Methodological Note:** Unlike the preliminary in-sample backtest, the walk-forward approach progressively retrains the HMM using only historical information available at each evaluation step. This reduces look-ahead bias associated with full-sample model estimation, although it does not eliminate all potential sources of statistical bias or overfitting.

The `shift(2)` implementation represents the primary backtesting scenario, while `shift(1)` is retained to assess the sensitivity of the results to execution timing. Both scenarios incorporate transaction costs, although the execution model remains simplified.

**Key Findings:** Over the common evaluation period, the main walk-forward strategy (`shift(2)`) achieved a CAGR of 8.49%, compared with 16.24% for Buy & Hold. However, its Maximum Drawdown was lower (−14.70% versus −24.50%).

These results highlight a trade-off between return and risk: the proposed strategy reduced the maximum historical drawdown but did not outperform Buy & Hold in terms of annualized return.

**The results remain historical simulations and should not be interpreted as evidence of future profitability or as a fully validated trading system.**

## Data and Technologies

**Financial instrument:** SPY — SPDR S&P 500 ETF Trust

**Data frequency:** Daily

**Historical period:** September 2017 – September 2026

**Data source:** Yahoo Finance, accessed through the `yfinance` Python library.

**Programming language:** Python

**Libraries used:** NumPy, pandas, Matplotlib, yfinance, and hmmlearn.

The analysis is implemented in Jupyter notebooks, which can also be executed using Google Colab.

## Language and Use of Artificial Intelligence

The notebook is written in **Italian**, while this README is provided in English to make the project more accessible to an international audience.

Artificial intelligence tools have been consulted to assist with clarifications, presentation improvements, and final checks.

## Project Limitations

The analysis focuses on a single financial instrument, SPY, over a specific historical period.

Market regime identification depends on the selected features, model assumptions, and methodological choices.

The underlying data are obtained from an external provider and may be subject to corrections, revisions, or updates.

Historical results do not guarantee that the strategy will achieve similar performance under future market conditions.

## Disclaimer

### Educational and Research Purposes Only

This repository contains an independent, experimental personal project developed exclusively for **educational, research, and technical portfolio purposes**, with a focus on statistical modeling, machine learning, and quantitative finance.

All materials provided, including source code, analyses, charts, statistical models, trading strategies, and numerical results, are intended solely for informational and educational use.

**Nothing in this repository constitutes financial or investment advice, personalized investment recommendations, an offer to buy or sell financial instruments, or a solicitation to engage in investment activities.**

The author does not act through this repository as a licensed financial advisor, authorized financial intermediary, or professional asset manager.

### Financial Risks and Backtesting Limitations

All investment and trading strategies involve risk, including the potential loss of a substantial portion or the entirety of invested capital.

Any performance figures presented in this repository are derived from historical simulations and do not represent actual realized investment returns or reliable forecasts of future performance.

Backtesting results may be highly sensitive to the selected historical period, prevailing market conditions, data characteristics, modeling assumptions, and parameter choices.

Even when walk-forward methodologies and precautions against look-ahead bias are employed, **implementation errors, overfitting, statistical biases, data-related issues, and other methodological limitations cannot be entirely ruled out**.

Actual trading conditions may differ significantly from simulated results due to transaction costs, bid-ask spreads, slippage, market liquidity, execution timing, taxes, and other practical constraints.

**Past performance, whether simulated or actual, is not indicative of future results.**

### Data Accuracy and Code Reliability

The financial data used in this project are obtained from Yahoo Finance through the `yfinance` library and may contain inaccuracies, omissions, retrospective adjustments, or service interruptions.

The author makes no representations or warranties regarding the accuracy, completeness, continued availability, or timeliness of information obtained from third-party sources.

All code, analyses, and related materials are provided **"AS IS"**, without warranties of any kind, express or implied, including but not limited to warranties of accuracy, reliability, fitness for a particular purpose, or freedom from errors.

This project has not been developed or independently validated as a production-ready trading system intended for deployment with real capital.

### User Responsibility and Limitation of Liability

Anyone who accesses, downloads, modifies, or uses the materials is responsible for independently verifying their accuracy, suitability, and compliance with applicable laws and regulations before any potential use.

Any financial or investment decisions made on the basis of information contained in this repository are undertaken solely at the user's own discretion and risk.

**To the fullest extent permitted by applicable law, the author disclaims liability for financial losses, direct or indirect damages, or other consequences arising from the use, interpretation of, or reliance upon the code, analyses, models, strategies, or information provided in this repository.**

### Project Independence and Non-Affiliation

This project is independent and is not affiliated with, sponsored by, endorsed by, or independently verified by Yahoo Finance, State Street Global Advisors (associated with the SPY ETF), or any other companies or organizations referenced herein.

Any references to financial instruments, trademarks, companies, or data providers are included solely for identification, description, and analytical purposes.
