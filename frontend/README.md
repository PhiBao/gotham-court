# 🦇 Gotham Court — Frontend

Next.js frontend for Gotham Court, the AI-powered decentralized dispute resolution system on GenLayer.

## Setup

```bash
npm install
cp .env.example .env
# Edit .env with your deployed contract address
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | Deployed Gotham Court contract address | — |
| `NEXT_PUBLIC_GENLAYER_RPC_URL` | GenLayer RPC endpoint | `https://studio.genlayer.com/api` |
| `NEXT_PUBLIC_GENLAYER_CHAIN_ID` | GenLayer chain ID | `61999` |

## Tech Stack

- **Next.js 16** — App Router + Turbopack
- **React 19** — UI framework
- **TypeScript** — Type safety
- **Tailwind CSS v4** — OKLCH color system, Gotham dark theme
- **TanStack Query v5** — Data fetching + 10s auto-refresh
- **genlayer-js SDK** — GenLayer blockchain interaction
- **Radix UI** — Accessible dialog, label, button primitives
- **Lucide React** — Icons
- **Sonner** — Toast notifications

## Project Structure

```
frontend/
├── app/
│   ├── page.tsx          # Main page (hero, case feed, how-it-works)
│   ├── layout.tsx        # Root layout + providers
│   └── globals.css       # Gotham dark theme + animations
├── components/
│   ├── CaseFeed.tsx      # Case list, skeleton loaders, filter tabs, analytics
│   ├── CaseDetail.tsx    # Case view, timeline, defense form, judgment UI
│   ├── FileCaseModal.tsx # File case dialog with inline validation
│   ├── Navbar.tsx        # Fixed header with stats + file case button
│   ├── AccountPanel.tsx  # MetaMask connect/disconnect
│   └── ui/               # shadcn/ui base components
├── lib/
│   ├── contracts/
│   │   ├── GothamCourt.ts  # Contract class (genlayer-js SDK wrapper)
│   │   └── types.ts        # Case, CaseSummary, TransactionReceipt types
│   ├── hooks/
│   │   └── useGothamCourt.ts # TanStack Query hooks for all contract ops
│   └── genlayer/
│       ├── WalletProvider.tsx # MetaMask provider + network switching
│       └── client.ts         # GenLayer client config
└── public/                    # Static assets
```

## Features

- **Case Filing** — File disputes with defendant address, description, and evidence URLs
- **Defense Submission** — Defendants respond with counter-arguments and evidence
- **AI Judgment** — Trigger AI validators to scrape evidence and deliver verdicts
- **Case Analytics** — Live stats: total/open/judged cases, guilty count, avg severity, verdict bar
- **Filter Tabs** — All / Open / Defense / Judged with live counts
- **Case Timeline** — Visual step indicator (Filed → Defense → Judged)
- **Skeleton Loaders** — Animated placeholders during data fetch
- **Inline Validation** — Real-time field validation with error messages
- **Severity Bars** — Color-coded 10-point severity visualization
- **MetaMask Wallet** — Connect, switch accounts, auto network switching

## Build

```bash
npm run build
npm start
```

## Deploy to Vercel

1. Set **Root Directory** to `frontend` in Vercel project settings
2. Add environment variables in Vercel dashboard
3. Deploy — auto-detected as Next.js
