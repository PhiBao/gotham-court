# 🦇 GOTHAM COURT

**Decentralized AI-Powered Dispute Resolution on GenLayer**

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/license/mit/)
[![GenLayer](https://img.shields.io/badge/Built%20on-GenLayer-FFD700)](https://genlayer.com)

> *"In the darkness of disputes, AI brings the light of justice."*

## What is Gotham Court?

Gotham Court is a decentralized dispute resolution system built on [GenLayer](https://genlayer.com)'s AI-native blockchain. File a case, present evidence, and let AI judges analyze both sides to deliver fair verdicts through **Optimistic Democracy** consensus.

No human bias. No backroom deals. Just on-chain justice.

### How It Works

1. **File a Case** — Plaintiff identifies the defendant, describes the dispute, and submits evidence URLs
2. **Submit Defense** — Defendant responds with their counter-arguments and evidence
3. **Place Bets** — Anyone (except parties) can stake real GEN on Guilty, Not Guilty, or Insufficient Evidence
4. **AI Judgment** — Multiple AI validators independently scrape evidence, analyze both sides, and reach consensus
5. **Verdict & Payout** — Winners receive a proportional share of the entire pool via on-chain GEN transfer

## Tech Stack

### Intelligent Contract (Python / GenVM)
- **GenLayer Intelligent Contract** with `@allow_storage` dataclass for case & bet storage
- **TreeMap** storage for on-chain case management and betting ledger
- **`gl.nondet.web.render()`** for evidence scraping during judgment
- **`gl.nondet.exec_prompt()`** for AI-powered verdict generation
- **Optimistic Democracy** — leader proposes verdict, validators independently verify
- **Payable betting** — `@gl.public.write.payable` reads `gl.message.value` for real GEN reception
- **Native transfers** — `_Recipient.emit_transfer()` sends GEN winnings to bettors
- **Native GEN transfers** — `@gl.public.write.payable` for receiving bets, `_Recipient.emit_transfer()` for sending winnings to bettors

### Frontend (TypeScript / Next.js)
- **Next.js 16** with App Router and Turbopack
- **React 19** with TanStack Query v5 for data fetching
- **genlayer-js SDK** for contract interaction
- **Radix UI** primitives + **Tailwind CSS v4** (OKLCH color system)
- **MetaMask** wallet integration
- Dark "Gotham" theme with animated UI

## Features

### Core Justice
- **Case Filing** — File disputes against any address with evidence URLs
- **Defense System** — Defendants can respond with counter-evidence
- **AI Judgment** — GenLayer validators scrape evidence and reach consensus
- **Case Analytics** — Real-time stats dashboard with verdict distribution
- **Filter Tabs** — Filter cases by status (Open / Defense / Judged)
- **Case Timeline** — Visual progress tracker (Filed → Defense → Judged)
- **Severity Bars** — Visual severity indicators for judged cases
- **Inline Validation** — Real-time form validation with error feedback

### Prediction Market (Betting)
- **Parimutuel Pool Betting** — Stake real GEN on three outcomes: Guilty, Not Guilty, or Insufficient Evidence
- **Real Token Transfers** — Bets are payable transactions (`gl.message.value`). Winnings sent via `_Recipient.emit_transfer()`
- **Proportional Payouts** — Winners split the entire pool based on their stake share
- **Anti-Griefing** — Plaintiffs and defendants cannot bet on their own case; no betting after judgment
- **Escrow Tracking** — Contract tracks per-case escrow balances for transparency
- **Real GEN Escrow** — Contract holds native GEN in escrow per-case and redistributes proportionally to winners

### Leaderboard & History
- **Betting Leaderboard** (`Leaderboard.tsx`) — Top 10 cases ranked by total pool volume, with medal rankings, pool bars, and verdict badges
- **Bet History** (`BetHistory.tsx`) — Connected wallet's active bets (awaiting judgment) and past claimed bets, with outcome color-coding and case status
- **User Bets Query** — `useUserBets` hook queries all bets across cases for the connected address

### Faucet & Wallet
- **Faucet Page** (`/faucet`) — Links to GenLayer testnet faucets with live wallet balance display
- **Balance Polling** — Real-time GEN balance refresh via MetaMask provider

## Project Structure

```
gotham-court/
├── contracts/
│   └── gotham_court.py          # GenLayer intelligent contract (cases + betting + events)
├── frontend/
│   ├── app/
│   │   ├── page.tsx             # Main page
│   │   ├── faucet/
│   │   │   └── page.tsx         # GEN faucet page with balance display
│   │   ├── layout.tsx           # Root layout
│   │   └── globals.css          # Gotham dark theme
  │   ├── components/
  │   │   ├── BettingPanel.tsx     # Parimutuel betting UI (place bets / claim)
  │   │   ├── CaseFeed.tsx         # Case list + filters + analytics + pool bars
  │   │   ├── CaseDetail.tsx       # Case view + timeline + judgment + betting
  │   │   ├── FileCaseModal.tsx    # File case dialog with validation
  │   │   ├── Leaderboard.tsx      # Top cases by betting volume (pool ranking)
  │   │   ├── BetHistory.tsx       # User's active + past bets across all cases
  │   │   ├── Navbar.tsx           # Navigation + stats + faucet link
  │   │   └── AccountPanel.tsx     # MetaMask wallet panel
│   └── lib/
│       ├── contracts/
│       │   ├── GothamCourt.ts   # Contract interaction class (payable bets)
│       │   └── types.ts         # TypeScript types
│       ├── hooks/
│       │   └── useGothamCourt.ts # TanStack Query hooks (bets + escrow)
│       └── genlayer/
│           ├── WalletProvider.tsx # MetaMask provider
│           └── client.ts          # Network config + provider helpers
├── deploy/                       # Deployment scripts
├── test/                         # Integration tests (betting + claiming)
└── .audit/findings/              # Security audit reports
```

## Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) v18+
- [GenLayer CLI](https://github.com/genlayerlabs/genlayer-cli): `npm install -g genlayer`
- Access to [GenLayer Studio](https://studio.genlayer.com/) (testnet)

### 1. Install dependencies
```bash
npm install
cd frontend && npm install
```

### 2. Deploy the contract
```bash
# Select network
genlayer network

# Deploy
genlayer deploy
```

### 3. Configure frontend
```bash
# Update contract address in frontend/.env
echo "NEXT_PUBLIC_CONTRACT_ADDRESS=<your-contract-address>" > frontend/.env
echo "NEXT_PUBLIC_GENLAYER_RPC_URL=https://studio.genlayer.com/api" >> frontend/.env
echo "NEXT_PUBLIC_GENLAYER_CHAIN_ID=61999" >> frontend/.env
```

### 4. Run the frontend
```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and connect MetaMask to the GenLayer network (chain ID 61999).

## Architecture

### Dispute Resolution Flow
```
User (MetaMask) → Frontend (Next.js) → genlayer-js SDK → GenLayer RPC
                                                              ↓
                                                    Intelligent Contract
                                                    (gotham_court.py)
                                                              ↓
                                                    AI Validators scrape
                                                    evidence & judge via
                                                    Optimistic Democracy
```

### Betting Flow (Real GEN Transfers)
```
User → place_bet(outcome) + value: GEN
         ↓
   Contract receives gl.message.value
         ↓
   Bet stored in TreeMap + pool totals updated
         ↓
   Case judged → verdict determined
         ↓
   User → claim_winnings(case_id)
         ↓
   Contract calculates proportional share
         ↓
   _Recipient(sender).emit_transfer(value=winnings)
         ↓
   GEN sent to winner via on-chain message
```

### Betting Model: Parimutuel Pool
Gotham Court uses a **parimutuel (pool) betting system**, not an orderbook:
- All bets on a single case go into one shared pool
- The pool is divided into three outcome buckets (Guilty / Not Guilty / Insufficient Evidence)
- After the AI verdict, the **entire pool** (winning + losing bets) is distributed proportionally to winners
- If nobody bet on the winning outcome, all bettors receive a refund
- The contract uses `@gl.public.write.payable` to receive real GEN, and `_Recipient.emit_transfer()` to send payouts

## Hackathon Track

**Onchain Justice** — *GenLayer Testnet Bradbury Hackathon*

Built to demonstrate how GenLayer's AI-native blockchain enables trustless, transparent dispute resolution where AI validators independently analyze evidence and reach consensus — no human judges required.

## Security

The intelligent contract has been through iterative security audits (see [`.audit/findings/`](.audit/findings/)) following the **Nemesis Auditor** methodology (Feynman + State Inconsistency passes) and **Pashov Audit Group** patterns.

### Core Hardening
- **Defense-required judgment** — `judge_case` requires a defense submission before AI judgment can proceed, preventing rush-to-judgment attacks
- **Prompt injection mitigation** — User-submitted data is wrapped in `BEGIN/END` markers with explicit instructions to ignore embedded commands, and all inputs are truncated (title: 200 chars, description/defense: 5,000 chars, web scrapes: 2,000 chars)
- **Input validation** — Whitespace-only strings rejected for title, description, evidence URLs, and defense text
- **Verdict consensus** — Validators independently re-run the full judgment pipeline and verify verdict match + severity within ±2 tolerance

### Betting Security
- **Party exclusion** — Plaintiffs and defendants are blocked from betting on their own case
- **Closed betting** — `place_bet` reverts if `case.status == "JUDGED"`
- **Double-claim prevention** — `claim_winnings` reverts if `bet.claimed == True`
- **State-before-transfer** — `bet.claimed = True` is set **before** `_Recipient.emit_transfer()` to prevent reentrancy-style issues
- **Balance check** — Contract verifies `self.balance >= winnings` before emitting transfer (defensive)
- **No switch-betting** — Users can only add to an existing bet on the same outcome; switching outcomes is prohibited

## License

MIT — see [LICENSE](LICENSE) for details.

## Links

- **[GenLayer Documentation](https://docs.genlayer.com/)**
- **[Discord](https://discord.gg/8Jm4v89VAu)** | **[Telegram](https://t.me/genlayer)**
