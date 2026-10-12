/**
 * Market Data & Option Chain Generator for Indian Indices
 * Supports:
 * 1. Zerodha Kite Connect live REST & WebSocket bridge
 * 2. Realistic micro-tick simulation fallback
 */

const INDICES_CONFIG = {
    NIFTY: {
        name: 'NIFTY 50',
        exchange: 'NSE',
        symbol: 'NSE:NIFTY 50',
        spot: 22520.45,
        change: 85.20,
        changePercent: 0.38,
        strikeStep: 50,
        lotSize: 25,
        defaultIV: 13.85,
        defaultDTE: 3.5,
        high: 22560.80,
        low: 22440.10,
        open: 22435.25,
        vwap: 22495.10,
        cumVol: 15400000,
        cumVolPrice: 15400000 * 22495.10
    },
    SENSEX: {
        name: 'BSE SENSEX',
        exchange: 'BSE',
        symbol: 'BSE:SENSEX',
        spot: 81965.80,
        change: 395.20,
        changePercent: 0.49,
        strikeStep: 100,
        lotSize: 10,
        defaultIV: 13.60,
        defaultDTE: 4.0,
        high: 82140.00,
        low: 81680.50,
        open: 81710.00,
        vwap: 81880.00,
        cumVol: 8200000,
        cumVolPrice: 8200000 * 81880.00
    },
    BANKNIFTY: {
        name: 'BANK NIFTY',
        exchange: 'NSE',
        symbol: 'NSE:NIFTY BANK',
        spot: 51380.20,
        change: 245.60,
        changePercent: 0.48,
        strikeStep: 100,
        lotSize: 15,
        defaultIV: 15.40,
        defaultDTE: 3.5,
        high: 51520.00,
        low: 51180.00,
        open: 51220.00,
        vwap: 51320.50,
        cumVol: 11000000,
        cumVolPrice: 11000000 * 51320.50
    }
};

class MarketFeed {
    constructor() {
        this.indices = JSON.parse(JSON.stringify(INDICES_CONFIG));
        this.subscribers = [];
        this.statusSubscribers = [];
        this.isSimulating = true;
        this.timer = null;
        this.vix = 13.72;
        this.prevVix = 13.72;
        this.vixChange = 0;
        this.pcrHistory = [1.18];
        this.pcrTrend = 'STABLE';
        this.strikePreviousData = {};
        this.feedSource = 'SIMULATION'; // 'SIMULATION' or 'ZERODHA'
        this.isKiteConnected = false;
        this.kiteUserName = '';
        this.kiteApiKey = '';
        this.lastPingMs = 0;

        // Auto-check Kite status on load
        this.initKiteBridge();
    }

    async initKiteBridge() {
        try {
            const res = await fetch('/api/kite/status');
            if (res.ok) {
                const data = await res.json();
                this.isKiteConnected = data.connected;
                this.kiteUserName = data.user_name || '';
                this.kiteApiKey = data.api_key || '';
                this.kiteError = null;
                if (this.isKiteConnected || data.live_feed) {
                    this.feedSource = 'ZERODHA';
                    await this.fetchKiteQuotes();
                }
                this.notifyStatus();
            }
        } catch (e) {
            // Standalone mode without backend
            console.log('Running in local browser mode without Kite backend proxy.');
        }
    }

    startSimulation(intervalMs = 1200) {
        if (this.timer) clearInterval(this.timer);
        this.isSimulating = true;
        this.timer = setInterval(() => {
            if (!this.isSimulating) return;
            if (this.feedSource === 'ZERODHA') {
                this.fetchKiteQuotes();
            } else {
                this.tick();
            }
        }, intervalMs);
    }

    stopSimulation() {
        this.isSimulating = false;
        if (this.timer) clearInterval(this.timer);
        this.timer = null;
    }

    toggleSimulation() {
        if (this.isSimulating) {
            this.stopSimulation();
            return false;
        } else {
            this.startSimulation();
            return true;
        }
    }

