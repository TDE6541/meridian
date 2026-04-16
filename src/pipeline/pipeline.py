from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Optional, Sequence, Tuple

from .extraction import ENSEMBLE_RUN_PATTERN, run_ensemble_extraction
from .fallback import scan_segments_for_fallback
from .llm_client import (
    MissingOpenAIConfigurationError,
    OpenAIConfigStatus,
    OpenAIDependencyError,
    OpenAIInvocationError,
    OpenAIResponseFormatError,
    inspect_openai_env,
)
from .merge import merge_directives, merge_holds
from .models import Directive, Hold, MeetingMetadata, Segment
from .segmentation import segment_transcript_text
from .transcript_cache import normalize_transcript, transcript_hash
from .translation import translate_internal_capture_to_handoff

PIPELINE_PHASE_ORDER = (
    "normalize_transcript",
    "hash_transcript",
    "resolve_openai_config",
    "transcribe_audio",
    "segment_transcript",
    "extract_capture_artifacts",
    "merge_capture_artifacts",
    "fallback_cue_scan",
    "translate_boundary_handoff",
)

DEFERRED_PHASES: Tuple[str, ...] = ()


class DeferredPipelineStageError(NotImplementedError):
    """Raised when code reaches a later-wave stage that Block C does not ship."""


@dataclass(frozen=True)
class PipelineStage:
    """Declarative stage metadata for the current shipped pipeline subset."""

    name: str
    shipped: bool
    description: str

    @property
    def shipped_in_block_a(self) -> bool:
        """
        Backward-compatible alias preserved for existing tests and callers.

        The attribute name is historical; in Block C it means "currently shipped."
        """

        return self.shipped


@dataclass(frozen=True)
class PreparedPipelineContext:
    """Prepared transcript and config posture available in the current block."""

    meeting: MeetingMetadata
    raw_transcript: str
    normalized_transcript: str
    transcript_sha256: str
    llm_config_status: OpenAIConfigStatus


@dataclass(frozen=True)
class SegmentedPipelineContext(PreparedPipelineContext):
    """Prepared transcript state plus shipped Block B segmentation output."""

    segments: Tuple[Segment, ...]


@dataclass(frozen=True)
class CapturedPipelineContext(SegmentedPipelineContext):
    """Segmented transcript state plus Block C capture artifacts."""

    directives: Tuple[Directive, ...] = ()
    holds: Tuple[Hold, ...] = ()
    extraction_run_pattern: Tuple[str, ...] = ENSEMBLE_RUN_PATTERN
    fallback_used: bool = False
    notes: Tuple[str, ...] = ()


@dataclass(frozen=True)
class PipelineHandoffContext:
    """Captured pipeline state plus the Block D local/frozen seam outputs."""

    captured: CapturedPipelineContext
    capture_artifact: dict[str, Any]
    governance_handoff: dict[str, Any]


PIPELINE_STAGES: Tuple[PipelineStage, ...] = (
    PipelineStage(
        name="normalize_transcript",
        shipped=True,
        description="Normalize transcript text for deterministic caching only.",
    ),
    PipelineStage(
        name="hash_transcript",
        shipped=True,
        description="Compute a stable transcript digest for later cache and lineage use.",
    ),
    PipelineStage(
        name="resolve_openai_config",
        shipped=True,
        description="Inspect env-driven OpenAI config posture without implying extraction is runnable.",
    ),
    PipelineStage(
        name="transcribe_audio",
        shipped=True,
        description="Optional OpenAI-only audio transcription lives in src/pipeline/transcription.py.",
    ),
    PipelineStage(
        name="segment_transcript",
        shipped=True,
        description="Segment normalized transcript text into bounded civic meeting blocks.",
    ),
    PipelineStage(
        name="extract_capture_artifacts",
        shipped=True,
        description="Run civic extraction across three ensemble passes using two bounded role archetypes.",
    ),
    PipelineStage(
        name="merge_capture_artifacts",
        shipped=True,
        description="Merge ensemble directives and holds while preserving agreement and confidence backbone fields.",
    ),
    PipelineStage(
        name="fallback_cue_scan",
        shipped=True,
        description="Apply a bounded civic cue scan only when LLM extraction fails.",
    ),
    PipelineStage(
        name="translate_boundary_handoff",
        shipped=True,
        description=(
            "Build a durable capture artifact and a reduced local/frozen governance "
            "handoff without transport, subject, or runtime-source widening."
        ),
    ),
)


