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

### 1. 🎯 Dual-Mode Optimal Entry Advisor (Breakout & Pullback)
- **Trade Execution Assistant**: Prevents both premature entries during consolidations and FOMO chasing at candle peaks. Automatically supports two distinct execution philosophies:
  - **🚀 Breakout / Momentum Setup (Entry Trigger ABOVE CMP)**:
    - `⏳ WAIT FOR BREAKOUT`: Displays when target entry is set above current market price (e.g. buying after a resistance cross). Alerts the trader to wait for price to rally +₹X (+Y%) to confirm momentum before entering.
    - `🚀 BREAKOUT TRIGGERED`: Fires when live LTP crosses above your trigger price. Flashes neon-green with live execution instructions and sounds an audio chime (`🔔`).
  - **🎯 Pullback / Support Setup (Entry Limit BELOW CMP)**:
    - `⏳ WAIT FOR PULLBACK`: Displays when target entry is set below CMP. Shows required dip points into support to maximize Risk-to-Reward ratio.
    - `🎯 PULLBACK ENTRY REACHED`: Fires when price retraces down into your limit order sweet-spot.
- **⚡ Quick Entry Preset Chips**:
  - `Auto Pullback` (Greeks, Delta, and volatility-weighted limit order)
  - `-5% Dip` (Moderate pullback retracement limit order)
  - `-8% Dip` (Deep support pullback limit order)
  - `At CMP` (Instant market execution at prevailing price)
  - `+5% Breakout` (Momentum entry trigger 5% above CMP)
  - `+10% Breakout` (Major resistance cross trigger 10% above CMP)
  - `Custom Numeric Entry`: Type any price higher or lower than CMP — the system automatically identifies Breakout vs Pullback mode.
- **🔔 Audio Alerts**: Built-in Web Audio API chime plays in real-time when any entry level is triggered so you never miss an execution.

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

### 5. 📊 Open Interest (OI) & PCR Sentiment Engine
- **Live Put-Call Ratio (PCR)**: Computes index-wide Put-Call Ratio with real-time sentiment classifications:
  - `PCR > 1.30`: Extremely Bullish / Overbought warning
  - `PCR 1.05 - 1.30`: Bullish (Put Writers in control, Buy-on-Dip bias)
  - `PCR 0.85 - 1.05`: Balanced Consolidation zone
  - `PCR 0.65 - 0.85`: Bearish (Call Writers dominant)
  - `PCR < 0.65`: Extremely Bearish / Oversold reversal watch
- **Key Support Floor (Max Put OI)**: Automatically detects and highlights the strike with maximum Put open interest and contract volume.
- **Key Resistance Wall (Max Call OI)**: Identifies the major overhead supply wall where institutional Call writing is concentrated.
- **Expiry Max Pain Pin Strike**: Calculates theoretical options seller minimum-loss pin level.
- **Strike OI Confirmation in Entry Advisor**: Real-time evaluation of whether your selected strike is backed by Put writing support or encountering major Call resistance.

---

### 6. 🎯 Multi-Factor Signal Precision & Confluence Engine (0 - 100)
- **Composite Confluence Gauge**: Filters out low-probability false breakouts by scoring setup quality across 5 pillars:
  1. **Spot vs Intraday VWAP (25 pts)**: Verifies that CE buyers trade above VWAP and PE buyers trade below VWAP.
  2. **Derivatives OI & PCR Momentum (25 pts)**: Evaluates strike protection against institutional walls and rolling $\Delta\text{PCR}$ trends.
  3. **Greeks Quality & Moneyness (20 pts)**: Rewards the optimal ATM/Near-ITM Delta ($0.42 - 0.65$) sweet-spot while penalizing high Theta decay drag.
  4. **India VIX Volatility Regime (15 pts)**: Identifies IV expansion opportunities and warns option buyers against IV crush.
  5. **Entry Precision & Anti-Fakeout (15 pts)**: Validates level crossing with buffer protection.
- **Conviction Tiers**:
  - `🟢 HIGH CONVICTION (≥80)`: Prime institutional confluence setup.
  - `🟡 MODERATE / SCALP (60 - 79)`: Tradeable scalp with disciplined trailing stop.
  - `🔴 LOW CONVICTION (<60)`: Chop or low follow-through warning.

---

### 7. 🌊 Strike-Level Institutional Buildup Classification ($\Delta\text{OI}$)
- **4-Quadrant Derivatives Flow Detection**:
  - `[LB] Long Buildup` (Price $\uparrow$ + OI $\uparrow$): Institutional accumulation (Strong Bullish).
  - `[SB] Short Buildup` (Price $\downarrow$ + OI $\uparrow$): Institutional call/put writing overhead (Strong Bearish).
  - `[SC] Short Covering` (Price $\uparrow$ + OI $\downarrow$): Trapped sellers scrambling to exit (Short Squeeze).
  - `[LU] Long Unwinding` (Price $\downarrow$ + OI $\downarrow$): Profit-taking / buyer liquidation.
- **Direct Option Chain Badges**: Every strike row in the Option Chain displays live `[LB]`, `[SB]`, `[SC]`, or `[LU]` badges alongside contract OI numbers.

---

### 8. 🛡️ Dynamic Trade Management & Trailing Stop-Loss Schedule
- **Milestone 1 (Target 1 Reached - 1:1.5 RR)**: Auto-guidance to **Trail Stop-Loss to Breakeven (Cost-to-Cost)** for a risk-free position.
- **Milestone 2 (Target 2 Reached - 1:2.0 RR)**: Auto-guidance to **Book 50–70% Quantity and Trail SL to Target 1**, locking profits while allowing runners to seek Target 3.
- **Theta Time-Stop Bleed Warning**: Calculates maximum safe holding time (in minutes) before time decay eats $>25\%$ of stop-loss capital.
- **Indian Market Session Timing Window**: Live IST status tracker highlighting Opening Auction ($09:15-09:45$), Morning Momentum ($09:45-11:30$), Midday Chop ($11:30-13:30$), Afternoon Expansion ($13:30-14:30$), and Power Hour / 0DTE Gamma Scalp ($14:30-15:30$).

---

### 9. ⚡ Interactive Option Chain & Simulator
- **Visual S&R Badges**: Option chain directly flags strikes with `[RES WALL]`, `[SUP FLOOR]`, and `[MAX PAIN]`.
- **1-Click Strike Loading**: Click any strike in the chain to immediately load it into the Greeks, RR, and OI calculator.
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
# nifty-options-analyser
