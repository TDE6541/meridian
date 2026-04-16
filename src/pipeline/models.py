from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Literal, Optional


# Internal HoldPoint-native capture models.


@dataclass(frozen=True)
class Segment:
    """Internal transcript segment contract preserved for later capture stages."""

    segment_id: str
    timestamp_start: Optional[str] = None
    timestamp_end: Optional[str] = None
    summary: str = ""
    topics: List[str] = field(default_factory=list)
    text: str = ""


@dataclass(frozen=True)
class Directive:
    """Internal directive contract kept separate from Meridian-facing handoff models."""

    directive_id: Optional[str] = None
    segment_id: str = ""
    timestamp_start: Optional[str] = None
    timestamp_end: Optional[str] = None
    directive_summary: str = ""
    responsible_party: str = ""
    status: str = ""
    confidence: float = 0.0
    source_quote: str = ""


@dataclass(frozen=True)
class Hold:
    """Internal hold contract kept separate from Meridian-facing handoff models."""

    hold_id: Optional[str] = None
    segment_id: str = ""
    timestamp_start: Optional[str] = None
    timestamp_end: Optional[str] = None
    hold_type: str = ""
    hold_summary: str = ""
    owner_to_clarify: str = ""
    blocking_scope: str = ""
    severity: str = ""
    confidence: float = 0.0
    source_quote: str = ""


# Additive boundary contracts for later Meridian handoff work.


ArtifactKind = Literal["directive", "hold"]


@dataclass(frozen=True)
class ConfidenceTriplet:
    """Bounded confidence seam for later translation without implying entity truth."""

    model_confidence: Optional[float] = None
    agreement_ratio: Optional[float] = None
    final_confidence: Optional[float] = None


@dataclass(frozen=True)
class LineageRef:
    """Minimal lineage payload for transcript-backed downstream review."""

    transcript_hash: str
    segment_id: Optional[str] = None
    stage_name: Optional[str] = None
    source_quote: Optional[str] = None


@dataclass(frozen=True)
class MeetingMetadata:
    """Meeting context carried at the boundary without claiming Meridian entity mapping."""

    org_id: str
    meeting_id: str
    capture_source: Optional[str] = None
    title: Optional[str] = None


@dataclass(frozen=True)
class CaptureArtifact:
    """Generic capture artifact contract for later boundary translation."""

    artifact_kind: ArtifactKind
    summary: str
    source_quote: str
    lineage: LineageRef
    artifact_id: Optional[str] = None
    responsible_party: Optional[str] = None
    status: Optional[str] = None
    blocking_scope: Optional[str] = None
    severity: Optional[str] = None
    confidence: ConfidenceTriplet = field(default_factory=ConfidenceTriplet)


@dataclass(frozen=True)
class GovernanceHandoffPayload:
    """Boundary payload seam for later JS/runtime integration work."""

    meeting: MeetingMetadata
    transcript_hash: str
    capture_artifacts: List[CaptureArtifact] = field(default_factory=list)
    deferred_stages: List[str] = field(default_factory=list)
    notes: List[str] = field(default_factory=list)
