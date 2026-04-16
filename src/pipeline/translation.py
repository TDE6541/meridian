from __future__ import annotations

from dataclasses import asdict
from typing import TYPE_CHECKING, Iterable, Optional, Sequence

from .models import (
    CaptureArtifact,
    ConfidenceTriplet,
    Directive,
    GovernanceHandoffPayload,
    Hold,
    MeetingMetadata,
    Segment,
)

if TYPE_CHECKING:
    from .pipeline import CapturedPipelineContext

SUPPORTED_CAPTURE_ARTIFACT_KINDS = frozenset({"directive", "hold"})
DEFERRED_BOUNDARY_STAGES = (
    "segment_transcript",
    "extract_capture_artifacts",
    "runtime_wiring",
)
CAPTURE_ARTIFACT_DOCUMENT_VERSION = "wave4b-blockd-capture-artifact-v1"
GOVERNANCE_HANDOFF_DOCUMENT_VERSION = "wave4b-blockd-governance-handoff-v1"
RUNTIME_OWNED_FIELDS = (
    "entity_ref",
    "raw_subject",
    "authority_context",
    "evidence_context",
    "confidence_context",
    "candidate_signal_patch",
)


class TranslationDeferredError(NotImplementedError):
    """Raised when later-wave translation work is invoked in Block A."""


def validate_capture_artifact(artifact: CaptureArtifact) -> CaptureArtifact:
    """Validate the additive boundary shape without claiming runtime governability."""

    if artifact.artifact_kind not in SUPPORTED_CAPTURE_ARTIFACT_KINDS:
        raise ValueError(
            "capture artifact kind must be one of: "
            + ", ".join(sorted(SUPPORTED_CAPTURE_ARTIFACT_KINDS))
        )

    if not artifact.summary.strip():
        raise ValueError("capture artifact summary must be a non-empty string")

    if not artifact.source_quote.strip():
        raise ValueError("capture artifact source_quote must be a non-empty string")

    if not artifact.lineage.transcript_hash.strip():
        raise ValueError("capture artifact lineage.transcript_hash is required")

    return artifact


def validate_governance_handoff_payload(
    payload: GovernanceHandoffPayload,
) -> GovernanceHandoffPayload:
    """Validate the frozen handoff seam for later boundary work."""

    if not payload.meeting.org_id.strip():
        raise ValueError("meeting.org_id must be a non-empty string")

    if not payload.meeting.meeting_id.strip():
        raise ValueError("meeting.meeting_id must be a non-empty string")

    if not payload.transcript_hash.strip():
        raise ValueError("transcript_hash must be a non-empty string")

    for artifact in payload.capture_artifacts:
        validate_capture_artifact(artifact)

    return payload


def build_governance_handoff_payload(
    meeting: MeetingMetadata,
    transcript_hash: str,
    capture_artifacts: Sequence[CaptureArtifact],
    notes: Optional[Iterable[str]] = None,
) -> GovernanceHandoffPayload:
    """Build the boundary payload while keeping later translation work deferred."""

    payload = GovernanceHandoffPayload(
        meeting=meeting,
        transcript_hash=transcript_hash,
        capture_artifacts=list(capture_artifacts),
        deferred_stages=list(DEFERRED_BOUNDARY_STAGES),
        notes=list(notes or []),
    )
    return validate_governance_handoff_payload(payload)


def _confidence_backbone(confidence: ConfidenceTriplet | Directive | Hold) -> dict:
    if isinstance(confidence, ConfidenceTriplet):
        return {
            "model_confidence": confidence.model_confidence,
            "agreement_ratio": confidence.agreement_ratio,
            "final_confidence": confidence.final_confidence,
        }

    return {
        "model_confidence": confidence.model_confidence,
        "agreement_ratio": confidence.agreement_ratio,
        "final_confidence": confidence.final_confidence or confidence.confidence,
    }


def _meeting_metadata_payload(meeting: MeetingMetadata) -> dict:
    return asdict(meeting)


def _lineage_payload(
    segment: Segment,
    transcript_hash: str,
    *,
    stage_name: str,
) -> dict:
    return {
        "segment_id": segment.segment_id,
        "timestamp_start": segment.timestamp_start,
        "timestamp_end": segment.timestamp_end,
        "transcript_hash": transcript_hash,
        "stage_name": stage_name,
    }


