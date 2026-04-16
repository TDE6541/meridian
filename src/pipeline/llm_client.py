from __future__ import annotations

import importlib
import os
from dataclasses import dataclass
from typing import Mapping, Optional

OPENAI_API_KEY_ENV = "OPENAI_API_KEY"
MERIDIAN_PIPELINE_MODEL_ENV = "MERIDIAN_PIPELINE_MODEL"


class MissingOpenAIConfigurationError(RuntimeError):
    """Raised when later blocks require OpenAI config that is not present."""


class OpenAIDependencyError(RuntimeError):
    """Raised when the runtime dependency is absent at client construction time."""


@dataclass(frozen=True)
class OpenAIConfigStatus:
    """Lightweight inspection result for env-driven config posture."""

    api_key_present: bool
    model_present: bool
    model: Optional[str] = None

    @property
    def is_configured(self) -> bool:
        return self.api_key_present and self.model_present


@dataclass(frozen=True)
class OpenAIConfig:
    """Resolved OpenAI configuration for later pipeline blocks."""

    api_key: str
    model: str


def _env_source(env: Optional[Mapping[str, str]]) -> Mapping[str, str]:
    return os.environ if env is None else env


def inspect_openai_env(env: Optional[Mapping[str, str]] = None) -> OpenAIConfigStatus:
    """Inspect whether the approved env vars are present without requiring them."""

    source = _env_source(env)
    api_key = source.get(OPENAI_API_KEY_ENV, "").strip()
    model = source.get(MERIDIAN_PIPELINE_MODEL_ENV, "").strip()
    return OpenAIConfigStatus(
        api_key_present=bool(api_key),
        model_present=bool(model),
        model=model or None,
    )


def resolve_openai_config(
    required: bool = True, env: Optional[Mapping[str, str]] = None
) -> Optional[OpenAIConfig]:
    """
    Resolve the approved OpenAI config surface.

    When `required` is false, missing values yield `None` so Block A can expose
    honest scaffold state without pretending extraction is runnable.
    """

    source = _env_source(env)
    api_key = source.get(OPENAI_API_KEY_ENV, "").strip()
    model = source.get(MERIDIAN_PIPELINE_MODEL_ENV, "").strip()

    if api_key and model:
        return OpenAIConfig(api_key=api_key, model=model)

    if not required:
        return None

    missing = []
    if not api_key:
        missing.append(OPENAI_API_KEY_ENV)
    if not model:
        missing.append(MERIDIAN_PIPELINE_MODEL_ENV)

    raise MissingOpenAIConfigurationError(
        "Meridian pipeline OpenAI configuration is incomplete; missing: "
        + ", ".join(missing)
    )


def create_openai_client(
    config: Optional[OpenAIConfig] = None, env: Optional[Mapping[str, str]] = None
):
    """
    Build the SDK client lazily so importing this module never requires network
    access or a preinstalled dependency.
    """

    resolved = config if config is not None else resolve_openai_config(required=True, env=env)

    try:
        openai_module = importlib.import_module("openai")
    except ModuleNotFoundError as exc:
        raise OpenAIDependencyError(
            "The 'openai' package is required to create the Meridian pipeline client."
        ) from exc

    return openai_module.OpenAI(api_key=resolved.api_key)
