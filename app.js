/**
 * AlphaGreeks Terminal - Application Controller
 * Connects UI inputs, live market feeds, Black-Scholes Greeks engine, and Risk-Reward models
 */

document.addEventListener('DOMContentLoaded', () => {
    // Current State
    const state = {
        currentIndex: 'NIFTY',
        optionType: 'CE',     // 'CE' or 'PE'
        tradeAction: 'BUY',   // 'BUY' or 'SELL'
        spotPrice: 25052.40,
        strikePrice: 25050,
        dteDays: 3.5,
        ivPercent: 13.85,
        interestRate: 6.75,
        premiumPaid: null,    // null = use theoretical Black-Scholes fair value
        lotsCount: 1,
        lotSize: 25,
        riskMode: 'spot_pts', // 'spot_pts', 'premium_pct', 'capital_amt'
        slSpotPts: 30,
        slPremiumPct: 20,
        slCapitalAmt: 1500,
        riskRewardRatio: 2.0,
        autoSyncSpot: true,
        // Optimal Entry state
        customTargetEntry: null, // null = auto sweet spot
        entryMode: 'auto',       // 'auto', 'dip5', 'dip8', 'cmp', 'custom'
        soundAlert: true,
        previousEntryStatus: null,
        // Simulation tab state
        simSpotMove: 0,
        simDaysHeld: 0
    };

    // DOM Elements Cache
    const el = {
        // Tickers
        tickerNiftySpot: document.getElementById('tickNiftySpot'),
        tickerNiftyChange: document.getElementById('tickNiftyChange'),
        tickerSensexSpot: document.getElementById('tickSensexSpot'),
        tickerSensexChange: document.getElementById('tickSensexChange'),
        tickerBankNiftySpot: document.getElementById('tickBankNiftySpot'),
        tickerBankNiftyChange: document.getElementById('tickBankNiftyChange'),
        tickVix: document.getElementById('tickVix'),
        tickerPills: document.querySelectorAll('.ticker-pill'),
        btnToggleLive: document.getElementById('btnToggleLive'),
        liveStatusBadge: document.getElementById('liveStatusBadge'),
        liveStatusText: document.getElementById('liveStatusText'),
        btnSyncPrices: document.getElementById('btnSyncPrices'),

        // Inputs
        indexButtons: document.querySelectorAll('#indexSelector .seg-btn'),
        inputSpot: document.getElementById('inputSpot'),
        btnApplyCurrentSpot: document.getElementById('btnApplyCurrentSpot'),
        badgeSpotStatus: document.getElementById('badgeSpotStatus'),
        cePeButtons: document.querySelectorAll('#optionTypeToggle .seg-btn'),
        buySellButtons: document.querySelectorAll('#tradeActionToggle .seg-btn'),
        inputStrike: document.getElementById('inputStrike'),
        badgeMoneyness: document.getElementById('badgeMoneyness'),
        chipAtm: document.getElementById('chipAtm'),
        chipOtm1: document.getElementById('chipOtm1'),
        chipItm1: document.getElementById('chipItm1'),
        chipStepMinus: document.getElementById('chipStepMinus'),
        chipStepPlus: document.getElementById('chipStepPlus'),
        rangeDte: document.getElementById('rangeDte'),
        valDteDisplay: document.getElementById('valDteDisplay'),
        dteChips: document.querySelectorAll('#rangeDte ~ .quick-chips-row .chip-btn'),
        inputIV: document.getElementById('inputIV'),
        ivVixHint: document.getElementById('ivVixHint'),
        inputRate: document.getElementById('inputRate'),
        inputPremium: document.getElementById('inputPremium'),
        badgeFairVal: document.getElementById('badgeFairVal'),
        inputLots: document.getElementById('inputLots'),
        labelLotSize: document.getElementById('labelLotSize'),
        btnResetDefaults: document.getElementById('btnResetDefaults'),

        // Optimal Entry Configuration Elements
        inputTargetEntry: document.getElementById('inputTargetEntry'),
        btnAutoEntry: document.getElementById('btnAutoEntry'),
        badgeEntryMode: document.getElementById('badgeEntryMode'),
        chipEntryAuto: document.getElementById('chipEntryAuto'),
        chipEntryDip5: document.getElementById('chipEntryDip5'),
        chipEntryDip8: document.getElementById('chipEntryDip8'),
        chipEntryCmp: document.getElementById('chipEntryCmp'),
        chipEntryBreak5: document.getElementById('chipEntryBreak5'),
        chipEntryBreak10: document.getElementById('chipEntryBreak10'),

        // Entry Advisor Banner Elements
        entryAdvisorCard: document.getElementById('entryAdvisorCard'),
        advisorBadge: document.getElementById('advisorBadge'),
        advCurrentLtp: document.getElementById('advCurrentLtp'),
        advOptimalEntry: document.getElementById('advOptimalEntry'),
        advDistance: document.getElementById('advDistance'),
        btnToggleSound: document.getElementById('btnToggleSound'),
        soundIcon: document.getElementById('soundIcon'),
        soundLabel: document.getElementById('soundLabel'),
        advisorMessageText: document.getElementById('advisorMessageText'),
        advOiPill: document.getElementById('advOiPill'),
        advOiDetails: document.getElementById('advOiDetails'),

        // Signal Precision & Confluence Gauge
        valConfluenceScore: document.getElementById('valConfluenceScore'),
        badgeConfluenceConviction: document.getElementById('badgeConfluenceConviction'),
        textConfluenceSummary: document.getElementById('textConfluenceSummary'),
        valConfVwap: document.getElementById('valConfVwap'),
        valConfOi: document.getElementById('valConfOi'),
        valConfBuildup: document.getElementById('valConfBuildup'),
        valConfVix: document.getElementById('valConfVix'),
        valConfGreeks: document.getElementById('valConfGreeks'),

        // VWAP & Session Ticker Pills
        tickVwapVal: document.getElementById('tickVwapVal'),
        tickVwapDiff: document.getElementById('tickVwapDiff'),
        tickSessionLabel: document.getElementById('tickSessionLabel'),
        tickerSessionPill: document.getElementById('tickerSessionPill'),

        // Trailing SL Milestones
        trailT1Action: document.getElementById('trailT1Action'),
        trailT1Text: document.getElementById('trailT1Text'),
        trailT2Action: document.getElementById('trailT2Action'),
        trailT2Text: document.getElementById('trailT2Text'),
        trailThetaWarning: document.getElementById('trailThetaWarning'),
        trailThetaSub: document.getElementById('trailThetaSub'),

        // OI Analytics Card Elements
        valPcrHeaderTag: document.getElementById('valPcrHeaderTag'),
        valPcrBadge: document.getElementById('valPcrBadge'),
        valPcrNumber: document.getElementById('valPcrNumber'),
        barPeOIPct: document.getElementById('barPeOIPct'),
        barCeOIPct: document.getElementById('barCeOIPct'),
        valPcrDesc: document.getElementById('valPcrDesc'),
        valMaxPutStrike: document.getElementById('valMaxPutStrike'),
        valMaxPutContracts: document.getElementById('valMaxPutContracts'),
        valMaxCallStrike: document.getElementById('valMaxCallStrike'),
        valMaxCallContracts: document.getElementById('valMaxCallContracts'),
        valMaxPainStrike: document.getElementById('valMaxPainStrike'),
        valMaxPainDistance: document.getElementById('valMaxPainDistance'),
        oiTradeConfirmationBanner: document.getElementById('oiTradeConfirmationBanner'),
        oiConfirmIcon: document.getElementById('oiConfirmIcon'),
        oiConfirmTitle: document.getElementById('oiConfirmTitle'),
        oiConfirmBody: document.getElementById('oiConfirmBody'),

        // Risk Engine Inputs
        riskModeButtons: document.querySelectorAll('#riskModeSelector .seg-btn'),
        groupSlSpot: document.getElementById('groupSlSpot'),
        groupSlPct: document.getElementById('groupSlPct'),
        groupSlAmt: document.getElementById('groupSlAmt'),
        inputSlSpot: document.getElementById('inputSlSpot'),
        inputSlPct: document.getElementById('inputSlPct'),
        inputSlAmt: document.getElementById('inputSlAmt'),
        rangeRR: document.getElementById('rangeRR'),
        valRrDisplay: document.getElementById('valRrDisplay'),
        rrChips: document.querySelectorAll('#rangeRR ~ .quick-chips-row .chip-btn'),

        // Verdict Banner & Quick Stats
        verdictActionTag: document.getElementById('verdictActionTag'),
        verdictTitle: document.getElementById('verdictTitle'),
        verdictMeta: document.getElementById('verdictMeta'),
        statCapital: document.getElementById('statCapital'),
        statBreakEven: document.getElementById('statBreakEven'),
        statEffectiveRR: document.getElementById('statEffectiveRR'),
        meterLossLabel: document.getElementById('meterLossLabel'),
        meterProfitLabel: document.getElementById('meterProfitLabel'),
        meterRiskBar: document.getElementById('meterRiskBar'),
        meterRewardBar: document.getElementById('meterRewardBar'),

        // Levels Grid
        valEntryPrice: document.getElementById('valEntryPrice'),
        valEntryStatus: document.getElementById('valEntryStatus'),
        valEntrySpotTrigger: document.getElementById('valEntrySpotTrigger'),
        boxEntryLevel: document.getElementById('boxEntryLevel'),

        valSlPrice: document.getElementById('valSlPrice'),
        valSlPoints: document.getElementById('valSlPoints'),
        valSlInr: document.getElementById('valSlInr'),
        valSlSpotTrigger: document.getElementById('valSlSpotTrigger'),

        valT1Price: document.getElementById('valT1Price'),
        valT1Points: document.getElementById('valT1Points'),
        valT1Inr: document.getElementById('valT1Inr'),
        valT1SpotTrigger: document.getElementById('valT1SpotTrigger'),

        valT2Price: document.getElementById('valT2Price'),
        valT2Points: document.getElementById('valT2Points'),
        valT2Inr: document.getElementById('valT2Inr'),
        valT2SpotTrigger: document.getElementById('valT2SpotTrigger'),

        valT3Price: document.getElementById('valT3Price'),
        valT3Points: document.getElementById('valT3Points'),
        valT3Inr: document.getElementById('valT3Inr'),
        valT3SpotTrigger: document.getElementById('valT3SpotTrigger'),

        // Greeks Outputs
        valGreekDelta: document.getElementById('valGreekDelta'),
        impactDelta: document.getElementById('impactDelta'),
        barDelta: document.getElementById('barDelta'),

        valGreekTheta: document.getElementById('valGreekTheta'),
        impactTheta: document.getElementById('impactTheta'),
        barTheta: document.getElementById('barTheta'),

        valGreekGamma: document.getElementById('valGreekGamma'),
        impactGamma: document.getElementById('impactGamma'),
        barGamma: document.getElementById('barGamma'),

        valGreekVega: document.getElementById('valGreekVega'),
        impactVega: document.getElementById('impactVega'),
        barVega: document.getElementById('barVega'),

        valGreekRho: document.getElementById('valGreekRho'),
        impactRho: document.getElementById('impactRho'),
        barRho: document.getElementById('barRho'),

        // Value Decomposition
        valDecompTotal: document.getElementById('valDecompTotal'),
        barIntrinsic: document.getElementById('barIntrinsic'),
        barExtrinsic: document.getElementById('barExtrinsic'),
        valIntrinsic: document.getElementById('valIntrinsic'),
        valExtrinsic: document.getElementById('valExtrinsic'),

        // Tabs
        tabButtons: document.querySelectorAll('.tab-btn'),
        tabContents: document.querySelectorAll('.tab-content'),

        // Option Chain
        btnRefreshChain: document.getElementById('btnRefreshChain'),
        chainTableBody: document.getElementById('chainTableBody'),

        // Simulator
        simSpotSlider: document.getElementById('simSpotSlider'),
        simSpotVal: document.getElementById('simSpotVal'),
        simHoldingDays: document.getElementById('simHoldingDays'),
        simDaysVal: document.getElementById('simDaysVal'),
        simProjPrice: document.getElementById('simProjPrice'),
        simNetPoints: document.getElementById('simNetPoints'),
        simTotalPnl: document.getElementById('simTotalPnl'),
        simBreakdownDetails: document.getElementById('simBreakdownDetails'),
        payoffCanvas: document.getElementById('payoffCanvas'),

        // Checklist & Order Summary
        orderSummaryText: document.getElementById('orderSummaryText'),
        btnCopySummary: document.getElementById('btnCopySummary')
    };

    // Initialize Index
    function initIndex(indexKey) {
        state.currentIndex = indexKey;
        const config = window.marketFeed.indices[indexKey];
        state.spotPrice = config.spot;
        state.lotSize = config.lotSize;
        state.ivPercent = config.defaultIV;
        state.strikePrice = window.marketFeed.getATMStrike(indexKey);
        state.dteDays = config.defaultDTE;

        // Update inputs
        el.inputSpot.value = state.spotPrice.toFixed(2);
        el.inputStrike.value = state.strikePrice;
        el.inputStrike.step = config.strikeStep;
        el.chipStepMinus.textContent = `-${config.strikeStep}`;
        el.chipStepPlus.textContent = `+${config.strikeStep}`;
        el.inputIV.value = state.ivPercent;
        el.labelLotSize.textContent = `Lot: ${state.lotSize} Qty`;
        el.rangeDte.value = state.dteDays;
        el.valDteDisplay.textContent = `${state.dteDays.toFixed(1)} Days`;

        // Update active index buttons
        el.indexButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.index === indexKey);
        });
        el.tickerPills.forEach(pill => {
            pill.classList.toggle('active-ticker', pill.dataset.index === indexKey);
        });

        // Recalculate
        recalculateAll();
        renderOptionChain();
    }

    // Subscribe to Live Market Feed
    window.marketFeed.subscribe((indices, vix) => {
        // Update Nifty ticker
        const n = indices.NIFTY;
        el.tickerNiftySpot.textContent = n.spot.toLocaleString('en-IN', { minimumFractionDigits: 2 });
        el.tickerNiftyChange.textContent = `${n.change >= 0 ? '+' : ''}${n.change.toFixed(2)} (${n.changePercent >= 0 ? '+' : ''}${n.changePercent.toFixed(2)}%)`;
        el.tickerNiftyChange.className = `ticker-change ${n.change >= 0 ? 'pos' : 'neg'}`;
        flashTicker(el.tickerNiftySpot, n.lastTickDir);

        // Update Sensex ticker
        const s = indices.SENSEX;
        el.tickerSensexSpot.textContent = s.spot.toLocaleString('en-IN', { minimumFractionDigits: 2 });
        el.tickerSensexChange.textContent = `${s.change >= 0 ? '+' : ''}${s.change.toFixed(2)} (${s.changePercent >= 0 ? '+' : ''}${s.changePercent.toFixed(2)}%)`;
        el.tickerSensexChange.className = `ticker-change ${s.change >= 0 ? 'pos' : 'neg'}`;
        flashTicker(el.tickerSensexSpot, s.lastTickDir);

        // Update Bank Nifty ticker
        const b = indices.BANKNIFTY;
        el.tickerBankNiftySpot.textContent = b.spot.toLocaleString('en-IN', { minimumFractionDigits: 2 });
        el.tickerBankNiftyChange.textContent = `${b.change >= 0 ? '+' : ''}${b.change.toFixed(2)} (${b.changePercent >= 0 ? '+' : ''}${b.changePercent.toFixed(2)}%)`;
        el.tickerBankNiftyChange.className = `ticker-change ${b.change >= 0 ? 'pos' : 'neg'}`;
        flashTicker(el.tickerBankNiftySpot, b.lastTickDir);

        // Update VIX
        el.tickVix.textContent = vix.toFixed(2);

        // Update Live VWAP & Session Window
        const activeIdxObj = indices[state.currentIndex];
        if (el.tickVwapVal && activeIdxObj && activeIdxObj.vwap) {
            el.tickVwapVal.textContent = activeIdxObj.vwap.toLocaleString('en-IN', { minimumFractionDigits: 2 });
            const vDiff = Math.round((activeIdxObj.spot - activeIdxObj.vwap) * 100) / 100;
            const vPct = Math.round((vDiff / activeIdxObj.vwap) * 10000) / 100;
            const isPos = vDiff >= 0;
            el.tickVwapDiff.textContent = `${isPos ? '+' : ''}${vPct.toFixed(2)}%`;
            el.tickVwapDiff.className = `vwap-diff ${isPos ? 'pos' : 'neg'}`;
        }
        if (el.tickSessionLabel && typeof evaluateSessionTiming === 'function') {
            const sess = evaluateSessionTiming();
            const phaseBrief = sess.phase === 'POST_MARKET' ? 'Post-Market' : (sess.phase === 'PRE_MARKET' ? 'Pre-Market' : (sess.phase === 'MIDDAY_CHOP' ? 'Midday Lull' : (sess.phase === 'POWER_HOUR_0DTE' ? 'Power Hour' : 'Active')));
            el.tickSessionLabel.textContent = `${sess.istTimeString} • ${phaseBrief}`;
            if (el.tickerSessionPill) {
                el.tickerSessionPill.className = `session-pill ${sess.phaseBadge}`;
                el.tickerSessionPill.title = `${sess.phaseLabel}: ${sess.guidance}`;
            }
        }

        // If AutoSyncSpot is active, sync spot with current index
        if (state.autoSyncSpot) {
            const currentObj = indices[state.currentIndex];
            if (currentObj && Math.abs(currentObj.spot - state.spotPrice) > 0.01) {
                state.spotPrice = currentObj.spot;
                el.inputSpot.value = state.spotPrice.toFixed(2);
                recalculateAll();
            }
        }
    });

    function flashTicker(element, dir) {
        if (!dir) return;
        const cls = dir === 'up' ? 'tick-flash-green' : 'tick-flash-red';
        element.classList.remove('tick-flash-green', 'tick-flash-red');
        void element.offsetWidth; // trigger reflow
        element.classList.add(cls);
    }

    // Audio Chime synthesizer for Optimal Entry Triggered
    function playEntryChime() {
        if (!state.soundAlert) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            const audioCtx = new AudioContext();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.type = 'sine';
            const now = audioCtx.currentTime;
            osc.frequency.setValueAtTime(587.33, now); // D5
            osc.frequency.setValueAtTime(880.00, now + 0.12); // A5
            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
            osc.start(now);
            osc.stop(now + 0.38);
        } catch (e) {
            // Audio context policy
        }
    }

    // Main Recalculation Engine
    function recalculateAll() {
        const S = parseFloat(state.spotPrice) || 25000;
        const K = parseFloat(state.strikePrice) || 25000;
        const T = Math.max(0.0001, (parseFloat(state.dteDays) || 1.0) / 365.0);
        const r = (parseFloat(state.interestRate) || 6.75) / 100.0;
        const v = (parseFloat(state.ivPercent) || 14.0) / 100.0;

        // 1. Calculate Option Greeks via Black-Scholes
        const greeks = calculateBlackScholesGreeks(state.optionType, S, K, T, r, v);

        // Fair Value determination
        const fairPrice = Math.round(greeks.price * 100) / 100;

        // Current Market Premium (LTP)
        const currentLTP = (state.premiumPaid !== null && state.premiumPaid > 0)
            ? state.premiumPaid
            : fairPrice;

        if (state.premiumPaid === null) {
            if (document.activeElement !== el.inputPremium) {
                el.inputPremium.value = fairPrice.toFixed(2);
            }
            el.badgeFairVal.textContent = `Fair: ₹${fairPrice.toFixed(2)}`;
            el.badgeFairVal.classList.remove('clickable');
            el.badgeFairVal.title = "Calculated theoretical Black-Scholes fair value based on current IV.";
        } else {
            const diff = Math.abs(currentLTP - fairPrice);
            if (diff > 0.3) {
                const solvedIV = calculateImpliedVolatility(state.optionType, S, K, T, r, currentLTP);
                el.badgeFairVal.innerHTML = `Market IV: <b>${solvedIV}%</b> <span class="sync-action">⚡ Sync</span>`;
                el.badgeFairVal.classList.add('clickable');
                el.badgeFairVal.title = `Traded LTP ₹${currentLTP.toFixed(2)} implies ${solvedIV}% IV (theoretical fair is ₹${fairPrice.toFixed(2)} at ${state.ivPercent}% IV). Click to calibrate model IV & Greeks to Kite!`;
            } else {
                el.badgeFairVal.textContent = `Fair: ₹${fairPrice.toFixed(2)}`;
                el.badgeFairVal.classList.remove('clickable');
                el.badgeFairVal.title = `Model Fair value matches traded LTP (₹${fairPrice.toFixed(2)}).`;
            }
        }

        // 2. Evaluate Optimal Entry Price & Wait / Triggered Status
        const strikeStep = window.marketFeed.indices[state.currentIndex].strikeStep;
        const entryAnalysis = calculateOptimalEntryAndStatus({
            currentLTP: currentLTP,
            customTargetEntry: state.customTargetEntry,
            slPrice: null,
            greeks: greeks,
            strikeStep: strikeStep,
            tradeAction: state.tradeAction
        });

        const activeEntryLevel = entryAnalysis.targetEntry;
        if (state.customTargetEntry === null && el.inputTargetEntry) {
            el.inputTargetEntry.value = activeEntryLevel.toFixed(2);
        }

        // 3. Target & Stop Loss anchored to the Optimal Entry Price
        const targetSL = calculateTargetAndSL({
            optionType: state.optionType,
            tradeAction: state.tradeAction,
            entryPremium: activeEntryLevel,
            spotPrice: S,
            strikePrice: K,
            lotSize: state.lotSize,
            lotsCount: state.lotsCount,
            greeks: greeks,
            riskRewardRatio: state.riskRewardRatio,
            riskMode: state.riskMode,
            slSpotPts: state.slSpotPts,
            slPremiumPct: state.slPremiumPct,
            maxCapitalRisk: state.slCapitalAmt
        });

        // 4. Final Evaluation with Stop Loss
        const finalEntryStatus = calculateOptimalEntryAndStatus({
            currentLTP: currentLTP,
            customTargetEntry: activeEntryLevel,
            slPrice: targetSL.slPrice,
            greeks: greeks,
            strikeStep: strikeStep,
            tradeAction: state.tradeAction
        });

        // Audio notification when entering trigger state
        if (state.previousEntryStatus === 'WAIT' && finalEntryStatus.status === 'TRIGGERED') {
            playEntryChime();
        }
        state.previousEntryStatus = finalEntryStatus.status;

        // 5. Generate Option Chain & OI Analytics
        const chainData = window.marketFeed.generateOptionChain(
            state.currentIndex,
            state.dteDays,
            state.ivPercent,
            6
        );
        const oiAnalytics = chainData.oiAnalytics;

        // Evaluate Strike-Specific OI Confirmation
        const oiConfirmation = evaluateOIConfirmation({
            optionType: state.optionType,
            tradeAction: state.tradeAction,
            strikePrice: K,
            spotPrice: S,
            oiData: oiAnalytics
        });

        // 6. Multi-Factor Confluence Scoring & Signal Precision Engine
        const selectedStrikeRow = chainData.strikes.find(s => s.strike === K) || chainData.strikes[0];
        const selectedBuildup = (state.optionType === 'CE' ? selectedStrikeRow?.ce?.buildup : selectedStrikeRow?.pe?.buildup)
            || { label: 'Long Buildup', code: 'LB', badgeClass: 'buildup-lb', desc: 'Active accumulation' };

        const confluence = (typeof calculateConfluenceScore === 'function')
            ? calculateConfluenceScore({
                optionType: state.optionType,
                tradeAction: state.tradeAction,
                spotPrice: S,
                vwap: oiAnalytics.vwap || S,
                greeks: greeks,
                oiConfirmation: oiConfirmation,
                pcrTrend: oiAnalytics.pcrTrend || 'STABLE',
                vix: window.marketFeed.vix,
                vixChange: window.marketFeed.vixChange || 0,
                entryStatus: finalEntryStatus,
                riskRewardRatio: state.riskRewardRatio,
                dteDays: state.dteDays
            })
            : null;

        // 7. Dynamic Trailing SL & Trade Management Schedule
        const tradeMgmt = (typeof calculateTradeManagementPlan === 'function')
            ? calculateTradeManagementPlan({
                entryPremium: activeEntryLevel,
                slPrice: targetSL.slPrice,
                targetSL: targetSL,
                greeks: greeks,
                lotSize: state.lotSize,
                lotsCount: state.lotsCount
            })
            : null;

        const sessionInfo = (typeof evaluateSessionTiming === 'function')
            ? evaluateSessionTiming()
            : null;

        // 8. Update DOM components
        updateEntryAdvisorUI(finalEntryStatus, greeks, S, oiConfirmation, confluence, selectedBuildup);
        updateOIAnalyticsUI(oiAnalytics, oiConfirmation, S, K);
        updateVerdictUI(greeks, targetSL, S, K, activeEntryLevel, currentLTP);
        updateLevelsUI(targetSL, finalEntryStatus, greeks, S, tradeMgmt);
        updateGreeksUI(greeks, currentLTP);
        updateSimulatorUI(greeks, activeEntryLevel, S);
        updateTradeSummary(targetSL, greeks, finalEntryStatus, oiConfirmation, confluence, tradeMgmt, sessionInfo);
    }

    // Dynamic Entry Advisor Banner UI Update
    function updateEntryAdvisorUI(entryStatus, greeks, S, oiConfirmation, confluence, selectedBuildup) {
        if (!el.entryAdvisorCard) return;

        el.entryAdvisorCard.className = `card entry-advisor-card ${entryStatus.statusClass}`;
        el.advCurrentLtp.textContent = `₹${entryStatus.currentLTP.toFixed(2)}`;
        el.advOptimalEntry.textContent = `₹${entryStatus.targetEntry.toFixed(2)}`;

        const diffSign = entryStatus.diffPoints > 0 ? '+' : '';
        el.advDistance.textContent = `${diffSign}₹${entryStatus.diffPoints.toFixed(2)} (${diffSign}${entryStatus.diffPercent.toFixed(1)}%)`;

        if (entryStatus.status === 'WAIT') {
            if (entryStatus.mode === 'BREAKOUT') {
                el.advisorBadge.textContent = '⏳ WAIT FOR BREAKOUT';
                const ptsRemaining = Math.abs(entryStatus.diffPoints);
                const pctRemaining = Math.abs(entryStatus.diffPercent);
                el.advisorMessageText.innerHTML = `⏳ <strong>WAIT FOR BREAKOUT:</strong> Current price is ₹${entryStatus.currentLTP.toFixed(2)}. Breakout trigger level is <strong>₹${entryStatus.targetEntry.toFixed(2)}</strong> (+₹${ptsRemaining.toFixed(2)} / +${pctRemaining.toFixed(1)}% above CMP). <strong>Wait for price to cross above ₹${entryStatus.targetEntry.toFixed(2)} to confirm upside momentum</strong> before entering!`;
            } else {
                el.advisorBadge.textContent = '⏳ WAIT FOR PULLBACK';
                el.advisorMessageText.innerHTML = `⏳ <strong>WAIT FOR PULLBACK:</strong> Current LTP is ₹${entryStatus.currentLTP.toFixed(2)}, which is above the optimal limit entry zone (₹${entryStatus.targetEntry.toFixed(2)}). <strong>Wait for a ₹${Math.abs(entryStatus.diffPoints).toFixed(2)} (${Math.abs(entryStatus.diffPercent).toFixed(1)}%) pullback</strong> into support to avoid FOMO and maintain positive Risk:Reward!`;
            }
        } else if (entryStatus.status === 'TRIGGERED') {
            if (entryStatus.mode === 'BREAKOUT') {
                el.advisorBadge.textContent = '🚀 BREAKOUT TRIGGERED';
                el.advisorMessageText.innerHTML = `🚀 <strong>BREAKOUT CONFIRMED:</strong> Price has crossed your breakout level (<strong>₹${entryStatus.targetEntry.toFixed(2)}</strong>) at ₹${entryStatus.currentLTP.toFixed(2)}! Resistance broken with momentum. Ready to execute Buy order!`;
            } else {
                el.advisorBadge.textContent = '🎯 ENTRY TRIGGERED';
                el.advisorMessageText.innerHTML = `🎯 <strong>ENTRY ZONE ACTIVE:</strong> Price has reached the optimal limit entry level (₹${entryStatus.targetEntry.toFixed(2)}). Your 1:${state.riskRewardRatio.toFixed(1)} Risk:Reward ratio is active. Ready to execute!`;
            }
        } else {
            el.advisorBadge.textContent = '⛔ SETUP INVALIDATED';
            el.advisorMessageText.innerHTML = `⛔ <strong>AVOID ENTRY:</strong> Current price (₹${entryStatus.currentLTP.toFixed(2)}) is below the Stop Loss threshold. Setup is invalidated; do not enter.`;
        }

        // Update OI confirmation strip inside Advisor Banner
        if (el.advOiPill && oiConfirmation) {
            el.advOiPill.className = `adv-oi-pill ${oiConfirmation.badgeClass}`;
            el.advOiPill.textContent = oiConfirmation.badge;
            if (el.advOiDetails) {
                el.advOiDetails.textContent = oiConfirmation.message;
            }
        }

        // Update Confluence Gauge & Factor Breakdown
        if (confluence && el.valConfluenceScore) {
            el.valConfluenceScore.textContent = confluence.totalScore;
            el.valConfluenceScore.className = `confluence-score-val font-mono ${confluence.totalScore >= 80 ? 'text-neon-green' : (confluence.totalScore >= 60 ? 'text-neon-gold' : 'text-neon-red')}`;

            if (el.badgeConfluenceConviction) {
                el.badgeConfluenceConviction.textContent = confluence.convictionBadge;
                el.badgeConfluenceConviction.className = `confluence-pill ${confluence.badgeClass}`;
            }

            if (el.textConfluenceSummary) {
                el.textConfluenceSummary.textContent = confluence.summaryAction;
            }

            if (el.valConfVwap) {
                el.valConfVwap.textContent = confluence.pillars.vwap.reason;
            }
            if (el.valConfOi) {
                el.valConfOi.textContent = confluence.pillars.oi.reason;
            }
            if (el.valConfBuildup && selectedBuildup) {
                el.valConfBuildup.textContent = `${selectedBuildup.label} [${selectedBuildup.code}]`;
                el.valConfBuildup.title = selectedBuildup.desc;
            }
            if (el.valConfVix) {
                el.valConfVix.textContent = confluence.pillars.vix.reason;
            }
            if (el.valConfGreeks) {
                el.valConfGreeks.textContent = confluence.pillars.greeks.reason;
            }
        }
    }

    // Dynamic OI Analytics & PCR Sentiment Engine Update
    function updateOIAnalyticsUI(oiAnalytics, oiConfirmation, spotPrice, strikePrice) {
        if (!el.valPcrNumber || !oiAnalytics) return;

        // 1. PCR & Header
        if (el.valPcrHeaderTag) {
            el.valPcrHeaderTag.textContent = `PCR ${oiAnalytics.pcr.toFixed(2)} • ${oiAnalytics.pcrSentiment}`;
        }
        el.valPcrNumber.textContent = oiAnalytics.pcr.toFixed(2);
        el.valPcrBadge.textContent = oiAnalytics.pcrSentiment;
        el.valPcrBadge.className = `pcr-badge ${oiAnalytics.pcrBadgeClass}`;
        el.valPcrDesc.textContent = oiAnalytics.pcrDescription;

        // Visual PE vs CE distribution bar
        const totalOI = oiAnalytics.totalCeOI + oiAnalytics.totalPeOI;
        const peRatio = totalOI > 0 ? Math.round((oiAnalytics.totalPeOI / totalOI) * 100) : 50;
        const ceRatio = 100 - peRatio;
        if (el.barPeOIPct) {
            el.barPeOIPct.style.width = `${peRatio}%`;
            el.barPeOIPct.textContent = `PE ${peRatio}%`;
        }
        if (el.barCeOIPct) {
            el.barCeOIPct.style.width = `${ceRatio}%`;
            el.barCeOIPct.textContent = `CE ${ceRatio}%`;
        }

        // 2. Key Support Floor (Max Put OI)
        if (el.valMaxPutStrike) {
            el.valMaxPutStrike.textContent = `${oiAnalytics.maxPeStrike} PE`;
            el.valMaxPutContracts.textContent = `${(oiAnalytics.maxPeOI / 1000).toFixed(0)}k contracts`;
        }

        // 3. Key Resistance Wall (Max Call OI)
        if (el.valMaxCallStrike) {
            el.valMaxCallStrike.textContent = `${oiAnalytics.maxCeStrike} CE`;
            el.valMaxCallContracts.textContent = `${(oiAnalytics.maxCeOI / 1000).toFixed(0)}k contracts`;
        }

        // 4. Max Pain Pin Level
        if (el.valMaxPainStrike) {
            el.valMaxPainStrike.textContent = `${oiAnalytics.maxPainStrike}`;
            const painDiff = Math.round(oiAnalytics.maxPainStrike - spotPrice);
            const painSign = painDiff >= 0 ? '+' : '';
            el.valMaxPainDistance.textContent = `${painSign}${painDiff} pts from spot`;
        }

        // 5. Strike Confirmation Banner inside OI Card
        if (el.oiTradeConfirmationBanner && oiConfirmation) {
            el.oiTradeConfirmationBanner.className = `oi-trade-confirmation-banner ${oiConfirmation.badgeClass}`;
            if (el.oiConfirmIcon) {
                el.oiConfirmIcon.textContent = oiConfirmation.status === 'CONFIRMED' ? '🛡️' : (oiConfirmation.status === 'CAUTION' ? '⚠️' : '⚖️');
            }
            if (el.oiConfirmTitle) {
                el.oiConfirmTitle.textContent = oiConfirmation.badge;
            }
            if (el.oiConfirmBody) {
                el.oiConfirmBody.textContent = oiConfirmation.message;
            }
        }
    }

    // Verdict Banner UI Update
    function updateVerdictUI(greeks, targetSL, S, K, entryPremium, currentLTP) {
        const isBuyer = state.tradeAction === 'BUY';
        el.verdictActionTag.textContent = state.tradeAction;
        el.verdictActionTag.className = `action-tag ${isBuyer ? '' : 'sell-mode'}`;

        const indexName = window.marketFeed.indices[state.currentIndex].name;
        el.verdictTitle.textContent = `${indexName} ${K} ${state.optionType}`;
        el.verdictMeta.textContent = `Spot: ${S.toFixed(2)} | DTE: ${state.dteDays.toFixed(1)}d | IV: ${state.ivPercent}% | LTP: ₹${(currentLTP || entryPremium).toFixed(2)} | Entry: ₹${entryPremium.toFixed(2)}`;

        // Moneyness Badge
        el.badgeMoneyness.textContent = greeks.moneyness;
        el.badgeMoneyness.style.color = greeks.moneyness.includes('ITM') ? 'var(--neon-green)' : (greeks.moneyness.includes('OTM') ? 'var(--neon-gold)' : 'var(--neon-cyan)');

        // Quick Stats
        el.statCapital.textContent = `₹${targetSL.capitalRequired.toLocaleString('en-IN')}`;
        el.statBreakEven.textContent = targetSL.breakEvenSpot.toFixed(2);
        el.statEffectiveRR.textContent = targetSL.effectiveRR;

        // Visual Risk-Reward Meter
        el.meterLossLabel.textContent = `Max Risk: -₹${targetSL.maxRiskINR.toLocaleString('en-IN')}`;
        el.meterProfitLabel.textContent = `Target 2: +₹${targetSL.t2.profitINR.toLocaleString('en-IN')}`;

        const totalPointsSpan = targetSL.slPoints + targetSL.targetPoints;
        const riskWidthPct = Math.max(10, Math.min(80, (targetSL.slPoints / totalPointsSpan) * 100));
        const rewardWidthPct = 100 - riskWidthPct;

        el.meterRiskBar.style.width = `${riskWidthPct}%`;
        el.meterRewardBar.style.width = `${rewardWidthPct}%`;
    }

    // Levels UI Update (Entry, SL & Targets)
    function updateLevelsUI(targetSL, entryStatus, greeks, S, tradeMgmt) {
        // Optimal Entry Level Card
        if (el.valEntryPrice) {
            el.valEntryPrice.textContent = `₹${entryStatus.targetEntry.toFixed(2)}`;
            if (entryStatus.status === 'WAIT') {
                el.valEntryStatus.textContent = `WAIT (-₹${Math.abs(entryStatus.diffPoints).toFixed(2)})`;
                el.valEntryStatus.className = 'text-neon-gold text-bold';
            } else if (entryStatus.status === 'TRIGGERED') {
                el.valEntryStatus.textContent = `READY / ENTER`;
                el.valEntryStatus.className = 'text-neon-green text-bold';
            } else {
                el.valEntryStatus.textContent = `INVALIDATED`;
                el.valEntryStatus.className = 'text-neon-red text-bold';
            }

            // Index spot level corresponding to entry
            const isCall = state.optionType === 'CE';
            const isBuyer = state.tradeAction === 'BUY';
            const safeDelta = Math.max(0.15, Math.abs(greeks.delta) || 0.5);
            const spotRetestDiff = entryStatus.diffPoints / safeDelta;
            const spotRetest = (isCall && isBuyer) ? S - spotRetestDiff : S + spotRetestDiff;
            el.valEntrySpotTrigger.textContent = spotRetest.toFixed(2);
        }

        // SL
        el.valSlPrice.textContent = `₹${targetSL.slPrice.toFixed(2)}`;
        el.valSlPoints.textContent = `-${targetSL.slPoints.toFixed(2)} pts`;
        el.valSlInr.textContent = `(-₹${targetSL.maxRiskINR.toLocaleString('en-IN')})`;
        el.valSlSpotTrigger.textContent = targetSL.slSpotPrice.toFixed(2);

        // T1
        el.valT1Price.textContent = `₹${targetSL.t1.price.toFixed(2)}`;
        el.valT1Points.textContent = `+${targetSL.t1.points.toFixed(2)} pts`;
        el.valT1Inr.textContent = `(+₹${targetSL.t1.profitINR.toLocaleString('en-IN')})`;
        const spot1Trigger = state.spotPrice + (state.optionType === 'CE' ? targetSL.targetUnderlyingPts * 0.75 : -targetSL.targetUnderlyingPts * 0.75);
        el.valT1SpotTrigger.textContent = spot1Trigger.toFixed(2);

        // T2 (Main)
        el.valT2Price.textContent = `₹${targetSL.t2.price.toFixed(2)}`;
        el.valT2Points.textContent = `+${targetSL.t2.points.toFixed(2)} pts`;
        el.valT2Inr.textContent = `(+₹${targetSL.t2.profitINR.toLocaleString('en-IN')})`;
        el.valT2SpotTrigger.textContent = targetSL.targetSpotPrice.toFixed(2);

        // T3 (Runner)
        el.valT3Price.textContent = `₹${targetSL.t3.price.toFixed(2)}`;
        el.valT3Points.textContent = `+${targetSL.t3.points.toFixed(2)} pts`;
        el.valT3Inr.textContent = `(+₹${targetSL.t3.profitINR.toLocaleString('en-IN')})`;
        const spot3Trigger = state.spotPrice + (state.optionType === 'CE' ? targetSL.targetUnderlyingPts * 1.5 : -targetSL.targetUnderlyingPts * 1.5);
        el.valT3SpotTrigger.textContent = spot3Trigger.toFixed(2);

        // Dynamic Trailing SL Schedule & Theta Cutoff Update
        if (tradeMgmt) {
            if (el.trailT1Action) el.trailT1Action.textContent = tradeMgmt.trailAtT1.action;
            if (el.trailT1Text) el.trailT1Text.textContent = tradeMgmt.trailAtT1.statusText;
            if (el.trailT2Action) el.trailT2Action.textContent = tradeMgmt.trailAtT2.action;
            if (el.trailT2Text) el.trailT2Text.textContent = tradeMgmt.trailAtT2.statusText;
            if (el.trailThetaWarning) el.trailThetaWarning.textContent = tradeMgmt.thetaCutoff.warning;
            if (el.trailThetaSub) el.trailThetaSub.textContent = `Decay rate: -₹${tradeMgmt.thetaCutoff.thetaHourlyINR}/hr (Lot: ${state.lotSize * state.lotsCount} Qty)`;
        }
    }

    // Greeks UI Update
    function updateGreeksUI(greeks, entryPremium) {
        // Delta
        el.valGreekDelta.textContent = greeks.delta.toFixed(3);
        const perPointMoveINR = Math.abs(greeks.delta * state.lotSize * state.lotsCount);
        el.impactDelta.textContent = `1 pt Spot: ±₹${perPointMoveINR.toFixed(1)} / pos`;
        el.barDelta.style.width = `${Math.min(100, Math.abs(greeks.delta) * 100)}%`;

        // Theta
        el.valGreekTheta.textContent = greeks.thetaDaily.toFixed(2);
        const dailyLossINR = Math.abs(greeks.thetaDaily * state.lotSize * state.lotsCount);
        el.impactTheta.textContent = `Hourly: ${greeks.thetaHourly.toFixed(2)} | -₹${dailyLossINR.toFixed(0)}/day`;
        el.barTheta.style.width = `${Math.min(100, (Math.abs(greeks.thetaDaily) / (entryPremium || 1)) * 100 * 2)}%`;

        // Gamma
        el.valGreekGamma.textContent = greeks.gamma.toFixed(5);
        const deltaShift100 = (greeks.gamma * 100).toFixed(2);
        el.impactGamma.textContent = `Δ shifts ±${deltaShift100} per 100 pt move`;
        el.barGamma.style.width = `${Math.min(100, greeks.gamma * 25000)}%`;

        // Vega
        el.valGreekVega.textContent = greeks.vega.toFixed(2);
        const vegaPnl = (greeks.vega * state.lotSize * state.lotsCount).toFixed(0);
        el.impactVega.textContent = `1% IV change: ±₹${vegaPnl} / pos`;
        el.barVega.style.width = `${Math.min(100, (greeks.vega / (entryPremium || 1)) * 100)}%`;

        // Rho
        el.valGreekRho.textContent = greeks.rho.toFixed(2);
        el.impactRho.textContent = `Per 1% Interest rate shift`;
        el.barRho.style.width = `${Math.min(100, Math.abs(greeks.rho) * 15)}%`;

        // Premium Decomposition
        el.valDecompTotal.textContent = `LTP: ₹${entryPremium.toFixed(2)}`;
        el.valIntrinsic.textContent = `₹${greeks.intrinsicValue.toFixed(2)}`;
        el.valExtrinsic.textContent = `₹${greeks.extrinsicValue.toFixed(2)}`;

        const totalVal = Math.max(0.01, greeks.intrinsicValue + greeks.extrinsicValue);
        const intPct = Math.round((greeks.intrinsicValue / totalVal) * 100);
        const extPct = 100 - intPct;

        el.barIntrinsic.style.width = `${intPct}%`;
        el.barExtrinsic.style.width = `${extPct}%`;
    }

    // Option Chain Table Generator
    function renderOptionChain() {
        const chainData = window.marketFeed.generateOptionChain(
            state.currentIndex,
            state.dteDays,
            state.ivPercent,
            6 // 6 strikes above and below ATM
        );

        el.chainTableBody.innerHTML = '';

        chainData.strikes.forEach(row => {
            const tr = document.createElement('tr');
            if (row.isATM) tr.classList.add('row-atm');

            const isSelected = row.strike === state.strikePrice;

            const maxCeBadge = row.isMaxCallOI ? ' <span class="badge-oi-res" title="Major Call Resistance Wall">RES WALL</span>' : '';
            const maxPeBadge = row.isMaxPutOI ? ' <span class="badge-oi-sup" title="Major Put Support Floor">SUP FLOOR</span>' : '';
            const maxPainBadge = row.isMaxPain ? ' <span class="badge-oi-pain" title="Expiry Max Pain Pin Strike">PAIN</span>' : '';

            const ceBuildup = row.ce.buildup ? `<span class="buildup-badge ${row.ce.buildup.badgeClass}" title="${row.ce.buildup.label}: ${row.ce.buildup.desc}">[${row.ce.buildup.code}]</span>` : '';
            const peBuildup = row.pe.buildup ? `<span class="buildup-badge ${row.pe.buildup.badgeClass}" title="${row.pe.buildup.label}: ${row.pe.buildup.desc}">[${row.pe.buildup.code}]</span>` : '';

            tr.innerHTML = `
                <td class="clickable-cell ${row.isITM_CE ? 'itm-ce-cell' : ''}" data-type="CE" data-strike="${row.strike}" data-price="${row.ce.price}">
                    <span class="font-mono text-neon-green">₹${row.ce.price.toFixed(2)}</span>
                </td>
                <td class="${row.isITM_CE ? 'itm-ce-cell' : ''} text-muted">${row.ce.delta.toFixed(2)}</td>
                <td class="${row.isITM_CE ? 'itm-ce-cell' : ''} text-muted">${(row.ce.oi / 1000).toFixed(0)}k${ceBuildup}${maxCeBadge}</td>

                <td class="strike-cell ${isSelected ? 'text-neon-cyan' : ''}">
                    ${row.strike} ${row.isATM ? '<small>(ATM)</small>' : ''}${maxPainBadge}
                </td>

                <td class="${row.isITM_PE ? 'itm-pe-cell' : ''} text-muted">${(row.pe.oi / 1000).toFixed(0)}k${peBuildup}${maxPeBadge}</td>
                <td class="${row.isITM_PE ? 'itm-pe-cell' : ''} text-muted">${row.pe.delta.toFixed(2)}</td>
                <td class="clickable-cell ${row.isITM_PE ? 'itm-pe-cell' : ''}" data-type="PE" data-strike="${row.strike}" data-price="${row.pe.price}">
                    <span class="font-mono text-neon-red">₹${row.pe.price.toFixed(2)}</span>
                </td>
            `;

            el.chainTableBody.appendChild(tr);
        });

        // Add click events to load any strike from Option Chain
        el.chainTableBody.querySelectorAll('.clickable-cell').forEach(cell => {
            cell.addEventListener('click', () => {
                const type = cell.dataset.type;
                const strike = parseFloat(cell.dataset.strike);
                const price = parseFloat(cell.dataset.price);

                state.optionType = type;
                state.strikePrice = strike;
                state.premiumPaid = price;

                // Update UI toggles
                el.cePeButtons.forEach(b => b.classList.toggle('active', b.dataset.type === type));
                el.inputStrike.value = strike;
                el.inputPremium.value = price.toFixed(2);

                recalculateAll();
                renderOptionChain();
            });
        });
    }

    // What-If Simulator Update
    function updateSimulatorUI(greeks, entryPremium, S) {
        const deltaSpot = parseFloat(state.simSpotMove) || 0;
        const daysHeld = parseFloat(state.simDaysHeld) || 0;

        const proj = projectOptionPrice(greeks, entryPremium, deltaSpot, daysHeld, 0);
        const isBuyer = state.tradeAction === 'BUY';
        const totalQty = state.lotSize * state.lotsCount;

        const pnlPerUnit = isBuyer
            ? (proj.projectedPrice - entryPremium)
            : (entryPremium - proj.projectedPrice);
        const totalPnlINR = Math.round(pnlPerUnit * totalQty);

        el.simProjPrice.textContent = `₹${proj.projectedPrice.toFixed(2)}`;
        el.simNetPoints.textContent = `${proj.netChange >= 0 ? '+' : ''}${proj.netChange.toFixed(2)} pts`;
        el.simTotalPnl.textContent = `${totalPnlINR >= 0 ? '+' : ''}₹${totalPnlINR.toLocaleString('en-IN')}`;
        el.simTotalPnl.className = `font-mono text-bold ${totalPnlINR >= 0 ? 'text-neon-green' : 'text-neon-red'}`;

        const deltaPnl = Math.round(proj.deltaImpact * totalQty);
        const thetaPnl = Math.round(proj.thetaImpact * totalQty);
        const gammaPnl = Math.round(proj.gammaImpact * totalQty);

        el.simBreakdownDetails.textContent = `Δ: ${deltaPnl >= 0 ? '+' : ''}₹${deltaPnl} | Θ: ${thetaPnl >= 0 ? '+' : ''}₹${thetaPnl} | Γ: +₹${gammaPnl}`;

        drawPayoffCanvas(greeks, entryPremium, S);
    }

    // Draw Payoff Canvas
    function drawPayoffCanvas(greeks, entryPremium, spot) {
        const canvas = el.payoffCanvas;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        ctx.clearRect(0, 0, width, height);

        // Grid lines & Zero line
        const zeroY = height * 0.55;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.moveTo(0, zeroY);
        ctx.lineTo(width, zeroY);
        ctx.stroke();

        // Calculate points across -200 to +200 spot movement
        const range = 200;
        const points = [];
        const isBuyer = state.tradeAction === 'BUY';
        const totalQty = state.lotSize * state.lotsCount;

        for (let x = 0; x <= width; x += 10) {
            const deltaSpot = ((x / width) - 0.5) * 2 * range;
            const proj = projectOptionPrice(greeks, entryPremium, deltaSpot, state.simDaysHeld, 0);
            const pnl = isBuyer ? (proj.projectedPrice - entryPremium) * totalQty : (entryPremium - proj.projectedPrice) * totalQty;
            const y = zeroY - (pnl / (entryPremium * totalQty || 1)) * (height * 0.4);
            points.push({ x, y: Math.max(10, Math.min(height - 10, y)) });
        }

        // Draw curve
        ctx.beginPath();
        ctx.strokeStyle = '#00F0FF';
        ctx.lineWidth = 2.5;
        points.forEach((pt, idx) => {
            if (idx === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();

        // Marker for current simulated spot
        const currentSimX = ((state.simSpotMove / (2 * range)) + 0.5) * width;
        if (currentSimX >= 0 && currentSimX <= width) {
            ctx.fillStyle = '#00E676';
            ctx.beginPath();
            ctx.arc(currentSimX, zeroY, 4, 0, Math.PI * 2);
            ctx.fill();
        }

        // Labels
        ctx.fillStyle = '#64748B';
        ctx.font = '10px JetBrains Mono';
        ctx.fillText('-200 pts', 10, height - 8);
        ctx.fillText('Current Spot', width / 2 - 30, height - 8);
        ctx.fillText('+200 pts', width - 60, height - 8);
        ctx.fillText('+Profit', 10, 18);
        ctx.fillText('-Loss', 10, height - 25);
    }

    // Trade Plan Summary Formatter
    function updateTradeSummary(targetSL, greeks, entryStatus, oiConfirmation, confluence, tradeMgmt, sessionInfo) {
        const entryText = entryStatus ? `
OPTIMAL ENTRY TARGET: ₹${entryStatus.targetEntry.toFixed(2)} [Status: ${entryStatus.status}]
CURRENT MARKET LTP  : ₹${entryStatus.currentLTP.toFixed(2)} (${entryStatus.diffPoints >= 0 ? '+' : ''}${entryStatus.diffPoints.toFixed(2)} pts away)
ADVISOR NOTE        : ${entryStatus.message}
` : '';

        const oiText = oiConfirmation ? `
OI CONFIRMATION     : [${oiConfirmation.badge}] ${oiConfirmation.message}
PCR METRIC          : ${oiConfirmation.pcr.toFixed(2)} | S&R Walls: Sup ₹${oiConfirmation.maxPeStrike} / Res ₹${oiConfirmation.maxCeStrike}
` : '';

        const confText = confluence ? `
SIGNAL CONFLUENCE   : [${confluence.convictionBadge}] Score: ${confluence.totalScore}/100
CONFLUENCE ACTION   : ${confluence.summaryAction}
PILLARS EVALUATED   : VWAP: ${confluence.pillars.vwap.reason} | VIX: ${confluence.pillars.vix.reason}
` : '';

        const mgmtText = tradeMgmt ? `--------------------------------
[DYNAMIC TRADE MANAGEMENT]
• Stage 1 (At T1): ${tradeMgmt.trailAtT1.action} (${tradeMgmt.trailAtT1.statusText})
• Stage 2 (At T2): ${tradeMgmt.trailAtT2.action} (${tradeMgmt.trailAtT2.statusText})
• ${tradeMgmt.thetaCutoff.warning}
` : '';

        const timingText = sessionInfo ? `SESSION TIMING      : ${sessionInfo.istTimeString} (${sessionInfo.phaseLabel})\n` : '';

        const text = 
`[ALPHAGREEKS PRECISION TRADE PLAN]
Instrument: ${state.currentIndex} ${state.strikePrice} ${state.optionType}
Action: ${state.tradeAction} | Lots: ${state.lotsCount} (Qty: ${targetSL.totalQty})
${timingText}${entryText}${oiText}${confText}--------------------------------
STOP LOSS (SL): ₹${targetSL.slPrice.toFixed(2)} (-${targetSL.slPoints.toFixed(2)} pts | Max Risk: -₹${targetSL.maxRiskINR.toLocaleString('en-IN')})
SL Index Trigger: ${targetSL.slSpotPrice.toFixed(2)}

TARGET 1 (1:1.5): ₹${targetSL.t1.price.toFixed(2)} (+${targetSL.t1.points.toFixed(2)} pts | Profit: +₹${targetSL.t1.profitINR.toLocaleString('en-IN')})
TARGET 2 (1:2.0): ₹${targetSL.t2.price.toFixed(2)} (+${targetSL.t2.points.toFixed(2)} pts | Profit: +₹${targetSL.t2.profitINR.toLocaleString('en-IN')})
TARGET 3 (1:3.0): ₹${targetSL.t3.price.toFixed(2)} (+${targetSL.t3.points.toFixed(2)} pts | Profit: +₹${targetSL.t3.profitINR.toLocaleString('en-IN')})
${mgmtText}--------------------------------
Greeks: Δ: ${greeks.delta.toFixed(2)} | Θ: ${greeks.thetaDaily.toFixed(2)} | Γ: ${greeks.gamma.toFixed(4)} | IV: ${state.ivPercent}%
Break-Even Index: ${targetSL.breakEvenSpot.toFixed(2)} | Effective RR: ${targetSL.effectiveRR}`;

        el.orderSummaryText.textContent = text;
    }

    // =========================================================
    // EVENT LISTENERS & USER CONTROLS
    // =========================================================

    // Optimal Entry Input & Quick Chips
    const allEntryChips = [el.chipEntryAuto, el.chipEntryDip5, el.chipEntryDip8, el.chipEntryCmp, el.chipEntryBreak5, el.chipEntryBreak10];

    if (el.inputTargetEntry) {
        el.inputTargetEntry.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            state.customTargetEntry = isNaN(val) ? null : val;
            state.entryMode = 'custom';
            const currLTP = parseFloat(el.inputPremium.value) || 100;
            if (state.customTargetEntry && state.customTargetEntry > currLTP * 1.002) {
                el.badgeEntryMode.textContent = '🚀 Breakout Setup';
            } else if (state.customTargetEntry && state.customTargetEntry < currLTP * 0.998) {
                el.badgeEntryMode.textContent = '🎯 Pullback Setup';
            } else {
                el.badgeEntryMode.textContent = 'Custom Limit';
            }
            allEntryChips.forEach(c => c && c.classList.remove('active'));
            recalculateAll();
        });
    }

    if (el.btnAutoEntry) {
        el.btnAutoEntry.addEventListener('click', () => {
            state.customTargetEntry = null;
            state.entryMode = 'auto';
            el.badgeEntryMode.textContent = 'Auto Pullback';
            allEntryChips.forEach(c => c && c.classList.remove('active'));
            if (el.chipEntryAuto) el.chipEntryAuto.classList.add('active');
            recalculateAll();
        });
    }

    if (el.chipEntryAuto) {
        el.chipEntryAuto.addEventListener('click', () => {
            state.customTargetEntry = null;
            state.entryMode = 'auto';
            el.badgeEntryMode.textContent = 'Auto Pullback';
            allEntryChips.forEach(c => c && c.classList.remove('active'));
            el.chipEntryAuto.classList.add('active');
            recalculateAll();
        });
    }

    if (el.chipEntryDip5) {
        el.chipEntryDip5.addEventListener('click', () => {
            const curr = parseFloat(el.inputPremium.value) || 100;
            state.customTargetEntry = Math.round(curr * 0.95 * 100) / 100;
            state.entryMode = 'dip5';
            el.badgeEntryMode.textContent = '-5% Dip';
            allEntryChips.forEach(c => c && c.classList.remove('active'));
            el.chipEntryDip5.classList.add('active');
            el.inputTargetEntry.value = state.customTargetEntry.toFixed(2);
            recalculateAll();
        });
    }

    if (el.chipEntryDip8) {
        el.chipEntryDip8.addEventListener('click', () => {
            const curr = parseFloat(el.inputPremium.value) || 100;
            state.customTargetEntry = Math.round(curr * 0.92 * 100) / 100;
            state.entryMode = 'dip8';
            el.badgeEntryMode.textContent = '-8% Dip';
            allEntryChips.forEach(c => c && c.classList.remove('active'));
            el.chipEntryDip8.classList.add('active');
            el.inputTargetEntry.value = state.customTargetEntry.toFixed(2);
            recalculateAll();
        });
    }

    if (el.chipEntryCmp) {
        el.chipEntryCmp.addEventListener('click', () => {
            const curr = parseFloat(el.inputPremium.value) || 100;
            state.customTargetEntry = curr;
            state.entryMode = 'cmp';
            el.badgeEntryMode.textContent = 'At CMP';
            allEntryChips.forEach(c => c && c.classList.remove('active'));
            el.chipEntryCmp.classList.add('active');
            el.inputTargetEntry.value = state.customTargetEntry.toFixed(2);
            recalculateAll();
        });
    }

    if (el.chipEntryBreak5) {
        el.chipEntryBreak5.addEventListener('click', () => {
            const curr = parseFloat(el.inputPremium.value) || 100;
            state.customTargetEntry = Math.round(curr * 1.05 * 100) / 100;
            state.entryMode = 'break5';
            el.badgeEntryMode.textContent = '+5% Breakout';
            allEntryChips.forEach(c => c && c.classList.remove('active'));
            el.chipEntryBreak5.classList.add('active');
            el.inputTargetEntry.value = state.customTargetEntry.toFixed(2);
            recalculateAll();
        });
    }

    if (el.chipEntryBreak10) {
        el.chipEntryBreak10.addEventListener('click', () => {
            const curr = parseFloat(el.inputPremium.value) || 100;
            state.customTargetEntry = Math.round(curr * 1.10 * 100) / 100;
            state.entryMode = 'break10';
            el.badgeEntryMode.textContent = '+10% Breakout';
            allEntryChips.forEach(c => c && c.classList.remove('active'));
            el.chipEntryBreak10.classList.add('active');
            el.inputTargetEntry.value = state.customTargetEntry.toFixed(2);
            recalculateAll();
        });
    }

    // Toggle Audio Alert
    if (el.btnToggleSound) {
        el.btnToggleSound.addEventListener('click', () => {
            state.soundAlert = !state.soundAlert;
            el.btnToggleSound.classList.toggle('active', state.soundAlert);
            el.soundIcon.textContent = state.soundAlert ? '🔔' : '🔕';
            el.soundLabel.textContent = state.soundAlert ? 'Alert: ON' : 'Alert: OFF';
            if (state.soundAlert) playEntryChime();
        });
    }

    // Index Selector Buttons
    el.indexButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            initIndex(btn.dataset.index);
        });
    });

    el.tickerPills.forEach(pill => {
        pill.addEventListener('click', () => {
            initIndex(pill.dataset.index);
        });
    });

    // Spot Price manual input & sync button
    el.inputSpot.addEventListener('input', (e) => {
        state.spotPrice = parseFloat(e.target.value) || 25000;
        state.autoSyncSpot = false;
        el.badgeSpotStatus.textContent = 'Manual';
        el.badgeSpotStatus.style.color = 'var(--neon-gold)';
        recalculateAll();
        renderOptionChain();
    });

    el.btnApplyCurrentSpot.addEventListener('click', () => {
        state.autoSyncSpot = true;
        el.badgeSpotStatus.textContent = 'Live Synced';
        el.badgeSpotStatus.style.color = 'var(--neon-cyan)';
        const curr = window.marketFeed.indices[state.currentIndex];
        state.spotPrice = curr.spot;
        el.inputSpot.value = state.spotPrice.toFixed(2);
        recalculateAll();
        renderOptionChain();
    });

    // CE / PE Toggle
    el.cePeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            el.cePeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.optionType = btn.dataset.type;
            state.premiumPaid = null; // reset to recalculate fair value
            recalculateAll();
        });
    });

    // BUY / SELL Toggle
    el.buySellButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            el.buySellButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.tradeAction = btn.dataset.action;
            recalculateAll();
        });
    });

    // Strike Price Input
    el.inputStrike.addEventListener('input', (e) => {
        state.strikePrice = parseFloat(e.target.value) || 25000;
        state.premiumPaid = null;
        recalculateAll();
    });

    // Quick Strike Adjusters
    el.chipAtm.addEventListener('click', () => {
        state.strikePrice = window.marketFeed.getATMStrike(state.currentIndex, state.spotPrice);
        el.inputStrike.value = state.strikePrice;
        state.premiumPaid = null;
        recalculateAll();
    });

    el.chipStepPlus.addEventListener('click', () => {
        const step = window.marketFeed.indices[state.currentIndex].strikeStep;
        state.strikePrice += step;
        el.inputStrike.value = state.strikePrice;
        state.premiumPaid = null;
        recalculateAll();
    });

    el.chipStepMinus.addEventListener('click', () => {
        const step = window.marketFeed.indices[state.currentIndex].strikeStep;
        state.strikePrice -= step;
        el.inputStrike.value = state.strikePrice;
        state.premiumPaid = null;
        recalculateAll();
    });

    el.chipOtm1.addEventListener('click', () => {
        const step = window.marketFeed.indices[state.currentIndex].strikeStep;
        const atm = window.marketFeed.getATMStrike(state.currentIndex, state.spotPrice);
        state.strikePrice = state.optionType === 'CE' ? atm + step : atm - step;
        el.inputStrike.value = state.strikePrice;
        state.premiumPaid = null;
        recalculateAll();
    });

    el.chipItm1.addEventListener('click', () => {
        const step = window.marketFeed.indices[state.currentIndex].strikeStep;
        const atm = window.marketFeed.getATMStrike(state.currentIndex, state.spotPrice);
        state.strikePrice = state.optionType === 'CE' ? atm - step : atm + step;
        el.inputStrike.value = state.strikePrice;
        state.premiumPaid = null;
        recalculateAll();
    });

    // Expiry Range & Chips
    el.rangeDte.addEventListener('input', (e) => {
        state.dteDays = parseFloat(e.target.value);
        el.valDteDisplay.textContent = `${state.dteDays.toFixed(1)} Days`;
        el.dteChips.forEach(c => c.classList.remove('active'));
        state.premiumPaid = null;
        recalculateAll();
        renderOptionChain();
    });

    el.dteChips.forEach(chip => {
        chip.addEventListener('click', () => {
            el.dteChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            state.dteDays = parseFloat(chip.dataset.dte);
            el.rangeDte.value = state.dteDays;
            el.valDteDisplay.textContent = `${state.dteDays.toFixed(1)} Days`;
            state.premiumPaid = null;
            recalculateAll();
            renderOptionChain();
        });
    });

    // IV & Interest Rate
    el.inputIV.addEventListener('input', (e) => {
        state.ivPercent = parseFloat(e.target.value) || 14.0;
        state.premiumPaid = null;
        recalculateAll();
        renderOptionChain();
    });

    el.ivVixHint.addEventListener('click', () => {
        state.ivPercent = window.marketFeed.vix;
        el.inputIV.value = state.ivPercent;
        state.premiumPaid = null;
        recalculateAll();
        renderOptionChain();
    });

    el.inputRate.addEventListener('input', (e) => {
        state.interestRate = parseFloat(e.target.value) || 6.75;
        state.premiumPaid = null;
        recalculateAll();
    });

    // Premium Input
    el.inputPremium.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        state.premiumPaid = isNaN(val) ? null : val;
        recalculateAll();
    });

    el.inputPremium.addEventListener('blur', () => {
        if (state.premiumPaid === null) {
            recalculateAll();
        }
    });

    // Fair / Market IV Sync Badge Click
    el.badgeFairVal.addEventListener('click', () => {
        if (state.premiumPaid !== null && state.premiumPaid > 0) {
            const S = parseFloat(state.spotPrice) || 25000;
            const K = parseFloat(state.strikePrice) || 25000;
            const T = Math.max(0.0001, (parseFloat(state.dteDays) || 1.0) / 365.0);
            const r = (parseFloat(state.interestRate) || 6.75) / 100.0;
            const solvedIV = calculateImpliedVolatility(state.optionType, S, K, T, r, state.premiumPaid);
            if (solvedIV > 0) {
                state.ivPercent = solvedIV;
                el.inputIV.value = solvedIV;
                if (window.audioEngine) window.audioEngine.playAlert();
                recalculateAll();
                renderOptionChain();
            }
        }
    });

    // Lots Count
    el.inputLots.addEventListener('input', (e) => {
        state.lotsCount = Math.max(1, parseInt(e.target.value) || 1);
        recalculateAll();
    });

    // Risk Mode Selection
    el.riskModeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            el.riskModeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.riskMode = btn.dataset.mode;

            el.groupSlSpot.classList.toggle('hidden', state.riskMode !== 'spot_pts');
            el.groupSlPct.classList.toggle('hidden', state.riskMode !== 'premium_pct');
            el.groupSlAmt.classList.toggle('hidden', state.riskMode !== 'capital_amt');

            recalculateAll();
        });
    });

    el.inputSlSpot.addEventListener('input', (e) => {
        state.slSpotPts = parseFloat(e.target.value) || 30;
        recalculateAll();
    });
    el.inputSlPct.addEventListener('input', (e) => {
        state.slPremiumPct = parseFloat(e.target.value) || 20;
        recalculateAll();
    });
    el.inputSlAmt.addEventListener('input', (e) => {
        state.slCapitalAmt = parseFloat(e.target.value) || 1500;
        recalculateAll();
    });

    // Risk Reward Slider & Presets
    el.rangeRR.addEventListener('input', (e) => {
        state.riskRewardRatio = parseFloat(e.target.value);
        el.valRrDisplay.textContent = `1 : ${state.riskRewardRatio.toFixed(1)}`;
        el.rrChips.forEach(c => c.classList.remove('active'));
        recalculateAll();
    });

    el.rrChips.forEach(chip => {
        chip.addEventListener('click', () => {
            el.rrChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            state.riskRewardRatio = parseFloat(chip.dataset.rr);
            el.rangeRR.value = state.riskRewardRatio;
            el.valRrDisplay.textContent = `1 : ${state.riskRewardRatio.toFixed(1)}`;
            recalculateAll();
        });
    });

    // Panel Tabs Switching
    el.tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            el.tabButtons.forEach(b => b.classList.remove('active'));
            el.tabContents.forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            const targetId = btn.dataset.tab;
            const targetEl = document.getElementById(targetId);
            if (targetEl) targetEl.classList.add('active');

            if (targetId === 'tabSimulator') {
                const S = parseFloat(state.spotPrice) || 25000;
                const K = parseFloat(state.strikePrice) || 25000;
                const T = Math.max(0.0001, (parseFloat(state.dteDays) || 1.0) / 365.0);
                const r = (parseFloat(state.interestRate) || 6.75) / 100.0;
                const v = (parseFloat(state.ivPercent) || 14.0) / 100.0;
                const greeks = calculateBlackScholesGreeks(state.optionType, S, K, T, r, v);
                const entryPremium = (state.premiumPaid !== null && state.premiumPaid > 0) ? state.premiumPaid : greeks.price;
                drawPayoffCanvas(greeks, entryPremium, S);
            }
        });
    });

    // Simulator Sliders
    el.simSpotSlider.addEventListener('input', (e) => {
        state.simSpotMove = parseFloat(e.target.value);
        const simSpotExact = (state.spotPrice + state.simSpotMove).toFixed(2);
        el.simSpotVal.textContent = `${state.simSpotMove >= 0 ? '+' : ''}${state.simSpotMove} pts (${simSpotExact})`;
        recalculateAll();
    });

    el.simHoldingDays.addEventListener('input', (e) => {
        state.simDaysHeld = parseFloat(e.target.value);
        el.simDaysVal.textContent = state.simDaysHeld === 0 ? 'Intraday (0 Days Decay)' : `${state.simDaysHeld} Days Holding`;
        recalculateAll();
    });

    // Toggle Live Simulation button
    el.btnToggleLive.addEventListener('click', () => {
        const isRunning = window.marketFeed.toggleSimulation();
        if (isRunning) {
            el.liveStatusText.textContent = 'LIVE FEED';
            el.liveStatusBadge.style.color = 'var(--neon-green)';
            el.liveStatusBadge.querySelector('.status-dot').classList.add('pulsing');
        } else {
            el.liveStatusText.textContent = 'PAUSED';
            el.liveStatusBadge.style.color = 'var(--text-muted)';
            el.liveStatusBadge.querySelector('.status-dot').classList.remove('pulsing');
        }
    });

    el.btnSyncPrices.addEventListener('click', () => {
        window.marketFeed.tick();
    });

    el.btnRefreshChain.addEventListener('click', () => {
        renderOptionChain();
    });

    // Copy Trade Plan to Clipboard
    el.btnCopySummary.addEventListener('click', () => {
        navigator.clipboard.writeText(el.orderSummaryText.textContent).then(() => {
            const originalText = el.btnCopySummary.innerHTML;
            el.btnCopySummary.innerHTML = `✓ Copied to Clipboard!`;
            el.btnCopySummary.style.borderColor = 'var(--neon-green)';
            el.btnCopySummary.style.color = 'var(--neon-green)';
            setTimeout(() => {
                el.btnCopySummary.innerHTML = originalText;
                el.btnCopySummary.style.borderColor = '';
                el.btnCopySummary.style.color = '';
            }, 2000);
        });
    });

    // =========================================================
    // ZERODHA KITE CONNECT INTEGRATION
    // =========================================================
    const kiteEl = {
        btnKiteConnect: document.getElementById('btnKiteConnect'),
        labelKiteConnect: document.getElementById('labelKiteConnect'),
        modalKite: document.getElementById('modalKite'),
        btnCloseKiteModal: document.getElementById('btnCloseKiteModal'),
        kiteStatusCard: document.getElementById('kiteStatusCard'),
        kiteStatusTitle: document.getElementById('kiteStatusTitle'),
        kiteStatusSub: document.getElementById('kiteStatusSub'),
        kiteDot: document.getElementById('kiteDot'),
        btnDisconnectKite: document.getElementById('btnDisconnectKite'),
        kiteTabButtons: document.querySelectorAll('#kiteTabControl .seg-btn'),
        tabDirectToken: document.getElementById('tabDirectToken'),
        tabLoginFlow: document.getElementById('tabLoginFlow'),
        kiteApiKey: document.getElementById('kiteApiKey'),
        kiteAccessToken: document.getElementById('kiteAccessToken'),
        btnSaveDirectToken: document.getElementById('btnSaveDirectToken'),
        kiteApiKeyLogin: document.getElementById('kiteApiKeyLogin'),
        kiteApiSecret: document.getElementById('kiteApiSecret'),
        btnOpenKiteLogin: document.getElementById('btnOpenKiteLogin'),
        kiteRequestToken: document.getElementById('kiteRequestToken'),
        btnExchangeToken: document.getElementById('btnExchangeToken')
    };

    // Subscribe to marketFeed Kite status updates
    window.marketFeed.subscribeStatus((status) => {
        if (!kiteEl.btnKiteConnect) return;
        if (status.connected) {
            kiteEl.btnKiteConnect.classList.add('connected');
            kiteEl.labelKiteConnect.textContent = status.userName ? `Kite: ${status.userName}` : 'Kite Live';
            kiteEl.kiteStatusTitle.textContent = `🟢 Connected (${status.userName || 'Zerodha Kite'})`;
            kiteEl.kiteStatusSub.textContent = `Streaming live NSE & BSE tick feed (${status.pingMs || 18}ms latency)`;
            kiteEl.kiteDot.className = 'status-dot pulsing';
            kiteEl.kiteDot.style.backgroundColor = 'var(--neon-green)';
            if (kiteEl.kiteApiKey && status.apiKey) kiteEl.kiteApiKey.value = status.apiKey;
            if (kiteEl.kiteApiKeyLogin && status.apiKey) kiteEl.kiteApiKeyLogin.value = status.apiKey;
            el.liveStatusText.textContent = 'ZERODHA LIVE';
        } else {
            kiteEl.btnKiteConnect.classList.remove('connected');
            kiteEl.labelKiteConnect.textContent = 'Connect Zerodha';
            if (window.marketFeed.kiteError) {
                kiteEl.kiteStatusTitle.textContent = '⚠️ Token Expired / Invalid (403)';
                kiteEl.kiteStatusSub.textContent = 'Please generate a fresh Access Token for today or exchange Request Token below';
                kiteEl.kiteDot.className = 'status-dot';
                kiteEl.kiteDot.style.backgroundColor = 'var(--neon-red)';
            } else {
                kiteEl.kiteStatusTitle.textContent = '⚪ Disconnected';
                kiteEl.kiteStatusSub.textContent = 'Using high-fidelity market simulator';
                kiteEl.kiteDot.className = 'status-dot';
                kiteEl.kiteDot.style.backgroundColor = '';
            }
            if (status.apiKey && kiteEl.kiteApiKey) kiteEl.kiteApiKey.value = status.apiKey;
            if (status.apiKey && kiteEl.kiteApiKeyLogin) kiteEl.kiteApiKeyLogin.value = status.apiKey;
            el.liveStatusText.textContent = 'SIMULATOR';
        }
    });

    // Open/Close Modal
    if (kiteEl.btnKiteConnect) {
        kiteEl.btnKiteConnect.addEventListener('click', () => {
            kiteEl.modalKite.classList.remove('hidden');
        });
    }

    if (kiteEl.btnCloseKiteModal) {
        kiteEl.btnCloseKiteModal.addEventListener('click', () => {
            kiteEl.modalKite.classList.add('hidden');
        });
    }

    if (kiteEl.modalKite) {
        kiteEl.modalKite.addEventListener('click', (e) => {
            if (e.target === kiteEl.modalKite) {
                kiteEl.modalKite.classList.add('hidden');
            }
        });
    }

    // Modal Tab switcher
    kiteEl.kiteTabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            kiteEl.kiteTabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const tabId = btn.dataset.kitetab;
            kiteEl.tabDirectToken.classList.toggle('hidden', tabId !== 'tabDirectToken');
            kiteEl.tabLoginFlow.classList.toggle('hidden', tabId !== 'tabLoginFlow');
        });
    });

    // Save Direct Access Token
    if (kiteEl.btnSaveDirectToken) {
        kiteEl.btnSaveDirectToken.addEventListener('click', async () => {
            const apiKey = kiteEl.kiteApiKey.value.trim();
            const token = kiteEl.kiteAccessToken.value.trim();

            if (!apiKey || !token) {
                alert('Please provide both Kite API Key and Access Token.');
                return;
            }

            kiteEl.btnSaveDirectToken.textContent = 'Connecting...';
            try {
                const res = await fetch('/api/kite/save_credentials', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ api_key: apiKey, access_token: token })
                });

                if (res.ok) {
                    await window.marketFeed.initKiteBridge();
                    window.marketFeed.setFeedSource('ZERODHA');
                    kiteEl.btnSaveDirectToken.textContent = '✓ Connected!';
                    setTimeout(() => {
                        kiteEl.btnSaveDirectToken.textContent = 'Connect & Start Live Stream';
                        kiteEl.modalKite.classList.add('hidden');
                    }, 1200);
                } else {
                    alert('Error saving credentials. Please check connection.');
                    kiteEl.btnSaveDirectToken.textContent = 'Connect & Start Live Stream';
                }
            } catch (e) {
                alert('Could not reach backend server: ' + e.message);
                kiteEl.btnSaveDirectToken.textContent = 'Connect & Start Live Stream';
            }
        });
    }

    // Open Kite Login
    if (kiteEl.btnOpenKiteLogin) {
        kiteEl.btnOpenKiteLogin.addEventListener('click', async () => {
            const apiKey = (kiteEl.kiteApiKeyLogin.value || kiteEl.kiteApiKey.value).trim();
            if (!apiKey) {
                alert('Please enter your Kite API Key first.');
                return;
            }

            // Save key first
            await fetch('/api/kite/save_credentials', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    api_key: apiKey,
                    api_secret: kiteEl.kiteApiSecret.value.trim()
                })
            });

            const loginUrl = `https://kite.zerodha.com/connect/login?v=3&api_key=${apiKey}`;
            window.open(loginUrl, '_blank');
        });
    }

    // Exchange Token
    if (kiteEl.btnExchangeToken) {
        kiteEl.btnExchangeToken.addEventListener('click', async () => {
            const apiKey = (kiteEl.kiteApiKeyLogin.value || kiteEl.kiteApiKey.value).trim();
            const apiSecret = kiteEl.kiteApiSecret.value.trim();
            const reqToken = kiteEl.kiteRequestToken.value.trim();

            if (!apiKey || !apiSecret || !reqToken) {
                alert('Please provide API Key, API Secret, and Request Token.');
                return;
            }

            kiteEl.btnExchangeToken.textContent = 'Exchanging token...';
            try {
                const res = await fetch('/api/kite/exchange_token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        api_key: apiKey,
                        api_secret: apiSecret,
                        request_token: reqToken
                    })
                });

                const data = await res.json();
                if (res.ok && data.status === 'success') {
                    await window.marketFeed.initKiteBridge();
                    window.marketFeed.setFeedSource('ZERODHA');
                    kiteEl.btnExchangeToken.textContent = `✓ Logged in as ${data.user_name || 'Trader'}!`;
                    setTimeout(() => {
                        kiteEl.btnExchangeToken.textContent = 'Exchange Token & Connect';
                        kiteEl.modalKite.classList.add('hidden');
                    }, 1200);
                } else {
                    alert(`Kite Login Error: ${data.error || 'Authentication failed'}`);
                    kiteEl.btnExchangeToken.textContent = 'Exchange Token & Connect';
                }
            } catch (e) {
                alert('Error connecting: ' + e.message);
                kiteEl.btnExchangeToken.textContent = 'Exchange Token & Connect';
            }
        });
    }

    // Disconnect Kite
    if (kiteEl.btnDisconnectKite) {
        kiteEl.btnDisconnectKite.addEventListener('click', async () => {
            try {
                await fetch('/api/kite/disconnect', { method: 'POST' });
                window.marketFeed.isKiteConnected = false;
                window.marketFeed.setFeedSource('SIMULATION');
                window.marketFeed.notifyStatus();
            } catch (e) {
                console.error(e);
            }
        });
    }

    // Reset Defaults
    el.btnResetDefaults.addEventListener('click', () => {
        initIndex('NIFTY');
    });

    // Initial Execution
    initIndex('NIFTY');
    window.marketFeed.startSimulation(1500);
});
