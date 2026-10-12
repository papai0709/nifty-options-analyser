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
    const safeDelta = Math.max(0.15, Math.abs(greeks.delta) || 0.5);
    if (riskMode === 'spot_pts') {
        slUnderlyingPoints = Math.abs(parseFloat(slSpotPts) || 30);
        // Under adverse move of slUnderlyingPoints, how much does the option drop/rise?
        const adverseDeltaSpot = isCall ? -slUnderlyingPoints : slUnderlyingPoints;
        const adverseProj = projectOptionPrice(greeks, entryPremium, adverseDeltaSpot, 0, 0);
        slPoints = Math.max(1, entryPremium - adverseProj.projectedPrice);
    } else if (riskMode === 'premium_pct') {
        const pct = Math.min(95, Math.max(3, parseFloat(slPremiumPct) || 20)) / 100.0;
        slPoints = entryPremium * pct;
        slUnderlyingPoints = Math.abs(slPoints / safeDelta);
    } else if (riskMode === 'capital_amt') {
        const maxRisk = Math.max(100, parseFloat(maxCapitalRisk) || 2000);
        slPoints = maxRisk / totalQty;
        slUnderlyingPoints = Math.abs(slPoints / safeDelta);
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
    const targetUnderlyingPts = (targetPoints / safeDelta);
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

/**
 * Evaluates trade setup against Open Interest (OI) & Put-Call Ratio (PCR) analytics
 */
function evaluateOIConfirmation({ optionType, tradeAction, strikePrice, spotPrice, oiData }) {
    if (!oiData) {
        return {
            status: 'NEUTRAL',
            badge: '⚖️ OI Neutral',
            badgeClass: 'oi-neutral',
            message: 'Live market liquidity active.'
        };
    }

    const isBuyer = tradeAction === 'BUY';
    const isCall = optionType === 'CE';
    const K = strikePrice;
    const { pcr, maxCeStrike, maxCeOI, maxPeStrike, maxPeOI, maxPainStrike } = oiData;

    let status = 'NEUTRAL'; // 'CONFIRMED', 'CAUTION', 'NEUTRAL'
    let badge = '⚖️ OI Neutral';
    let badgeClass = 'oi-neutral';
    let message = '';

    if (isBuyer) {
        if (isCall) {
            // CALL BUYER (BULLISH TRADER)
            if (K > maxCeStrike) {
                status = 'CAUTION';
                badge = '⚠️ Above Call Wall (Supply Risk)';
                badgeClass = 'oi-caution';
                message = `Selected strike (₹${K}) is ABOVE the Major Call Resistance Wall (₹${maxCeStrike}). High risk of supply pressure and institutional seller defense!`;
            } else if (K === maxCeStrike) {
                status = 'CAUTION';
                badge = '⚠️ At Major Call Wall (Resistance)';
                badgeClass = 'oi-caution';
                message = `Selected strike (₹${K}) is the MAXIMUM Call OI Wall (${(maxCeOI / 1000).toFixed(0)}k contracts). Strong resistance expected unless breakout volume surges.`;
            } else if (pcr >= 1.05 && spotPrice >= maxPeStrike) {
                status = 'CONFIRMED';
                badge = '🛡️ Bullish OI Confirmation';
                badgeClass = 'oi-confirmed';
                message = `Bullish Setup Backed by OI: PCR is ${pcr.toFixed(2)} with heavy Put Writing Support Floor at ₹${maxPeStrike}. Solid underlying cushion for Call longs!`;
            } else if (pcr < 0.80) {
                status = 'CAUTION';
                badge = '⚠️ Bearish PCR Headwind';
                badgeClass = 'oi-caution';
                message = `PCR is low (${pcr.toFixed(2)}), indicating dominant Call writers overhead. Upside moves may face prompt profit-booking.`;
            } else {
                status = 'NEUTRAL';
                badge = '✓ OI In Safe Range';
                badgeClass = 'oi-neutral';
                message = `Strike is in balanced trading range (Support Floor: ₹${maxPeStrike} | Resistance Wall: ₹${maxCeStrike} | Max Pain: ₹${maxPainStrike}).`;
            }
        } else {
            // PUT BUYER (BEARISH TRADER)
            if (K < maxPeStrike) {
                status = 'CAUTION';
                badge = '⚠️ Below Put Floor (Reversal Risk)';
                badgeClass = 'oi-caution';
                message = `Selected strike (₹${K}) is BELOW the Major Put Support Floor (₹${maxPeStrike}). Heavy Put writing acts as a strong cushion against further drops!`;
            } else if (K === maxPeStrike) {
                status = 'CAUTION';
                badge = '⚠️ At Major Put Floor (Support)';
                badgeClass = 'oi-caution';
                message = `Selected strike (₹${K}) is the MAXIMUM Put OI Floor (${(maxPeOI / 1000).toFixed(0)}k contracts). Option sellers actively defending this zone.`;
            } else if (pcr <= 0.85 && spotPrice <= maxCeStrike) {
                status = 'CONFIRMED';
                badge = '⚡ Bearish OI Confirmation';
                badgeClass = 'oi-confirmed';
                message = `Bearish Setup Backed by OI: PCR is ${pcr.toFixed(2)} with heavy Call Writing Resistance Wall at ₹${maxCeStrike}. Strong ceiling capping index rebounds!`;
            } else if (pcr > 1.25) {
                status = 'CAUTION';
                badge = '⚠️ Bullish PCR Headwind';
                badgeClass = 'oi-caution';
                message = `PCR is elevated (${pcr.toFixed(2)}), indicating heavy institutional Put writing. Bears may struggle to break support.`;
            } else {
                status = 'NEUTRAL';
                badge = '✓ OI In Safe Range';
                badgeClass = 'oi-neutral';
                message = `Strike is in balanced trading range (Support Floor: ₹${maxPeStrike} | Resistance Wall: ₹${maxCeStrike} | Max Pain: ₹${maxPainStrike}).`;
            }
        }
    } else {
        // OPTION SELLER (WRITER)
        if (isCall) {
            if (K >= maxCeStrike) {
                status = 'CONFIRMED';
                badge = '🛡️ High-Prob Call Writing Zone';
                badgeClass = 'oi-confirmed';
                message = `High Probability Short: Selling at/above the Key Call Wall (₹${maxCeStrike}) where institutional writers are concentrated!`;
            } else {
                status = 'NEUTRAL';
                badge = '✓ Call Writing Active';
                badgeClass = 'oi-neutral';
                message = `Call writing active. Major overhead resistance positioned at ₹${maxCeStrike}.`;
            }
        } else {
            if (K <= maxPeStrike) {
                status = 'CONFIRMED';
                badge = '🛡️ High-Prob Put Writing Zone';
                badgeClass = 'oi-confirmed';
                message = `High Probability Short: Selling at/below the Key Put Floor (₹${maxPeStrike}) where institutional buyers provide support!`;
            } else {
                status = 'NEUTRAL';
                badge = '✓ Put Writing Active';
                badgeClass = 'oi-neutral';
                message = `Put writing active. Major underlying support floor positioned at ₹${maxPeStrike}.`;
            }
        }
    }

    return {
        status,
        badge,
        badgeClass,
        message,
        pcr,
        maxCeStrike,
        maxPeStrike,
        maxPainStrike
    };
}

/**
 * 4-Quadrant Institutional Buildup Classification
 * Evaluates strike flow based on price change and OI delta
 */
function classifyStrikeBuildup(priceChange, oiChange) {
    const pUp = priceChange >= 0;
    const oiUp = oiChange >= 0;

    if (pUp && oiUp) {
        return {
            type: 'LONG_BUILDUP',
            code: 'LB',
            label: 'Long Buildup',
            badgeClass: 'buildup-lb',
            sentiment: 'Bullish',
            desc: 'Fresh institutional buying with open interest expansion'
        };
    } else if (!pUp && oiUp) {
        return {
            type: 'SHORT_BUILDUP',
            code: 'SB',
            label: 'Short Buildup',
            badgeClass: 'buildup-sb',
            sentiment: 'Bearish',
            desc: 'Aggressive call writing / short buildup overhead'
        };
    } else if (pUp && !oiUp) {
        return {
            type: 'SHORT_COVERING',
            code: 'SC',
            label: 'Short Covering',
            badgeClass: 'buildup-sc',
            sentiment: 'Bullish Reversal',
            desc: 'Trapped short sellers rushing to exit / short squeeze'
        };
    } else {
        return {
            type: 'LONG_UNWINDING',
            code: 'LU',
            label: 'Long Unwinding',
            badgeClass: 'buildup-lu',
            sentiment: 'Bearish Reversal',
            desc: 'Bulls liquidating long positions / profit booking'
        };
    }
}

/**
 * Multi-Factor Confluence Scoring Engine (0 - 100)
 * Evaluates composite signal quality across:
 * 1. Spot Trend & VWAP Alignment (25 pts)
 * 2. OI Buildup & PCR Momentum (25 pts)
 * 3. Greeks Quality & Moneyness (20 pts)
 * 4. India VIX Volatility Regime (15 pts)
 * 5. Entry Precision & Setup Status (15 pts)
 */
function calculateConfluenceScore({
    optionType = 'CE',
    tradeAction = 'BUY',
    spotPrice = 22500,
    vwap = 22500,
    greeks = {},
    oiConfirmation = null,
    pcrTrend = 'STABLE', // 'RISING', 'FALLING', 'STABLE'
    vix = 13.8,
    vixChange = 0,
    entryStatus = null,
    riskRewardRatio = 2.0,
    dteDays = 3.5
}) {
    const isBuyer = tradeAction === 'BUY';
    const isCall = optionType === 'CE';

    // 1. Spot & VWAP Trend Alignment (25 pts max)
    let vwapScore = 0;
    let vwapReason = '';
    const vwapDiff = spotPrice - vwap;
    const vwapPct = (vwapDiff / vwap) * 100;

    if (isBuyer) {
        if (isCall) {
            if (vwapPct >= 0.08) {
                vwapScore = 25;
                vwapReason = `Strong Spot momentum above VWAP (+${vwapPct.toFixed(2)}%)`;
            } else if (vwapPct >= -0.05) {
                vwapScore = 18;
                vwapReason = `Spot consolidating around VWAP (${vwapPct >= 0 ? '+' : ''}${vwapPct.toFixed(2)}%)`;
            } else {
                vwapScore = 6;
                vwapReason = `Spot trading below VWAP (${vwapPct.toFixed(2)}%) - Intraday resistance headwind`;
            }
        } else {
            // PE Buyer
            if (vwapPct <= -0.08) {
                vwapScore = 25;
                vwapReason = `Strong downward spot momentum below VWAP (${vwapPct.toFixed(2)}%)`;
            } else if (vwapPct <= 0.05) {
                vwapScore = 18;
                vwapReason = `Spot consolidating around VWAP (${vwapPct.toFixed(2)}%)`;
            } else {
                vwapScore = 6;
                vwapReason = `Spot trading above VWAP (+${vwapPct.toFixed(2)}%) - Bullish cushion headwind`;
            }
        }
    } else {
        // Option Seller
        if (Math.abs(vwapPct) <= 0.15) {
            vwapScore = 25;
            vwapReason = `Spot in rangebound equilibrium near VWAP - Ideal theta collection`;
        } else {
            vwapScore = 16;
            vwapReason = `Spot displaced from VWAP (${vwapPct.toFixed(2)}%)`;
        }
    }

    // 2. OI & PCR Momentum Flow (25 pts max)
    let oiScore = 0;
    let oiReason = '';
    if (oiConfirmation) {
        if (oiConfirmation.status === 'CONFIRMED') {
            oiScore = 20;
            oiReason = oiConfirmation.badge;
        } else if (oiConfirmation.status === 'NEUTRAL') {
            oiScore = 14;
            oiReason = 'OI in safe balanced range';
        } else {
            oiScore = 5;
            oiReason = oiConfirmation.badge;
        }

        // PCR Trend dynamic bonus (+5 pts)
        if (isBuyer && isCall && pcrTrend === 'RISING') {
            oiScore = Math.min(25, oiScore + 5);
            oiReason += ' • Rising PCR (Put writing accelerating)';
        } else if (isBuyer && !isCall && pcrTrend === 'FALLING') {
            oiScore = Math.min(25, oiScore + 5);
            oiReason += ' • Falling PCR (Call writing intensifying)';
        } else if (!isBuyer && pcrTrend === 'STABLE') {
            oiScore = Math.min(25, oiScore + 5);
            oiReason += ' • Stable PCR (Consolidation favorable for theta)';
        }
    } else {
        oiScore = 12;
        oiReason = 'Standard OI baseline';
    }

    // 3. Greeks Quality & Moneyness (20 pts max)
    let greeksScore = 0;
    let greeksReason = '';
    const absDelta = Math.abs(greeks.delta || 0.5);

    if (isBuyer) {
        if (absDelta >= 0.42 && absDelta <= 0.65) {
            greeksScore = 14;
            greeksReason = `Optimal ATM/ITM Delta (${absDelta.toFixed(2)}) for momentum`;
        } else if (absDelta > 0.65) {
            greeksScore = 12;
            greeksReason = `Deep ITM (${absDelta.toFixed(2)}) - Low extrinsic decay, high capital req`;
        } else if (absDelta >= 0.30) {
            greeksScore = 9;
            greeksReason = `Slight OTM Delta (${absDelta.toFixed(2)}) - Moderate gamma acceleration`;
        } else {
            greeksScore = 4;
            greeksReason = `Deep OTM Delta (${absDelta.toFixed(2)}) - High theta decay trap risk`;
        }

        // Theta Efficiency: Hourly theta vs potential spot delta
        const thetaHourly = Math.abs(greeks.thetaHourly || 0.5);
        const thetaPer10Pts = thetaHourly / (absDelta * 10 || 1);
        if (thetaPer10Pts < 0.15) {
            greeksScore += 6;
            greeksReason += ' • Low Theta drag';
        } else if (thetaPer10Pts < 0.30) {
            greeksScore += 4;
            greeksReason += ' • Moderate Theta drag';
        } else {
            greeksScore += 1;
            greeksReason += ' • Heavy Theta decay erosion';
        }
    } else {
        // Seller
        if (absDelta <= 0.35) {
            greeksScore = 20;
            greeksReason = `High-probability OTM Delta (${absDelta.toFixed(2)}) for decay harvest`;
        } else {
            greeksScore = 10;
            greeksReason = `Elevated Delta (${absDelta.toFixed(2)}) - Higher directional risk`;
        }
    }

    // 4. Volatility & VIX Regime (15 pts max)
    let vixScore = 0;
    let vixReason = '';
    if (isBuyer) {
        if (vixChange >= -0.5) {
            vixScore = 15;
            vixReason = `Stable/Expanding Volatility (VIX ${vix.toFixed(2)}) - Safe from IV crush`;
        } else {
            vixScore = 6;
            vixReason = `Contracting Volatility (VIX ${vix.toFixed(2)}, ${vixChange.toFixed(2)}%) - IV crush headwind`;
        }
    } else {
        // Seller
        if (vixChange <= 0.2 || vix >= 14.5) {
            vixScore = 15;
            vixReason = `Favorable Volatility Regime for Premium Collection`;
        } else {
            vixScore = 8;
            vixReason = `Rising VIX (${vix.toFixed(2)}) - Watch for premium expansion`;
        }
    }

    // 5. Entry Precision & Setup Status (15 pts max)
    let entryScore = 0;
    let entryReason = '';
    if (entryStatus) {
        if (entryStatus.status === 'TRIGGERED') {
            entryScore = 15;
            entryReason = entryStatus.mode === 'BREAKOUT' ? 'Breakout level confirmed with live momentum' : 'Optimal pullback support sweet-spot reached';
        } else if (entryStatus.status === 'WAIT') {
            const pctAway = Math.abs(entryStatus.diffPercent || 0);
            if (pctAway <= 2.5) {
                entryScore = 10;
                entryReason = `Approaching trigger zone (${pctAway.toFixed(1)}% away)`;
            } else {
                entryScore = 6;
                entryReason = `Awaiting setup (${pctAway.toFixed(1)}% away) - Do not front-run`;
            }
        } else {
            entryScore = 0;
            entryReason = 'Setup invalidated below Stop-Loss';
        }
    } else {
        entryScore = 10;
        entryReason = 'Active market order';
    }

    // Total Score
    const totalScore = Math.max(0, Math.min(100, Math.round(vwapScore + oiScore + greeksScore + vixScore + entryScore)));

    let conviction = 'CHOP / LOW CONFIDENCE';
    let convictionBadge = '🔴 LOW CONVICTION';
    let badgeClass = 'confluence-low';
    let summaryAction = 'Wait for confirmation or lower risk budget';

    if (totalScore >= 80) {
        conviction = 'HIGH CONVICTION';
        convictionBadge = '🟢 HIGH CONVICTION';
        badgeClass = 'confluence-high';
        summaryAction = 'Prime Institutional Setup: Optimal alignment across price, OI, and Greeks';
    } else if (totalScore >= 60) {
        conviction = 'MODERATE / SCALP';
        convictionBadge = '🟡 MODERATE / SCALP';
        badgeClass = 'confluence-mid';
        summaryAction = 'Viable Scalp Setup: Execute with disciplined trailing stop';
    }

    return {
        totalScore,
        conviction,
        convictionBadge,
        badgeClass,
        summaryAction,
        pillars: {
            vwap: { score: vwapScore, max: 25, reason: vwapReason, pct: Math.round((vwapScore / 25) * 100) },
            oi: { score: oiScore, max: 25, reason: oiReason, pct: Math.round((oiScore / 25) * 100) },
            greeks: { score: greeksScore, max: 20, reason: greeksReason, pct: Math.round((greeksScore / 20) * 100) },
            vix: { score: vixScore, max: 15, reason: vixReason, pct: Math.round((vixScore / 15) * 100) },
            entry: { score: entryScore, max: 15, reason: entryReason, pct: Math.round((entryScore / 15) * 100) }
        }
    };
}

/**
 * Trade Management & Dynamic Trailing Stop-Loss Engine
 * Provides milestone actions (Cost-to-Cost, Runner Lock, Theta Bleed Cutoff)
 */
function calculateTradeManagementPlan({
    entryPremium,
    slPrice,
    targetSL,
    greeks,
    lotSize = 25,
    lotsCount = 1
}) {
    entryPremium = parseFloat(entryPremium) || 100;
    const isBuyer = true; // Focused on buyers
    const t1 = targetSL.t1;
    const t2 = targetSL.t2;
    const t3 = targetSL.t3;

    // Milestone 1: At Target 1 (1:1.5 RR) -> Trail SL to Breakeven
    const trailAtT1 = {
        triggerPrice: t1.price,
        newSlPrice: entryPremium,
        action: 'Trail Stop-Loss to Breakeven (Cost-to-Cost)',
        protectedINR: Math.round(targetSL.maxRiskINR),
        statusText: `Lock in Risk-Free Trade at ₹${t1.price.toFixed(2)}`
    };

    // Milestone 2: At Target 2 (1:2.0 RR) -> Book 50% & Trail to T1
    const trailAtT2 = {
        triggerPrice: t2.price,
        newSlPrice: t1.price,
        action: 'Book 50-70% Quantity & Trail SL to Target 1 Level',
        lockedProfitINR: Math.round(t1.profitINR * 0.7),
        statusText: `Secure +₹${Math.round(t1.profitINR * 0.7).toLocaleString('en-IN')} & let runners target T3`
    };

    // Theta Bleed Safe Holding Horizon
    // If trade doesn't reach T1 within this time, Theta eats > 25% of the risk budget
    const slPts = targetSL.slPoints || 20;
    const thetaHourly = Math.abs(greeks.thetaHourly || 1.5);
    const maxThetaBudgetPts = slPts * 0.25;
    const safeHoldingHours = Math.max(0.3, maxThetaBudgetPts / (thetaHourly || 1));
    const safeHoldingMinutes = Math.round(safeHoldingHours * 60);

    return {
        trailAtT1,
        trailAtT2,
        thetaCutoff: {
            safeMinutes: safeHoldingMinutes,
            thetaHourlyINR: Math.round(thetaHourly * lotSize * lotsCount),
            warning: `Theta Time-Stop: Exit or reassess if trade stays flat for > ${safeHoldingMinutes} mins`
        }
    };
}

/**
 * Evaluates Indian Market Session Phase & Execution Quality
 */
function evaluateSessionTiming(dateObj = new Date()) {
    // Current IST Time calculation
    const utc = dateObj.getTime() + (dateObj.getTimezoneOffset() * 60000);
    const istTime = new Date(utc + (3600000 * 5.5)); // IST is UTC+5:30

    const hours = istTime.getHours();
    const minutes = istTime.getMinutes();
    const timeNum = hours * 100 + minutes;

    let phase = 'MARKET_OPEN';
    let phaseLabel = 'Active Trading Session';
    let phaseBadge = 'session-normal';
    let guidance = 'Standard execution parameters active';

    if (timeNum < 915) {
        phase = 'PRE_MARKET';
        phaseLabel = 'Pre-Market / Simulated';
        phaseBadge = 'session-closed';
        guidance = 'Market opens at 09:15 IST';
    } else if (timeNum <= 945) {
        phase = 'OPENING_DISCOVERY';
        phaseLabel = '09:15 - 09:45 Opening Auction & Price Discovery';
        phaseBadge = 'session-caution';
        guidance = 'High spread volatility & gap false-breaks. Allow 15 mins for initial balance.';
    } else if (timeNum <= 1130) {
        phase = 'MORNING_MOMENTUM';
        phaseLabel = '09:45 - 11:30 Morning Trend Window';
        phaseBadge = 'session-prime';
        guidance = 'Prime execution window! High institutional volume & clean directional trends.';
    } else if (timeNum <= 1330) {
        phase = 'MIDDAY_CHOP';
        phaseLabel = '11:30 - 13:30 Midday European Lull & Chop Zone';
        phaseBadge = 'session-caution';
        guidance = 'Chop & theta bleed trap. Demands higher confluence score (≥80) before entering.';
    } else if (timeNum <= 1430) {
        phase = 'AFTERNOON_EXPANSION';
        phaseLabel = '13:30 - 14:30 Afternoon Momentum Resumption';
        phaseBadge = 'session-prime';
        guidance = 'European market volume active. Breakouts from midday ranges offer strong follow-through.';
    } else if (timeNum <= 1530) {
        phase = 'POWER_HOUR_0DTE';
        phaseLabel = '14:30 - 15:30 Power Hour & Expiry Gamma Scalp';
        phaseBadge = 'session-gamma';
        guidance = 'Fast delta acceleration and max pain pin gravity. Rapid scalp executions recommended.';
    } else {
        phase = 'POST_MARKET';
        phaseLabel = 'Post-Market / Sim Mode';
        phaseBadge = 'session-closed';
        guidance = 'Market closed for today';
    }

    return {
        phase,
        phaseLabel,
        phaseBadge,
        guidance,
        istTimeString: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} IST`
    };
}

/**
 * Solve for Implied Volatility (IV) given a Market Traded Price
 * Uses binary bisection search to match theoretical BS price to market LTP
 * @returns {number} IV in percentage (e.g. 18.8)
 */
function calculateImpliedVolatility(type, S, K, T, r, targetPrice) {
    targetPrice = parseFloat(targetPrice) || 0;
    if (targetPrice <= 0.05 || !S || !K || !T) return 14.0;
    const isCall = type.toUpperCase() === 'CE';
    const intrinsic = isCall ? Math.max(0, S - K) : Math.max(0, K - S);

    if (targetPrice <= intrinsic) {
        return 5.0;
    }

    let low = 0.01;
    let high = 3.0;

    for (let i = 0; i < 40; i++) {
        const mid = (low + high) / 2.0;
        const res = calculateBlackScholesGreeks(type, S, K, T, r, mid);
        if (Math.abs(res.price - targetPrice) < 0.01) {
            return Math.round(mid * 1000) / 10;
        }
        if (res.price > targetPrice) {
            high = mid;
        } else {
            low = mid;
        }
    }
    return Math.round(((low + high) / 2.0) * 1000) / 10;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        calculateBlackScholesGreeks,
        calculateImpliedVolatility,
        projectOptionPrice,
        calculateTargetAndSL,
        calculateOptimalEntryAndStatus,
        evaluateOIConfirmation,
        classifyStrikeBuildup,
        calculateConfluenceScore,
        calculateTradeManagementPlan,
        evaluateSessionTiming,
        normalCDF,
        normalPDF
    };
}