def _segment_lineage_payload(segment: Segment) -> dict:
    return {
        "segment_id": segment.segment_id,
        "timestamp_start": segment.timestamp_start,
        "timestamp_end": segment.timestamp_end,
        "summary": segment.summary,
        "speakers": list(segment.speakers),
        "segment_type": segment.segment_type,
        "cue_markers": list(segment.cue_markers),
    }


def _artifact_id(meeting: MeetingMetadata, transcript_hash: str) -> str:
    return (
        f"capture-artifact:{meeting.org_id}:{meeting.meeting_id}:{transcript_hash[:12]}"
    )


def _item_governance_flags() -> dict:
    return {
        "boundary_ambiguity_preserved": True,
        "entity_mapping_status": "deferred",
        "subject_binding_status": "deferred",
        "general_entity_governance_claimed": False,
    }


def _directive_item_payload(
    directive: Directive,
    *,
    index: int,
    segment_lookup: dict[str, Segment],
    transcript_hash: str,
) -> dict:
    segment = segment_lookup[directive.segment_id]
    return {
        "capture_item_id": f"directive:{directive.segment_id}:{index}",
        "item_kind": "directive",
        "summary": directive.directive_summary,
        "owner": directive.responsible_party or None,
        "source_quote": directive.source_quote,
        "confidence_backbone": _confidence_backbone(directive),
        "lineage": _lineage_payload(
            segment,
            transcript_hash,
            stage_name="extract_capture_artifacts",
        ),
        "raw_capture_fields": {
            "status": directive.status,
            "responsible_party": directive.responsible_party,
        },
        "normalization_flags": {
            "summary_source_field": "directive_summary",
            "owner_source_field": "responsible_party",
            "item_type_source_field": "status",
            "normalized_item_type": "directive",
        },
        "governance_flags": _item_governance_flags(),
    }


def _hold_item_payload(
    hold: Hold,
    *,
    index: int,
    segment_lookup: dict[str, Segment],
    transcript_hash: str,
) -> dict:
    segment = segment_lookup[hold.segment_id]
    return {
        "capture_item_id": f"hold:{hold.segment_id}:{index}",
        "item_kind": "hold",
        "summary": hold.hold_summary,
        "owner": hold.owner_to_clarify or None,
        "source_quote": hold.source_quote,
        "confidence_backbone": _confidence_backbone(hold),
        "lineage": _lineage_payload(
            segment,
            transcript_hash,
            stage_name="extract_capture_artifacts",
        ),
        "raw_capture_fields": {
            "hold_type": hold.hold_type,
            "blocking_scope": hold.blocking_scope,
            "severity": hold.severity,
            "owner_to_clarify": hold.owner_to_clarify,
        },
        "normalization_flags": {
            "summary_source_field": "hold_summary",
            "owner_source_field": "owner_to_clarify",
            "item_type_source_field": "hold_type",
            "normalized_item_type": "hold",
        },
        "governance_flags": _item_governance_flags(),
    }


def build_capture_artifact_document(captured_context: "CapturedPipelineContext") -> dict:
    """Build the durable capture artifact without implying runtime readiness."""

    segment_lookup = {segment.segment_id: segment for segment in captured_context.segments}
    extracted_items = [
        _directive_item_payload(
            directive,
            index=index,
            segment_lookup=segment_lookup,
            transcript_hash=captured_context.transcript_sha256,
        )
        for index, directive in enumerate(captured_context.directives, start=1)
    ]
    extracted_items.extend(
        _hold_item_payload(
            hold,
            index=index,
            segment_lookup=segment_lookup,
            transcript_hash=captured_context.transcript_sha256,
        )
        for index, hold in enumerate(captured_context.holds, start=1)
    )

    return {
        "artifact_version": CAPTURE_ARTIFACT_DOCUMENT_VERSION,
        "artifact_id": _artifact_id(
            captured_context.meeting, captured_context.transcript_sha256
        ),
        "meeting_metadata": _meeting_metadata_payload(captured_context.meeting),
        "transcript_hash": captured_context.transcript_sha256,
        "capture_counts": {
            "segment_count": len(captured_context.segments),
            "directive_count": len(captured_context.directives),
            "hold_count": len(captured_context.holds),
        },
        "capture_run": {
            "fallback_used": captured_context.fallback_used,
            "extraction_run_pattern": list(captured_context.extraction_run_pattern),
            "notes": list(captured_context.notes),
        },
        "segment_lineage": [
            _segment_lineage_payload(segment) for segment in captured_context.segments
        ],
        "extracted_items": extracted_items,
        "normalization_flags": {
            "internal_contracts_preserved": True,
            "directive_hold_boundary_preserved": True,
            "no_entity_class_inference": True,
        },
        "governance_flags": {
            "boundary_ambiguity_preserved": True,
            "transport_subject_status": "deferred",
            "general_entity_governance_claimed": False,
            "runtime_request_ready": False,
        },
    }


