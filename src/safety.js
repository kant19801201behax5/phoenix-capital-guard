// safety.js — Phoenix Zero network-safety gate, paid per-check via REAL x402.
// KILLER FEATURE 1+2: agent pays x402 (M2M) for live network telemetry and
// BLOCKS its own trade if BSC/L2 is unsafe. Reuses the PRODUCTION Phoenix Zero
// x402 gateway (x402 v2, Base mainnet, USDC $0.01/call, Coinbase CDP facilitator).
const axios = require('axios');

const SAFE_URL = process.env.PHOENIX_SAFE_URL || 'https://rtt.phoenix-ai.work/api/v1/safe';
const FEED_URL = process.env.PHOENIX_FEED_URL || 'https://rtt.phoenix-ai.work/api/public-feed';
const X402_ON  = process.env.X402_ENABLED === '1';

const REVERT_MAX = 0.15;
const P99_MAX_MS = Number(process.env.SAFE_P99_MAX_MS || 1500);

// --- REAL x402 paying client (official x402-axios + viem wallet on Base) -------
let _x402client = null;
function x402Client() {
  if (_x402client) return _x402client;
  const { withPaymentInterceptor } = require('x402-axios');
  const { createWalletClient, http } = require('viem');
  const { privateKeyToAccount } = require('viem/accounts');
  const { base } = require('viem/chains');
  const account = privateKeyToAccount(process.env.X402_PAYER_PRIVKEY);
  const wallet  = createWalletClient({ account, chain: base, transport: http() });
  // auto-handles: GET -> 402 -> sign EIP-3009 USDC authorization -> retry -> data
  _x402client = withPaymentInterceptor(axios.create({ timeout: 20000 }), wallet);
  return _x402client;
}

async function paidGet(url) {
  console.log('   [x402] GET ' + url + ' (auto-pay $0.01 USDC on Base on 402)');
  const r = await x402Client().get(url);
  if (r.headers['x-payment-response']) console.log('   [x402] payment settled on Base -> telemetry unlocked');
  return r.data;
}

// Demo-proof: hit the live x402 endpoint, decode the real 402 challenge, log it.
// Proves x402 is REAL and live even when we are not funded to settle.
async function probe402() {
  try {
    await axios.get(SAFE_URL, { timeout: 8000 });
  } catch (e) {
    const pr = e.response && e.response.status === 402 && e.response.headers['payment-required'];
    if (pr) {
      try {
        const d = JSON.parse(Buffer.from(pr, 'base64').toString('utf8'));
        const a = (d.accepts && d.accepts[0]) || {};
        const usd = (Number(a.amount || 0) / 1e6).toFixed(4);
        console.log(`   [x402] LIVE 402 from gateway — net=${a.network} asset=${a.extra && a.extra.name || 'USDC'} price=$${usd} payTo=${String(a.payTo || '').slice(0, 12)}… (set X402_PAYER_PRIVKEY to settle)`);
      } catch { console.log('   [x402] LIVE 402 received from gateway'); }
    }
  }
}

async function readFeed() {
  const feed = (await axios.get(FEED_URL, { timeout: 10000 })).data;
  const l = (feed.data || []).slice(-1)[0] || {};
  return {
    revert: Number(l.arb_revert ?? l.arb_revert_ratio ?? 0) || 0,
    p99:    Number(l.base_p99 ?? l.base_p99_ms ?? 0) || 0,
    stall:  Number(l.stall_prob ?? l.stall_flag ?? 0) || 0,
  };
}

// { safe, reason, revert, p99, paid }. Real x402 pay when funded; else proves the
// live 402 and reads the public feed. Fail-safe (block) if oracle unreachable.
async function getNetworkSafety() {
  let data, paid = false;
  try {
    if (X402_ON && process.env.X402_PAYER_PRIVKEY) {
      try { data = await paidGet(SAFE_URL); paid = true; }
      catch (e) { console.log('   [x402] pay path failed (' + (e.message || e) + ') -> public feed'); data = await readFeed(); }
    } else {
      if (X402_ON) await probe402();   // show the live 402 even when unfunded
      data = await readFeed();
    }
  } catch (e) {
    console.log('   [safety] oracle unreachable (' + (e.message || e) + ') -> fail-safe BLOCK');
    return { safe: false, reason: 'oracle_unreachable_failsafe', revert: 0, p99: 0, paid: false };
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
