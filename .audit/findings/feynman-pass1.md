# Feynman Audit — Pass 1 (Full)
## Contract: `contracts/gotham_court.py` (GothamCourt)
## Language: Python — GenLayer SDK (GenVM runtime)

---

## Phase 0 — Attacker's Hit List

```
LANGUAGE: Python (GenLayer intelligent contract)
  Runtime: GenVM sandbox
  SDK: genlayer (gl.Contract, TreeMap, Address, u256, gl.vm.run_nondet_unsafe)
  Consensus: Optimistic Democracy (leader proposes, validators verify)
  External: gl.nondet.web.render (web scraping), gl.nondet.exec_prompt (LLM call)

ATTACK GOALS (Q0.1):
  1. Verdict manipulation — bias the AI judge toward attacker's desired outcome
  2. Rush-to-judgment — force a verdict before defendant responds
  3. Reputation attack — file frivolous/spam cases to damage target's on-chain record
  4. Evidence tampering — change evidence content after filing, before judgment
  5. Denial of justice — prevent legitimate cases from being judged

NOVEL CODE (Q0.2) — highest bug density:
  - leader_fn() (L101-185): Web scraping + LLM prompt construction + JSON parsing
    → Entirely custom. No reuse of battle-tested patterns.
  - validator_fn() (L187-209): Re-runs leader_fn and compares results
    → Novel consensus validation. Unique to this contract.
  - Prompt template (L138-162): f-string interpolation of user-controlled strings
    → User data injected into AI prompt with zero sanitization.

VALUE STORES (Q0.3):
  - cases: TreeMap[u256, Case] — holds all dispute records
  - No token/fund storage — reputational value only
  - Verdicts are permanent and public; no edit/appeal mechanism
  Outflows: None (no financial extraction possible)
  Risk axis: REPUTATIONAL — permanent on-chain verdict records

COMPLEX PATHS (Q0.4):
  - file_case() → submit_defense() → judge_case() → leader_fn()
    → [web.render N URLs] → [exec_prompt] → validator_fn() → [re-run leader_fn]
    → state write (verdict, severity, reasoning, status)
    Modules: 1 contract, 2+ external calls, LLM oracle, web scraping
    Complexity: HIGH — non-deterministic external data + AI decision + consensus

PRIORITY ORDER:
  1. judge_case / leader_fn / validator_fn — appears in 4/5 goals
  2. file_case — appears in 2/5 goals (spam, prompt injection surface)
  3. submit_defense — appears in 1/5 (prompt injection via defense)
  4. View functions — low priority (read-only)
```

---

## Phase 1 — Scope & Inventory

### Function-State Matrix

| Function | Visibility | Reads | Writes | Guards | External Calls |
|----------|-----------|-------|--------|--------|----------------|
| `__init__` | constructor | — | case_count=0 | — | — |
| `file_case` | @public.write | case_count | cases[id] (new), case_count (+1) | title≠empty, desc≠empty, urls≠empty, defendant≠sender | — |
| `submit_defense` | @public.write | cases[id] | cases[id].defense_text, .defense_urls, .status | case exists, status==OPEN, sender==defendant, defense_text≠empty | — |
| `judge_case` | @public.write | cases[id] | cases[id].verdict, .severity, .reasoning, .status | case exists, status≠JUDGED | web.render(), exec_prompt() |
| `get_case` | @public.view | cases[id] | — | case exists | — |
| `get_case_count` | @public.view | case_count | — | — | — |
| `get_all_cases` | @public.view | cases (iter) | — | — | — |

### Function Pairs (inverse operations)

| Pair | Symmetric? |
|------|-----------|
| file_case / (no delete_case) | ❌ No inverse — cases are permanent |
| submit_defense / (no retract) | ❌ No inverse — defense is permanent |
| judge_case / (no appeal) | ❌ No inverse — verdict is permanent |

**Observation:** Every state-changing action is irreversible by design. This amplifies the impact of any bug — there's no undo mechanism.

---

## Phase 2 — Per-Function Feynman Interrogation

### Function: `__init__` (L28-29)

```python
L28: def __init__(self):
L29:     self.case_count = 0
```

| Line | Question | Answer | Verdict |
|------|----------|--------|---------|
| L29 | Q1.1: WHY set to 0? | Counter for auto-incrementing case IDs. Delete → no IDs assigned. | SOUND |
| L29 | Q5.1: First call? | First file_case gets id=0, count becomes 1. Clean. | SOUND |
| L29 | Q4.3: Does cases TreeMap need init? | GenLayer TreeMap initializes empty by default. | SOUND |