    setFeedSource(source) {
        this.feedSource = source;
        this.notifyStatus();
        if (source === 'ZERODHA') {
            this.fetchKiteQuotes();
        } else {
            this.tick();
        }
    }

    async fetchKiteQuotes() {
        const start = performance.now();
        try {
            const symbols = ['NSE:NIFTY 50', 'BSE:SENSEX', 'NSE:NIFTY BANK', 'NSE:INDIA VIX'];
            const params = symbols.map(s => `symbols=${encodeURIComponent(s)}`).join('&');
            const res = await fetch(`/api/kite/quotes?${params}`);
            this.lastPingMs = Math.round(performance.now() - start);

            if (res.ok) {
                const json = await res.json();
                const data = json.data || {};
                this.isKiteConnected = true;
                this.kiteError = null;
                if (json.user_name) this.kiteUserName = json.user_name;

                // Map NIFTY 50
                if (data['NSE:NIFTY 50']) {
                    const q = data['NSE:NIFTY 50'];
                    const prev = this.indices.NIFTY.spot;
                    this.indices.NIFTY.spot = q.last_price;
                    this.indices.NIFTY.open = q.ohlc ? q.ohlc.open : this.indices.NIFTY.open;
                    this.indices.NIFTY.high = q.ohlc ? q.ohlc.high : this.indices.NIFTY.high;
                    this.indices.NIFTY.low = q.ohlc ? q.ohlc.low : this.indices.NIFTY.low;
                    this.indices.NIFTY.change = Math.round((q.last_price - (q.ohlc ? q.ohlc.close : prev)) * 100) / 100;
                    this.indices.NIFTY.changePercent = Math.round((q.net_change || (this.indices.NIFTY.change / (q.ohlc?.close || 1)) * 100) * 100) / 100;
                    this.indices.NIFTY.lastTickDir = q.last_price >= prev ? 'up' : 'down';
                }

                // Map SENSEX
                if (data['BSE:SENSEX']) {
                    const q = data['BSE:SENSEX'];
                    const prev = this.indices.SENSEX.spot;
                    this.indices.SENSEX.spot = q.last_price;
                    if (q.ohlc) {
                        this.indices.SENSEX.open = q.ohlc.open;
                        this.indices.SENSEX.high = q.ohlc.high;
                        this.indices.SENSEX.low = q.ohlc.low;
                    }
                    this.indices.SENSEX.change = Math.round((q.last_price - (q.ohlc ? q.ohlc.close : prev)) * 100) / 100;
                    this.indices.SENSEX.changePercent = Math.round((q.net_change || 0) * 100) / 100;
                    this.indices.SENSEX.lastTickDir = q.last_price >= prev ? 'up' : 'down';
                }

                // Map BANK NIFTY
                if (data['NSE:NIFTY BANK']) {
                    const q = data['NSE:NIFTY BANK'];
                    const prev = this.indices.BANKNIFTY.spot;
                    this.indices.BANKNIFTY.spot = q.last_price;
                    if (q.ohlc) {
                        this.indices.BANKNIFTY.open = q.ohlc.open;
                        this.indices.BANKNIFTY.high = q.ohlc.high;
                        this.indices.BANKNIFTY.low = q.ohlc.low;
                    }
                    this.indices.BANKNIFTY.change = Math.round((q.last_price - (q.ohlc ? q.ohlc.close : prev)) * 100) / 100;
                    this.indices.BANKNIFTY.changePercent = Math.round((q.net_change || 0) * 100) / 100;
                    this.indices.BANKNIFTY.lastTickDir = q.last_price >= prev ? 'up' : 'down';
                }

                // Map INDIA VIX
                if (data['NSE:INDIA VIX']) {
                    this.vix = data['NSE:INDIA VIX'].last_price;
                }

                this.notify();
            } else if (res.status === 401 || res.status === 403) {
                // Access token expired or invalid
                const json = await res.json().catch(() => ({}));
                this.isKiteConnected = false;
                this.feedSource = 'SIMULATION';
                this.kiteError = json.error || 'Token expired or invalid (403)';
                this.notifyStatus();
            }
        } catch (e) {
            console.warn('Error fetching Zerodha quotes, using simulation tick fallback:', e);
            this.tick();
        }
    }

