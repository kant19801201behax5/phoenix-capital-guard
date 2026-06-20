// risk.js — autonomous constraints (TWAK special-prize: 20pts "drawdown/slippage
// limits, allowlist"). The capital bodyguard that keeps us UNDER the 30% DQ line.
const ALLOW = (process.env.TOKEN_ALLOWLIST || 'USDT,USDC,WBNB,CAKE,ETH')
  .split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
const MAX_DD   = Number(process.env.MAX_DRAWDOWN_PCT || 25);  // hard stop BEFORE 30% DQ
const PER_TRADE = Number(process.env.PER_TRADE_USD || 25);
const DAILY_MAX = Number(process.env.DAILY_TRADES_MAX || 12);
const SLIP_BPS  = Number(process.env.SLIPPAGE_BPS || 50);

class Risk {
  constructor(startEquityUsd) {
    this.peak = startEquityUsd || 0;
    this.equity = startEquityUsd || 0;
    this.dayKey = new Date().toISOString().slice(0, 10);
    this.tradesToday = 0;
    this.halted = false;
  }
  mark(equityUsd) {
    this.equity = equityUsd;
    if (equityUsd > this.peak) this.peak = equityUsd;
    const dd = this.peak > 0 ? (1 - this.equity / this.peak) * 100 : 0;
    if (dd >= MAX_DD) this.halted = true;     // permanent halt: protect the entry
    return dd;
  }
  _rollDay() {
    const k = new Date().toISOString().slice(0, 10);
    if (k !== this.dayKey) { this.dayKey = k; this.tradesToday = 0; }
  }
  // Returns { ok, reason, quote? }
  check(signal) {
    this._rollDay();
    const dd = this.peak > 0 ? (1 - this.equity / this.peak) * 100 : 0;
    if (this.halted || dd >= MAX_DD) return { ok: false, reason: `drawdown ${dd.toFixed(1)}% >= ${MAX_DD}% — HALT` };
    if (this.tradesToday >= DAILY_MAX) return { ok: false, reason: `daily cap ${DAILY_MAX} reached` };
    const sym = (signal.symbol || '').toUpperCase();
    if (!ALLOW.includes(sym)) return { ok: false, reason: `${sym} not in allowlist` };
    return {
      ok: true, reason: 'ok',
      quote: { tokenIn: 'USDT', tokenOut: sym, amountUsd: PER_TRADE, slippageBps: SLIP_BPS },
    };
  }
  record() { this.tradesToday += 1; }
}

module.exports = { Risk, MAX_DD, PER_TRADE, DAILY_MAX, SLIP_BPS };
