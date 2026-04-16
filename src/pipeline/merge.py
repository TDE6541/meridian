from __future__ import annotations

from dataclasses import replace
from difflib import SequenceMatcher
import re
from typing import Iterable, List, Optional, Sequence, Tuple

from .models import Directive, Hold

MIN_DIRECTIVE_AGREEMENT_RATIO = 2.0 / 3.0
DIRECTIVE_SIMILARITY_THRESHOLD = 0.62
HOLD_SIMILARITY_THRESHOLD = 0.55
_REFERENCE_PATTERN = re.compile(
    r"\b(?:ordinance|resolution)\s+(?:no\.?\s*)?[a-z0-9-]+\b",
    re.IGNORECASE,
)


def _normalize_text(text: str) -> str:
    normalized = str(text or "").strip().lower()
    normalized = re.sub(r"[^\w\s-]", " ", normalized)
    normalized = re.sub(r"\s+", " ", normalized)
    return normalized


def _segment_sort_key(segment_id: str) -> Tuple[int, str]:
    text = str(segment_id or "")
    match = re.search(r"\d+", text)
    if match:
        return int(match.group()), text
    return 10**9, text


def _extract_terms(text: str) -> set[str]:
    return {
        term
        for term in re.findall(r"[a-z0-9-]+", _normalize_text(text))
        if len(term) > 2 and term not in {"the", "and", "for", "with", "was", "are"}
    }


def _term_overlap(left: str, right: str) -> float:
    left_terms = _extract_terms(left)
    right_terms = _extract_terms(right)
    if not left_terms or not right_terms:
        return 0.0
    return len(left_terms & right_terms) / float(len(left_terms | right_terms))


def _extract_reference(text: str) -> Optional[str]:
    match = _REFERENCE_PATTERN.search(str(text or ""))
    if not match:
        return None
    return _normalize_text(match.group(0))


def _artifact_confidence(value: Optional[float], fallback: float) -> float:
    if value is None:
        return fallback
    if value < 0.0:
        return 0.0
    if value > 1.0:
        return 1.0
    return float(value)


def _choose_quote(quotes: Iterable[str]) -> str:
    candidates = [str(quote or "").strip() for quote in quotes if str(quote or "").strip()]
    if not candidates:
        return ""
    return max(candidates, key=lambda quote: (len(quote), quote))


def _directive_similarity(left: Directive, right: Directive) -> float:
    summary_score = SequenceMatcher(
        None,
        _normalize_text(left.directive_summary),
        _normalize_text(right.directive_summary),
    ).ratio()
    quote_score = SequenceMatcher(
        None,
        _normalize_text(left.source_quote),
        _normalize_text(right.source_quote),
    ).ratio()
    term_overlap = _term_overlap(left.directive_summary, right.directive_summary)
    left_reference = _extract_reference(left.directive_summary) or _extract_reference(left.source_quote)
    right_reference = _extract_reference(right.directive_summary) or _extract_reference(right.source_quote)
    reference_bonus = 0.12 if left_reference and left_reference == right_reference else 0.0
    party_bonus = (
        0.1
        if _normalize_text(left.responsible_party) == _normalize_text(right.responsible_party)
        else 0.0
    )
    return min(
        1.0,
        (summary_score * 0.6)
        + (quote_score * 0.1)
        + (term_overlap * 0.2)
        + party_bonus
        + reference_bonus,
    )


def _hold_similarity(left: Hold, right: Hold) -> float:
    summary_score = SequenceMatcher(
        None,
        _normalize_text(left.hold_summary),
        _normalize_text(right.hold_summary),
    ).ratio()
    quote_score = SequenceMatcher(
        None,
        _normalize_text(left.source_quote),
        _normalize_text(right.source_quote),
    ).ratio()
    term_overlap = _term_overlap(left.hold_summary, right.hold_summary)
    type_bonus = 0.1 if _normalize_text(left.hold_type) == _normalize_text(right.hold_type) else 0.0
    owner_bonus = (
        0.1
        if _normalize_text(left.owner_to_clarify) == _normalize_text(right.owner_to_clarify)
        else 0.0
    )
    scope_bonus = (
        0.1
        if _normalize_text(left.blocking_scope)
        and _normalize_text(left.blocking_scope) == _normalize_text(right.blocking_scope)
        else 0.0
    )
    return min(
        1.0,
        (summary_score * 0.45)
        + (quote_score * 0.2)
        + (term_overlap * 0.15)
        + type_bonus
        + owner_bonus
        + scope_bonus,
    )


