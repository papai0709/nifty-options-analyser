# ⚡ Nifty Options Analyser

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Market](https://img.shields.io/badge/Market-NSE%20%7C%20BSE%20India-orange.svg)](#)
[![Data Feed](https://img.shields.io/badge/Live%20Feed-Zerodha%20Kite%20Connect-red.svg)](#)
[![Python](https://img.shields.io/badge/Backend-Python%203-yellow.svg)](#)
[![UI](https://img.shields.io/badge/Frontend-Vanilla%20JS%20%7C%20CSS3-green.svg)](#)

> **High-performance real-time Indian stock market options terminal for NIFTY 50, BSE SENSEX, and BANK NIFTY.**
> Provides live index feeds, Black-Scholes Greeks ($\Delta$, $\Gamma$, $\Theta$, $\nu$, $\rho$), dynamic Risk-Reward Target/SL matrix, an intelligent **Optimal Pullback Entry Advisor**, and seamless **Zerodha Kite Connect** integration.

---

## 🌟 Key Features

### 1. 🎯 Optimal Pullback Entry Advisor
- **Trade Patience Assistant**: Prevents chasing green candles at market highs. Automatically calculates an optimal pullback limit entry sweet-spot.
- **Dynamic Status Alerts**:
  - `⏳ WAIT FOR PULLBACK`: Alerts the trader when current market LTP is above the optimal entry and shows required dip points.
  - `🟢 READY FOR ENTRY`: Triggers when market retraces to your limit price sweet-spot.
  - `⚠️ BELOW ENTRY`: Flags if price slips under limit level, advising SL caution.
- **Quick Entry Presets**:
  - `Auto Pullback` (Greeks & volatility weighted limit order)
  - `-5% Dip` (Conservative retracement)
  - `-8% Dip` (Deep pullback entry)
  - `At CMP` (Aggressive breakout entry at current market price)

---

### 2. 📊 Black-Scholes Greeks Engine
- **Delta ($\Delta$)**: Position sensitivity per 1 point underlying move, including INR P&L impact per lot.
- **Theta ($\Theta$)**: 1-day calendar decay, hourly decay, and daily INR time-decay erosion.
- **Gamma ($\Gamma$)**: Delta acceleration per 100 points underlying index movement.
- **Vega ($\nu$)**: P&L sensitivity to a 1% change in Implied Volatility (IV crush/expansion).
- **Rho ($\rho$)**: Sensitivity to RBI benchmark interest rate changes.
- **Intrinsic vs Extrinsic Decomposition**: Visual bar breakdown of real intrinsic value vs extrinsic time premium.

---

### 3. ⚖️ Risk Management & Dynamic RR Target Matrix
- **3 Flexible Stop-Loss Modes**:
  1. **Spot Points**: SL based on underlying index move (e.g., -30 pts on Nifty).
  2. **Premium %**: SL as percentage of entry premium (e.g., -20% or -30%).
  3. **Fixed Capital ₹ Risk**: Hard monetary risk budget (e.g., max ₹1,500 loss).
- **5-Column Target Matrix**:
  - **Stop-Loss**: Cut-loss price, points risk, max ₹ risk, capital drawdown %, and spot level trigger.
  - **Target 1 (1 : 1.5 RR)**: Scalp / initial partial profit booking.
  - **Target 2 (1 : 2.0 RR)**: Primary swing target.
  - **Target 3 (1 : 3.0 RR)**: Extended momentum runner.
  - **Break-Even Spot**: Exact underlying index price required to cover trade costs.

---

### 4. 🪁 Zerodha Kite Connect Live Integration
- **Zero-Friction Authentication**:
  - Supports **Direct Access Token** entry for quick daily trading sessions.
  - Supports **1-Click Kite Login**: Automatically exchanges `request_token` using your `api_key` and `api_secret` via SHA-256 checksum generation.
- **Real-Time Live Feed**:
  - Direct tick-by-tick streaming for `NSE:NIFTY 50`, `BSE:SENSEX`, `NSE:NIFTY BANK`, and `NSE:INDIA VIX`.
  - Built-in live exchange feed fallback for uninterrupted index tracking.
- **Privacy & Security**: Credentials and tokens are stored locally on your machine in `kite_config.json` and never transmitted to external third-party servers.

---

### 5. ⚡ Interactive Option Chain & Simulator
- **Live Option Chain**: Real-time 13+ strike matrix around ATM with Call & Put LTP, Delta, Gamma, Theta, and Open Interest (OI).
- **1-Click Strike Loading**: Click any strike in the chain to immediately load it into the Greeks & RR calculator.
- **What-If Scenario Simulator**: Test underlying moves (-300 to +300 pts) and holding periods (Intraday to 5 days) with HTML5 Canvas payoff visualization.

---

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Any modern web browser (Chrome, Edge, Safari, Firefox)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/<your-username>/nifty-options-analyser.git
   cd nifty-options-analyser
   ```

2. **Run the local terminal**:
   ```bash
   chmod +x run.sh
   ./run.sh
   ```
   *The launcher will automatically find an open port (default: 8085) and open your browser.*

3. *(Optional)* **Run from anywhere on your Mac/Linux system**:
   ```bash
   mkdir -p ~/.local/bin
   ln -sf "$(pwd)/run.sh" ~/.local/bin/options-analyser
   ```
   Now you can launch the app from any directory simply by typing:
   ```bash
   options-analyser
   ```

---

## 🔑 Zerodha Kite Connect Configuration

1. Log in to [Zerodha Developer Console](https://developers.kite.trade) and create an app.
2. In the terminal, click the **Connect Zerodha** button in the top navigation bar.
3. Choose either:
   - **Direct Token**: Paste your daily Kite `api_key` and `access_token`.
   - **Login Flow**: Enter `api_key` + `api_secret`, click **🔗 Open Zerodha Login**, authorize, and paste the redirected `request_token`.
4. Your account will display `🟢 Kite: <Your Name>` and stream live real-time index prices.

---

## 📁 Repository Structure

```
nifty-options-analyser/
├── index.html         # High-density financial terminal layout & modal components
├── style.css          # Glassmorphism dark UI theme, animations, and typography
├── greeks.js          # Black-Scholes pricing model, Greeks, and RR math
├── marketData.js      # Index configurations, option chain generator, and feed sync
├── app.js             # Event handling, state management, and advisor engine
├── server.py          # Python backend proxy for Kite Connect & live feed bridge
├── run.sh             # Universal one-click startup and port allocation script
└── README.md          # Project documentation
```

---

## 🛡️ Risk Disclaimer

*Options trading in derivative segments involves substantial risk of loss and is not suitable for every investor. The calculations, Greeks, and Risk-Reward projections provided by this tool are for educational, analytical, and informational purposes only and do not constitute financial advice. Always execute proper risk management before taking real-market positions.*

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
# nifty-options-analyser
