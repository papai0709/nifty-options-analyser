/**
 * Black-Scholes Option Pricing and Greeks Engine
 * Specifically designed for Indian Stock Market Index Options (European style - NIFTY & SENSEX)
 */

// Standard Normal Cumulative Distribution Function approximation (Abramowitz and Stegun 7.1.26)
function normalCDF(x) {
    if (isNaN(x)) return 0;
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;

    const sign = x < 0 ? -1 : 1;
    const absX = Math.abs(x) / Math.sqrt(2.0);

    const t = 1.0 / (1.0 + p * absX);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);

    return 0.5 * (1.0 + sign * y);
}

// Standard Normal Probability Density Function
function normalPDF(x) {
    if (isNaN(x)) return 0;
    return (1.0 / Math.sqrt(2.0 * Math.PI)) * Math.exp(-0.5 * x * x);
}

/**
 * Calculate Black-Scholes European Option Price & All Greeks
 * @param {string} type - 'CE' or 'PE'
 * @param {number} S - Current Spot Price
 * @param {number} K - Strike Price
 * @param {number} T - Time to Expiry in Years (e.g., DTE / 365)
 * @param {number} r - Risk-free interest rate (e.g. 0.0675 for 6.75%)
 * @param {number} v - Implied Volatility (e.g. 0.14 for 14%)
 */
function calculateBlackScholesGreeks(type, S, K, T, r, v) {
    // Edge case protections
    S = Math.max(0.001, parseFloat(S) || 0);
    K = Math.max(0.001, parseFloat(K) || 0);
    r = parseFloat(r) || 0.0675;
    v = Math.max(0.001, parseFloat(v) || 0.15); // min 0.1% IV
    T = Math.max(0.0001, parseFloat(T) || 0.0001); // min a few minutes to expiry

    const sqrtT = Math.sqrt(T);
    const d1 = (Math.log(S / K) + (r + (v * v) / 2.0) * T) / (v * sqrtT);
    const d2 = d1 - v * sqrtT;

    const nd1 = normalCDF(d1);
    const nd2 = normalCDF(d2);
    const n_d1 = normalCDF(-d1);
    const n_d2 = normalCDF(-d2);
    const npdf_d1 = normalPDF(d1);

    const discountFactor = Math.exp(-r * T);

    let theoreticalPrice = 0;
    let delta = 0;
    let thetaAnnual = 0;
    let rho = 0;

    const isCall = type.toUpperCase() === 'CE';

    if (isCall) {
        theoreticalPrice = S * nd1 - K * discountFactor * nd2;
        delta = nd1;
        thetaAnnual = -(S * npdf_d1 * v) / (2.0 * sqrtT) - r * K * discountFactor * nd2;
        rho = (K * T * discountFactor * nd2) / 100.0; // Sensitivity to 1% rate change
    } else {
        theoreticalPrice = K * discountFactor * n_d2 - S * n_d1;
        delta = nd1 - 1.0; // Negative delta for Put
        thetaAnnual = -(S * npdf_d1 * v) / (2.0 * sqrtT) + r * K * discountFactor * n_d2;
        rho = (-K * T * discountFactor * n_d2) / 100.0;
    }

    // Gamma is identical for CE and PE
    const gamma = npdf_d1 / (S * v * sqrtT);

    // Vega is identical for CE and PE (expressed per 1% change in IV)
    const vega = (S * sqrtT * npdf_d1) / 100.0;

    // Daily Theta (divided by 365 calendar days)
    const thetaDaily = thetaAnnual / 365.0;

    // Hourly Theta (assuming approx 6.25 trading hours per market day)
    const thetaHourly = thetaDaily / 6.25;

    // Intrinsic & Extrinsic values
    let intrinsicValue = 0;
    if (isCall) {
        intrinsicValue = Math.max(0, S - K);
    } else {
        intrinsicValue = Math.max(0, K - S);
    }
    const extrinsicValue = Math.max(0, theoreticalPrice - intrinsicValue);

    // Moneyness determination
    const distancePercent = ((K - S) / S) * 100.0;
    let moneyness = 'ATM';
    if (isCall) {
        if (distancePercent < -1.5) moneyness = 'Deep ITM';
        else if (distancePercent < -0.3) moneyness = 'ITM';
        else if (distancePercent <= 0.3) moneyness = 'ATM';
        else if (distancePercent <= 1.5) moneyness = 'OTM';
        else moneyness = 'Deep OTM';
    } else {
        if (distancePercent > 1.5) moneyness = 'Deep ITM';
        else if (distancePercent > 0.3) moneyness = 'ITM';
        else if (distancePercent >= -0.3) moneyness = 'ATM';
        else if (distancePercent >= -1.5) moneyness = 'OTM';
        else moneyness = 'Deep OTM';
    }

    return {
        price: Math.max(0.05, theoreticalPrice),
        delta: delta,
        gamma: gamma,
        thetaDaily: thetaDaily,
        thetaHourly: thetaHourly,
        vega: vega,
        rho: rho,
        intrinsicValue: intrinsicValue,
        extrinsicValue: extrinsicValue,
        moneyness: moneyness,
        distancePercent: distancePercent,
        d1: d1,
        d2: d2
    };
}