**FUNCTION VERDICT: SOUND**

---

### Function: `file_case` (L31-65)

```python
L31: @gl.public.write
L32: def file_case(self, defendant: Address, title: str, description: str, evidence_urls: str) -> u256:
L38:     if not title or not description:
L39:         raise gl.UserError("Title and description are required")
L40:     if not evidence_urls:
L41:         raise gl.UserError("At least one evidence URL is required")
L43:     defendant_as_addr = Address(defendant) if isinstance(defendant, str) else defendant
L44:     if defendant_as_addr == gl.message.sender_address:
L45:         raise gl.UserError("Cannot file a case against yourself")
L47:     case_id = self.case_count
L48:     self.case_count += 1
L50:     case = Case(
L51:         id=case_id,
L52:         plaintiff=gl.message.sender_address,
L53:         defendant=defendant_as_addr,
...
L64:         status="OPEN",
L65:     )
L66:     self.cases[case_id] = case
L67:     return case_id
```

| Line | Question | Answer | Verdict |
|------|----------|--------|---------|
| L38 | Q1.1: WHY check title/desc? | Prevents empty case filings. | SOUND |
| L38 | Q1.4: Is check SUFFICIENT? | `not ""` is True but `not " "` is False. Whitespace-only strings pass. | **SUSPECT** — whitespace title allowed |
| L40 | Q1.4: Is URL check sufficient? | `not "   "` is False. Whitespace-only or malformed URLs pass. No URL format validation. | **SUSPECT** — no URL format validation |
| L43 | Q4.1: WHY isinstance check? | Frontend may pass hex string instead of Address. Defensive. | SOUND |
| L44 | Q4.1: WHO can call? | Anyone with any address. No rate limit, no filing fee, no cooldown. | **SUSPECT** — unlimited filing |
| L44 | Q1.3: Self-filing check sufficient? | Prevents `plaintiff == defendant` only. Attacker can use two addresses. | SOUND (by design) |
| L47-48 | Q2.1: What if reordered? | `case_id = count` before `count += 1`. If reversed, next file_case would collide on same ID. Current order is correct. | SOUND |
| L47-48 | Q5.3: Double call rapid succession? | GenVM processes transactions sequentially. No race condition. Each gets unique ID. | SOUND |
| L50-66 | Q4.2: User-controlled strings stored? | `title`, `description`, `evidence_urls` all stored verbatim. No length limit, no sanitization. Later injected into LLM prompt. | **SUSPECT** — prompt injection surface → feed to Pass 2 |
| L52 | Q4.1: Caller as plaintiff? | `gl.message.sender_address` — cannot be spoofed in GenLayer. | SOUND |
| L64 | Q1.1: WHY status OPEN? | Initial state for case lifecycle. | SOUND |
| L67 | Q6.1: Return value consumed? | Returns case_id to caller. Frontend uses it. | SOUND |

**FUNCTION VERDICT: HAS_CONCERNS**
**SUSPECTS:**
- S1: Whitespace-only strings pass validation (title, description, evidence_urls) — LOW
- S2: No rate limit / filing fee — unlimited spam possible — LOW
- S3: User strings stored unsanitized → later used in LLM prompt (L138+) — MEDIUM (feed to State)
- S4: No maximum length on input strings — potential storage bloat — LOW

---

### Function: `submit_defense` (L69-86)

```python
L69: @gl.public.write
L70: def submit_defense(self, case_id: u256, defense_text: str, defense_urls: str) -> None:
L75:     if case_id not in self.cases:
L76:         raise gl.UserError("Case not found")
L78:     case = self.cases[case_id]
L80:     if case.status != "OPEN":
L81:         raise gl.UserError("Case is not open for defense")
L82:     if gl.message.sender_address != case.defendant:
L83:         raise gl.UserError("Only the defendant can submit a defense")
L84:     if not defense_text:
L85:         raise gl.UserError("Defense text is required")
L87:     case.defense_text = defense_text
L88:     case.defense_urls = defense_urls
L89:     case.status = "DEFENSE"
```

