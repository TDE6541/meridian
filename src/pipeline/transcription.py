from __future__ import annotations

import importlib
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Mapping, Optional, Tuple

from .llm_client import OPENAI_API_KEY_ENV, MissingOpenAIConfigurationError, OpenAIDependencyError

MERIDIAN_TRANSCRIPTION_MODEL_ENV = "MERIDIAN_TRANSCRIPTION_MODEL"


class MissingTranscriptionConfigurationError(MissingOpenAIConfigurationError):
    """Raised when transcription is invoked without the required OpenAI config."""


class InvalidTranscriptionConfigurationError(RuntimeError):
    """Raised when the configured transcription model is not a transcription model."""


class TranscriptionInvocationError(RuntimeError):
    """Raised when the OpenAI transcription request fails."""


@dataclass(frozen=True)
class TranscriptionConfigStatus:
    """Inspection result for the env-driven transcription config surface."""

    api_key_present: bool
    model_present: bool
    model_valid: bool
    model: Optional[str] = None

    @property
    def is_configured(self) -> bool:
        return self.api_key_present and self.model_present and self.model_valid


@dataclass(frozen=True)
class TranscriptionConfig:
    """Resolved OpenAI transcription configuration."""

    api_key: str
    model: str


@dataclass(frozen=True)
class TranscriptChunk:
    """Structured transcript unit emitted by the OpenAI transcription wrapper."""

    text: str
    timestamp_start: Optional[str] = None
    timestamp_end: Optional[str] = None
    speaker: Optional[str] = None


@dataclass(frozen=True)
class TranscriptionResult:
    """Bounded audio-transcription result for later transcript-first processing."""

    text: str
    model: str
    chunks: Tuple[TranscriptChunk, ...] = ()


def _env_source(env: Optional[Mapping[str, str]]) -> Mapping[str, str]:
    return os.environ if env is None else env


def _is_valid_transcription_model(model: str) -> bool:
    normalized = model.strip()
    return normalized == "whisper-1" or "transcribe" in normalized


def inspect_transcription_env(
    env: Optional[Mapping[str, str]] = None,
) -> TranscriptionConfigStatus:
    """Inspect whether the bounded transcription env vars are present and plausible."""

    source = _env_source(env)
    api_key = source.get(OPENAI_API_KEY_ENV, "").strip()
    model = source.get(MERIDIAN_TRANSCRIPTION_MODEL_ENV, "").strip()
    return TranscriptionConfigStatus(
        api_key_present=bool(api_key),
        model_present=bool(model),
        model_valid=_is_valid_transcription_model(model) if model else False,
        model=model or None,
    )


def resolve_transcription_config(
    required: bool = True, env: Optional[Mapping[str, str]] = None
) -> Optional[TranscriptionConfig]:
    """
    Resolve the transcription-specific OpenAI config surface.

    Meridian keeps transcript extraction and audio transcription model selection
    separate so Block B does not silently reuse a chat model for audio intake.
    """

    source = _env_source(env)
    api_key = source.get(OPENAI_API_KEY_ENV, "").strip()
    model = source.get(MERIDIAN_TRANSCRIPTION_MODEL_ENV, "").strip()

    if api_key and model and _is_valid_transcription_model(model):
        return TranscriptionConfig(api_key=api_key, model=model)

    if not required:
        return None

    missing = []
    if not api_key:
        missing.append(OPENAI_API_KEY_ENV)
    if not model:
        missing.append(MERIDIAN_TRANSCRIPTION_MODEL_ENV)

    if missing:
        raise MissingTranscriptionConfigurationError(
            "Meridian transcription configuration is incomplete; missing: "
            + ", ".join(missing)
        )

    raise InvalidTranscriptionConfigurationError(
        "Meridian transcription requires an OpenAI transcription model in "
        f"{MERIDIAN_TRANSCRIPTION_MODEL_ENV}; received {model!r}."
    )