/**
 * Predict option premium for a future underlying price movement and holding period
 * Using 2nd-order Taylor expansion (Delta + Gamma + Theta)
 * @param {object} greeks - output from calculateBlackScholesGreeks
 * @param {number} entryPremium - premium paid/received
 * @param {number} deltaSpot - change in underlying index points (e.g. +50 or -30)
 * @param {number} daysHeld - number of days holding the position (e.g. 0.25 days for intraday or 1 day)
 * @param {number} ivChange - change in IV in % points (e.g. +1.5% or -1.0%)
 */
function projectOptionPrice(greeks, entryPremium, deltaSpot, daysHeld = 0, ivChange = 0) {
    const deltaImpact = greeks.delta * deltaSpot;
    const gammaImpact = 0.5 * greeks.gamma * (deltaSpot * deltaSpot);
    const thetaImpact = greeks.thetaDaily * daysHeld;
    const vegaImpact = greeks.vega * ivChange;

    const netChange = deltaImpact + gammaImpact + thetaImpact + vegaImpact;
    const projectedPrice = Math.max(0.05, entryPremium + netChange);

    return {
        projectedPrice: projectedPrice,
        netChange: netChange,
        deltaImpact: deltaImpact,
        gammaImpact: gammaImpact,
        thetaImpact: thetaImpact,
        vegaImpact: vegaImpact
    };
}

/**
 * Calculate Target and Stop Loss with Risk-to-Reward (RR) considerations
 * Handles both Option Buyers and Option Sellers
 */