    tick() {
        // Random micro-oscillation simulating liquid Indian index ticks
        for (const key of Object.keys(this.indices)) {
            const idx = this.indices[key];
            const maxDelta = idx.spot * 0.00035;
            const delta = (Math.random() - 0.49) * maxDelta;
            const prevSpot = idx.spot;
            idx.spot = Math.round((idx.spot + delta) * 100) / 100;
            idx.change = Math.round((idx.spot - idx.open) * 100) / 100;
            idx.changePercent = Math.round((idx.change / idx.open) * 10000) / 100;
            // Update VWAP with realistic volume-weighted ticks
            const tickVol = Math.round(5000 + Math.random() * 15000);
            idx.cumVol = (idx.cumVol || 15000000) + tickVol;
            idx.cumVolPrice = (idx.cumVolPrice || (idx.cumVol * idx.spot)) + (idx.spot * tickVol);
            idx.vwap = Math.round((idx.cumVolPrice / idx.cumVol) * 100) / 100;
        }

        const prevVixVal = this.vix;
        this.vix = Math.max(10, Math.round((this.vix + (Math.random() - 0.5) * 0.05) * 100) / 100);
        this.vixChange = Math.round(((this.vix - 13.72) / 13.72) * 1000) / 10;
        this.notify();
    }

    subscribe(callback) {
        this.subscribers.push(callback);
        callback(this.indices, this.vix, this.feedSource);
    }

    subscribeStatus(callback) {
        this.statusSubscribers.push(callback);
        callback({
            connected: this.isKiteConnected,
            source: this.feedSource,
            userName: this.kiteUserName,
            apiKey: this.kiteApiKey,
            pingMs: this.lastPingMs
        });
    }

    notify() {
        for (const cb of this.subscribers) {
            cb(this.indices, this.vix, this.feedSource);
        }
    }

    notifyStatus() {
        for (const cb of this.statusSubscribers) {
            cb({
                connected: this.isKiteConnected,
                source: this.feedSource,
                userName: this.kiteUserName,
                apiKey: this.kiteApiKey,
                pingMs: this.lastPingMs
            });
        }
    }

    setManualSpot(indexKey, newSpot) {
        if (this.indices[indexKey]) {
            const idx = this.indices[indexKey];
            idx.spot = parseFloat(newSpot);
            idx.change = Math.round((idx.spot - idx.open) * 100) / 100;
            idx.changePercent = Math.round((idx.change / idx.open) * 10000) / 100;
            this.notify();
        }
    }

    getATMStrike(indexKey, spotOverride = null) {
        const idx = this.indices[indexKey] || this.indices.NIFTY;
        const spot = spotOverride !== null ? spotOverride : idx.spot;
        const step = idx.strikeStep;
        return Math.round(spot / step) * step;
    }

