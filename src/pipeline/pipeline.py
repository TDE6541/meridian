from __future__ import annotations

from dataclasses import dataclass
from typing import Tuple

from .llm_client import OpenAIConfigStatus, inspect_openai_env
from .models import MeetingMetadata
from .transcript_cache import normalize_transcript, transcript_hash

PIPELINE_PHASE_ORDER = (
    "normalize_transcript",
    "hash_transcript",
    "resolve_openai_config",
    "segment_transcript",
    "extract_capture_artifacts",
    "translate_boundary_handoff",
)

DEFERRED_PHASES = PIPELINE_PHASE_ORDER[3:]


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
        name="segment_transcript",
        shipped_in_block_a=False,
        description="Deferred to later blocks.",
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
    """Structural Block A pipeline scaffold with explicit deferred execution stages."""

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

    def run(self, meeting: MeetingMetadata, transcript_text: str) -> PreparedPipelineContext:
        """
        Prepare deterministic transcript state, then stop before later-wave logic.

        Block A ships the scaffold only and must not claim end-to-end capture behavior.
        """

        prepared = self.prepare(meeting=meeting, transcript_text=transcript_text)
        raise DeferredPipelineStageError(
            "Wave 4B Block A ships only the pipeline substrate; "
            "segment_transcript, extract_capture_artifacts, and "
            "translate_boundary_handoff remain deferred to later blocks."
        )

