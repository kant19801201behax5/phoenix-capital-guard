// identity.js — REAL Silicon DNA agent attestation (KILLER FEATURE 3).
// Answers Trust Wallet's own open problem: "no standard for how users audit
// agent behavior / who is this agent". Before trading, the agent runs the LIVE
// Silicon DNA gate: GET /api/challenge -> solve Argon2id PoW (same hash-wasm lib
// + params as the server: salt 'quantum_salt_3.2') -> POST /api/verify-pow.
// The server recomputes argon2id and returns VERIFIED only on a genuine match
// (with ASIC / slow-time / forgery guards). So an unattended agent is provably
// a LEGIT_AGENT, not a malicious bot — not a metrics read, a real handshake.
const axios = require('axios');

const BASE        = process.env.SILICON_DNA_BASE || 'https://rtt.phoenix-ai.work';
const SDNA_METRICS = process.env.SILICON_DNA_URL || (BASE + '/api/silicon-metrics');
const SALT        = 'quantum_salt_3.2';   // must match the Silicon DNA server

async function powAttest() {
  const { argon2id } = require('hash-wasm');
  // 1) challenge
  const ch = (await axios.get(BASE + '/api/challenge', { timeout: 10000 })).data;
  const { target, m_cost, t_cost } = ch;
  if (!target) throw new Error('no challenge target');
  // 2) solve Argon2id PoW — identical lib (hash-wasm) + params as the server
  const t0 = Date.now();
  const hash = await argon2id({
    password: target, salt: SALT,
    iterations: t_cost, memorySize: m_cost,
    hashLength: 32, parallelism: 1, outputType: 'hex',
  });
  const calcTime = Date.now() - t0;
  // 3) verify — server recomputes argon2id(target) and compares
  const v = (await axios.post(BASE + '/api/verify-pow', { hash, calcTime, m_cost }, { timeout: 20000 })).data;
  return { verified: v.status === 'VERIFIED', m_cost, calcTime, next: v.next_m_cost };
}

// { ok, verified, mcost?, calcTime?, mode?, note?/err? }
async function attest() {
  try {
    const r = await powAttest();
    if (r.verified) return { ok: true, verified: true, mcost: r.m_cost, calcTime: r.calcTime };
    return { ok: true, verified: false, reason: 'pow_not_verified' };
  } catch (e) {
    // Graceful: liveness-only read so the loop never crashes if the gate blips.
    try {
      const m = (await axios.get(SDNA_METRICS, { timeout: 8000 })).data;
      return { ok: true, verified: false, mode: m.mode, threat: m.phoenix_threat, note: 'liveness only (' + (e.message || e) + ')' };
    } catch (e2) {
      return { ok: false, err: e.message || String(e) };
    }
  }
}

module.exports = { attest };
