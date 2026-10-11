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
        open: 22435.25
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
        open: 81710.00
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
        open: 51220.00
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
            if (idx.spot > idx.high) idx.high = idx.spot;
            if (idx.spot < idx.low) idx.low = idx.spot;
            idx.lastTickDir = idx.spot >= prevSpot ? 'up' : 'down';
        }

        this.vix = Math.max(10, Math.round((this.vix + (Math.random() - 0.5) * 0.05) * 100) / 100);
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
        for (let i = -countAround; i <= countAround; i++) {
            const strike = atm + i * step;
            const ceGreeks = calculateBlackScholesGreeks('CE', idx.spot, strike, T, r, vol);
            const peGreeks = calculateBlackScholesGreeks('PE', idx.spot, strike, T, r, vol);

            const dist = Math.abs(i);
            const baseOI = Math.max(15000, Math.round((85000 - dist * 9500) * (0.8 + Math.random() * 0.4)));

            strikes.push({
                strike: strike,
                isATM: i === 0,
                isITM_CE: strike < idx.spot,
                isITM_PE: strike > idx.spot,
                ce: {
                    price: Math.round(ceGreeks.price * 100) / 100,
                    delta: Math.round(ceGreeks.delta * 100) / 100,
                    gamma: Math.round(ceGreeks.gamma * 10000) / 10000,
                    theta: Math.round(ceGreeks.thetaDaily * 100) / 100,
                    iv: Math.round(vol * 1000) / 10,
                    oi: baseOI
                },
                pe: {
                    price: Math.round(peGreeks.price * 100) / 100,
                    delta: Math.round(peGreeks.delta * 100) / 100,
                    gamma: Math.round(peGreeks.gamma * 10000) / 10000,
                    theta: Math.round(peGreeks.thetaDaily * 100) / 100,
                    iv: Math.round(vol * 1000) / 10,
                    oi: Math.round(baseOI * (0.85 + Math.random() * 0.3))
                }
            });
        }

        return {
            index: idx,
            spot: idx.spot,
            atm: atm,
            vix: this.vix,
            strikes: strikes
        };
    }
}

// Export singleton instance
const marketFeedInstance = new MarketFeed();
if (typeof window !== 'undefined') {
    window.marketFeed = marketFeedInstance;
}
