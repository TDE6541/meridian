from __future__ import annotations

from dataclasses import dataclass
from typing import Optional, Sequence, Tuple

from .llm_client import request_json_chat_completion
from .models import Directive, Hold, Segment

ENSEMBLE_RUN_PATTERN: Tuple[str, str, str] = (
    "heavy-decision",
    "heavy-risk",
    "heavy-decision",
)

PROMPT_RESIDUE_TERMS = frozenset(
    {
        "builder",
        "homeowner",
        "plumber",
        "electrician",
        "hvac",
        "framing",
        "truss",
        "slab",
        "roof",
        "punch list",
    }
)

_BASE_SYSTEM_PROMPT = """
You are Meridian's civic meeting capture engine for a single public-meeting transcript segment.

Your job is to extract only two kinds of internal capture objects:
- directives: clear decisions, adopted motions, or explicit follow-up assignments
- holds: unresolved items, ambiguity, deferrals, or missing information that still need clarification

Operate with these fixed doctrines:
- HOLD > GUESS
- evidence-linked only
- no silent mangling
- no Meridian entity mapping claims
- one segment only; do not assume hidden context from earlier or later discussion

This is civic meeting work, not private project work.
Stay grounded in city council, county commission, planning commission, school board,
utility board, public hearing, workshop, and committee language only.

Directive guidance:
- Capture explicit adopted motions, accepted reports, ordinance or resolution action,
  hearing closure decisions, and direct assignments to staff, clerk, attorney, or departments.
- Use status = "confirmed" only when the segment clearly states the action passed,
  was adopted, or was otherwise finalized in the room.
- Use status = "proposed" for follow-up assignments, review requests, and staff direction
  that was stated but not yet completed.

Hold guidance:
- Capture unresolved legal review, deferred votes, continued hearings, missing budget detail,
  pending staff analysis, unclear compliance steps, or explicit "bring it back later" language.
- If the segment contains a motion but not the outcome, preserve that uncertainty as a hold.
- If a question is raised and answered inside the same segment, do not keep it as a hold.

Evidence rules:
- Every directive and hold must include a short verbatim source_quote from the segment text.
- Use only the segment timestamps that are supplied in the prompt.
- If the transcript does not support an item, omit it.

Output rules:
- Return exactly one JSON object with "directives" and "holds" keys.
- Use the supplied internal HoldPoint-native field names.
- Confidence must be a decimal from 0.0 to 1.0.
""".strip()

_ARCHETYPE_OVERLAYS = {
    "heavy-decision": """
Role archetype: heavy-decision.

Prioritize clear civic decisions and assignments:
- adopted ordinances, resolutions, motions, and hearing outcomes
- explicit direction to staff, clerk, attorney, or department leads
- follow-up tasks with a named owner or department

Do not force a directive when the segment is still undecided.
If outcome language is incomplete, preserve a hold instead.
""".strip(),
    "heavy-risk": """
Role archetype: heavy-risk.

Prioritize ambiguity and unresolved civic risk:
- continued hearings
- referrals to staff or legal review
- missing vote outcomes
- deferred budget or compliance details
- requests for return reports, revised drafts, or future reconsideration

Do not invent procedural risk that the segment does not support.
Keep every hold tied to an explicit quote.
""".strip(),
}


@dataclass(frozen=True)
class ExtractionRunResult:
    archetype: str
    directives: Tuple[Directive, ...]
    holds: Tuple[Hold, ...]


def build_extraction_system_prompt(archetype: str) -> str:
    normalized = archetype.strip().lower()
    if normalized not in _ARCHETYPE_OVERLAYS:
        raise ValueError(f"Unsupported extraction archetype: {archetype!r}")
    return f"{_BASE_SYSTEM_PROMPT}\n\n{_ARCHETYPE_OVERLAYS[normalized]}"


def build_extraction_user_prompt(segment: Segment) -> str:
    return f"""
Evaluate exactly one civic meeting segment.

SEGMENT METADATA
- segment_id: {segment.segment_id}
- timestamp_start: {segment.timestamp_start or "null"}
- timestamp_end: {segment.timestamp_end or "null"}
- segment_type: {segment.segment_type or "discussion"}
- speakers: {", ".join(segment.speakers) if segment.speakers else "unknown"}
- cue_markers: {", ".join(segment.cue_markers) if segment.cue_markers else "none"}

SEGMENT SUMMARY
{segment.summary or "(none)"}

SEGMENT TRANSCRIPT
----- TRANSCRIPT START -----
{segment.text}
----- TRANSCRIPT END -----

Return a JSON object with exactly these keys:
{{
  "directives": [
    {{
      "segment_id": "{segment.segment_id}",
      "timestamp_start": "{segment.timestamp_start or "null"}",
      "timestamp_end": "{segment.timestamp_end or "null"}",
      "directive_summary": "short civic action sentence",
      "responsible_party": "Council | Board | Staff | Clerk | City Attorney | Department | Applicant | Unknown",
      "status": "confirmed or proposed",
      "confidence": 0.0,
      "source_quote": "short verbatim quote"
    }}
  ],
  "holds": [
    {{
      "segment_id": "{segment.segment_id}",
      "timestamp_start": "{segment.timestamp_start or "null"}",
      "timestamp_end": "{segment.timestamp_end or "null"}",
      "hold_type": "design_decision | coordination | missing_info | budget_scope | schedule | approval | key_person_dependency | process_gap | recurring_issue | third_party_dependency | design_dependency | scope_gap | budget_risk | schedule_risk | code_compliance_risk | external_dependency | measurement_standard | spec_conflict | other",
      "hold_summary": "short unresolved civic summary",
      "owner_to_clarify": "Council | Board | Staff | Clerk | City Attorney | Department | Applicant | Unknown",
      "blocking_scope": "what remains blocked or unclear",
      "severity": "low | medium | high",
      "confidence": 0.0,
      "source_quote": "short verbatim quote"
    }}
  ]
}}

Return empty arrays when nothing qualifies.
""".strip()


