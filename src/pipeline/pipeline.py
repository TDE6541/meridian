from __future__ import annotations

from dataclasses import dataclass
from typing import Tuple

from .llm_client import OpenAIConfigStatus, inspect_openai_env
from .models import MeetingMetadata, Segment
from .segmentation import segment_transcript_text
from .transcript_cache import normalize_transcript, transcript_hash

PIPELINE_PHASE_ORDER = (
    "normalize_transcript",
    "hash_transcript",
    "resolve_openai_config",
    "transcribe_audio",
    "segment_transcript",
    "extract_capture_artifacts",
    "translate_boundary_handoff",
)

DEFERRED_PHASES = PIPELINE_PHASE_ORDER[5:]


class DeferredPipelineStageError(NotImplementedError):
    """Raised when code reaches a later-wave stage that Block A does not ship."""


@dataclass(frozen=True)
class PipelineStage:
    """Declarative stage metadata for the Block A scaffold."""

    name: str
    shipped_in_block_a: bool
    description: str


@dataclass(frozen=True)
class PreparedPipelineContext:
    """Prepared transcript and config posture available in Block A."""

    meeting: MeetingMetadata
    raw_transcript: str
    normalized_transcript: str
    transcript_sha256: str
    llm_config_status: OpenAIConfigStatus


@dataclass(frozen=True)
class SegmentedPipelineContext(PreparedPipelineContext):
    """Prepared transcript state plus shipped Block B segmentation output."""

    segments: Tuple[Segment, ...]


PIPELINE_STAGES: Tuple[PipelineStage, ...] = (
    PipelineStage(
        name="normalize_transcript",
        shipped_in_block_a=True,
        description="Normalize transcript text for deterministic caching only.",
    ),
    PipelineStage(
        name="hash_transcript",
        shipped_in_block_a=True,
        description="Compute a stable transcript digest for later cache and lineage use.",
    ),
    PipelineStage(
        name="resolve_openai_config",
        shipped_in_block_a=True,
        description="Inspect env-driven OpenAI config posture without implying extraction is runnable.",
    ),
    PipelineStage(
        name="transcribe_audio",
        shipped_in_block_a=True,
        description="Optional OpenAI-only audio transcription lives in src/pipeline/transcription.py.",
    ),
    PipelineStage(
        name="segment_transcript",
        shipped_in_block_a=True,
        description="Segment normalized transcript text into bounded civic meeting blocks.",
    ),
    PipelineStage(
        name="extract_capture_artifacts",
        shipped_in_block_a=False,
        description="Deferred to later blocks.",
    ),
    PipelineStage(
        name="translate_boundary_handoff",
        shipped_in_block_a=False,
        description="Deferred to later blocks.",
    ),
)


class MeridianPipeline:
    """Structural pipeline scaffold with shipped Block B intake/segmentation only."""

    def describe_phases(self) -> Tuple[PipelineStage, ...]:
        return PIPELINE_STAGES

    def prepare(
        self, meeting: MeetingMetadata, transcript_text: str
    ) -> PreparedPipelineContext:
        normalized_transcript = normalize_transcript(transcript_text)
        return PreparedPipelineContext(
            meeting=meeting,
            raw_transcript=transcript_text,
            normalized_transcript=normalized_transcript,
            transcript_sha256=transcript_hash(normalized_transcript),
            llm_config_status=inspect_openai_env(),
        )

    def segment_text(
        self, meeting: MeetingMetadata, transcript_text: str
    ) -> SegmentedPipelineContext:
        """Prepare and segment transcript text without claiming later capture stages."""

        prepared = self.prepare(meeting=meeting, transcript_text=transcript_text)
        segments = tuple(segment_transcript_text(prepared.normalized_transcript))
        return SegmentedPipelineContext(
            meeting=prepared.meeting,
            raw_transcript=prepared.raw_transcript,
            normalized_transcript=prepared.normalized_transcript,
            transcript_sha256=prepared.transcript_sha256,
            llm_config_status=prepared.llm_config_status,
            segments=segments,
        )

    def run(self, meeting: MeetingMetadata, transcript_text: str) -> PreparedPipelineContext:
        """
        Prepare and segment transcript state, then stop before later-wave logic.

        Block B ships transcript intake and segmentation only and must not claim
        extraction or boundary handoff behavior.
        """

        self.segment_text(meeting=meeting, transcript_text=transcript_text)
        raise DeferredPipelineStageError(
            "Wave 4B Block B ships transcript segmentation only; "
            "extract_capture_artifacts and translate_boundary_handoff remain deferred "
            "to later blocks."
        )
