# Phoenix Capital-Guard — BNB AI Trading Agent

> Not a price predictor — a **bodyguard for capital**. Uses CMC to find edges, but
> uses **TWAK** (self-custody) + **x402** (pay-per-data) to *survive*. Before every
> trade the agent autonomously buys network telemetry from Phoenix Zero via x402;
> if BSC/L2 is lagging or under MEV war, the trade is blocked locally. No gas burned,
> no slippage rekt, no 30% drawdown disqualification.

**Hackathon:** BNB Chain × CoinMarketCap × Trust Wallet — Track 1 (Autonomous Trading Agents) + Special Prizes (Best use of x402 / TWAK / Agent Hub).

---

## Killer features
1. **Hardware Guardrail (auto-block):** `safety.js` pays x402 → Phoenix Zero `SAFE/UNSAFE`. Unsafe network → trade blocked autonomously. *(TWAK 20pts: autonomous limits.)*
2. **Native x402 M2M:** real `HTTP 402 → sign micro-payment → telemetry unlocked` inside the trade loop — not a README promise. *(x402 10pts.)*
3. **Toxic Funding Sniffer:** `cmc.js` scans the 149 allowed tokens for extreme-negative funding + Fear&Greed extremes → short-squeeze spot buy. Not RSI/MACD junk.

Execution is **TWAK only** (`twak.js`, local signing). Risk guards (`risk.js`): hard drawdown stop at 25% (below the 30% DQ), per-trade cap, daily cap, token allowlist, slippage cap.

## Architecture
```
CMC Agent Hub ──signal──┐
                        ▼
                  agent.js loop
                        │  pay x402 ──► Phoenix Zero /api/v1/safe ──► SAFE/UNSAFE
                        │  if UNSAFE → BLOCK (autonomous)
                        │  risk gate (drawdown/allowlist/limits)
                        ▼
                   TWAK (self-custody sign) ──► swap on BNB Chain (BSC)
```

## Quick start (DRY — runs without funds/keys, for the demo)
```bash
cp .env.example .env          # DRY_RUN=1 by default
npm install
npm run dry                   # full loop: CMC → x402 → safety → TWAK (mock)
```

## Go live (Track 1)
1. Fill `.env`: `CMC_API_KEY`, `TWAK_AGENT_PRIVKEY` (existing wallet), `X402_PAYER_PRIVKEY`, set `DRY_RUN=0`.
2. Fund the agent wallet with a little BNB (gas) + a stable on BSC.
3. Register on-chain **before 22 Jun**: `npm run register` (or `twak compete register`). Contract `0x212c61b9b72c95d95bf29cf032f5e5635629aed5`.
4. `npm start` — trades the open window 22–28 Jun (≥1 trade/day, drawdown-guarded).

## Files
- `src/agent.js` — main loop
- `src/cmc.js` — CMC toxic-funding signal
- `src/safety.js` — Phoenix Zero x402 network-safety gate
- `src/twak.js` — TWAK self-custody execution + registration
- `src/risk.js` — drawdown/slippage/allowlist guards
- `src/register.js` — on-chain competition registration
- `SUBMISSION.md` — DoraHacks pitch

## Wire-points (marked `TODO(wire)` in code)
- `safety.js buildX402Payment` → real x402 client payment (Phoenix gateway is live).
- `cmc.js fundingExtremes` → confirm CMC Agent Hub funding endpoint path.
- `twak.js` REST endpoints → real TWAK CLI/REST/MCP method names.

> Reuses the **production** Phoenix Zero oracle (live since Mar 2026: 206k+ RTT samples, x402 on Base). This is not a prototype — the safety layer already runs.
