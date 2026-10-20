# Market Regime Detection Using Hidden Markov Models (HMM) on SPY

### Project Overview

This project aims to identify different market regimes in the U.S. equity market using a **Hidden Markov Model (HMM)**, based on historical data from SPY, an exchange-traded fund (ETF) that tracks the S&P 500 Index.

The underlying idea is that financial markets alternate between periods characterized by different levels of volatility and returns. An HMM is employed to identify these regimes and investigate whether the resulting information can be used to develop a quantitative trading strategy focused on risk management.

The ultimate objective is to compare the proposed strategy against a Buy & Hold benchmark through a walk-forward backtesting framework designed to mitigate look-ahead bias and assess historical performance under more realistic information constraints.

## Project Structure

The notebook is organized into five sections, which are being progressively published following a review of the code and methodology.

### Currently Available Sections

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

### Sections Under Review and Pending Publication

**3. Hidden Markov Model**

Implementation of an HMM to identify market regimes and analyze their statistical characteristics.

**4. Trading Strategy**

Development of a quantitative long/cash trading strategy based on the market regimes identified by the model.

**5. Walk-Forward Backtesting**

Evaluation of the trading strategy through periodic HMM retraining and comparison with a Buy & Hold benchmark, using performance and risk metrics such as CAGR, Sharpe ratio, and Maximum Drawdown.

## Data and Technologies

**Financial instrument:** SPY — SPDR S&P 500 ETF Trust

**Data frequency:** Daily

**Historical period:** September 2017 – September 2026

**Data source:** Yahoo Finance, accessed through the `yfinance` Python library.

**Programming language:** Python

**Libraries used in the currently published sections:** NumPy, pandas, Matplotlib, and yfinance.

The analysis is implemented in Jupyter notebooks, which can also be executed using Google Colab.

## Language and Use of Artificial Intelligence

The notebook is written in **Italian**, while this README is provided in English to make the project more accessible to an international audience.

The project is undergoing a personal review and verification process. Artificial intelligence tools have been consulted to assist with clarifications, presentation improvements, and final checks.

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
