// cmc.js — CoinMarketCap AI Agent Hub adapter.
// KILLER FEATURE 3: Toxic Funding Sniffer. Not RSI/MACD junk — scans the 149
// competition tokens for extreme-negative funding (shorts paying longs) +
// Fear&Greed extremes → expects a short-squeeze → BUY spot on BSC.
// Free CMC Agent Hub for the hackathon period. Key -> .env (CMC_API_KEY).
const axios = require('axios');

const KEY  = process.env.CMC_API_KEY || '';
const BASE = process.env.CMC_BASE || 'https://pro-api.coinmarketcap.com';
const ALLOW = (process.env.TOKEN_ALLOWLIST || 'USDT,USDC,WBNB,CAKE,ETH')
  .split(',').map(s => s.trim().toUpperCase()).filter(Boolean);

const H = () => ({ 'X-CMC_PRO_API_KEY': KEY, Accept: 'application/json' });

async function fearGreed() {
  // CMC Fear & Greed. Returns 0..100 (extreme fear < 25 = contrarian buy bias).
  try {
    const r = await axios.get(`${BASE}/v3/fear-and-greed/latest`, { headers: H(), timeout: 10000 });
    return Number(r.data?.data?.value ?? 50);
  } catch { return null; }
}

async function fundingExtremes() {
  // Derivatives funding across allowed tokens. Extreme NEGATIVE = shorts pay longs
  // = crowded shorts = squeeze setup. (Endpoint shape per CMC Agent Hub; adjust path.)
  try {
    const r = await axios.get(`${BASE}/v1/derivatives/funding-rate`, {
      headers: H(), timeout: 12000,
      params: { symbol: ALLOW.join(',') },
    });
    const rows = r.data?.data || [];
    return rows
      .map(x => ({ symbol: String(x.symbol || '').toUpperCase(), funding: Number(x.funding_rate ?? x.fundingRate ?? 0) }))
      .filter(x => ALLOW.includes(x.symbol));
  } catch { return []; }
}

// Returns { direction:'long'|'flat', symbol, strength, reason }.
async function getSignal() {
  if (!KEY) {
    // DRY/demo fallback so the loop + demo run without a key.
    const mock = { symbol: 'CAKE', funding: -0.018, fg: 18 };
    return {
      direction: 'long', symbol: mock.symbol, strength: 0.7,
      reason: `MOCK toxic-funding: ${mock.symbol} funding=${(mock.funding*100).toFixed(2)}% fear=${mock.fg}`,
    };
  }
  const [fg, funds] = await Promise.all([fearGreed(), fundingExtremes()]);
  const worst = funds.sort((a, b) => a.funding - b.funding)[0]; // most negative funding
  const extremeFear = fg !== null && fg < 25;
  if (worst && worst.funding < -0.01 && (extremeFear || worst.funding < -0.02)) {
    const strength = Math.min(1, Math.abs(worst.funding) * 30 + (extremeFear ? 0.2 : 0));
    return {
      direction: 'long', symbol: worst.symbol, strength: Number(strength.toFixed(2)),
      reason: `toxic-funding ${worst.symbol} funding=${(worst.funding*100).toFixed(2)}% fear=${fg}`,
    };
  }
  return { direction: 'flat', symbol: null, strength: 0, reason: `no edge (fear=${fg})` };
}

module.exports = { getSignal };