| Line | Question | Answer | Verdict |
|------|----------|--------|---------|
| L75-76 | Q1.1: WHY existence check? | Prevents operating on non-existent case. | SOUND |
| L80-81 | Q1.1: WHY status==OPEN check? | Prevents double defense or defense after judgment. | SOUND |
| L80 | Q3.1: Consistent with judge_case? | judge_case checks `status != "JUDGED"`, allowing both OPEN and DEFENSE. submit_defense requires OPEN only. Correctly restrictive. | SOUND |
| L82-83 | Q4.1: WHO check? | Only the named defendant. Cannot be bypassed — `gl.message.sender_address` is tamper-proof. | SOUND |
| L84-85 | Q1.4: Sufficient? | Same whitespace issue as file_case. Whitespace-only defense_text passes. | **SUSPECT** — whitespace bypass (LOW) |
| L88 | Q4.2: defense_urls validated? | No. Empty string `""` is allowed (intentional — defense URLs are optional). But no URL format validation on non-empty strings. | SOUND (optional field) |
| L88 | Q4.2: defense_urls user-controlled? | Yes, injected into LLM prompt later. Same prompt injection surface as file_case. | **SUSPECT** — prompt injection surface |
| L87-89 | Q2.1: Ordering? | defense_text written before status change. If transaction aborts between L87 and L89, state could be inconsistent… BUT GenVM is atomic per transaction. All or nothing. | SOUND |
| L89 | Q5.3: Can defense be updated? | No — once status is DEFENSE, `status != "OPEN"` prevents re-entry. Defense is one-shot. | SOUND (by design) |

**FUNCTION VERDICT: HAS_CONCERNS**
**SUSPECTS:**
- S5: Whitespace-only defense_text passes — LOW
- S6: defense_text and defense_urls injected into LLM prompt unsanitized — MEDIUM (reinforces S3)

---

### Function: `judge_case` (L88-231)

This is the highest-priority function. Line-by-line deep dive.

```python
L91: @gl.public.write
L92: def judge_case(self, case_id: u256) -> None:
L93:     if case_id not in self.cases:
L94:         raise gl.UserError("Case not found")
L96:     case = self.cases[case_id]
L98:     if case.status == "JUDGED":
L99:         raise gl.UserError("Case already judged")
```

| Line | Question | Answer | Verdict |
|------|----------|--------|---------|
| L92 | **Q4.1: WHO can call judge_case?** | **ANYONE**. No access control. No `sender == plaintiff` or `sender == defendant` check. No role-based restriction. | **VULNERABLE** |
| L98-99 | Q1.1: WHY only check JUDGED? | Intentionally allows judging OPEN cases (no defense submitted). But this means the plaintiff can file and immediately judge without giving the defendant ANY opportunity to respond. | **VULNERABLE** — rush-to-judgment |
| L98 | Q5.3: Double call? | Second call would see status==JUDGED and revert. Safe against double-judgment. | SOUND |
| L98 | Q3.1: Consistent guards? | submit_defense requires `status == "OPEN"`. judge_case requires `status != "JUDGED"`. This means judge_case accepts BOTH OPEN and DEFENSE states. By design, but with NM-001 implications. | HAS_CONCERNS |

**Deep dive into `leader_fn()` (L101-185):**

```python
L101: title = case.title
L102: description = case.description
L103: evidence_urls_str = case.evidence_urls
L104: defense_text = case.defense_text
L105: defense_urls_str = case.defense_urls
L106: has_defense = case.status == "DEFENSE"
```

| Line | Question | Answer | Verdict |
|------|----------|--------|---------|
| L101-106 | Q1.1: WHY copy to local vars? | Closure capture for leader_fn/validator_fn nested functions. GenVM closures need explicit binding. | SOUND |
| L106 | Q4.3: Assumes about status? | If status is "OPEN", has_defense=False. Defense text/URLs may be empty. | SOUND |

```python
L108: def leader_fn():
L109:     plaintiff_evidence = []
L110:     for url in evidence_urls_str.split(","):
L111:         url = url.strip()
L112:         if url:
L113:             try:
L114:                 web_data = gl.nondet.web.render(url, mode="text")
L115:                 plaintiff_evidence.append(f"[Source: {url}]\n{web_data[:2000]}")
L116:             except Exception:
L117:                 plaintiff_evidence.append(f"[Source: {url}]\n(Failed to fetch)")
```