def _selected_items(
    capture_artifact_document: dict,
    *,
    selected_item_ids: Optional[Sequence[str]] = None,
) -> list[dict]:
    items = {
        item["capture_item_id"]: item
        for item in capture_artifact_document["extracted_items"]
    }
    if selected_item_ids is None:
        return list(capture_artifact_document["extracted_items"])

    selected = []
    for capture_item_id in selected_item_ids:
        if capture_item_id not in items:
            raise ValueError(f"Unknown capture_item_id for handoff selection: {capture_item_id}")
        selected.append(items[capture_item_id])
    return selected


def build_bounded_governance_handoff_payload(
    capture_artifact_document: dict,
    *,
    selected_item_ids: Optional[Sequence[str]] = None,
    notes: Optional[Iterable[str]] = None,
) -> dict:
    """Build the reduced, local/frozen governance handoff payload."""

    selected_items = []
    for item in _selected_items(
        capture_artifact_document,
        selected_item_ids=selected_item_ids,
    ):
        selected_items.append(
            {
                "capture_item_id": item["capture_item_id"],
                "normalized_summary": item["summary"],
                "normalized_owner": item["owner"],
                "normalized_item_type": item["normalization_flags"][
                    "normalized_item_type"
                ],
                "source_quote": item["source_quote"],
                "lineage": dict(item["lineage"]),
                "confidence_backbone": dict(item["confidence_backbone"]),
                "normalization_flags": dict(item["normalization_flags"]),
                "boundary_flags": {
                    "boundary_ambiguity_preserved": True,
                    "entity_mapping_status": "deferred",
                    "subject_binding_status": "local_frozen_only",
                    "runtime_owned_fields": list(RUNTIME_OWNED_FIELDS),
                    "general_entity_governance_claimed": False,
                },
            }
        )

    return {
        "handoff_version": GOVERNANCE_HANDOFF_DOCUMENT_VERSION,
        "handoff_mode": "local_frozen_proof",
        "capture_artifact_id": capture_artifact_document["artifact_id"],
        "meeting_metadata": dict(capture_artifact_document["meeting_metadata"]),
        "transcript_hash": capture_artifact_document["transcript_hash"],
        "selected_item_count": len(selected_items),
        "selected_items": selected_items,
        "runtime_boundary": {
            "target_runtime": "wave4a_command_request",
            "proof_mode": "local_frozen_only",
            "transport_subject_status": "deferred",
            "runtime_owned_fields": list(RUNTIME_OWNED_FIELDS),
            "general_entity_governance_claimed": False,
        },
        "notes": list(notes or []),
    }


def translate_internal_capture_to_handoff(
    captured_context: "CapturedPipelineContext",
    *,
    selected_item_ids: Optional[Sequence[str]] = None,
    notes: Optional[Iterable[str]] = None,
) -> dict:
    """Translate captured internal items into the Block D seam outputs."""

    capture_artifact = build_capture_artifact_document(captured_context)
    governance_handoff = build_bounded_governance_handoff_payload(
        capture_artifact,
        selected_item_ids=selected_item_ids,
        notes=notes,
    )
    return {
        "capture_artifact": capture_artifact,
        "governance_handoff": governance_handoff,
    }
