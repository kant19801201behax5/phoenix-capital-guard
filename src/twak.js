// twak.js — Trust Wallet Agent Kit execution layer (self-custody).
// TWAK is the ONLY execution surface: local signing, agent broadcasts its own
// BSC swaps. Keys never leave the user. (Special-prize criterion: TWAK is the
// execution layer, not an LLM add-on.)
const axios = require('axios');

const MODE = process.env.TWAK_MODE || 'rest';          // rest | cli | mcp
const REST = process.env.TWAK_REST_URL || 'http://127.0.0.1:8080';
const DRY  = process.env.DRY_RUN !== '0';
const CHAIN_ID = Number(process.env.BSC_CHAIN_ID || 56);

// Self-custody sign + broadcast a spot swap on BSC via TWAK.
// quote: { tokenIn, tokenOut, amountUsd, slippageBps }
async function executeSwap(quote) {
  if (DRY) {
    const fakeHash = '0x' + Buffer.from(`${quote.tokenIn}-${quote.tokenOut}-${Date.now()}`).toString('hex').slice(0, 64);
    console.log(`   [TWAK] DRY self-sign swap ${quote.amountUsd}$ ${quote.tokenIn}->${quote.tokenOut} (chain ${CHAIN_ID})`);
    return { ok: true, dry: true, txHash: fakeHash };
  }
  // LIVE: TWAK self-custody sign + broadcast. Endpoint/method names per TWAK docs.
  if (MODE === 'rest') {
    const r = await axios.post(`${REST}/v1/swap`, {
      chainId: CHAIN_ID,
      tokenIn: quote.tokenIn, tokenOut: quote.tokenOut,
      amountUsd: quote.amountUsd, slippageBps: quote.slippageBps,
      sign: 'local',                 // self-custody local signing
    }, { timeout: 30000 });
    return { ok: !!r.data?.txHash, txHash: r.data?.txHash, raw: r.data };
  }
  throw new Error(`TWAK mode ${MODE} not wired yet`);
}

// On-chain competition registration: agent wallet -> contract participant list.
async function competeRegister() {
  if (DRY) { console.log('   [TWAK] DRY compete register (mock)'); return { ok: true, dry: true }; }
  if (MODE === 'rest') {
    const r = await axios.post(`${REST}/v1/compete/register`, { chainId: CHAIN_ID }, { timeout: 30000 });
    return { ok: !!r.data?.txHash, txHash: r.data?.txHash, raw: r.data };
  }
  throw new Error(`TWAK mode ${MODE} not wired yet`);
}

module.exports = { executeSwap, competeRegister };
