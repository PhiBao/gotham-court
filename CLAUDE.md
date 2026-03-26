# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project: Gotham Court

Decentralized AI-powered dispute resolution on GenLayer. Users file cases, defendants submit defenses, and AI validators judge via Optimistic Democracy consensus.

**Deployed contract**: `0x09c7fF6DbaF4dA1A826eCa3B2D46cF11Dab9f064` on GenLayer studionet (chain ID 61999).

## Quick Commands

```bash
npm run deploy          # Deploy contracts via GenLayer CLI
npm run dev             # Start frontend dev server
npm run build           # Build frontend for production
gltest                  # Run contract tests (requires GenLayer Studio)
genlayer network        # Select network (studionet/localnet/testnet)
```

## Architecture

```
contracts/
  gotham_court.py       # GenLayer intelligent contract (case filing, defense, AI judgment)
frontend/               # Next.js 16 app (React 19, TypeScript, TanStack Query, Radix UI)
  app/page.tsx          # Main page (hero, case feed, how-it-works)
  components/           # CaseFeed, CaseDetail, FileCaseModal, Navbar, AccountPanel
  lib/contracts/        # GothamCourt.ts (SDK wrapper), types.ts
  lib/hooks/            # useGothamCourt.ts (TanStack Query hooks)
  lib/genlayer/         # WalletProvider.tsx (MetaMask), client.ts
deploy/                 # TypeScript deployment scripts (genlayer deploy)
test/                   # Python integration tests (gltest)
config/                 # Python config loader
```

## Key Technical Details

- **GenVM**: Does NOT support `import json`. Use `from dataclasses import dataclass` explicitly.
- **Address type**: SDK passes addresses as strings. Use `Address(defendant)` conversion in contract.
- **genlayer-js SDK**: `readContract` returns JavaScript `Map` objects, not plain objects. Frontend converts with `item.forEach((value, key) => obj[key] = value)`.
- **writeContract**: Always pass `value: BigInt(0)` parameter.
- **TransactionStatus**: Import from `genlayer-js/types`.
- **Chain**: Use `studionet` from `genlayer-js/chains`.

## Contract Pattern

```python
from dataclasses import dataclass
from genlayer import *

@allow_storage
@dataclass
class Case:
    id: u256
    plaintiff: Address
    # ...
    status: str

class GothamCourt(gl.Contract):
    cases: TreeMap[u256, Case]
    case_count: u256

    @gl.public.write
    def file_case(self, defendant: Address, ...) -> u256:
        defendant_as_addr = Address(defendant) if isinstance(defendant, str) else defendant
        # ...

    @gl.public.write
    def judge_case(self, case_id: u256) -> None:
        # Uses gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
        # leader_fn: scrapes evidence via gl.nondet.web.render(), generates verdict via gl.nondet.exec_prompt()
        # validator_fn: independently re-runs and compares verdict + severity (±2 tolerance)
```

## Frontend Patterns

- Contract interactions: `frontend/lib/contracts/GothamCourt.ts`
- React hooks: `frontend/lib/hooks/useGothamCourt.ts`
- Wallet context: `frontend/lib/genlayer/WalletProvider.tsx`
- GenLayer client: `frontend/lib/genlayer/client.ts`

---

## GenLayer Technical Reference

> **Can't solve an issue?** Always check the complete SDK API reference:
> **https://sdk.genlayer.com/main/_static/ai/api.txt**
>
> Contains: all classes, methods, parameters, return types, changelogs, breaking changes.

### Documentation URLs

| Resource | URL |
|----------|-----|
| **SDK API (Complete)** | https://sdk.genlayer.com/main/_static/ai/api.txt |
| Full Documentation | https://docs.genlayer.com/full-documentation.txt |
| Main Docs | https://docs.genlayer.com/ |
| GenLayerJS SDK | https://docs.genlayer.com/api-references/genlayer-js |

### What is GenLayer?

GenLayer is an AI-native blockchain where smart contracts can natively access the internet and make decisions using AI (LLMs). Contracts are Python-based and executed in the GenVM.

### Web Access (`gl.nondet.web`)

```python
gl.nondet.web.get(url: str, *, headers: dict = {}) -> Response
gl.nondet.web.post(url: str, *, body: str | bytes | None = None, headers: dict = {}) -> Response
gl.nondet.web.render(url: str, *, mode: Literal['text', 'html']) -> str
gl.nondet.web.render(url: str, *, mode: Literal['screenshot']) -> Image
```

### LLM Access (`gl.nondet`)

```python
gl.nondet.exec_prompt(prompt: str, *, images: Sequence[bytes | Image] | None = None) -> str
gl.nondet.exec_prompt(prompt: str, *, response_format: Literal['json'], image: bytes | Image | None = None) -> dict
```

### Equivalence Principle

Validation for non-deterministic outputs:

| Type | Use Case | Function |
|------|----------|----------|
| Strict | Exact outputs | `gl.eq_principle.strict_eq()` |
| Comparative | Similar outputs | `gl.eq_principle.prompt_comparative()` |
| Non-Comparative | Subjective assessments | `gl.eq_principle.prompt_non_comparative()` |

### Key Documentation Links

- [Introduction to Intelligent Contracts](https://docs.genlayer.com/developers/intelligent-contracts/introduction)
- [Storage](https://docs.genlayer.com/developers/intelligent-contracts/storage)
- [Deploying Contracts](https://docs.genlayer.com/developers/intelligent-contracts/deploying)
- [Crafting Prompts](https://docs.genlayer.com/developers/intelligent-contracts/crafting-prompts)
- [Contract Examples](https://docs.genlayer.com/developers/intelligent-contracts/examples/storage)
- [Testing Contracts](https://docs.genlayer.com/developers/decentralized-applications/testing)
