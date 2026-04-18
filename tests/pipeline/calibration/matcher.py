from __future__ import annotations

import re
import unicodedata
from difflib import SequenceMatcher
from typing import Any, Iterable, Sequence

OBLIGATION_CUES = (
    "shall",
    "must",
    "is to",
    "are to",
    "staff to",
    "director to",
    "submit",
    "prepare",
    "provide",
    "file",
    "return",
    "coordinate",
    "report back",
    "execute",
    "complete",
)
DECISION_RECORD_CUES = (
    "approved",
    "adopted",
    "authorized",
    "appointed",
    "accepted",
    "ratified",
    "called",
    "cancelled",
    "canceled",
    "opened",
    "closed",
    "reconvened",
    "adjourned",
    "denied",
    "conducted public hearing",
)
ACTION_REQUEST_CUES = (
    "request",
    "ask",
    "recommend",
    "propose",
    "consider",
    "seek",
    "refer",
    "forward",
    "bring back",
)
SEGMENT_BOUNDARY_SIMILARITY_THRESHOLD = 0.55


def exact_normalize(text: Any) -> str:
    normalized = unicodedata.normalize("NFKC", str(text or ""))
    normalized = re.sub(r"\s+", " ", normalized).strip().casefold()
    return normalized


def relaxed_normalize(text: Any) -> str:
    exact = exact_normalize(text)
    if not exact:
        return ""
    cleaned = "".join(character if character.isalnum() or character.isspace() else " " for character in exact)
    return re.sub(r"\s+", " ", cleaned).strip()


def score_confidence(runtime_item: dict[str, Any]) -> float:
    value = runtime_item.get("final_confidence")
    if value is None:
        value = runtime_item.get("confidence")
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return 0.0
    return max(0.0, min(1.0, round(numeric, 3)))


def _token_overlap(left: str, right: str) -> float:
    left_terms = {token for token in left.split() if token}
    right_terms = {token for token in right.split() if token}
    if not left_terms or not right_terms:
        return 0.0
    return len(left_terms & right_terms) / float(len(left_terms | right_terms))


def soft_quote_similarity(left: Any, right: Any) -> float:
    left_normalized = relaxed_normalize(left)
    right_normalized = relaxed_normalize(right)
    if not left_normalized or not right_normalized:
        return 0.0
    return max(
        SequenceMatcher(None, left_normalized, right_normalized).ratio(),
        _token_overlap(left_normalized, right_normalized),
    )


def _contains_relaxed_quote(left: Any, right: Any) -> bool:
    left_normalized = relaxed_normalize(left)
    right_normalized = relaxed_normalize(right)
    if not left_normalized or not right_normalized:
        return False
    return left_normalized in right_normalized or right_normalized in left_normalized


def _relaxed_quote_match(left: Any, right: Any) -> bool:
    left_normalized = relaxed_normalize(left)
    right_normalized = relaxed_normalize(right)
    if not left_normalized or not right_normalized:
        return False
    return _contains_relaxed_quote(left, right) or SequenceMatcher(
        None,
        left_normalized,
        right_normalized,
    ).ratio() >= 0.90


def _contains_cue(text: str, cues: Sequence[str]) -> bool:
    for cue in cues:
        if re.search(rf"\b{re.escape(cue)}\b", text):
            return True
    return False


def project_runtime_subtype(runtime_item: dict[str, Any]) -> str | None:
    if runtime_item["capture_class"] == "hold":
        return None

    candidate = exact_normalize(
        runtime_item.get("directive_summary") or runtime_item.get("source_quote")
    )
    if not candidate:
        return None
    if _contains_cue(candidate, OBLIGATION_CUES):
        return "obligation"
    if _contains_cue(candidate, DECISION_RECORD_CUES):
        return "decision_record"
    if _contains_cue(candidate, ACTION_REQUEST_CUES):
        return "action_request"
    return None


def _quote_supported(source_quote: Any, excerpt_text: str) -> bool:
    normalized_quote = exact_normalize(source_quote)
    normalized_excerpt = exact_normalize(excerpt_text)
    if not normalized_quote:
        return False
    return normalized_quote in normalized_excerpt


def _build_gold_items(gold_annotation: dict[str, Any]) -> list[dict[str, Any]]:
    items = []
    for index, item in enumerate(gold_annotation["gold_items"]):
        items.append(
            {
                "id": item["id"],
                "order_index": index,
                "capture_class": item["capture_class"],
                "semantic_subtype": item.get("semantic_subtype"),
                "source_quote": item["source_quote"],
                "ambiguity_expected": bool(item.get("ambiguity_expected")),
            }
        )
    return items


