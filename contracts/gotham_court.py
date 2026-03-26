# { "Depends": "py-genlayer:test" }

from dataclasses import dataclass
from genlayer import *


@allow_storage
@dataclass
class Case:
    id: u256
    plaintiff: Address
    defendant: Address
    title: str
    description: str
    evidence_urls: str
    defense_text: str
    defense_urls: str
    verdict: str
    reasoning: str
    severity: u256
    status: str  # OPEN, DEFENSE, JUDGED


class GothamCourt(gl.Contract):
    cases: TreeMap[u256, Case]
    case_count: u256

    def __init__(self):
        self.case_count = 0

    @gl.public.write
    def file_case(
        self,
        defendant: Address,
        title: str,
        description: str,
        evidence_urls: str,
    ) -> u256:
        if not title or not description:
            raise gl.UserError("Title and description are required")
        if not evidence_urls:
            raise gl.UserError("At least one evidence URL is required")

        defendant_as_addr = Address(defendant) if isinstance(defendant, str) else defendant
        if defendant_as_addr == gl.message.sender_address:
            raise gl.UserError("Cannot file a case against yourself")

        case_id = self.case_count
        self.case_count += 1

        case = Case(
            id=case_id,
            plaintiff=gl.message.sender_address,
            defendant=defendant_as_addr,
            title=title,
            description=description,
            evidence_urls=evidence_urls,
            defense_text="",
            defense_urls="",
            verdict="",
            reasoning="",
            severity=0,
            status="OPEN",
        )
        self.cases[case_id] = case
        return case_id

    @gl.public.write
    def submit_defense(
        self,
        case_id: u256,
        defense_text: str,
        defense_urls: str,
    ) -> None:
        if case_id not in self.cases:
            raise gl.UserError("Case not found")

        case = self.cases[case_id]

        if case.status != "OPEN":
            raise gl.UserError("Case is not open for defense")
        if gl.message.sender_address != case.defendant:
            raise gl.UserError("Only the defendant can submit a defense")
        if not defense_text:
            raise gl.UserError("Defense text is required")

        case.defense_text = defense_text
        case.defense_urls = defense_urls
        case.status = "DEFENSE"

    @gl.public.write
    def judge_case(self, case_id: u256) -> None:
        if case_id not in self.cases:
            raise gl.UserError("Case not found")

        case = self.cases[case_id]

        if case.status == "JUDGED":
            raise gl.UserError("Case already judged")

        # Store case data for closure capture
        title = case.title
        description = case.description
        evidence_urls_str = case.evidence_urls
        defense_text = case.defense_text
        defense_urls_str = case.defense_urls
        has_defense = case.status == "DEFENSE"

        def leader_fn():
            # Scrape plaintiff evidence
            plaintiff_evidence = []
            for url in evidence_urls_str.split(","):
                url = url.strip()
                if url:
                    try:
                        web_data = gl.nondet.web.render(url, mode="text")
                        plaintiff_evidence.append(
                            f"[Source: {url}]\n{web_data[:2000]}"
                        )
                    except Exception:
                        plaintiff_evidence.append(
                            f"[Source: {url}]\n(Failed to fetch)"
                        )

            # Scrape defendant evidence
            defendant_evidence = []
            if has_defense and defense_urls_str:
                for url in defense_urls_str.split(","):
                    url = url.strip()
                    if url:
                        try:
                            web_data = gl.nondet.web.render(url, mode="text")
                            defendant_evidence.append(
                                f"[Source: {url}]\n{web_data[:2000]}"
                            )
                        except Exception:
                            defendant_evidence.append(
                                f"[Source: {url}]\n(Failed to fetch)"
                            )

            defense_section = ""
            if has_defense:
                defense_section = f"""
DEFENDANT'S DEFENSE:
{defense_text}

DEFENDANT'S EVIDENCE:
{chr(10).join(defendant_evidence) if defendant_evidence else "(No evidence URLs provided)"}
"""

            prompt = f"""You are an impartial AI judge in Gotham Court, a decentralized dispute resolution system.
Analyze the following case and deliver a fair verdict.

CASE TITLE: {title}

PLAINTIFF'S COMPLAINT:
{description}

PLAINTIFF'S EVIDENCE:
{chr(10).join(plaintiff_evidence) if plaintiff_evidence else "(No evidence could be fetched)"}
{defense_section}
INSTRUCTIONS:
- Evaluate the evidence objectively
- Consider both sides fairly
- If the defendant did not submit a defense, note that but still evaluate the plaintiff's claims on their merits
- Determine verdict based on preponderance of evidence

Return a JSON object with exactly these fields:
{{
    "verdict": "GUILTY" or "NOT_GUILTY" or "INSUFFICIENT_EVIDENCE",
    "severity": integer from 1 to 10 (1=minor, 10=catastrophic),
    "reasoning": "Brief explanation of the verdict in 2-3 sentences"
}}
"""
            result = gl.nondet.exec_prompt(prompt, response_format="json")
            if not isinstance(result, dict):
                raise gl.UserError("LLM returned non-dict response")

            # Normalize verdict
            verdict = str(result.get("verdict", "")).upper().replace(" ", "_")
            if verdict not in ("GUILTY", "NOT_GUILTY", "INSUFFICIENT_EVIDENCE"):
                verdict = "INSUFFICIENT_EVIDENCE"

            # Normalize severity
            try:
                severity = int(result.get("severity", 5))
                severity = max(1, min(10, severity))
            except (ValueError, TypeError):
                severity = 5

            reasoning = str(result.get("reasoning", "No reasoning provided"))

            return {
                "verdict": verdict,
                "severity": severity,
                "reasoning": reasoning,
            }

        def validator_fn(leader_result) -> bool:
            if not isinstance(leader_result, gl.vm.Return):
                return False

            leader_data = leader_result.calldata

            # Validate structure
            if not isinstance(leader_data, dict):
                return False
            if "verdict" not in leader_data or "severity" not in leader_data:
                return False

            # Re-run independently
            validator_data = leader_fn()

            # Pattern 1: Partial Field Matching
            # Verdict must match exactly, severity within ±2 tolerance
            if leader_data["verdict"] != validator_data["verdict"]:
                return False

            if abs(leader_data["severity"] - validator_data["severity"]) > 2:
                return False

            return True

        result = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)

        case.verdict = result["verdict"]
        case.severity = result["severity"]
        case.reasoning = result["reasoning"]
        case.status = "JUDGED"

    @gl.public.view
    def get_case(self, case_id: u256) -> dict:
        if case_id not in self.cases:
            raise gl.UserError("Case not found")
        c = self.cases[case_id]
        return {
            "id": int(c.id),
            "plaintiff": c.plaintiff.as_hex,
            "defendant": c.defendant.as_hex,
            "title": c.title,
            "description": c.description,
            "evidence_urls": c.evidence_urls,
            "defense_text": c.defense_text,
            "defense_urls": c.defense_urls,
            "verdict": c.verdict,
            "reasoning": c.reasoning,
            "severity": int(c.severity),
            "status": c.status,
        }

    @gl.public.view
    def get_case_count(self) -> int:
        return int(self.case_count)

    @gl.public.view
    def get_all_cases(self) -> list:
        result = []
        for case_id, c in self.cases.items():
            result.append({
                "id": int(c.id),
                "plaintiff": c.plaintiff.as_hex,
                "defendant": c.defendant.as_hex,
                "title": c.title,
                "verdict": c.verdict,
                "severity": int(c.severity),
                "status": c.status,
            })
        return result
