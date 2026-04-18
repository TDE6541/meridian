from __future__ import annotations

from typing import Any, Optional

from .failure_categories import categorize_alignment
from .matcher import analyze_meeting_alignment
from .metrics import aggregate_evaluation_summaries, summarize_alignment
from .runner import (
    CORPUS_MANIFEST_PATH,
    FALLBACK_BASELINE_PATH,
    PRIMARY_BASELINE_PATH,
    ROOT,
    RUNNER_VERSION,
    load_corpus_manifest,
    load_excerpt_text,
    load_gold_annotation,
    load_recorded_bundle,
    list_corpus_meetings,
)


def _meeting_summary(
    meeting,
    recorded_meeting: dict[str, Any],
) -> dict[str, Any]:
    analysis = analyze_meeting_alignment(
        recorded_meeting,
        load_gold_annotation(meeting),
        load_excerpt_text(meeting),
    )
    failure_counts = categorize_alignment(analysis)
    return summarize_alignment(analysis, failure_counts)


def _with_fallback_metrics(section: dict[str, Any]) -> dict[str, Any]:
    section = dict(section)
    section["fallback_metrics"] = {
        "precision": section["scores"]["micro_precision"],
        "recall": section["scores"]["micro_recall"],
        "f1": section["scores"]["micro_f1"],
        "false_positives": section["failure_category_counts"]["fallback false positive"],
        "misses": section["failure_category_counts"]["fallback miss"],
    }
    return section


def _lane_section(bundle: dict[str, Any]) -> dict[str, Any]:
    meetings = list_corpus_meetings()
    recorded_lookup = {meeting["meeting_id"]: meeting for meeting in bundle["meetings"]}

    meeting_summaries = []
    dev_summaries = []
    holdout_summaries = []
    for meeting in meetings:
        summary = _meeting_summary(meeting, recorded_lookup[meeting.meeting_id])
        meeting_summaries.append(summary)
        if meeting.slot == "holdout":
            holdout_summaries.append(summary)
        else:
            dev_summaries.append(summary)

    all_meetings = aggregate_evaluation_summaries(meeting_summaries)
    dev_aggregate = aggregate_evaluation_summaries(dev_summaries)
    holdout = aggregate_evaluation_summaries(holdout_summaries)

    if bundle["lane"] == "forced_fallback":
        all_meetings = _with_fallback_metrics(all_meetings)
        dev_aggregate = _with_fallback_metrics(dev_aggregate)
        holdout = _with_fallback_metrics(holdout)

    return {
        "lane": bundle["lane"],
        "capture_mode": bundle["capture_mode"],
        "model": bundle.get("model"),
        "meeting_count": bundle["meeting_count"],
        "all_meetings": all_meetings,
        "dev_aggregate": dev_aggregate,
        "holdout": holdout,
        "by_meeting": meeting_summaries,
    }


def build_baseline_report(
    *,
    primary_bundle: Optional[dict[str, Any]] = None,
    fallback_bundle: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    primary = (
        load_recorded_bundle(PRIMARY_BASELINE_PATH)
        if primary_bundle is None
        else primary_bundle
    )
    fallback = (
        load_recorded_bundle(FALLBACK_BASELINE_PATH)
        if fallback_bundle is None
        else fallback_bundle
    )
    manifest = load_corpus_manifest()
    dev_meetings = [
        entry["meeting_id"] for entry in manifest["meetings"] if entry["slot"] != "holdout"
    ]
    holdout_meetings = [
        entry["meeting_id"] for entry in manifest["meetings"] if entry["slot"] == "holdout"
    ]

    return {
        "report_version": RUNNER_VERSION,
        "corpus": {
            "manifest_path": CORPUS_MANIFEST_PATH.relative_to(ROOT).as_posix(),
            "corpus_name": manifest["corpus_name"],
            "corpus_version": manifest["corpus_version"],
            "annotation_schema_version": manifest["annotation_schema_version"],
            "meeting_count": manifest["corpus_size"]["total_shipped"],
            "dev_meeting_ids": dev_meetings,
            "holdout_meeting_ids": holdout_meetings,
            "gold_item_count": manifest["totals"]["total_gold_items"],
            "directive_gold_count": manifest["totals"]["total_directives"],
            "hold_gold_count": manifest["totals"]["total_holds"],
            "negative_control_count": manifest["totals"]["total_negative_controls"],
        },
        "recordings": {
            "primary_path": PRIMARY_BASELINE_PATH.relative_to(ROOT).as_posix(),
            "forced_fallback_path": FALLBACK_BASELINE_PATH.relative_to(ROOT).as_posix(),
            "primary_replay_ready": bool(primary.get("replay_ready")),
            "forced_fallback_replay_ready": bool(fallback.get("replay_ready")),
        },
        "primary_lane": _lane_section(primary),
        "forced_fallback_lane": _lane_section(fallback),
    }
