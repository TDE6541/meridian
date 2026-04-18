from __future__ import annotations

from typing import Any, Iterable


CAPTURE_CLASSES = ("directive", "hold")
CONFIDENCE_BUCKETS = (
    ("0.00-0.49", 0.00, 0.49),
    ("0.50-0.69", 0.50, 0.69),
    ("0.70-0.84", 0.70, 0.84),
    ("0.85-1.00", 0.85, 1.00),
)


def _round_metric(value: float) -> float:
    return round(value, 4)


def _safe_divide(numerator: float, denominator: float) -> float:
    if not denominator:
        return 0.0
    return numerator / denominator


def _f1(precision: float, recall: float) -> float:
    if not precision and not recall:
        return 0.0
    return (2.0 * precision * recall) / (precision + recall)


def _per_class_counts(analysis: dict[str, Any]) -> dict[str, dict[str, int]]:
    counts = {
        capture_class: {"gold": 0, "runtime": 0, "true_positive": 0}
        for capture_class in CAPTURE_CLASSES
    }
    for gold_item in analysis["gold_items"]:
        counts[gold_item["capture_class"]]["gold"] += 1
    for runtime_item in analysis["runtime_items"]:
        counts[runtime_item["capture_class"]]["runtime"] += 1
    for pair in analysis["pairs"]:
        counts[pair["capture_class"]]["true_positive"] += 1
    return counts


def _confidence_bucket_rows(analysis: dict[str, Any]) -> list[dict[str, Any]]:
    rows = [
        {
            "bucket": label,
            "count": 0,
            "exact_matches": 0,
            "relaxed_matches": 0,
            "unmatched": 0,
            "precision": 0.0,
        }
        for label, _, _ in CONFIDENCE_BUCKETS
    ]
    bucket_lookup = {row["bucket"]: row for row in rows}

    for runtime_item in analysis["runtime_items"]:
        runtime_id = runtime_item["runtime_item_id"]
        confidence = analysis["scoring_confidences"][runtime_id]
        bucket_label = CONFIDENCE_BUCKETS[-1][0]
        for label, lower, upper in CONFIDENCE_BUCKETS:
            if lower <= confidence <= upper:
                bucket_label = label
                break

        row = bucket_lookup[bucket_label]
        row["count"] += 1
        pair = analysis["pair_by_runtime"].get(runtime_id)
        if pair is None:
            row["unmatched"] += 1
        elif pair["match_type"] == "exact":
            row["exact_matches"] += 1
        else:
            row["relaxed_matches"] += 1

    for row in rows:
        matched = row["exact_matches"] + row["relaxed_matches"]
        row["precision"] = _round_metric(_safe_divide(matched, row["count"]))

    return rows


def _summary_from_counts(
    counts: dict[str, Any],
    *,
    failure_category_counts: dict[str, int],
    confidence_buckets: list[dict[str, Any]],
    meeting_ids: Iterable[str],
) -> dict[str, Any]:
    meeting_id_list = list(meeting_ids)
    meeting_count = len(meeting_id_list)
    matched = counts["exact_matches"] + counts["relaxed_matches"]
    unmatched_gold = counts["gold_items"] - matched
    unmatched_runtime = counts["runtime_items"] - matched

    per_class_metrics: dict[str, dict[str, Any]] = {}
    macro_precisions = []
    macro_recalls = []
    macro_f1s = []

    for capture_class in CAPTURE_CLASSES:
        class_counts = counts["per_class"][capture_class]
        true_positive = class_counts["true_positive"]
        false_positive = class_counts["runtime"] - true_positive
        false_negative = class_counts["gold"] - true_positive
        precision = _safe_divide(true_positive, true_positive + false_positive)
        recall = _safe_divide(true_positive, true_positive + false_negative)
        f1 = _f1(precision, recall)

        macro_precisions.append(precision)
        macro_recalls.append(recall)
        macro_f1s.append(f1)
        per_class_metrics[capture_class] = {
            "gold_items": class_counts["gold"],
            "runtime_items": class_counts["runtime"],
            "true_positive": true_positive,
            "false_positive": false_positive,
            "false_negative": false_negative,
            "precision": _round_metric(precision),
            "recall": _round_metric(recall),
            "f1": _round_metric(f1),
        }

    micro_precision = _safe_divide(matched, counts["runtime_items"])
    micro_recall = _safe_divide(matched, counts["gold_items"])
    micro_f1 = _f1(micro_precision, micro_recall)

    return {
        "meeting_count": meeting_count,
        "meeting_ids": meeting_id_list,
        "counts": {
            "gold_items": counts["gold_items"],
            "runtime_items": counts["runtime_items"],
            "exact_matches": counts["exact_matches"],
            "relaxed_matches": counts["relaxed_matches"],
            "matched_items": matched,
            "unmatched_gold_items": unmatched_gold,
            "unmatched_runtime_items": unmatched_runtime,
            "unsupported_quotes": counts["unsupported_quotes"],
            "unsafe_certainty": counts["unsafe_certainty"],
            "fallback_activations": counts["fallback_activations"],
        },
        "scores": {
            "micro_precision": _round_metric(micro_precision),
            "micro_recall": _round_metric(micro_recall),
            "micro_f1": _round_metric(micro_f1),
            "macro_precision": _round_metric(sum(macro_precisions) / len(macro_precisions)),
            "macro_recall": _round_metric(sum(macro_recalls) / len(macro_recalls)),
            "macro_f1": _round_metric(sum(macro_f1s) / len(macro_f1s)),
            "exact_match_score": _round_metric(
                _safe_divide(counts["exact_matches"], counts["gold_items"])
            ),
            "relaxed_match_score": _round_metric(_safe_divide(matched, counts["gold_items"])),
            "unsupported_quote_rate": _round_metric(
                _safe_divide(counts["unsupported_quotes"], counts["runtime_items"])
            ),
            "unsafe_certainty_rate": _round_metric(
                _safe_divide(counts["unsafe_certainty"], counts["runtime_items"])
            ),
            "fallback_activation_rate": _round_metric(
                _safe_divide(counts["fallback_activations"], meeting_count)
            ),
        },
        "per_class_metrics": per_class_metrics,
        "confidence_buckets": confidence_buckets,
        "failure_category_counts": failure_category_counts,
    }


