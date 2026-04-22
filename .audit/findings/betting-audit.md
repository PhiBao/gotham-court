# Gotham Court — Betting Feature Security Audit (Real GEN Token Version)

> **Scope**: `contracts/gotham_court.py` betting additions and related frontend code.
> **Method**: Feynman first-principles pass + State Inconsistency pass, inspired by Nemesis Auditor and Pashov Audit Group patterns.
> **Date**: 2026-04-22
> **Version**: Real GEN native token transfers (payable bets + `emit_transfer` payouts)

---

## Executive Summary

The betting feature adds a prediction market layer to Gotham Court. Users stake **real GEN tokens** (native currency) on three outcomes (Guilty, Not Guilty, Insufficient Evidence) before judgment. After the AI verdict, winners receive a proportional share of the total pool via on-chain native token transfer (`_Recipient.emit_transfer`).

**Overall Risk**: LOW for a hackathon/demo deployment. No Critical or High findings. Two Medium observations around precision dust and missing production hardening. Events and native transfers are now implemented.

---

## Findings

### GTH-001: Integer Division Dust Accumulation
**Severity**: MEDIUM  
**Discovery Path**: Feynman pass — payout formula in `claim_winnings`

**Root Cause**: `claim_winnings` uses floor division `//` to compute proportional payouts:
```python
winnings = (bet.amount * total_pool) // winning_total
```

When `(bet.amount * total_pool)` is not evenly divisible by `winning_total`, the remainder ("dust") stays in the contract and is permanently unclaimable.

**Trigger Sequence**:
1. Bettor A stakes 3 wei on GUILTY
2. Bettor B stakes 2 wei on GUILTY
3. Bettor C stakes 2 wei on NOT_GUILTY
4. Verdict = GUILTY (winning_total = 5, total_pool = 7)
5. A claims: `(3 * 7) // 5 = 4` (dust: 1 wei)
6. B claims: `(2 * 7) // 5 = 2` (dust: 4 wei)
7. Total distributed = 6 wei; 1 wei remains locked in contract forever

**Impact**: In a real-value system, dust accumulates over time, creating a slowly-growing locked GEN balance. The contract now tracks `case_escrow` per case, but unclaimed dust between cases is not sweepable.

**Fix**: Document the dust behavior as acceptable for the demo. For production, use fixed-point arithmetic (e.g., multiply all calculations by `1e18` and track fractional shares), or add a `sweep_dust(admin)` function callable by an authorized address.

**Verification**: Manual code trace confirmed.

---

### GTH-002: Event Emission Added ✅ FIXED
**Severity**: RESOLVED  
**Discovery Path**: State Inconsistency pass

**Status**: `BetPlaced`, `WinningsClaimed`, `CaseFiled`, `DefenseSubmitted`, and `CaseJudged` events are now emitted. This enables off-chain indexers and reactive UIs.

---

### GTH-003: Missing Bet Limits / No Maximum Stake Cap
**Severity**: LOW  
**Discovery Path**: Feynman pass — economic attack vector

**Root Cause**: `place_bet` accepts any `gl.message.value > 0` with no upper bound.

**Impact**: In a real-value system, a whale could dominate the pool and manipulate implied odds, or grief smaller bettors by making proportional shares negligible.

**Fix**: Add a `MAX_BET_AMOUNT` constant (e.g., 1000 GEN in wei) and enforce it:
```python
if amount > MAX_BET_AMOUNT:
    raise gl.UserError(f"Bet exceeds maximum of {MAX_BET_AMOUNT}")
```

**Verification**: Code trace confirmed no limits exist.

---

### GTH-004: Frontend Precision for Large Bet Amounts
**Severity**: LOW  
**Discovery Path**: Cross-feed Feynman → State Inconsistency

**Root Cause**: The frontend converts user input (GEN string) to wei `BigInt` via a custom `toWei()` helper. Very small amounts with many decimal places could hit edge cases.

**Current Mitigation**: The `toWei()` function pads and truncates to 18 decimals. For amounts up to `Number.MAX_SAFE_INTEGER / 1e18` (~9M GEN), precision is maintained. A comment warns users.

**Fix**: Add client-side `MAX_BET` validation and clamp decimals.

**Verification**: Code trace of `BettingPanel.tsx` `toWei()` and `GothamCourt.ts` `placeBet` signature.

---

### GTH-005: Native Transfer Balance Check
**Severity**: LOW  
**Discovery Path**: Feynman pass — external value transfer