| Line | Question | Answer | Verdict |
|------|----------|--------|---------|
| L110 | Q4.2: evidence_urls format assumed? | Assumes comma-separated URLs. No validation that strings are actually URLs. Could be arbitrary text like `"not a url, also not a url"`. `.split(",")` would produce `["not a url", " also not a url"]`. `web.render` would fail, caught by except. | SOUND (fails gracefully) |
| L114 | **Q4.5: Is scraped data fresh/trustworthy?** | **web.render is called at JUDGMENT TIME, not filing time.** Evidence content can change between filing and judgment. Plaintiff can modify hosted evidence after seeing the defense. | **SUSPECT** — temporal evidence gap |
| L114 | Q7.3: External call — what state is exposed? | web.render is inside leader_fn which runs inside `run_nondet_unsafe`. No contract state is mutated during this call. External call is isolated. | SOUND |
| L115 | Q4.6: web_data[:2000] — sufficient? | Truncation at 2000 chars. Could cut off critical evidence mid-sentence. But this is a practical limit, not a security issue. | SOUND |
| L116-117 | Q6.2: Error handling? | Silently catches ALL exceptions and records failure. Attacker could intentionally provide URLs that fail to make it look like "no evidence provided". But the URL string is still visible in case data. | SOUND (graceful degradation) |

```python
L119: defendant_evidence = []
L120: if has_defense and defense_urls_str:
L121:     for url in defense_urls_str.split(","):
L122:         url = url.strip()
L123:         if url:
L124:             try:
L125:                 web_data = gl.nondet.web.render(url, mode="text")
L126:                 defendant_evidence.append(f"[Source: {url}]\n{web_data[:2000]}")
L127:             except Exception:
L128:                 defendant_evidence.append(f"[Source: {url}]\n(Failed to fetch)")
```

| Line | Question | Answer | Verdict |
|------|----------|--------|---------|
| L120 | Q4.3: What if defense_urls_str is empty? | `if has_defense and defense_urls_str` — short-circuits. Empty string is falsy. Correctly skips. | SOUND |
| L120-128 | Q3.2: Symmetric with plaintiff evidence scraping? | Yes, identical pattern. Consistent. | SOUND |

```python
L130: defense_section = ""
L131: if has_defense:
L132:     defense_section = f"""
L133: DEFENDANT'S DEFENSE:
L134: {defense_text}
L135:
L136: DEFENDANT'S EVIDENCE:
L137: {chr(10).join(defendant_evidence) if defendant_evidence else "(No evidence URLs provided)"}
L138: """
```

| Line | Question | Answer | Verdict |
|------|----------|--------|---------|
| L134 | **Q4.2: defense_text is user-controlled. Sanitized?** | **No.** Raw user string interpolated into LLM prompt. Prompt injection vector. | **VULNERABLE** |
| L137 | Q4.2: defendant_evidence is web-scraped. Trusted? | Scraped content injected into prompt. Malicious web pages could contain prompt injection payloads. | **SUSPECT** — web content injection |

```python
L140: prompt = f"""You are an impartial AI judge in Gotham Court...
L141: CASE TITLE: {title}
L143: PLAINTIFF'S COMPLAINT:
L144: {description}
L146: PLAINTIFF'S EVIDENCE:
L147: {chr(10).join(plaintiff_evidence) if plaintiff_evidence else "(No evidence could be fetched)"}
L148: {defense_section}
...
```

| Line | Question | Answer | Verdict |
|------|----------|--------|---------|
| L141 | **Q4.2: title is user-controlled. Sanitized?** | **No.** Direct f-string interpolation. | **VULNERABLE** — prompt injection |
| L144 | **Q4.2: description is user-controlled. Sanitized?** | **No.** Direct f-string interpolation. Unlimited length. | **VULNERABLE** — prompt injection |
| L147 | Q4.2: plaintiff_evidence contains scraped web content? | Yes. web.render output truncated to 2000 chars per URL but not sanitized. Malicious web page could embed prompt injection. | **SUSPECT** — web-sourced injection |

```python
L163:     result = gl.nondet.exec_prompt(prompt, response_format="json")
L164:     if not isinstance(result, dict):
L165:         raise gl.UserError("LLM returned non-dict response")
```

| Line | Question | Answer | Verdict |
|------|----------|--------|---------|
| L163 | Q4.5: exec_prompt return trusted? | LLM output is non-deterministic. `response_format="json"` constrains but doesn't guarantee structure. | HAS_CONCERNS |
| L164-165 | Q6.1: Type check sufficient? | Checks dict type. Doesn't check required keys yet (done below). | SOUND (partial validation, completed below) |

