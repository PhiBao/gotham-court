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
3. **AI Judgment** — Multiple AI validators independently scrape evidence, analyze both sides, and reach consensus
4. **Verdict** — Guilty, Not Guilty, or Insufficient Evidence with severity rating (1-10) and AI reasoning

## Tech Stack

### Intelligent Contract (Python / GenVM)
- **GenLayer Intelligent Contract** with `@allow_storage` dataclass for case storage
- **TreeMap** storage for on-chain case management
- **`gl.nondet.web.render()`** for evidence scraping during judgment
- **`gl.nondet.exec_prompt()`** for AI-powered verdict generation
- **Optimistic Democracy** — leader proposes verdict, validators independently verify

### Frontend (TypeScript / Next.js)
- **Next.js 16** with App Router and Turbopack
- **React 19** with TanStack Query v5 for data fetching
- **genlayer-js SDK** for contract interaction
- **Radix UI** primitives + **Tailwind CSS v4** (OKLCH color system)
- **MetaMask** wallet integration
- Dark "Gotham" theme with animated UI

## Features

- **Case Filing** — File disputes against any address with evidence URLs
- **Defense System** — Defendants can respond with counter-evidence
- **AI Judgment** — GenLayer validators scrape evidence and reach consensus
- **Case Analytics** — Real-time stats dashboard with verdict distribution
- **Filter Tabs** — Filter cases by status (Open / Defense / Judged)
- **Case Timeline** — Visual progress tracker (Filed → Defense → Judged)
- **Severity Bars** — Visual severity indicators for judged cases
- **Inline Validation** — Real-time form validation with error feedback

## Project Structure

```
gotham-court/
├── contracts/
│   └── gotham_court.py          # GenLayer intelligent contract
├── frontend/
│   ├── app/
│   │   ├── page.tsx             # Main page
│   │   ├── layout.tsx           # Root layout
│   │   └── globals.css          # Gotham dark theme
│   ├── components/
│   │   ├── CaseFeed.tsx         # Case list + filters + analytics
│   │   ├── CaseDetail.tsx       # Case view + timeline + judgment
│   │   ├── FileCaseModal.tsx    # File case dialog with validation
│   │   ├── Navbar.tsx           # Navigation + stats
│   │   └── AccountPanel.tsx     # MetaMask wallet panel
│   └── lib/
│       ├── contracts/
│       │   ├── GothamCourt.ts   # Contract interaction class
│       │   └── types.ts         # TypeScript types
│       ├── hooks/
│       │   └── useGothamCourt.ts # TanStack Query hooks
│       └── genlayer/
│           └── WalletProvider.tsx # MetaMask provider
├── deploy/                       # Deployment scripts
└── test/                         # Integration tests
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

## Hackathon Track

**Onchain Justice** — *GenLayer Testnet Bradbury Hackathon*

Built to demonstrate how GenLayer's AI-native blockchain enables trustless, transparent dispute resolution where AI validators independently analyze evidence and reach consensus — no human judges required.

## Security

The intelligent contract has been through a full security audit (see [`.audit/findings/`](.audit/findings/)). Key hardening measures:

- **Defense-required judgment** — `judge_case` requires a defense submission before AI judgment can proceed, preventing rush-to-judgment attacks
- **Prompt injection mitigation** — User-submitted data is wrapped in `BEGIN/END` markers with explicit instructions to ignore embedded commands, and all inputs are truncated (title: 200 chars, description/defense: 5,000 chars, web scrapes: 2,000 chars)
- **Input validation** — Whitespace-only strings rejected for title, description, evidence URLs, and defense text
- **Verdict consensus** — Validators independently re-run the full judgment pipeline and verify verdict match + severity within ±2 tolerance

## License

MIT — see [LICENSE](LICENSE) for details.

## Links

- **[GenLayer Documentation](https://docs.genlayer.com/)**
- **[Discord](https://discord.gg/8Jm4v89VAu)** | **[Telegram](https://t.me/genlayer)**
