from __future__ import annotations

from typing import Any

from .matcher import soft_quote_similarity


FAILURE_CATEGORY_NAMES = (
    "false positive",
    "false negative",
    "wrong class",
    "wrong subtype",
    "unsupported quote / grounding failure",
    "unsafe certainty",
    "fallback false positive",
    "fallback miss",
    "segment-boundary miss",
    "duplicated/paraphrased decision merge failure",
)


def _duplicate_runtime_ids(analysis: dict[str, Any]) -> set[str]:
    duplicate_ids: set[str] = set()
    paired_runtime_ids = set(analysis["pair_by_runtime"])
    wrong_class_runtime_ids = set(analysis["wrong_class_by_runtime"])
    segment_boundary_runtime_ids = set(analysis["segment_boundary_by_runtime"])
    gold_directives = [
        item for item in analysis["gold_items"] if item["capture_class"] == "directive"
    ]

    for runtime_item in analysis["runtime_items"]:
        runtime_id = runtime_item["runtime_item_id"]
        if runtime_item["capture_class"] != "directive":
            continue
        if runtime_id in paired_runtime_ids:
            continue
        if runtime_id in wrong_class_runtime_ids or runtime_id in segment_boundary_runtime_ids:
            continue
        if analysis["quote_supported"][runtime_id]:
            continue

        summary = runtime_item.get("directive_summary") or runtime_item.get("source_quote")
        for gold_item in gold_directives:
            similarity = max(
                soft_quote_similarity(runtime_item["source_quote"], gold_item["source_quote"]),
                soft_quote_similarity(summary, gold_item["source_quote"]),
            )
            if similarity >= 0.55:
                duplicate_ids.add(runtime_id)
                break

    return duplicate_ids


def categorize_alignment(analysis: dict[str, Any]) -> dict[str, int]:
    duplicate_ids = _duplicate_runtime_ids(analysis)
    wrong_subtype_count = 0
    for pair in analysis["pairs"]:
        runtime_id = pair["runtime_item_id"]
        if analysis["projected_subtypes"][runtime_id] != pair["gold_semantic_subtype"]:
            wrong_subtype_count += 1

    counts = {name: 0 for name in FAILURE_CATEGORY_NAMES}
    counts["false positive"] = len(analysis["unmatched_runtime_ids"])
    counts["false negative"] = len(analysis["unmatched_gold_ids"])
    counts["wrong class"] = len(analysis["wrong_class_links"])
    counts["wrong subtype"] = wrong_subtype_count
    counts["unsupported quote / grounding failure"] = sum(
        1 for supported in analysis["quote_supported"].values() if not supported
    )
    counts["unsafe certainty"] = len(analysis["unsafe_runtime_ids"])
    counts["segment-boundary miss"] = len(analysis["segment_boundary_links"])
    counts["duplicated/paraphrased decision merge failure"] = len(duplicate_ids)

    if analysis["lane"] == "forced_fallback":
        counts["fallback false positive"] = len(analysis["unmatched_runtime_ids"])
        counts["fallback miss"] = len(analysis["unmatched_gold_ids"])

    return counts