def _build_runtime_items(recorded_meeting: dict[str, Any]) -> list[dict[str, Any]]:
    items = []
    for index, item in enumerate(recorded_meeting["runtime_items"]):
        items.append(
            {
                **item,
                "order_index": index,
            }
        )
    return items


def _greedy_pair(
    gold_items: Sequence[dict[str, Any]],
    runtime_items: Sequence[dict[str, Any]],
    *,
    match_type: str,
    require_same_class: bool,
) -> tuple[list[dict[str, Any]], set[str], set[str]]:
    pairs: list[dict[str, Any]] = []
    used_gold: set[str] = set()
    used_runtime: set[str] = set()

    for gold in gold_items:
        if gold["id"] in used_gold:
            continue
        for runtime in runtime_items:
            if runtime["runtime_item_id"] in used_runtime:
                continue
            if require_same_class and gold["capture_class"] != runtime["capture_class"]:
                continue
            if not require_same_class and gold["capture_class"] == runtime["capture_class"]:
                continue

            if match_type == "exact":
                matched = exact_normalize(gold["source_quote"]) == exact_normalize(
                    runtime["source_quote"]
                )
            else:
                matched = _relaxed_quote_match(gold["source_quote"], runtime["source_quote"])

            if matched:
                pairs.append(
                    {
                        "gold_id": gold["id"],
                        "runtime_item_id": runtime["runtime_item_id"],
                        "match_type": match_type,
                        "capture_class": gold["capture_class"],
                        "gold_semantic_subtype": gold.get("semantic_subtype"),
                        "ambiguity_expected": gold["ambiguity_expected"],
                    }
                )
                used_gold.add(gold["id"])
                used_runtime.add(runtime["runtime_item_id"])
                break

    return pairs, used_gold, used_runtime


def _greedy_segment_boundary_links(
    gold_items: Sequence[dict[str, Any]],
    runtime_items: Sequence[dict[str, Any]],
) -> list[dict[str, Any]]:
    links: list[dict[str, Any]] = []
    used_gold: set[str] = set()
    used_runtime: set[str] = set()

    for gold in gold_items:
        if gold["id"] in used_gold:
            continue
        for runtime in runtime_items:
            if runtime["runtime_item_id"] in used_runtime:
                continue
            if gold["capture_class"] != runtime["capture_class"]:
                continue
            similarity = soft_quote_similarity(gold["source_quote"], runtime["source_quote"])
            if similarity < SEGMENT_BOUNDARY_SIMILARITY_THRESHOLD:
                continue
            links.append(
                {
                    "gold_id": gold["id"],
                    "runtime_item_id": runtime["runtime_item_id"],
                    "similarity": round(similarity, 4),
                }
            )
            used_gold.add(gold["id"])
            used_runtime.add(runtime["runtime_item_id"])
            break

    return links


