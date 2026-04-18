from __future__ import annotations

import re
from typing import List, Sequence, Tuple

from .models import Directive, Hold, Segment

_DECISION_REFERENCE_PATTERN = re.compile(
    r"\b(?:ordinance|resolution)\s+(?:no\.?\s*)?[A-Za-z0-9-]+\b",
    re.IGNORECASE,
)
_HEARING_PATTERN = re.compile(r"\b(?:public\s+)?hearing\b", re.IGNORECASE)
_ADOPTED_PATTERN = re.compile(
    r"\b(?:motion|resolution|ordinance|hearing)\b.*\b(?:passes?|passed|approved|adopted|carried)\b",
    re.IGNORECASE,
)
_FAILED_PATTERN = re.compile(
    r"\b(?:motion|resolution|ordinance|hearing)\b.*\b(?:fails?|failed|denied|rejected)\b",
    re.IGNORECASE,
)
_SECOND_PATTERN = re.compile(
    r"\bseconded\b|\bsecond\b(?=.*\bmotion\b)",
    re.IGNORECASE,
)
_DEFERRAL_PATTERN = re.compile(
    r"\b(?:defer(?:red)?|tabled|continue(?:d)?|refer(?:red)? to staff)\b",
    re.IGNORECASE,
)
_FOLLOWUP_PATTERN = re.compile(
    r"\b(?:staff will|clerk will|city attorney will|bring back|return with|review and report back|prepare and return|submit for review)\b",
    re.IGNORECASE,
)
_EXPLICIT_ACTION_PATTERN = re.compile(
    r"\b(?:adopt|authorize|approval(?:\s+of)?|conditional approval|conduct(?:\s+second)?\s+public hearing|discussion and consideration|election of|group activity)\b",
    re.IGNORECASE,
)


def _sentence_candidates(text: str) -> List[str]:
    raw_sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    return [sentence.strip() for sentence in raw_sentences if sentence.strip()]


def _extract_reference(text: str) -> str:
    match = _DECISION_REFERENCE_PATTERN.search(text)
    if match:
        return match.group(0)
    if _HEARING_PATTERN.search(text):
        return "hearing"
    return "agenda item"


def _infer_party(text: str) -> str:
    lowered = text.lower()
    if "city attorney" in lowered:
        return "City Attorney"
    if "clerk" in lowered:
        return "Clerk"
    if "staff" in lowered:
        return "Staff"
    if "planning" in lowered:
        return "Planning Department"
    if "public works" in lowered:
        return "Public Works"
    return "Council"


def _directive_from_fallback(
    segment: Segment,
    *,
    summary: str,
    responsible_party: str,
    status: str,
    source_quote: str,
    confidence: float,
) -> Directive:
    return Directive(
        segment_id=segment.segment_id,
        timestamp_start=segment.timestamp_start,
        timestamp_end=segment.timestamp_end,
        directive_summary=summary,
        responsible_party=responsible_party,
        status=status,
        confidence=confidence,
        model_confidence=confidence,
        final_confidence=confidence,
        source_quote=source_quote,
    )


def _hold_from_fallback(
    segment: Segment,
    *,
    hold_type: str,
    summary: str,
    owner_to_clarify: str,
    blocking_scope: str,
    severity: str,
    source_quote: str,
    confidence: float,
) -> Hold:
    return Hold(
        segment_id=segment.segment_id,
        timestamp_start=segment.timestamp_start,
        timestamp_end=segment.timestamp_end,
        hold_type=hold_type,
        hold_summary=summary,
        owner_to_clarify=owner_to_clarify,
        blocking_scope=blocking_scope,
        severity=severity,
        confidence=confidence,
        model_confidence=confidence,
        final_confidence=confidence,
        source_quote=source_quote,
    )


def scan_segments_for_fallback(segments: Sequence[Segment]) -> Tuple[List[Directive], List[Hold]]:
    """
    Apply a narrow civic cue scan after extraction failure.

    This is intentionally not a second extractor. It only reacts to explicit
    procedural cues that signal likely decisions, deferrals, or follow-up action.
    """

    directives: List[Directive] = []
    holds: List[Hold] = []
    seen = set()

    for segment in segments:
        segment_reference = _extract_reference(segment.text)
        for sentence in _sentence_candidates(segment.text):
            reference = _extract_reference(sentence)
            if reference == "agenda item" and segment_reference != "agenda item":
                reference = segment_reference
            responsible_party = _infer_party(sentence)
            lowered = sentence.lower()

            if _ADOPTED_PATTERN.search(sentence):
                summary = f"Record adopted action for {reference}."
                key = ("directive", segment.segment_id, summary)
                if key not in seen:
                    directives.append(
                        _directive_from_fallback(
                            segment,
                            summary=summary,
                            responsible_party="Council",
                            status="confirmed",
                            source_quote=sentence,
                            confidence=0.55,
                        )
                    )
                    seen.add(key)
                continue

            if _FAILED_PATTERN.search(sentence):
                summary = f"Outcome after failed action on {reference} remains unresolved."
                key = ("hold", segment.segment_id, summary)
                if key not in seen:
                    holds.append(
                        _hold_from_fallback(
                            segment,
                            hold_type="process_gap",
                            summary=summary,
                            owner_to_clarify="Council",
                            blocking_scope=reference,
                            severity="medium",
                            source_quote=sentence,
                            confidence=0.4,
                        )
                    )
                    seen.add(key)
                continue

            if _DEFERRAL_PATTERN.search(sentence) and not _EXPLICIT_ACTION_PATTERN.search(sentence):
                summary = f"Further action on {reference} was deferred for later clarification."
                key = ("hold", segment.segment_id, summary)
                if key not in seen:
                    holds.append(
                        _hold_from_fallback(
                            segment,
                            hold_type="schedule",
                            summary=summary,
                            owner_to_clarify=responsible_party if "staff" in lowered else "Council",
                            blocking_scope=reference,
                            severity="medium",
                            source_quote=sentence,
                            confidence=0.45,
                        )
                    )
                    seen.add(key)

            if (
                _SECOND_PATTERN.search(sentence)
                and not _ADOPTED_PATTERN.search(sentence)
                and not _FAILED_PATTERN.search(sentence)
            ):
                summary = f"The final outcome for {reference} still needs confirmation."
                key = ("hold", segment.segment_id, summary)
                if key not in seen:
                    holds.append(
                        _hold_from_fallback(
                            segment,
                            hold_type="missing_info",
                            summary=summary,
                            owner_to_clarify="Clerk",
                            blocking_scope=reference,
                            severity="low",
                            source_quote=sentence,
                            confidence=0.35,
                        )
                    )
                    seen.add(key)

            if _FOLLOWUP_PATTERN.search(sentence):
                summary = f"{responsible_party} has an explicit follow-up for {reference}."
                key = ("directive", segment.segment_id, summary)
                if key not in seen:
                    directives.append(
                        _directive_from_fallback(
                            segment,
                            summary=summary,
                            responsible_party=responsible_party,
                            status="proposed",
                            source_quote=sentence,
                            confidence=0.45,
                        )
                    )
                    seen.add(key)

    return directives, holds
