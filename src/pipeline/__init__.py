"""Wave 4B Block A pipeline substrate for Meridian."""

from .llm_client import OpenAIConfig, inspect_openai_env, resolve_openai_config
from .models import CaptureArtifact, Directive, GovernanceHandoffPayload, Hold, Segment
from .pipeline import MeridianPipeline
from .receipt import build_frozen_proof_manifest, build_run_level_capture_receipt
from .transcript_cache import normalize_transcript, transcript_hash

__all__ = [
    "CaptureArtifact",
    "Directive",
    "GovernanceHandoffPayload",
    "Hold",
    "MeridianPipeline",
    "OpenAIConfig",
    "Segment",
    "build_frozen_proof_manifest",
    "build_run_level_capture_receipt",
    "inspect_openai_env",
    "normalize_transcript",
    "resolve_openai_config",
    "transcript_hash",
]
