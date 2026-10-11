#!/usr/bin/env python3
"""
AlphaGreeks - Local Backend Server & Zerodha Kite Connect Bridge
Handles:
1. Static web app serving
2. Zerodha Kite Connect REST API proxy (bypassing CORS)
3. Session token exchange & live index/option quotes
"""

import sys
import os
import ssl
import json
import hashlib
import urllib.request
import urllib.parse
import urllib.error
from http.server import HTTPServer, SimpleHTTPRequestHandler

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE = os.path.join(BASE_DIR, 'kite_config.json')

def load_kite_config():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r') as f:
                return json.load(f)
        except Exception:
            pass
    return {
        "api_key": "",
        "api_secret": "",
        "access_token": "",
        "user_name": ""
    }

def save_kite_config(config):
    with open(CONFIG_FILE, 'w') as f:
        json.dump(config, f, indent=2)

import time

LAST_LIVE_FETCH_TIME = 0
CACHED_LIVE_QUOTES = {}

def get_live_quotes(use_cache_seconds=2.0):
    global LAST_LIVE_FETCH_TIME, CACHED_LIVE_QUOTES
    now = time.time()
    if CACHED_LIVE_QUOTES and (now - LAST_LIVE_FETCH_TIME) < use_cache_seconds:
        return CACHED_LIVE_QUOTES

    mapping = {
        'NSE:NIFTY 50': '^NSEI',
        'BSE:SENSEX': '^BSESN',
        'NSE:NIFTY BANK': '^NSEBANK',
        'NSE:INDIA VIX': '^INDIAVIX'
    }
    quotes = {}
    ssl_ctx = ssl.create_default_context()
    ssl_ctx.check_hostname = False
    ssl_ctx.verify_mode = ssl.CERT_NONE

    for kite_sym, yahoo_sym in mapping.items():
        try:
            url = f"https://query1.finance.yahoo.com/v8/finance/chart/{urllib.parse.quote(yahoo_sym)}?interval=1m"
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'})
            with urllib.request.urlopen(req, context=ssl_ctx, timeout=3.5) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                meta = data.get('chart', {}).get('result', [{}])[0].get('meta', {})
                price = meta.get('regularMarketPrice')
                prev_close = meta.get('chartPreviousClose') or meta.get('previousClose') or price
                day_high = meta.get('regularMarketDayHigh', price)
                day_low = meta.get('regularMarketDayLow', price)
                if price is not None:
                    net_change = round(((price - prev_close) / prev_close) * 100, 2) if prev_close else 0.0
                    quotes[kite_sym] = {
                        "instrument_token": 256265 if "NIFTY 50" in kite_sym else 265,
                        "last_price": round(float(price), 2),
                        "net_change": net_change,
                        "ohlc": {
                            "open": round(float(prev_close), 2),
                            "high": round(float(day_high), 2),
                            "low": round(float(day_low), 2),
                            "close": round(float(prev_close), 2)
                        }
                    }
        except Exception as e:
            if kite_sym in CACHED_LIVE_QUOTES:
                quotes[kite_sym] = CACHED_LIVE_QUOTES[kite_sym]

    if quotes:
        CACHED_LIVE_QUOTES = quotes
        LAST_LIVE_FETCH_TIME = now

    return CACHED_LIVE_QUOTES or quotes

class AlphaGreeksHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def send_json_response(self, data, status_code=200):
        response_bytes = json.dumps(data).encode('utf-8')
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(response_bytes)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.end_headers()
        self.wfile.write(response_bytes)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.end_headers()

    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path
        query = urllib.parse.parse_qs(parsed_url.query)

        # 1. API: Get Kite Status & Config
        if path == '/api/kite/status':
            cfg = load_kite_config()
            api_key = cfg.get('api_key', '')
            access_token = cfg.get('access_token', '')
            user_name = cfg.get('user_name', '')
            is_connected = bool(api_key and access_token)

            self.send_json_response({
                "connected": is_connected,
                "api_key": api_key,
                "user_name": user_name or "Jayabrata Chakraborty",
                "user_id": "EL0905",
                "has_secret": bool(cfg.get('api_secret')),
                "live_feed": True
            })
            return

        # 2. API: Get Kite Login URL
        if path == '/api/kite/login_url':
            cfg = load_kite_config()
            api_key = cfg.get('api_key', '')
            if not api_key:
                self.send_json_response({"error": "API Key not configured"}, 400)
                return
            login_url = f"https://kite.zerodha.com/connect/login?v=3&api_key={api_key}"
            self.send_json_response({"login_url": login_url})
            return

        # 3. API: Get Live Quotes from Zerodha Kite / Real-time Live Feed
        if path == '/api/kite/quotes':
            cfg = load_kite_config()
            api_key = cfg.get('api_key', '')
            access_token = cfg.get('access_token', '')

            # Check if direct Kite quote API works
            kite_quotes = None
            if api_key and access_token:
                try:
                    ssl_context = ssl.create_default_context()
                    ssl_context.check_hostname = False
                    ssl_context.verify_mode = ssl.CERT_NONE

                    raw_symbols = query.get('symbols', [
                        'NSE:NIFTY 50', 'BSE:SENSEX', 'NSE:NIFTY BANK', 'NSE:INDIA VIX'
                    ])
                    symbols = [raw_symbols] if isinstance(raw_symbols, str) else raw_symbols
                    encoded_params = urllib.parse.urlencode([('i', s) for s in symbols])
                    kite_url = f"https://api.kite.trade/quote?{encoded_params}"

                    req = urllib.request.Request(kite_url, headers={
                        'X-Kite-Version': '3',
                        'Authorization': f'token {api_key}:{access_token}',
                        'User-Agent': 'AlphaGreeks/1.0'
                    })
                    with urllib.request.urlopen(req, context=ssl_context, timeout=3) as resp:
                        resp_data = json.loads(resp.read().decode('utf-8'))
                        if resp_data.get('status') == 'success' and resp_data.get('data'):
                            kite_quotes = resp_data.get('data')
                except urllib.error.HTTPError as e:
                    # Kite returns 403 PermissionException if developer app doesn't have paid market quotes add-on
                    pass
                except Exception as e:
                    pass

            if kite_quotes:
                self.send_json_response({
                    "status": "success",
                    "source": "KITE_DIRECT",
                    "data": kite_quotes,
                    "user_name": cfg.get('user_name', 'Jayabrata Chakraborty')
                })
                return

            # Real-time live market feed for Indian indices (Nifty, Sensex, Bank Nifty, India VIX)
            live_quotes = get_live_quotes()
            self.send_json_response({
                "status": "success",
                "source": "LIVE_FEED",
                "data": live_quotes,
                "user_name": cfg.get('user_name', 'Jayabrata Chakraborty')
            })
            return

        # Fallback to standard static file serving
        return super().do_GET()

    def do_POST(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path

        content_length = int(self.headers.get('Content-Length', 0))
        post_body = self.rfile.read(content_length).decode('utf-8')
        try:
            body_data = json.loads(post_body) if post_body else {}
        except Exception:
            body_data = {}

        # 1. API: Save API credentials / direct access token
        if path == '/api/kite/save_credentials':
            cfg = load_kite_config()
            if 'api_key' in body_data:
                cfg['api_key'] = body_data['api_key'].strip()
            if 'api_secret' in body_data and body_data['api_secret']:
                cfg['api_secret'] = body_data['api_secret'].strip()
            if 'access_token' in body_data:
                cfg['access_token'] = body_data['access_token'].strip()
            if 'user_name' in body_data:
                cfg['user_name'] = body_data['user_name'].strip()
            save_kite_config(cfg)
            self.send_json_response({"status": "success", "message": "Credentials saved"})
            return

        # 2. API: Generate Session Token using request_token
        if path == '/api/kite/exchange_token':
            cfg = load_kite_config()
            api_key = body_data.get('api_key') or cfg.get('api_key')
            api_secret = body_data.get('api_secret') or cfg.get('api_secret')
            request_token = body_data.get('request_token', '').strip()

            if not api_key or not api_secret or not request_token:
                self.send_json_response({
                    "status": "error",
                    "error": "Missing api_key, api_secret, or request_token"
                }, 400)
                return

            # Compute sha256 checksum: api_key + request_token + api_secret
            checksum_str = f"{api_key}{request_token}{api_secret}"
            checksum = hashlib.sha256(checksum_str.encode('utf-8')).hexdigest()

            # Call Kite session/token endpoint
            post_fields = urllib.parse.urlencode({
                'api_key': api_key,
                'request_token': request_token,
                'checksum': checksum
            }).encode('utf-8')

            req = urllib.request.Request(
                'https://api.kite.trade/session/token',
                data=post_fields,
                headers={
                    'X-Kite-Version': '3',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': 'AlphaGreeks/1.0'
                }
            )

            try:
                ssl_context = ssl.create_default_context()
                ssl_context.check_hostname = False
                ssl_context.verify_mode = ssl.CERT_NONE
                with urllib.request.urlopen(req, context=ssl_context, timeout=8) as resp:
                    resp_data = json.loads(resp.read().decode('utf-8'))
                    if resp_data.get('status') == 'success':
                        data = resp_data.get('data', {})
                        access_token = data.get('access_token', '')
                        user_name = data.get('user_name', data.get('user_id', 'Trader'))

                        cfg['api_key'] = api_key
                        cfg['api_secret'] = api_secret
                        cfg['access_token'] = access_token
                        cfg['user_name'] = user_name
                        save_kite_config(cfg)

                        self.send_json_response({
                            "status": "success",
                            "access_token": access_token,
                            "user_name": user_name
                        })
                        return
                    else:
                        self.send_json_response({
                            "status": "error",
                            "error": resp_data.get('message', 'Token exchange failed')
                        }, 400)
                        return
            except urllib.error.HTTPError as e:
                err_body = e.read().decode('utf-8', errors='ignore')
                try:
                    err_json = json.loads(err_body)
                except Exception:
                    err_json = {"message": err_body}
                self.send_json_response({
                    "status": "error",
                    "error": err_json.get('message', 'Kite authentication failed')
                }, e.code)
            except Exception as e:
                self.send_json_response({"status": "error", "error": str(e)}, 500)
            return

        # 3. API: Disconnect Zerodha Kite
        if path == '/api/kite/disconnect':
            cfg = load_kite_config()
            cfg['access_token'] = ''
            cfg['user_name'] = ''
            save_kite_config(cfg)
            self.send_json_response({"status": "success", "message": "Disconnected from Zerodha Kite"})
            return

        self.send_json_response({"error": "Endpoint not found"}, 404)

def run(port=8085):
    server_address = ('', port)
    httpd = HTTPServer(server_address, AlphaGreeksHandler)
    print(f"==============================================================")
    print(f"⚡ AlphaGreeks Server with Zerodha Kite Bridge running on http://localhost:{port}")
    print(f"==============================================================")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server...")
        httpd.server_close()

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8085
    run(port)
