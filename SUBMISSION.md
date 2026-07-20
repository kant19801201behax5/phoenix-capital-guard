# Phoenix Capital-Guard
### The autonomous BNB agent you can actually leave unattended.
**BNB Hack: AI Trading Agent Edition — CoinMarketCap × Trust Wallet × BNB Chain**
Track 1 (Autonomous Trading Agents) + Special Prizes: **Best use of TWAK · Best use of x402 · Best use of Agent Hub**

---

## The thesis (the pain everyone in this room is feeling)

Everyone taught an agent to **trade**. Nobody solved how to **leave the room and not come back to a drained wallet.**

The whole 2026 agentic-finance race — Coinbase Agentic Wallets, MetaMask Agent Wallet, Trust Wallet AgentKit, Mastercard Agent Pay — is early and **terrifying to run unattended**:
- **Custodial risk** — most agent frameworks hold your keys (Trust Wallet's own words: *"introduces counterparty risk"*).
- **Blind execution** — agents fire into MEV wars / gas spikes / slippage and get rekt (this hackathon literally disqualifies you at 30% drawdown).
- **Zero auditability** — Trust Wallet's stated open problem: *"no standard for how users audit agent behavior after the fact."*

**Phoenix Capital-Guard solves all three** — and it's not a prototype. The safety layer has run in **production since March 2026** (206k+ measurements, x402 live on Base).

---

## Three killer features — each aimed at a sponsor's deepest bet

### 1. Self-Custody Survival → Trust Wallet's #1 differentiator
**TWAK is the sole execution layer.** Keys never leave the user; the agent signs and broadcasts its own BSC swaps locally. Before *every* trade it consults a network-safety gate and, if BSC/L2 is under MEV war or sequencer stall, **blocks its own trade autonomously** — staying under the 30% drawdown line by design. Self-custody + survival instinct = the agent you can leave running.

### 2. Bidirectional x402 flywheel → CMC + Coinbase's "prove the M2M economy" bet
Most teams will *consume* x402. We do both:
- **Agent PAYS x402** → CMC Agent Hub for derivatives/funding data ($0.0001–$0.01 USDC/call).
- **Phoenix Zero EARNS x402** → our agent buys network-safety telemetry from *our own* live x402 endpoint (`/api/v1/safe`, Base mainnet, since March 2026).

We're not a guest in the agentic economy — we're a **two-way proof it works.** Real `HTTP 402 → sign → settle → data`, in the trade loop, not in the README.

### 3. Auditable Autonomy → Trust Wallet's stated open problem
Before trading, the agent completes the live **Silicon DNA** gate — a real **Argon2id proof-of-work handshake** (`GET /api/challenge → solve → POST /api/verify-pow → {status:"VERIFIED"}`, ML-KEM-768 PQC transport). **Verified live end-to-end:** a clean agent returns `VERIFIED`; a no-PoW request is classified `MALICIOUS_BOT` and rejected. So an unattended agent is provably a legit actor, not a malicious bot — exactly the audit gap the industry admits it has. Every decision is also logged with its cause (CMC signal + network verdict + risk state).

---

## Live demo (runs free, no capital — DRY/testnet)

```
[CAPITAL-GUARD] flow: identity → CMC funding → x402 pay → Phoenix SAFE/UNSAFE → TWAK self-sign → BSC swap
[CAPITAL-GUARD] Agent identity: LEGIT_AGENT — Silicon DNA Argon2id PoW VERIFIED (m_cost=65536, 212ms)
[CAPITAL-GUARD] CMC signal: long CAKE (toxic-funding -1.80%, fear=18)
[CAPITAL-GUARD] Phoenix safety: SAFE (revert=0.6% p99=10.7ms)   ← LIVE production oracle
   [TWAK] self-sign swap 25$ USDT->CAKE (chain 56, self-custody)
[CAPITAL-GUARD] ✅ swap | tx 0x…
```
When the network storms, the same loop prints `🚨 TRADE BLOCKED autonomously — mev_war` and skips the trade. **That moment is the demo.**

🎬 Production proof video (capital auto-protection, live infra): https://youtu.be/KtTrz23B92w

---

## Maps 1:1 to the TWAK special-prize rubric
| Criterion | Weight | Us |
|---|---|---|
| TWAK integration depth (sole executor, multi-surface) | 30 | TWAK = only execution: sign + autonomous mode + x402 |
| Self-custody integrity (keys stay local) | 25 | keys never leave; local signing whole round-trip |
| Autonomous execution + limits (drawdown/allowlist/slippage) | 20 | hard 25% DD stop (<30% DQ), per-trade/daily caps, allowlist, slippage |
| Native x402 (real, in the loop) | 10 | bidirectional x402, live since Mar 2026 |
| Originality + real-world | 10 | "the agent you can leave unattended" — a trust layer, not bot #401 |
| Demo + on-chain proof | 5 | live loop + BSC tx + production oracle |

---

## Production proof
- Phoenix Zero: **206,000+** network measurements, 6 chains, live since **Mar 2026**.
- x402 gateway: live on Base mainnet (official x402 + Coinbase CDP facilitator, Base Sepolia testnet fallback).
- Silicon DNA: 270/270 tests, ML-KEM-768 PQC.

## Run it
```bash
cp .env.example .env && npm install && npm run dry   # full loop, free, no keys
# live: fill CMC + TWAK keys, DRY_RUN=0, npm run register (before 22 Jun), npm start
```

## Repo
- `src/agent.js` loop · `cmc.js` (toxic-funding sniffer) · `safety.js` (x402 → Phoenix gate) · `twak.js` (self-custody exec + register) · `risk.js` (drawdown guard) · `register.js`
- Reuses the **production** Phoenix Zero x402 oracle. Not a prototype — the trust layer already runs.