**Root Cause**: `claim_winnings` checks `self.balance < winnings` before emitting transfer. If this check fails, the function reverts. However, if multiple claims race and the contract balance is drained between calculation and transfer, the check catches it.

**Note**: GenLayer's value transfer model deducts immediately from the contract balance when `emit_transfer()` is called and credits the recipient when the child transaction finalizes. There is no classic EVM reentrancy risk. The state update (`bet.claimed = True`) happens before the transfer.

**Verification**: Code trace confirmed `bet.claimed = True` precedes `_Recipient(...).emit_transfer()`.

---

### GTH-006: Key Format Consistency Risk
**Severity**: INFO  
**Discovery Path**: State Inconsistency pass — TreeMap key mapping

**Root Cause**: Betting keys are constructed via f-strings using `u256` (`case_id`) and `Address.as_hex`. If `u256.__str__` ever changes representation between write and view contexts, keys would desync.

**Current Assessment**: LOW risk. `u256` is a numeric alias and `__str__` behavior is deterministic. The existing codebase relies on the same pattern for case lookups (`case_id not in self.cases`).

**Mitigation**: Consider explicit key builder to centralize format:
```python
def _bet_key(self, case_id: u256, addr: Address) -> str:
    return f"{int(case_id)}:{addr.as_hex}"
```

---

## State Inconsistency Matrix

| Coupled State Pair | Mutation Paths | Consistent? | Notes |
|---|---|---|---|
| `bets[key].amount` ↔ `bet_totals[total_key]` ↔ `case_escrow[case_id]` | `place_bet` (add new / accumulate) | ✅ Yes | All three updated atomically in same function. No external calls between. |
| `bets[key].claimed` ↔ `bet_totals` | `claim_winnings` | ✅ Yes | `bet_totals` is read-only in claim; `claimed` set before transfer. |
| `cases[case_id].status` ↔ betting eligibility | `judge_case` sets JUDGED; `place_bet` checks it | ✅ Yes | `place_bet` correctly rejects if `status == "JUDGED"`. |
| `cases[case_id].verdict` ↔ payout logic | `judge_case` writes verdict; `claim_winnings` reads it | ✅ Yes | `claim_winnings` requires `status == "JUDGED"` AND `case.verdict` truthy. |
| `case_count` ↔ `cases` keys | `file_case` increments and assigns | ✅ Yes | Monotonic; no reuse. |
| `self.balance` ↔ `case_escrow` totals | `place_bet` receives GEN; `claim_winnings` emits transfer | ✅ Yes | `case_escrow` is a ledger tracking how much was received; actual balance is on-chain. The escrow total <= actual balance (assuming no other value paths). |

---

## Cross-Function Guard Consistency

| Guard | `place_bet` | `claim_winnings` | `get_bet` | `get_case_bet_totals` | Consistent? |
|---|---|---|---|---|---|
| `case_id` exists | ✅ Raises | ✅ Raises | ❌ Returns empty | ✅ Raises | Minor: `get_bet` is lenient by design. |
| Case judged | ✅ Rejects bet | ✅ Requires judged | N/A | N/A | ✅ |
| `bettor` has bet | N/A | ✅ Requires exists | ✅ Returns empty if not | N/A | ✅ |
| Party exclusion | ✅ Rejects plaintiff/defendant | N/A | N/A | N/A | ✅ |
| Transfer balance | N/A | ✅ Checks `self.balance >= winnings` | N/A | N/A | ✅ |

---

## Recommendations

1. **Document dust behavior** in README or contract comments so users understand fractional wei may remain locked.
2. **Cap bet amounts** to prevent pool domination by a single actor.
3. **Add a `get_all_bets(case_id)` view** for transparency (currently only individual bet lookup is supported).
4. **Consider adding a sweep function** (admin-only) to collect accumulated dust for treasury or redistribution.
5. **Frontend MAX_BET clamp** to prevent oversized inputs.

---

## Conclusion

The betting feature is **architecturally sound** and now uses **real native GEN transfers**. The core invariants hold:
- Bets cannot be placed after judgment.
- Parties to a case cannot bet.
- Double-claiming is prevented.
- Payout math is proportional and handles zero-winner edge cases gracefully.
- State is updated **before** external value transfer to prevent race conditions.
- Events are emitted for all major lifecycle actions.

The identified issues are production-hardening improvements rather than exploitable vulnerabilities in the current design.