def create_transcription_client(
    config: Optional[TranscriptionConfig] = None, env: Optional[Mapping[str, str]] = None
):
    """Build the OpenAI SDK client lazily for transcription only."""

    resolved = (
        config if config is not None else resolve_transcription_config(required=True, env=env)
    )

    try:
        openai_module = importlib.import_module("openai")
    except ModuleNotFoundError as exc:
        raise OpenAIDependencyError(
            "The 'openai' package is required to create the Meridian transcription client."
        ) from exc

    return openai_module.OpenAI(api_key=resolved.api_key)


def _format_timestamp(value) -> Optional[str]:
    if value is None:
        return None

    if isinstance(value, (int, float)):
        total_seconds = int(float(value))
        hours = total_seconds // 3600
        minutes = (total_seconds % 3600) // 60
        seconds = total_seconds % 60
        return f"{hours:02d}:{minutes:02d}:{seconds:02d}"

    text = str(value).strip()
    if not text:
        return None

    if text.replace(".", "", 1).isdigit():
        return _format_timestamp(float(text))

    parts = text.split(":")
    if len(parts) == 2 and all(part.isdigit() for part in parts):
        minutes, seconds = (int(part) for part in parts)
        return f"00:{minutes:02d}:{seconds:02d}"

    if len(parts) == 3 and all(part.isdigit() for part in parts):
        hours, minutes, seconds = (int(part) for part in parts)
        return f"{hours:02d}:{minutes:02d}:{seconds:02d}"

    return None


def _extract_attr(value, *names):
    if isinstance(value, Mapping):
        for name in names:
            if name in value:
                return value[name]
        return None

    for name in names:
        if hasattr(value, name):
            return getattr(value, name)
    return None


def _extract_chunks(response) -> Tuple[TranscriptChunk, ...]:
    raw_segments = _extract_attr(response, "segments") or ()
    chunks = []
    for item in raw_segments:
        text = str(_extract_attr(item, "text") or "").strip()
        if not text:
            continue
        chunks.append(
            TranscriptChunk(
                text=text,
                timestamp_start=_format_timestamp(
                    _extract_attr(item, "start", "timestamp_start")
                ),
                timestamp_end=_format_timestamp(_extract_attr(item, "end", "timestamp_end")),
                speaker=(
                    str(_extract_attr(item, "speaker") or "").strip() or None
                ),
            )
        )
    return tuple(chunks)


def _extract_text(response, chunks: Tuple[TranscriptChunk, ...]) -> str:
    if isinstance(response, str):
        return response.strip()

    text = str(_extract_attr(response, "text") or "").strip()
    if text:
        return text

    return "\n".join(chunk.text for chunk in chunks).strip()


def transcribe_audio_file(
    audio_path,
    *,
    client=None,
    env: Optional[Mapping[str, str]] = None,
    language: Optional[str] = None,
    prompt: Optional[str] = None,
) -> TranscriptionResult:
    """Transcribe a local audio file through the OpenAI audio API only."""

    path = Path(audio_path)
    if not path.exists():
        raise FileNotFoundError(f"Audio file not found: {path}")

    config = resolve_transcription_config(required=True, env=env)
    resolved_client = client if client is not None else create_transcription_client(config=config)

    request_kwargs = {
        "model": config.model,
        "response_format": "verbose_json",
        "timestamp_granularities": ["segment"],
    }
    if language:
        request_kwargs["language"] = language
    if prompt:
        request_kwargs["prompt"] = prompt

    try:
        with path.open("rb") as audio_handle:
            response = resolved_client.audio.transcriptions.create(
                file=audio_handle,
                **request_kwargs,
            )
    except Exception as exc:
        raise TranscriptionInvocationError(
            f"OpenAI transcription failed for {path.name}: {exc}"
        ) from exc

    chunks = _extract_chunks(response)
    return TranscriptionResult(
        text=_extract_text(response, chunks),
        model=config.model,
        chunks=chunks,
    )