```python
L167:     verdict = str(result.get("verdict", "")).upper().replace(" ", "_")
L168:     if verdict not in ("GUILTY", "NOT_GUILTY", "INSUFFICIENT_EVIDENCE"):
L169:         verdict = "INSUFFICIENT_EVIDENCE"
```

| Line | Question | Answer | Verdict |
|------|----------|--------|---------|
| L167-169 | Q1.1: WHY normalize? | Defensive — LLM may return varying formats. Falls back to INSUFFICIENT_EVIDENCE. | SOUND |
| L169 | Q4.2: Can attacker exploit the fallback? | If injection makes LLM return garbage verdict, fallback is INSUFFICIENT_EVIDENCE. Not the worst outcome. Limits injection impact for verdict field. | SOUND (good defense) |

```python
L171:     try:
L172:         severity = int(result.get("severity", 5))
L173:         severity = max(1, min(10, severity))
L174:     except (ValueError, TypeError):
L175:         severity = 5
```

| Line | Question | Answer | Verdict |
|------|----------|--------|---------|
| L172-175 | Q1.1: WHY clamp and fallback? | Defensive — LLM may return out-of-range or non-integer. Falls back to 5. | SOUND |
| L173 | Q7.7: Masking pattern? | `max(1, min(10, severity))` — this is NOT masking a bug. It's genuinely clamping LLM output to valid range. | SOUND |

```python
L177:     reasoning = str(result.get("reasoning", "No reasoning provided"))
L179:     return {"verdict": verdict, "severity": severity, "reasoning": reasoning}
```

| Line | Question | Answer | Verdict |
|------|----------|--------|---------|
| L177 | Q4.2: reasoning is LLM output. Size bounded? | `str()` conversion. No length limit. LLM could return very long reasoning. Stored on-chain. | **SUSPECT** — unbounded on-chain storage |
| L179 | Q6.1: Return consumed by? | Consumed by `run_nondet_unsafe` → fed to `validator_fn` and then to state writes. | SOUND |

**Deep dive into `validator_fn()` (L187-209):**

```python
L187: def validator_fn(leader_result) -> bool:
L188:     if not isinstance(leader_result, gl.vm.Return):
L189:         return False
L191:     leader_data = leader_result.calldata
L193:     if not isinstance(leader_data, dict):
L194:         return False
L195:     if "verdict" not in leader_data or "severity" not in leader_data:
L196:         return False
L198:     validator_data = leader_fn()
L200:     if leader_data["verdict"] != validator_data["verdict"]:
L201:         return False
L203:     if abs(leader_data["severity"] - validator_data["severity"]) > 2:
L204:         return False
L206:     return True
```

| Line | Question | Answer | Verdict |
|------|----------|--------|---------|
| L188-189 | Q1.1: Type check on leader result? | Validates it's a proper Return object. | SOUND |
| L193-196 | Q1.1: Structure validation? | Checks dict with required keys. | SOUND |
| L195 | Q1.4: Sufficient? | Doesn't check for "reasoning" key. But reasoning is always present in leader_fn output (L177-179). If leader is malicious and omits it, it would still pass validation here. But L229 (`result["reasoning"]`) would raise KeyError… | **SUSPECT** — missing "reasoning" key check |
| **L198** | **Q4.2: validator calls leader_fn()** | **The validator re-executes the EXACT same leader_fn function, which builds the EXACT same prompt from the EXACT same case data.** If a prompt injection exists in user input, BOTH leader and validator see it identically. The injection bypasses consensus. | **VULNERABLE** — injection passes consensus |
| **L198** | **Q4.5: Web scraping is non-deterministic** | **leader_fn() calls web.render() again. Web content may have changed between leader and validator execution.** Evidence pages could serve different content to different requests (A/B testing, CDN caching, deliberate manipulation). Validator may scrape different content → different LLM output → validation failure → transaction stuck. | **SUSPECT** — temporal non-determinism may cause valid cases to fail validation |
| L200-201 | Q1.1: Verdict must match exactly? | Strict. Both must agree on GUILTY/NOT_GUILTY/INSUFFICIENT_EVIDENCE. | SOUND (appropriate strictness) |
| L203-204 | Q1.1: Severity within ±2? | Tolerant. Allows some LLM variance. Reasonable. | SOUND |
| L204 | Q3.1: Reasoning NOT compared? | Intentional — reasoning text will vary between LLM runs. Only structured fields (verdict, severity) are compared. | SOUND (by design) |