class MeridianPipeline:
    """Structural pipeline scaffold with shipped Block D seam behavior."""

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

    def capture_text(
        self,
        meeting: MeetingMetadata,
        transcript_text: str,
        *,
        client=None,
        env=None,
    ) -> CapturedPipelineContext:
        """
        Prepare, segment, and capture civic directives/holds without boundary translation.

        If OpenAI extraction is unavailable, Block C degrades through a narrow cue scan
        instead of pretending full extraction succeeded.
        """

        segmented = self.segment_text(meeting=meeting, transcript_text=transcript_text)

        try:
            run_results = run_ensemble_extraction(
                segmented.segments,
                client=client,
                env=env,
                run_pattern=ENSEMBLE_RUN_PATTERN,
            )
            directives = tuple(merge_directives([run.directives for run in run_results]))
            holds = tuple(merge_holds([run.holds for run in run_results]))
            fallback_used = False
            notes: Tuple[str, ...] = ()
        except (
            MissingOpenAIConfigurationError,
            OpenAIDependencyError,
            OpenAIInvocationError,
            OpenAIResponseFormatError,
        ) as exc:
            fallback_directives, fallback_holds = scan_segments_for_fallback(segmented.segments)
            directives = tuple(fallback_directives)
            holds = tuple(fallback_holds)
            fallback_used = True
            notes = (f"bounded fallback cue scan used after extraction failure: {exc}",)

        return CapturedPipelineContext(
            meeting=segmented.meeting,
            raw_transcript=segmented.raw_transcript,
            normalized_transcript=segmented.normalized_transcript,
            transcript_sha256=segmented.transcript_sha256,
            llm_config_status=segmented.llm_config_status,
            segments=segmented.segments,
            directives=directives,
            holds=holds,
            extraction_run_pattern=ENSEMBLE_RUN_PATTERN,
            fallback_used=fallback_used,
            notes=notes,
        )

    def translate_capture(
        self,
        captured_context: CapturedPipelineContext,
        *,
        selected_item_ids: Optional[Sequence[str]] = None,
        notes: Optional[Sequence[str]] = None,
    ) -> PipelineHandoffContext:
        """Build the Block D seam outputs from an existing capture context."""

        translation = translate_internal_capture_to_handoff(
            captured_context,
            selected_item_ids=selected_item_ids,
            notes=notes,
        )
        return PipelineHandoffContext(
            captured=captured_context,
            capture_artifact=translation["capture_artifact"],
            governance_handoff=translation["governance_handoff"],
        )

    def capture_to_handoff(
        self,
        meeting: MeetingMetadata,
        transcript_text: str,
        *,
        client=None,
        env=None,
        selected_item_ids: Optional[Sequence[str]] = None,
        notes: Optional[Sequence[str]] = None,
    ) -> PipelineHandoffContext:
        """Capture transcript items and build the local/frozen handoff seam."""

        captured = self.capture_text(
            meeting=meeting,
            transcript_text=transcript_text,
            client=client,
            env=env,
        )
        return self.translate_capture(
            captured,
            selected_item_ids=selected_item_ids,
            notes=notes,
        )

    def run(
        self,
        meeting: MeetingMetadata,
        transcript_text: str,
        *,
        client=None,
        env=None,
        selected_item_ids: Optional[Sequence[str]] = None,
        notes: Optional[Sequence[str]] = None,
    ) -> PipelineHandoffContext:
        """
        Prepare, capture, and translate into the Block D seam outputs.

        This top-level surface stops at the local/frozen governance handoff. It does
        not claim runtime evaluation, transport publication, or grounded subject truth.
        """

        return self.capture_to_handoff(
            meeting=meeting,
            transcript_text=transcript_text,
            client=client,
            env=env,
            selected_item_ids=selected_item_ids,
            notes=notes,
        )