def analyze_meeting_alignment(
    recorded_meeting: dict[str, Any],
    gold_annotation: dict[str, Any],
    excerpt_text: str,
) -> dict[str, Any]:
    gold_items = _build_gold_items(gold_annotation)
    runtime_items = _build_runtime_items(recorded_meeting)
    gold_by_id = {item["id"]: item for item in gold_items}
    runtime_by_id = {item["runtime_item_id"]: item for item in runtime_items}

    exact_pairs, matched_gold, matched_runtime = _greedy_pair(
        gold_items,
        runtime_items,
        match_type="exact",
        require_same_class=True,
    )
    remaining_gold = [item for item in gold_items if item["id"] not in matched_gold]
    remaining_runtime = [
        item for item in runtime_items if item["runtime_item_id"] not in matched_runtime
    ]

    relaxed_pairs, relaxed_gold, relaxed_runtime = _greedy_pair(
        remaining_gold,
        remaining_runtime,
        match_type="relaxed",
        require_same_class=True,
    )
    matched_gold.update(relaxed_gold)
    matched_runtime.update(relaxed_runtime)

    still_unmatched_gold = [item for item in gold_items if item["id"] not in matched_gold]
    still_unmatched_runtime = [
        item for item in runtime_items if item["runtime_item_id"] not in matched_runtime
    ]

    wrong_class_exact, wrong_gold, wrong_runtime = _greedy_pair(
        still_unmatched_gold,
        still_unmatched_runtime,
        match_type="exact",
        require_same_class=False,
    )
    remaining_wrong_gold = [
        item for item in still_unmatched_gold if item["id"] not in wrong_gold
    ]
    remaining_wrong_runtime = [
        item for item in still_unmatched_runtime if item["runtime_item_id"] not in wrong_runtime
    ]
    wrong_class_relaxed, wrong_gold_relaxed, wrong_runtime_relaxed = _greedy_pair(
        remaining_wrong_gold,
        remaining_wrong_runtime,
        match_type="relaxed",
        require_same_class=False,
    )
    wrong_class_links = wrong_class_exact + wrong_class_relaxed

    remaining_boundary_gold = [
        item
        for item in still_unmatched_gold
        if item["id"] not in wrong_gold and item["id"] not in wrong_gold_relaxed
    ]
    remaining_boundary_runtime = [
        item
        for item in still_unmatched_runtime
        if item["runtime_item_id"] not in wrong_runtime
        and item["runtime_item_id"] not in wrong_runtime_relaxed
    ]
    segment_boundary_links = _greedy_segment_boundary_links(
        remaining_boundary_gold,
        remaining_boundary_runtime,
    )

    pairs = exact_pairs + relaxed_pairs
    pair_by_runtime = {pair["runtime_item_id"]: pair for pair in pairs}
    pair_by_gold = {pair["gold_id"]: pair for pair in pairs}
    wrong_class_by_runtime = {
        link["runtime_item_id"]: link for link in wrong_class_links
    }
    wrong_class_by_gold = {link["gold_id"]: link for link in wrong_class_links}
    segment_boundary_by_runtime = {
        link["runtime_item_id"]: link for link in segment_boundary_links
    }
    segment_boundary_by_gold = {
        link["gold_id"]: link for link in segment_boundary_links
    }

    projected_subtypes = {
        runtime_id: project_runtime_subtype(runtime_item)
        for runtime_id, runtime_item in runtime_by_id.items()
    }
    quote_supported = {
        runtime_id: _quote_supported(runtime_item["source_quote"], excerpt_text)
        for runtime_id, runtime_item in runtime_by_id.items()
    }
    scoring_confidences = {
        runtime_id: score_confidence(runtime_item)
        for runtime_id, runtime_item in runtime_by_id.items()
    }

    unsafe_runtime_ids = []
    for runtime_id, runtime_item in runtime_by_id.items():
        conditions = []
        paired = pair_by_runtime.get(runtime_id)
        wrong_class = wrong_class_by_runtime.get(runtime_id)
        if paired is None and wrong_class is None:
            conditions.append("unmatched")
        if not quote_supported[runtime_id]:
            conditions.append("unsupported_quote")
        if wrong_class is not None:
            conditions.append("wrong_class")
        if paired is not None and projected_subtypes[runtime_id] != paired["gold_semantic_subtype"]:
            conditions.append("wrong_subtype")
        if paired is not None and paired["ambiguity_expected"]:
            conditions.append("ambiguity_expected")
        if scoring_confidences[runtime_id] >= 0.80 and conditions:
            unsafe_runtime_ids.append(runtime_id)

    return {
        "meeting_id": recorded_meeting["meeting_id"],
        "slot": recorded_meeting["slot"],
        "lane": recorded_meeting["lane"],
        "fallback_used": bool(recorded_meeting.get("fallback_used")),
        "gold_items": gold_items,
        "runtime_items": runtime_items,
        "gold_by_id": gold_by_id,
        "runtime_by_id": runtime_by_id,
        "pairs": pairs,
        "pair_by_runtime": pair_by_runtime,
        "pair_by_gold": pair_by_gold,
        "wrong_class_links": wrong_class_links,
        "wrong_class_by_runtime": wrong_class_by_runtime,
        "wrong_class_by_gold": wrong_class_by_gold,
        "segment_boundary_links": segment_boundary_links,
        "segment_boundary_by_runtime": segment_boundary_by_runtime,
        "segment_boundary_by_gold": segment_boundary_by_gold,
        "unmatched_gold_ids": [
            item["id"] for item in gold_items if item["id"] not in pair_by_gold
        ],
        "unmatched_runtime_ids": [
            item["runtime_item_id"]
            for item in runtime_items
            if item["runtime_item_id"] not in pair_by_runtime
        ],
        "projected_subtypes": projected_subtypes,
        "quote_supported": quote_supported,
        "scoring_confidences": scoring_confidences,
        "unsafe_runtime_ids": unsafe_runtime_ids,
    }