def prompt_contains_construction_residue(*prompts: str) -> bool:
    combined = " ".join(prompts).lower()
    return any(term in combined for term in PROMPT_RESIDUE_TERMS)


def _clean_text(value) -> str:
    return str(value or "").strip()


def _normalize_status(value) -> str:
    status = _clean_text(value).lower()
    if status == "confirmed":
        return "confirmed"
    return "proposed"


def _normalize_severity(value) -> str:
    severity = _clean_text(value).lower()
    if severity in {"low", "medium", "high"}:
        return severity
    return "medium"


def _normalize_hold_type(value) -> str:
    hold_type = _clean_text(value).lower()
    allowed = {
        "design_decision",
        "coordination",
        "missing_info",
        "budget_scope",
        "schedule",
        "approval",
        "key_person_dependency",
        "process_gap",
        "recurring_issue",
        "third_party_dependency",
        "design_dependency",
        "scope_gap",
        "budget_risk",
        "schedule_risk",
        "code_compliance_risk",
        "external_dependency",
        "measurement_standard",
        "spec_conflict",
        "other",
    }
    return hold_type if hold_type in allowed else "other"


def _clamp_confidence(value) -> float:
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return 0.0
    if numeric < 0.0:
        return 0.0
    if numeric > 1.0:
        return 1.0
    return round(numeric, 3)


def _directive_from_payload(payload: dict, segment: Segment) -> Optional[Directive]:
    summary = _clean_text(payload.get("directive_summary"))
    source_quote = _clean_text(payload.get("source_quote"))
    if not summary or not source_quote:
        return None

    model_confidence = _clamp_confidence(payload.get("confidence"))
    return Directive(
        segment_id=_clean_text(payload.get("segment_id")) or segment.segment_id,
        timestamp_start=_clean_text(payload.get("timestamp_start")) or segment.timestamp_start,
        timestamp_end=_clean_text(payload.get("timestamp_end")) or segment.timestamp_end,
        directive_summary=summary,
        responsible_party=_clean_text(payload.get("responsible_party")) or "Unknown",
        status=_normalize_status(payload.get("status")),
        confidence=model_confidence,
        model_confidence=model_confidence,
        final_confidence=model_confidence,
        source_quote=source_quote,
    )


def _hold_from_payload(payload: dict, segment: Segment) -> Optional[Hold]:
    summary = _clean_text(payload.get("hold_summary"))
    source_quote = _clean_text(payload.get("source_quote"))
    if not summary or not source_quote:
        return None

    model_confidence = _clamp_confidence(payload.get("confidence"))
    return Hold(
        segment_id=_clean_text(payload.get("segment_id")) or segment.segment_id,
        timestamp_start=_clean_text(payload.get("timestamp_start")) or segment.timestamp_start,
        timestamp_end=_clean_text(payload.get("timestamp_end")) or segment.timestamp_end,
        hold_type=_normalize_hold_type(payload.get("hold_type")),
        hold_summary=summary,
        owner_to_clarify=_clean_text(payload.get("owner_to_clarify")) or "Unknown",
        blocking_scope=_clean_text(payload.get("blocking_scope")),
        severity=_normalize_severity(payload.get("severity")),
        confidence=model_confidence,
        model_confidence=model_confidence,
        final_confidence=model_confidence,
        source_quote=source_quote,
    )


def extract_segments_with_archetype(
    segments: Sequence[Segment],
    *,
    archetype: str,
    client=None,
    env=None,
    model: Optional[str] = None,
) -> ExtractionRunResult:
    normalized = archetype.strip().lower()
    system_prompt = build_extraction_system_prompt(normalized)
    directives = []
    holds = []

    for segment in segments:
        if not segment.text.strip():
            continue

        payload = request_json_chat_completion(
            system_prompt,
            build_extraction_user_prompt(segment),
            client=client,
            env=env,
            model=model,
        )

        raw_directives = payload.get("directives") or []
        raw_holds = payload.get("holds") or []
        if not isinstance(raw_directives, list):
            raw_directives = []
        if not isinstance(raw_holds, list):
            raw_holds = []

        for item in raw_directives:
            if isinstance(item, dict):
                directive = _directive_from_payload(item, segment)
                if directive is not None:
                    directives.append(directive)

        for item in raw_holds:
            if isinstance(item, dict):
                hold = _hold_from_payload(item, segment)
                if hold is not None:
                    holds.append(hold)

    return ExtractionRunResult(
        archetype=normalized,
        directives=tuple(directives),
        holds=tuple(holds),
    )


def run_ensemble_extraction(
    segments: Sequence[Segment],
    *,
    client=None,
    env=None,
    model: Optional[str] = None,
    run_pattern: Sequence[str] = ENSEMBLE_RUN_PATTERN,
) -> Tuple[ExtractionRunResult, ...]:
    normalized_pattern = tuple(archetype.strip().lower() for archetype in run_pattern)
    if len(set(normalized_pattern)) > 2:
        raise ValueError("Block C supports at most two extraction archetypes.")

    results = []
    for archetype in normalized_pattern:
        results.append(
            extract_segments_with_archetype(
                segments,
                archetype=archetype,
                client=client,
                env=env,
                model=model,
            )
        )
    return tuple(results)
