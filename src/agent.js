// agent.js — Phoenix Capital-Guard main loop.
// CMC signal -> pay x402 for Phoenix network-safety -> autonomous SAFE/UNSAFE gate
// -> TWAK self-custody swap on BSC, under hard drawdown/slippage/allowlist limits.
// Runs end-to-end in DRY_RUN (demo without funds). LIVE: set DRY_RUN=0 + keys.
require('dotenv').config();
const cmc      = require('./cmc');
const safety   = require('./safety');
const twak     = require('./twak');
const identity = require('./identity');
const { Risk, MAX_DD, PER_TRADE } = require('./risk');

const INTERVAL = Number(process.env.CHECK_INTERVAL || 60) * 1000;
const DRY = process.env.DRY_RUN !== '0';
const START_EQUITY = Number(process.env.START_EQUITY_USD || 100);

const ts = () => new Date().toISOString().replace('T', ' ').slice(0, 19);
const log = (m) => console.log(`${ts()} [CAPITAL-GUARD] ${m}`);

async function cycle(risk) {
  log('— cycle —');
  // 1) CMC: toxic-funding sniffer
  const sig = await cmc.getSignal();
  log(`CMC signal: ${sig.direction} ${sig.symbol || ''} (${sig.reason})`);
  if (sig.direction === 'flat') return;

  // 2) pay x402 -> Phoenix network safety (KILLER: M2M + autonomous block)
  const net = await safety.getNetworkSafety();
  log(`Phoenix safety: ${net.safe ? 'SAFE' : 'UNSAFE'} (revert=${(net.revert*100).toFixed(1)}% p99=${net.p99}ms${net.paid ? ' · x402-paid' : ' · feed'})`);
  if (!net.safe) { log(`🚨 TRADE BLOCKED autonomously — ${net.reason}`); return; }

  // 3) risk gate (drawdown/allowlist/limits)
  const r = risk.check(sig);
  if (!r.ok) { log(`⛔ risk gate: ${r.reason}`); return; }

  // 4) TWAK self-custody execution on BSC
  const res = await twak.executeSwap(r.quote);
  if (res.ok) { risk.record(); log(`✅ swap ${r.quote.amountUsd}$ USDT->${r.quote.tokenOut} | tx ${res.txHash}${res.dry ? ' (DRY)' : ''}`); }
  else log(`❌ swap failed`);
}

async function main() {
  log(`start | mode=${DRY ? 'DRY_RUN' : 'LIVE'} | start_equity=$${START_EQUITY} | maxDD=${MAX_DD}% | perTrade=$${PER_TRADE}`);
  log('flow: identity → CMC funding → x402 pay → Phoenix SAFE/UNSAFE → TWAK self-sign → BSC swap');
  // Auditable autonomy: prove this agent is a LEGIT_AGENT via Silicon DNA before trading.
  const att = await identity.attest();
  if (att.ok) log(`Agent identity: ATTESTED via Silicon DNA (trust=${att.trust} mode=${att.mode} bot_drop=${att.botDrop} banned=${att.banned})`);
  else log(`Silicon DNA identity layer unreachable (${att.err}) — proceeding (demo)`);
  const risk = new Risk(START_EQUITY);
  // first cycle immediately, then on interval
  await cycle(risk).catch(e => log(`cycle error: ${e.message}`));
  setInterval(() => cycle(risk).catch(e => log(`cycle error: ${e.message}`)), INTERVAL);
}

main();
