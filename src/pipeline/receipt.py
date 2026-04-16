from __future__ import annotations

from collections import Counter
from pathlib import Path
from typing import Any, Mapping, Sequence


FROZEN_PROOF_MANIFEST_VERSION = "wave4b-blocke-frozen-proof-v1"
RUN_LEVEL_RECEIPT_VERSION = "wave4b-blocke-capture-receipt-v1"


def _path_text(path_value: str | Path) -> str:
    return Path(path_value).as_posix()


def _artifact_entry(
    *,
    role: str,
    excerpt_path: str | Path,
    provenance_path: str | Path,
    provenance: Mapping[str, Any],
    primary_verbatim_source: bool,
) -> dict[str, Any]:
    return {
        "role": role,
        "excerpt_path": _path_text(excerpt_path),
        "provenance_path": _path_text(provenance_path),
        "artifact_type": provenance.get("artifact_type"),
        "source_purity": provenance.get("source_purity"),
        "is_verbatim": provenance.get("is_verbatim"),
        "primary_verbatim_source": primary_verbatim_source,
        "meeting_title": provenance.get("meeting_title"),
        "meeting_date": provenance.get("meeting_date"),
    }


def _confidence_summary(capture_artifact: Mapping[str, Any]) -> dict[str, Any]:
    extracted_items = capture_artifact.get("extracted_items") or []
    if not extracted_items:
        return {
            "agreement_ratio": None,
            "model_confidence": None,
            "final_confidence": None,
        }

    def metric_summary(metric_name: str) -> dict[str, float]:
        values = [
            float(item["confidence_backbone"][metric_name])
            for item in extracted_items
            if item.get("confidence_backbone", {}).get(metric_name) is not None
        ]
        if not values:
            return {"min": 0.0, "max": 0.0, "average": 0.0}
        return {
            "min": round(min(values), 3),
            "max": round(max(values), 3),
            "average": round(sum(values) / len(values), 3),
        }

    return {
        "agreement_ratio": metric_summary("agreement_ratio"),
        "model_confidence": metric_summary("model_confidence"),
        "final_confidence": metric_summary("final_confidence"),
    }


def _decision_counts(governance_sweep: Mapping[str, Any]) -> dict[str, int]:
    counter = Counter(
        scenario.get("decision")
        for scenario in (governance_sweep.get("scenarios") or [])
        if scenario.get("decision")
    )
    return dict(sorted(counter.items()))


def build_frozen_proof_manifest(
    pipeline_result,
    *,
    source_label: str,
    primary_artifact: Mapping[str, Any],
    supplemental_artifacts: Sequence[Mapping[str, Any]] = (),
) -> dict[str, Any]:
    capture_artifact = pipeline_result.capture_artifact
    governance_handoff = pipeline_result.governance_handoff

    proof_artifacts = [
        _artifact_entry(
            role=str(primary_artifact["role"]),
            excerpt_path=primary_artifact["excerpt_path"],
            provenance_path=primary_artifact["provenance_path"],
            provenance=primary_artifact["provenance"],
            primary_verbatim_source=True,
        )
    ]
    proof_artifacts.extend(
        _artifact_entry(
            role=str(artifact["role"]),
            excerpt_path=artifact["excerpt_path"],
            provenance_path=artifact["provenance_path"],
            provenance=artifact["provenance"],
            primary_verbatim_source=False,
        )
        for artifact in supplemental_artifacts
    )

    return {
        "proof_manifest_version": FROZEN_PROOF_MANIFEST_VERSION,
        "source_label": source_label,
        "meeting_id": pipeline_result.captured.meeting.meeting_id,
        "meeting_title": pipeline_result.captured.meeting.title,
        "capture_source": pipeline_result.captured.meeting.capture_source,
        "transcript_hash": pipeline_result.captured.transcript_sha256,
        "segment_count": capture_artifact["capture_counts"]["segment_count"],
        "extracted_decision_count": capture_artifact["capture_counts"]["directive_count"],
        "unresolved_item_count": capture_artifact["capture_counts"]["hold_count"],
        "governance_handoff_count": governance_handoff["selected_item_count"],
        "capture_artifact_id": capture_artifact["artifact_id"],
        "handoff_mode": governance_handoff["handoff_mode"],
        "segment_lineage": list(capture_artifact["segment_lineage"]),
        "proof_artifacts": proof_artifacts,
    }


def build_run_level_capture_receipt(
    pipeline_result,
    *,
    proof_manifest: Mapping[str, Any],
    governance_sweep: Mapping[str, Any],
) -> dict[str, Any]:
    first_scenario = (governance_sweep.get("scenarios") or [None])[0] or {}

    return {
        "receipt_version": RUN_LEVEL_RECEIPT_VERSION,
        "meeting_id": pipeline_result.captured.meeting.meeting_id,
        "source_label": proof_manifest["source_label"],
        "segment_count": proof_manifest["segment_count"],
        "extracted_decision_count": proof_manifest["extracted_decision_count"],
        "unresolved_item_count": proof_manifest["unresolved_item_count"],
        "agreement_confidence_summary": _confidence_summary(
            pipeline_result.capture_artifact
        ),
        "fallback_used": pipeline_result.captured.fallback_used,
        "governance_handoff_count": proof_manifest["governance_handoff_count"],
        "governance_outcome_summary": {
            "scenario_count": governance_sweep.get("scenarioCount"),
            "governed_non_event_proof_passed": governance_sweep.get(
                "governedNonEventProofPassed"
            ),
            "decision_counts": _decision_counts(governance_sweep),
            "primary_decision": first_scenario.get("decision"),
            "primary_reason": first_scenario.get("reason"),
            "primary_confidence_tier": first_scenario.get("confidenceTier"),
        },
        "proof_artifact_locations": [
            artifact["excerpt_path"]
            for artifact in proof_manifest["proof_artifacts"]
        ]
        + [artifact["provenance_path"] for artifact in proof_manifest["proof_artifacts"]],
    }