function calculateTargetAndSL({
    optionType,      // 'CE' or 'PE'
    tradeAction,     // 'BUY' or 'SELL'
    entryPremium,    // Option Price
    spotPrice,       // Spot Index Price
    strikePrice,     // Strike Price
    lotSize,         // e.g. 25 for Nifty, 10 for Sensex
    lotsCount,       // Number of lots
    greeks,          // Calculated greeks
    riskRewardRatio, // e.g. 2.0 for 1:2
    riskMode,        // 'spot_pts', 'premium_pct', 'capital_amt'
    slSpotPts,       // SL in underlying points (if riskMode == 'spot_pts')
    slPremiumPct,    // SL in premium % (if riskMode == 'premium_pct')
    maxCapitalRisk   // Max Loss in INR (if riskMode == 'capital_amt')
}) {
    const totalQty = lotSize * lotsCount;
    const isBuyer = tradeAction.toUpperCase() === 'BUY';
    const isCall = optionType.toUpperCase() === 'CE';

    let slPoints = 0;
    let slUnderlyingPoints = 0;

    // Determine Option Premium Stop Loss Points
    if (riskMode === 'spot_pts') {
        slUnderlyingPoints = Math.abs(parseFloat(slSpotPts) || 30);
        // Under adverse move of slUnderlyingPoints, how much does the option drop/rise?
        // For a CE Buyer: adverse move is Spot FALLING by slUnderlyingPoints (-slUnderlyingPoints)
        // deltaSpot adverse:
        const adverseDeltaSpot = isCall ? -slUnderlyingPoints : slUnderlyingPoints;
        const adverseProj = projectOptionPrice(greeks, entryPremium, adverseDeltaSpot, 0, 0);
        slPoints = Math.max(1, entryPremium - adverseProj.projectedPrice);
    } else if (riskMode === 'premium_pct') {
        const pct = Math.min(95, Math.max(3, parseFloat(slPremiumPct) || 20)) / 100.0;
        slPoints = entryPremium * pct;
        slUnderlyingPoints = Math.abs(slPoints / (greeks.delta || 0.5));
    } else if (riskMode === 'capital_amt') {
        const maxRisk = Math.max(100, parseFloat(maxCapitalRisk) || 2000);
        slPoints = maxRisk / totalQty;
        slUnderlyingPoints = Math.abs(slPoints / (greeks.delta || 0.5));
    }

    // Ensure realistic bounds
    if (isBuyer) {
        slPoints = Math.min(slPoints, entryPremium * 0.95); // Can't lose more than 95% of premium
    }
    slPoints = Math.max(1.0, Math.round(slPoints * 100) / 100);

    const slPrice = isBuyer ? Math.max(0.05, entryPremium - slPoints) : entryPremium + slPoints;
    const maxRiskINR = slPoints * totalQty;

    // Target calculation based on Risk-to-Reward Ratio
    const rr = Math.max(0.5, parseFloat(riskRewardRatio) || 2.0);
    const targetPoints = slPoints * rr;

    const t1Points = targetPoints * 0.75; // Target 1 (Partial exit)
    const t2Points = targetPoints;        // Main Target (1:RR)
    const t3Points = targetPoints * 1.5;  // Runner Target (Extended)

    const t1Price = isBuyer ? entryPremium + t1Points : Math.max(0.05, entryPremium - t1Points);
    const t2Price = isBuyer ? entryPremium + t2Points : Math.max(0.05, entryPremium - t2Points);
    const t3Price = isBuyer ? entryPremium + t3Points : Math.max(0.05, entryPremium - t3Points);

    const t1ProfitINR = t1Points * totalQty;
    const t2ProfitINR = t2Points * totalQty;
    const t3ProfitINR = t3Points * totalQty;

    // Spot Price at Target & SL
    const spotDirectionFactor = (isBuyer && isCall) || (!isBuyer && !isCall) ? 1 : -1;
    const targetUnderlyingPts = (targetPoints / Math.abs(greeks.delta || 0.5));
    const targetSpotPrice = spotPrice + spotDirectionFactor * targetUnderlyingPts;
    const slSpotPrice = spotPrice - spotDirectionFactor * slUnderlyingPoints;

    // Break-even
    let breakEvenSpot = 0;
    if (isBuyer) {
        breakEvenSpot = isCall ? strikePrice + entryPremium : strikePrice - entryPremium;
    } else {
        breakEvenSpot = isCall ? strikePrice + entryPremium : strikePrice - entryPremium;
    }

    const capitalRequired = isBuyer ? entryPremium * totalQty : (spotPrice * 0.12 * totalQty); // approx margin for selling

    return {
        entryPremium: entryPremium,
        totalQty: totalQty,
        capitalRequired: capitalRequired,
        slPoints: slPoints,
        slPrice: Math.round(slPrice * 100) / 100,
        slSpotPrice: Math.round(slSpotPrice * 100) / 100,
        slUnderlyingPoints: Math.round(slUnderlyingPoints * 100) / 100,
        maxRiskINR: Math.round(maxRiskINR),

        targetPoints: Math.round(targetPoints * 100) / 100,
        targetSpotPrice: Math.round(targetSpotPrice * 100) / 100,
        targetUnderlyingPts: Math.round(targetUnderlyingPts * 100) / 100,

        t1: {
            price: Math.round(t1Price * 100) / 100,
            points: Math.round(t1Points * 100) / 100,
            profitINR: Math.round(t1ProfitINR),
            rr: Math.round((t1Points / slPoints) * 10) / 10
        },
        t2: {
            price: Math.round(t2Price * 100) / 100,
            points: Math.round(t2Points * 100) / 100,
            profitINR: Math.round(t2ProfitINR),
            rr: rr
        },
        t3: {
            price: Math.round(t3Price * 100) / 100,
            points: Math.round(t3Points * 100) / 100,
            profitINR: Math.round(t3ProfitINR),
            rr: Math.round((t3Points / slPoints) * 10) / 10
        },
        breakEvenSpot: Math.round(breakEvenSpot * 100) / 100,
        effectiveRR: `1 : ${rr.toFixed(1)}`
    };
}

