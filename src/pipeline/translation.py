from __future__ import annotations

from typing import Iterable, Optional, Sequence

from .models import CaptureArtifact, GovernanceHandoffPayload, MeetingMetadata

SUPPORTED_CAPTURE_ARTIFACT_KINDS = frozenset({"directive", "hold"})
DEFERRED_BOUNDARY_STAGES = (
    "segment_transcript",
    "extract_capture_artifacts",
    "runtime_wiring",
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


def translate_internal_capture_to_handoff(*_args, **_kwargs):
    """Explicitly block end-to-end translation claims until later blocks land."""

    raise TranslationDeferredError(
        "Wave 4B Block A freezes only the capture-to-governance seam; "
        "translation from internal Segment/Directive/Hold models is deferred to later blocks."
    )
