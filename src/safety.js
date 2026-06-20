// safety.js — Phoenix Zero network-safety gate, paid per-check via REAL x402.
// KILLER FEATURE 1+2: agent pays x402 (M2M) for live network telemetry and
// BLOCKS its own trade if BSC/L2 is unsafe (MEV war / sequencer stall).
// Reuses the PRODUCTION Phoenix Zero x402 gateway (Base mainnet $0.0001/call,
// Base Sepolia testnet fallback) — official x402-axios client, no stub.
const axios = require('axios');

const SAFE_URL = process.env.PHOENIX_SAFE_URL || 'https://rtt.phoenix-ai.work/api/v1/safe';
const FEED_URL = process.env.PHOENIX_FEED_URL || 'https://rtt.phoenix-ai.work/api/public-feed';
const X402_ON  = process.env.X402_ENABLED === '1';

const REVERT_MAX = 0.15;
const P99_MAX_MS = Number(process.env.SAFE_P99_MAX_MS || 1500);

// Lazily build a real x402-paying axios client (official Coinbase x402-axios + viem).
let _x402client = null;
function x402Client() {
  if (_x402client) return _x402client;
  const { withPaymentInterceptor } = require('x402-axios');
  const { privateKeyToAccount } = require('viem/accounts');
  const account = privateKeyToAccount(process.env.X402_PAYER_PRIVKEY);
  // withPaymentInterceptor auto-handles: GET -> 402 -> sign EIP-3009 USDC payment -> retry.
  _x402client = withPaymentInterceptor(axios.create({ timeout: 15000 }), account);
  return _x402client;
}

async function paidGet(url) {
  const client = x402Client();
  console.log('   [x402] GET ' + url + ' (auto-pay $0.0001 USDC on 402)');
  const r = await client.get(url);
  if (r.headers['x-payment-response']) console.log('   [x402] payment settled -> telemetry unlocked');
  return r.data;
}

async function readFeed() {
  const feed = (await axios.get(FEED_URL, { timeout: 10000 })).data;
  const l = (feed.data || []).slice(-1)[0] || {};
  return {
    revert: Number(l.arb_revert ?? l.arb_revert_ratio ?? 0) || 0,
    p99:    Number(l.base_p99 ?? l.base_p99_ms ?? 0) || 0,
    stall:  Number(l.stall_flag ?? 0) || 0,
  };
}

// { safe, reason, revert, p99, paid }. Real x402 when payer key set, else public feed.
async function getNetworkSafety() {
  let data, paid = false;
  if (X402_ON && process.env.X402_PAYER_PRIVKEY) {
    try { data = await paidGet(SAFE_URL); paid = true; }
    catch (e) { console.log('   [x402] pay path failed (' + (e.message || e) + ') -> public feed'); data = await readFeed(); }
  } else {
    data = await readFeed();
  }

  const revert = Number(data.revert_ratio ?? data.revert ?? 0) || 0;
  const p99    = Number(data.base_p99_ms ?? data.p99 ?? 0) || 0;
  const stall  = Number(data.stall ?? data.stall_flag ?? 0) || 0;

  let safe = true, reason = 'ok';
  if (typeof data.safe === 'boolean' && !data.safe) { safe = false; reason = data.reason || 'oracle_unsafe'; }
  else if (revert > REVERT_MAX) { safe = false; reason = `mev_war revert=${(revert * 100).toFixed(1)}%`; }
  else if (p99 > P99_MAX_MS)   { safe = false; reason = `sequencer_stall p99=${p99}ms`; }
  else if (stall >= 2)         { safe = false; reason = 'stall_flag'; }

  return { safe, reason, revert, p99, paid };
}

module.exports = { getNetworkSafety };