def summarize_alignment(
    analysis: dict[str, Any],
    failure_category_counts: dict[str, int],
) -> dict[str, Any]:
    per_class = _per_class_counts(analysis)
    counts = {
        "gold_items": len(analysis["gold_items"]),
        "runtime_items": len(analysis["runtime_items"]),
        "exact_matches": sum(1 for pair in analysis["pairs"] if pair["match_type"] == "exact"),
        "relaxed_matches": sum(
            1 for pair in analysis["pairs"] if pair["match_type"] == "relaxed"
        ),
        "unsupported_quotes": sum(
            1 for supported in analysis["quote_supported"].values() if not supported
        ),
        "unsafe_certainty": len(analysis["unsafe_runtime_ids"]),
        "fallback_activations": 1 if analysis["fallback_used"] else 0,
        "per_class": per_class,
    }
    summary = _summary_from_counts(
        counts,
        failure_category_counts=failure_category_counts,
        confidence_buckets=_confidence_bucket_rows(analysis),
        meeting_ids=[analysis["meeting_id"]],
    )
    summary["meeting_id"] = analysis["meeting_id"]
    summary["slot"] = analysis["slot"]
    summary["fallback_used"] = analysis["fallback_used"]
    return summary


def aggregate_evaluation_summaries(summaries: list[dict[str, Any]]) -> dict[str, Any]:
    counts = {
        "gold_items": 0,
        "runtime_items": 0,
        "exact_matches": 0,
        "relaxed_matches": 0,
        "unsupported_quotes": 0,
        "unsafe_certainty": 0,
        "fallback_activations": 0,
        "per_class": {
            capture_class: {"gold": 0, "runtime": 0, "true_positive": 0}
            for capture_class in CAPTURE_CLASSES
        },
    }
    bucket_lookup = {
        label: {
            "bucket": label,
            "count": 0,
            "exact_matches": 0,
            "relaxed_matches": 0,
            "unmatched": 0,
            "precision": 0.0,
        }
        for label, _, _ in CONFIDENCE_BUCKETS
    }
    failure_category_counts: dict[str, int] = {}
    meeting_ids: list[str] = []

    for summary in summaries:
        meeting_ids.extend(summary["meeting_ids"])
        counts["gold_items"] += summary["counts"]["gold_items"]
        counts["runtime_items"] += summary["counts"]["runtime_items"]
        counts["exact_matches"] += summary["counts"]["exact_matches"]
        counts["relaxed_matches"] += summary["counts"]["relaxed_matches"]
        counts["unsupported_quotes"] += summary["counts"]["unsupported_quotes"]
        counts["unsafe_certainty"] += summary["counts"]["unsafe_certainty"]
        counts["fallback_activations"] += summary["counts"]["fallback_activations"]

        for capture_class in CAPTURE_CLASSES:
            class_summary = summary["per_class_metrics"][capture_class]
            counts["per_class"][capture_class]["gold"] += class_summary["gold_items"]
            counts["per_class"][capture_class]["runtime"] += class_summary["runtime_items"]
            counts["per_class"][capture_class]["true_positive"] += class_summary["true_positive"]

        for bucket in summary["confidence_buckets"]:
            aggregate_bucket = bucket_lookup[bucket["bucket"]]
            aggregate_bucket["count"] += bucket["count"]
            aggregate_bucket["exact_matches"] += bucket["exact_matches"]
            aggregate_bucket["relaxed_matches"] += bucket["relaxed_matches"]
            aggregate_bucket["unmatched"] += bucket["unmatched"]

        for name, value in summary["failure_category_counts"].items():
            failure_category_counts[name] = failure_category_counts.get(name, 0) + value

    confidence_buckets = []
    for label, _, _ in CONFIDENCE_BUCKETS:
        bucket = bucket_lookup[label]
        matched = bucket["exact_matches"] + bucket["relaxed_matches"]
        bucket["precision"] = _round_metric(_safe_divide(matched, bucket["count"]))
        confidence_buckets.append(bucket)

    return _summary_from_counts(
        counts,
        failure_category_counts=failure_category_counts,
        confidence_buckets=confidence_buckets,
        meeting_ids=meeting_ids,
    )
