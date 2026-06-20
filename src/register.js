// register.js — one-shot on-chain competition registration on BSC.
// MUST run before the trading window opens (22 Jun). Adds the agent wallet to
// the immutable participant list. Two paths: TWAK CLI/REST, or direct contract.
require('dotenv').config();
const twak = require('./twak');

// Competition contract on BSC (from hackathon brief).
const COMPETITION = process.env.COMPETITION_CONTRACT || '0x212c61b9b72c95d95bf29cf032f5e5635629aed5';

async function main() {
  console.log(`[REGISTER] competition contract: ${COMPETITION}`);
  console.log(`[REGISTER] mode: ${process.env.DRY_RUN !== '0' ? 'DRY (no tx)' : 'LIVE'}`);
  // Preferred: TWAK handles wallet + signs the register tx.
  const res = await twak.competeRegister();
  if (res.ok) console.log(`[REGISTER] OK ${res.dry ? '(DRY)' : 'tx ' + res.txHash}`);
  else console.log('[REGISTER] FAILED', res);
  // Direct fallback (if not using TWAK CLI): call competition_register()/register()
  // on COMPETITION with the agent wallet via ethers + BSC_RPC. Needs tiny BNB gas.
}

main().catch(e => { console.error('[REGISTER] error:', e.message); process.exit(1); });