def _build_directive_cluster(
    cluster: Sequence[Tuple[int, Directive]], total_runs: int
) -> Directive:
    base = max(
        (directive for _, directive in cluster),
        key=lambda directive: (
            _artifact_confidence(directive.model_confidence, directive.confidence),
            len(directive.source_quote),
            -_segment_sort_key(directive.segment_id)[0],
        ),
    )
    run_indices = {run_index for run_index, _ in cluster}
    agreement_ratio = round(len(run_indices) / float(total_runs), 3)
    model_confidence = round(
        sum(
            _artifact_confidence(directive.model_confidence, directive.confidence)
            for _, directive in cluster
        )
        / len(cluster),
        3,
    )
    final_confidence = round((agreement_ratio + model_confidence) / 2.0, 3)
    return replace(
        base,
        confidence=final_confidence,
        model_confidence=model_confidence,
        agreement_ratio=agreement_ratio,
        final_confidence=final_confidence,
        source_quote=_choose_quote(directive.source_quote for _, directive in cluster),
    )


def _build_hold_cluster(cluster: Sequence[Tuple[int, Hold]], total_runs: int) -> Hold:
    base = max(
        (hold for _, hold in cluster),
        key=lambda hold: (
            _artifact_confidence(hold.model_confidence, hold.confidence),
            len(hold.source_quote),
            -_segment_sort_key(hold.segment_id)[0],
        ),
    )
    run_indices = {run_index for run_index, _ in cluster}
    agreement_ratio = round(len(run_indices) / float(total_runs), 3)
    model_confidence = round(
        sum(_artifact_confidence(hold.model_confidence, hold.confidence) for _, hold in cluster)
        / len(cluster),
        3,
    )
    final_confidence = round((agreement_ratio + model_confidence) / 2.0, 3)
    return replace(
        base,
        confidence=final_confidence,
        model_confidence=model_confidence,
        agreement_ratio=agreement_ratio,
        final_confidence=final_confidence,
        source_quote=_choose_quote(hold.source_quote for _, hold in cluster),
    )


def merge_directives(
    directive_runs: Sequence[Sequence[Directive]],
    *,
    min_agreement_ratio: float = MIN_DIRECTIVE_AGREEMENT_RATIO,
    similarity_threshold: float = DIRECTIVE_SIMILARITY_THRESHOLD,
) -> List[Directive]:
    if not directive_runs:
        return []

    total_runs = len(directive_runs)
    clusters: List[List[Tuple[int, Directive]]] = []

    for run_index, directives in enumerate(directive_runs):
        for directive in directives:
            if not directive.directive_summary.strip():
                continue

            matched_cluster: Optional[List[Tuple[int, Directive]]] = None
            matched_score = 0.0
            for cluster in clusters:
                exemplar = cluster[0][1]
                if exemplar.segment_id != directive.segment_id:
                    continue
                score = _directive_similarity(directive, exemplar)
                if score >= similarity_threshold and score > matched_score:
                    matched_cluster = cluster
                    matched_score = score

            if matched_cluster is None:
                clusters.append([(run_index, directive)])
            else:
                matched_cluster.append((run_index, directive))

    merged = []
    for cluster in clusters:
        merged_directive = _build_directive_cluster(cluster, total_runs)
        if (merged_directive.agreement_ratio or 0.0) >= min_agreement_ratio:
            merged.append(merged_directive)

    return sorted(
        merged,
        key=lambda directive: (
            _segment_sort_key(directive.segment_id),
            -directive.confidence,
            directive.directive_summary.lower(),
        ),
    )


def merge_holds(
    hold_runs: Sequence[Sequence[Hold]],
    *,
    similarity_threshold: float = HOLD_SIMILARITY_THRESHOLD,
) -> List[Hold]:
    if not hold_runs:
        return []

    total_runs = len(hold_runs)
    clusters: List[List[Tuple[int, Hold]]] = []

    for run_index, holds in enumerate(hold_runs):
        for hold in holds:
            if not hold.hold_summary.strip():
                continue

            matched_cluster: Optional[List[Tuple[int, Hold]]] = None
            matched_score = 0.0
            for cluster in clusters:
                exemplar = cluster[0][1]
                if exemplar.segment_id != hold.segment_id:
                    continue
                score = _hold_similarity(hold, exemplar)
                if score >= similarity_threshold and score > matched_score:
                    matched_cluster = cluster
                    matched_score = score

            if matched_cluster is None:
                clusters.append([(run_index, hold)])
            else:
                matched_cluster.append((run_index, hold))

    merged = [_build_hold_cluster(cluster, total_runs) for cluster in clusters]
    return sorted(
        merged,
        key=lambda hold: (
            _segment_sort_key(hold.segment_id),
            -hold.confidence,
            hold.hold_summary.lower(),
        ),
    )