**State writes after consensus (L211-215):**

```python
L211: result = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
L213: case.verdict = result["verdict"]
L214: case.severity = result["severity"]
L215: case.reasoning = result["reasoning"]
L216: case.status = "JUDGED"
```

| Line | Question | Answer | Verdict |
|------|----------|--------|---------|
| L213-216 | Q2.1: Ordering of writes? | All four writes happen atomically after run_nondet_unsafe returns. No external calls between writes. | SOUND |
| L215 | Q6.3: What if "reasoning" key missing from result? | `result` comes from leader_fn which always includes "reasoning" (L179). But if GenVM internals could modify the result… unlikely. | SOUND (leader_fn guarantees key) |
| L216 | Q2.2: Status set LAST? | Yes. verdict/severity/reasoning are set before status. If any write failed (won't happen — atomic), status wouldn't be JUDGED with empty verdict. Correct ordering. | SOUND |

**FUNCTION VERDICT: VULNERABLE**

**SUSPECTS fed to State Mapper:**
- S7: **No access control on judge_case** — anyone can call, any time — MEDIUM
- S8: **Can judge OPEN cases** — rush-to-judgment before defense — MEDIUM
- S9: **Prompt injection via title, description, defense_text** — unsanitized user strings in LLM prompt — MEDIUM
- S10: **Prompt injection via scraped web content** — evidence URLs could host injection payloads — MEDIUM
- S11: **Validator re-runs identical prompt** — injection bypasses consensus — MEDIUM (cross-feed)
- S12: **Web content temporal non-determinism** — content changes between leader/validator scraping — LOW
- S13: **Unbounded reasoning string** stored on-chain — LOW
- S14: **Missing "reasoning" key validation** in validator_fn — LOW

---

### Function: `get_case` (L218-233)

```python
L218: @gl.public.view
L219: def get_case(self, case_id: u256) -> dict:
L220:     if case_id not in self.cases:
L221:         raise gl.UserError("Case not found")
L222:     c = self.cases[case_id]
L223:     return {
L224:         "id": int(c.id),
L225:         "plaintiff": c.plaintiff.as_hex,
...
L233:     }
```

| Line | Question | Answer | Verdict |
|------|----------|--------|---------|
| L218 | Q4.1: WHO can call? | Anyone (@public.view). Case data is public by design. | SOUND |
| L220-221 | Q1.1: Existence check? | Prevents KeyError on non-existent case_id. | SOUND |
| L224-233 | Q6.1: Return all fields? | Returns complete case data including defense and verdict. | SOUND |

**FUNCTION VERDICT: SOUND**

---

### Function: `get_case_count` (L235-236)

```python
L235: @gl.public.view
L236: def get_case_count(self) -> int:
L237:     return int(self.case_count)
```

| Line | Question | Answer | Verdict |
|------|----------|--------|---------|
| L237 | Q6.1: WHY int() conversion? | u256 → Python int for JSON serialization. | SOUND |

**FUNCTION VERDICT: SOUND**

---

### Function: `get_all_cases` (L239-252)

```python
L239: @gl.public.view
L240: def get_all_cases(self) -> list:
L241:     result = []
L242:     for case_id, c in self.cases.items():
L243:         result.append({
L244:             "id": int(c.id),
L245:             "plaintiff": c.plaintiff.as_hex,
L246:             "defendant": c.defendant.as_hex,
L247:             "title": c.title,
L248:             "verdict": c.verdict,
L249:             "severity": int(c.severity),
L250:             "status": c.status,
L251:         })
L252:     return result
```

| Line | Question | Answer | Verdict |
|------|----------|--------|---------|
| L242 | **Q5.5: Unbounded iteration?** | Iterates ALL cases. O(n) with no pagination. As case count grows, this becomes expensive. Could hit execution timeouts on GenVM. | **SUSPECT** |
| L243-251 | Q6.1: Subset of fields? | Returns summary (no description, evidence, defense). Appropriate for listing. | SOUND |

**FUNCTION VERDICT: HAS_CONCERNS**
**SUSPECTS:**
- S15: Unbounded iteration — potential DoS at scale — LOW

---

## Phase 3 — Cross-Function Analysis

### 3.1 Guard Consistency

| State Variable | file_case | submit_defense | judge_case |
|---------------|-----------|----------------|------------|
| cases[id] write | sender≠defendant | sender==defendant, status==OPEN | status≠JUDGED |
| case_count write | (auto-increment) | — | — |

**GAP FOUND:** `judge_case` has NO caller restriction. Both `file_case` and `submit_defense` restrict who can call them (anyone / only defendant), but `judge_case` is callable by any address — including the plaintiff, the defendant, or a random third party. This is the most state-impactful function (writes verdict permanently) yet has the WEAKEST access control.

### 3.2 Inverse Operation Parity

**No inverse operations exist.** Every action (file, defend, judge) is one-way. This is by design but amplifies risk — any successfully exploited bug produces irreversible damage.

### 3.3 State Transition Integrity

```
Valid transitions:
  (none) → OPEN     (file_case)
  OPEN → DEFENSE    (submit_defense)
  OPEN → JUDGED     (judge_case — no defense required)
  DEFENSE → JUDGED  (judge_case — defense submitted)
```

**Missing transitions:**
- No OPEN → DISMISSED (plaintiff withdraws case)
- No JUDGED → APPEALED (challenge verdict)
- No DEFENSE → OPEN (defendant retracts defense)

**Gap:** OPEN → JUDGED bypasses the defense phase entirely. This is the rush-to-judgment vector (S8).

### 3.4 Value Flow

No financial value flows. Reputational value (verdicts) flows one-way: creation → permanence. No conservation law to verify.

---

## Phase 4 — Raw Findings Synthesis

### Finding FF-001: No Access Control on judge_case (Rush-to-Judgment)
**Severity (raw):** MEDIUM
**Questions:** Q4.1 (WHO can call?) + Q3.1 (guard consistency) + state transition gap
**Scenario:** Plaintiff files case → immediately calls judge_case → verdict rendered without defense
**Suspects:** S7, S8

### Finding FF-002: Prompt Injection via Unsanitized User Input
**Severity (raw):** MEDIUM
**Questions:** Q4.2 (external data assumptions) × 4 fields (title, description, defense_text, defense_urls)
**Scenario:** Plaintiff crafts description containing LLM override instructions → verdict manipulated
**Suspects:** S3, S6, S9, S10

### Finding FF-003: Injection Bypasses Consensus (Validator Re-runs Same Prompt)
**Severity (raw):** MEDIUM
**Questions:** Q4.2 on validator_fn + cross-function analysis
**Scenario:** Both leader_fn and validator_fn build identical prompt from identical case data → identical injection → consensus passes
**Suspects:** S11

### Finding FF-004: Evidence Temporal Inconsistency
**Severity (raw):** LOW
**Questions:** Q4.5 (external data freshness)
**Scenario:** Evidence scraped at judgment time, not filing time → content can change
**Suspects:** S12

### Finding FF-005: Unbounded Case Filing (Spam)
**Severity (raw):** LOW
**Questions:** Q4.1 (caller assumptions) + Q5.3 (rapid calls)
**Scenario:** Attacker files hundreds of cases against a target at gas cost only
**Suspects:** S2

### Finding FF-006: Unbounded get_all_cases Iteration
**Severity (raw):** LOW
**Questions:** Q5.5 (unbounded iteration)
**Scenario:** After many cases, get_all_cases exceeds execution limits
**Suspects:** S15

### Finding FF-007: Whitespace-Only Input Bypass
**Severity (raw):** LOW
**Questions:** Q1.4 (check sufficiency)
**Scenario:** `file_case(" ", " ", " ")` passes all validation — creates case with whitespace-only content
**Suspects:** S1, S4, S5

### Finding FF-008: Missing "reasoning" Key Validation in Validator
**Severity (raw):** LOW
**Questions:** Q1.4 (check sufficiency on validator_fn)
**Scenario:** If leader somehow returns dict without "reasoning", validator passes, but L215 KeyError
**Suspects:** S14

---

## Suspects Fed to State Mapper (Pass 2)

```
S3/S6/S9/S10: User-controlled strings in LLM prompt (title, desc, defense_text, web content)
S7: No access control on judge_case
S8: OPEN → JUDGED transition (skip defense)
S11: Validator re-runs identical prompt → injection bypasses consensus
S12: Web scraping temporal non-determinism
S13: Unbounded reasoning string on-chain
S14: Missing "reasoning" key validation in validator_fn
```