/**
 * Calculate Optimal Entry Price and evaluate current market entry condition
 */
function calculateOptimalEntryAndStatus({
    currentLTP,
    customTargetEntry = null,
    slPrice = null,
    greeks,
    strikeStep = 50,
    tradeAction = 'BUY'
}) {
    currentLTP = Math.max(0.05, parseFloat(currentLTP) || 100);
    const isBuyer = tradeAction.toUpperCase() === 'BUY';

    let targetEntry = customTargetEntry;
    if (targetEntry === null || targetEntry === undefined || isNaN(targetEntry) || targetEntry <= 0) {
        // Automatic pullback discount calculation:
        // Scaled by Delta and underlying support buffer (~15 index pts)
        const deltaMag = Math.abs(greeks.delta) || 0.5;
        const indexRetraceBuffer = (strikeStep || 50) * 0.25;
        const premiumDip = Math.max(currentLTP * 0.055, deltaMag * indexRetraceBuffer);
        targetEntry = isBuyer 
            ? Math.max(0.25, currentLTP - premiumDip)
            : currentLTP + premiumDip;
        targetEntry = Math.round(targetEntry * 100) / 100;
    }

    const diff = currentLTP - targetEntry;
    const diffPct = (diff / targetEntry) * 100;

    const isAboveCMP = targetEntry > currentLTP * 1.002;
    const isBelowCMP = targetEntry < currentLTP * 0.998;

    let mode = 'AT_CMP'; // 'BREAKOUT', 'PULLBACK', 'AT_CMP'
    if (isAboveCMP) mode = isBuyer ? 'BREAKOUT' : 'PREMIUM_SPIKE';
    else if (isBelowCMP) mode = isBuyer ? 'PULLBACK' : 'PREMIUM_DIP';

    let status = 'WAIT'; // 'WAIT', 'TRIGGERED', 'INVALIDATED'
    let statusClass = 'status-wait';
    let message = '';
    let modeLabel = 'Optimal Entry';

    if (isBuyer) {
        if (slPrice !== null && currentLTP < slPrice) {
            status = 'INVALIDATED';
            statusClass = 'status-invalid';
            modeLabel = 'Setup Invalid';
            message = `⛔ Setup Invalidated: Current price (₹${currentLTP.toFixed(2)}) has broken below Stop Loss (₹${slPrice.toFixed(2)}). Do NOT enter this strike; wait for new setup.`;
        } else if (mode === 'BREAKOUT') {
            modeLabel = 'Breakout Setup (Above CMP)';
            // Buyer waiting for breakout: currentLTP must rise to or cross targetEntry
            if (currentLTP >= targetEntry) {
                status = 'TRIGGERED';
                statusClass = 'status-triggered';
                message = `🚀 BREAKOUT CONFIRMED / TRIGGERED! Price has crossed Breakout Trigger (₹${targetEntry.toFixed(2)}) at ₹${currentLTP.toFixed(2)}! Resistance broken with momentum. Execute Buy order now!`;
            } else {
                status = 'WAIT';
                statusClass = 'status-wait';
                const ptsRemaining = Math.abs(targetEntry - currentLTP);
                const pctRemaining = (ptsRemaining / currentLTP) * 100;
                message = `⏳ WAIT FOR BREAKOUT: Current price (₹${currentLTP.toFixed(2)}) is below Breakout Trigger (₹${targetEntry.toFixed(2)}). Waiting for +₹${ptsRemaining.toFixed(2)} (+${pctRemaining.toFixed(1)}%) upside breakout confirmation. Do NOT enter early!`;
            }
        } else if (mode === 'PULLBACK') {
            modeLabel = 'Pullback Setup (Below CMP)';
            // Buyer waiting for dip: currentLTP must retrace down into targetEntry
            if (currentLTP <= targetEntry * 1.008 && currentLTP >= (slPrice || 0)) {
                status = 'TRIGGERED';
                statusClass = 'status-triggered';
                message = `🎯 OPTIMAL PULLBACK ZONE REACHED! Price dipped to ₹${currentLTP.toFixed(2)} (Target: ₹${targetEntry.toFixed(2)}). Ideal Risk-to-Reward ratio active. Execute order now!`;
            } else {
                status = 'WAIT';
                statusClass = 'status-wait';
                const ptsRemaining = Math.abs(currentLTP - targetEntry);
                const pctRemaining = (ptsRemaining / currentLTP) * 100;
                message = `⏳ WAIT FOR PULLBACK: Current price (₹${currentLTP.toFixed(2)}) is higher than Ideal Dip (₹${targetEntry.toFixed(2)}). Wait for a ₹${ptsRemaining.toFixed(2)} (${pctRemaining.toFixed(1)}%) pullback into support! Avoid FOMO market orders.`;
            }
        } else {
            // At CMP
            modeLabel = 'At CMP';
            status = 'TRIGGERED';
            statusClass = 'status-triggered';
            message = `🎯 AT CMP ENTRY: Price is at ₹${currentLTP.toFixed(2)}. Market entry active at prevailing price.`;
        }
    } else {
        // Seller perspective (Options Writing)
        modeLabel = 'Sell Entry';
        if (currentLTP >= targetEntry * 0.992) {
            status = 'TRIGGERED';
            statusClass = 'status-triggered';
            message = `🎯 SELL ENTRY TRIGGERED: Premium has spiked to ₹${currentLTP.toFixed(2)} (Target: ₹${targetEntry.toFixed(2)}). Optimal high-premium entry active!`;
        } else {
            status = 'WAIT';
            statusClass = 'status-wait';
            const ptsRemaining = Math.abs(targetEntry - currentLTP);
            message = `⏳ WAIT FOR PREMIUM EXPANSION: Current price (₹${currentLTP.toFixed(2)}) is below Ideal Sell Entry (₹${targetEntry.toFixed(2)}). Waiting for +₹${ptsRemaining.toFixed(2)} spike before shorting!`;
        }
    }

    return {
        targetEntry: targetEntry,
        currentLTP: currentLTP,
        diffPoints: Math.round(diff * 100) / 100,
        diffPercent: Math.round(diffPct * 10) / 10,
        mode: mode,
        modeLabel: modeLabel,
        isAboveCMP: isAboveCMP,
        status: status,
        statusClass: statusClass,
        message: message
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        calculateBlackScholesGreeks,
        projectOptionPrice,
        calculateTargetAndSL,
        calculateOptimalEntryAndStatus,
        normalCDF,
        normalPDF
    };
}