    generateOptionChain(indexKey, dteDays = 3.5, iv = 14.0, countAround = 7) {
        const idx = this.indices[indexKey] || this.indices.NIFTY;
        const atm = this.getATMStrike(indexKey);
        const step = idx.strikeStep;
        const T = Math.max(0.001, dteDays / 365.0);
        const r = 0.0675;
        const vol = (parseFloat(iv) || 14.0) / 100.0;

        const strikes = [];
        let totalCeOI = 0;
        let totalPeOI = 0;

        for (let i = -countAround; i <= countAround; i++) {
            const strike = atm + i * step;
            const ceGreeks = calculateBlackScholesGreeks('CE', idx.spot, strike, T, r, vol);
            const peGreeks = calculateBlackScholesGreeks('PE', idx.spot, strike, T, r, vol);

            const dist = Math.abs(i);
            // Realistic institutional OI distribution:
            // Call writers cluster at OTM strikes above ATM (i = +2, +3)
            // Put writers cluster at OTM strikes below ATM (i = -2, -3)
            const ceMultiplier = i >= 1 && i <= 3 ? 1.45 : (i < 0 ? 0.65 : 1.0);
            const peMultiplier = i <= -1 && i >= -3 ? 1.55 : (i > 0 ? 0.60 : 1.0);

            const baseOI = Math.max(18000, Math.round((75000 - dist * 7000) * (0.85 + Math.random() * 0.3)));
            const ceOI = Math.round(baseOI * ceMultiplier);
            const peOI = Math.round(baseOI * peMultiplier);

            totalCeOI += ceOI;
            totalPeOI += peOI;

            const cePrice = Math.round(ceGreeks.price * 100) / 100;
            const pePrice = Math.round(peGreeks.price * 100) / 100;

            // Track strike-level price and OI changes for buildup classification
            const prevStrike = this.strikePreviousData[strike] || null;
            const cePriceChange = prevStrike ? Math.round((cePrice - prevStrike.cePrice) * 100) / 100 : (i < 0 ? 1.5 : -1.2);
            const ceOiChange = prevStrike ? (ceOI - prevStrike.ceOI) : (i >= 1 ? 1200 : -600);
            const pePriceChange = prevStrike ? Math.round((pePrice - prevStrike.pePrice) * 100) / 100 : (i > 0 ? 1.4 : -1.1);
            const peOiChange = prevStrike ? (peOI - prevStrike.peOI) : (i <= -1 ? 1400 : -800);

            // Save for next interval
            this.strikePreviousData[strike] = { cePrice, ceOI, pePrice, peOI };

            const ceBuildup = (typeof classifyStrikeBuildup === 'function')
                ? classifyStrikeBuildup(cePriceChange, ceOiChange)
                : { type: 'SHORT_BUILDUP', code: 'SB', label: 'Short Buildup', badgeClass: 'buildup-sb', sentiment: 'Bearish' };

            const peBuildup = (typeof classifyStrikeBuildup === 'function')
                ? classifyStrikeBuildup(pePriceChange, peOiChange)
                : { type: 'SHORT_BUILDUP', code: 'SB', label: 'Short Buildup', badgeClass: 'buildup-sb', sentiment: 'Bullish' };

            strikes.push({
                strike: strike,
                isATM: i === 0,
                isITM_CE: strike < idx.spot,
                isITM_PE: strike > idx.spot,
                ce: {
                    price: cePrice,
                    priceChange: cePriceChange,
                    delta: Math.round(ceGreeks.delta * 100) / 100,
                    gamma: Math.round(ceGreeks.gamma * 10000) / 10000,
                    theta: Math.round(ceGreeks.thetaDaily * 100) / 100,
                    iv: Math.round(vol * 1000) / 10,
                    oi: ceOI,
                    oiChange: ceOiChange,
                    buildup: ceBuildup
                },
                pe: {
                    price: pePrice,
                    priceChange: pePriceChange,
                    delta: Math.round(peGreeks.delta * 100) / 100,
                    gamma: Math.round(peGreeks.gamma * 10000) / 10000,
                    theta: Math.round(peGreeks.thetaDaily * 100) / 100,
                    iv: Math.round(vol * 1000) / 10,
                    oi: peOI,
                    oiChange: peOiChange,
                    buildup: peBuildup
                }
            });
        }

        // 1. Find Max Call OI (Resistance Wall) & Max Put OI (Support Floor)
        let maxCeOI = 0;
        let maxPeOI = 0;
        let maxCeStrike = strikes[0]?.strike || atm;
        let maxPeStrike = strikes[0]?.strike || atm;

        for (const s of strikes) {
            if (s.ce.oi > maxCeOI) {
                maxCeOI = s.ce.oi;
                maxCeStrike = s.strike;
            }
            if (s.pe.oi > maxPeOI) {
                maxPeOI = s.pe.oi;
                maxPeStrike = s.strike;
            }
        }

        // 2. Calculate Index Put-Call Ratio (PCR) & PCR Trend Momentum
        const pcr = totalCeOI > 0 ? Math.round((totalPeOI / totalCeOI) * 100) / 100 : 1.0;
        this.pcrHistory.push(pcr);
        if (this.pcrHistory.length > 10) this.pcrHistory.shift();

        let pcrTrend = 'STABLE';
        if (this.pcrHistory.length >= 3) {
            const first = this.pcrHistory[0];
            const last = this.pcrHistory[this.pcrHistory.length - 1];
            if (last - first >= 0.03) pcrTrend = 'RISING';
            else if (first - last >= 0.03) pcrTrend = 'FALLING';
        }
        this.pcrTrend = pcrTrend;

        let pcrSentiment = 'NEUTRAL';
        let pcrBadgeClass = 'pcr-neutral';
        let pcrDescription = 'Balanced Market Sentiment (Two-Way Options Battle)';

        if (pcr >= 1.30) {
            pcrSentiment = 'EXTREMELY BULLISH';
            pcrBadgeClass = 'pcr-bullish';
            pcrDescription = 'Heavy Put Writing • Overbought Zone (Watch for exhaustion)';
        } else if (pcr >= 1.05) {
            pcrSentiment = 'BULLISH';
            pcrBadgeClass = 'pcr-bullish';
            pcrDescription = 'Put Writers in Control • Upward / Buy-on-Dip Bias';
        } else if (pcr >= 0.85) {
            pcrSentiment = 'NEUTRAL / BALANCED';
            pcrBadgeClass = 'pcr-neutral';
            pcrDescription = 'Balanced Market Sentiment (Consolidation Zone)';
        } else if (pcr >= 0.65) {
            pcrSentiment = 'BEARISH';
            pcrBadgeClass = 'pcr-bearish';
            pcrDescription = 'Call Writers Dominant • Overhead Resistance Strong';
        } else {
            pcrSentiment = 'EXTREMELY BEARISH';
            pcrBadgeClass = 'pcr-bearish';
            pcrDescription = 'Heavy Call Writing • Oversold Zone (Reversal Watch)';
        }

        // 3. Calculate Expiry Max Pain Strike
        let minWriterLoss = Infinity;
        let maxPainStrike = atm;
        for (const candidate of strikes) {
            const pin = candidate.strike;
            let totalLoss = 0;
            for (const s of strikes) {
                if (pin > s.strike) totalLoss += (pin - s.strike) * s.ce.oi;
                if (pin < s.strike) totalLoss += (s.strike - pin) * s.pe.oi;
            }
            if (totalLoss < minWriterLoss) {
                minWriterLoss = totalLoss;
                maxPainStrike = pin;
            }
        }

        // 4. Tag strikes with flags
        for (const s of strikes) {
            s.isMaxCallOI = s.strike === maxCeStrike;
            s.isMaxPutOI = s.strike === maxPeStrike;
            s.isMaxPain = s.strike === maxPainStrike;
            s.ceOIPct = totalCeOI > 0 ? Math.round((s.ce.oi / totalCeOI) * 1000) / 10 : 0;
            s.peOIPct = totalPeOI > 0 ? Math.round((s.pe.oi / totalPeOI) * 1000) / 10 : 0;
        }

        const vwapVal = idx.vwap || idx.spot;
        const vwapDiff = Math.round((idx.spot - vwapVal) * 100) / 100;
        const vwapPct = Math.round((vwapDiff / vwapVal) * 10000) / 100;

        const oiAnalytics = {
            totalCeOI,
            totalPeOI,
            pcr,
            pcrTrend: this.pcrTrend,
            pcrSentiment,
            pcrBadgeClass,
            pcrDescription,
            maxCeStrike,
            maxCeOI,
            maxPeStrike,
            maxPeOI,
            maxPainStrike,
            vwap: vwapVal,
            vwapDiff,
            vwapPct,
            vixChange: this.vixChange
        };

        return {
            index: idx,
            spot: idx.spot,
            atm: atm,
            vix: this.vix,
            strikes: strikes,
            oiAnalytics: oiAnalytics
        };
    }
}

// Export singleton instance
const marketFeedInstance = new MarketFeed();
if (typeof window !== 'undefined') {
    window.marketFeed = marketFeedInstance;
}
