import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.pipeline.llm_client import (
    MERIDIAN_PIPELINE_MODEL_ENV,
    OPENAI_API_KEY_ENV,
    MissingOpenAIConfigurationError,
    inspect_openai_env,
    resolve_openai_config,
)


class LLMClientConfigTests(unittest.TestCase):
    def test_inspect_openai_env_reports_missing_values(self):
        with patch.dict(os.environ, {}, clear=True):
            status = inspect_openai_env()

        self.assertFalse(status.api_key_present)
        self.assertFalse(status.model_present)
        self.assertFalse(status.is_configured)
        self.assertIsNone(status.model)

    def test_optional_resolution_returns_none_when_env_is_incomplete(self):
        with patch.dict(os.environ, {}, clear=True):
            self.assertIsNone(resolve_openai_config(required=False))

    def test_required_resolution_fails_clearly_when_both_values_are_missing(self):
        with patch.dict(os.environ, {}, clear=True):
            with self.assertRaises(MissingOpenAIConfigurationError) as raised:
                resolve_openai_config()

        message = str(raised.exception)
        self.assertIn(OPENAI_API_KEY_ENV, message)
        self.assertIn(MERIDIAN_PIPELINE_MODEL_ENV, message)

    def test_required_resolution_fails_when_model_is_missing(self):
        with patch.dict(os.environ, {OPENAI_API_KEY_ENV: "sk-test"}, clear=True):
            with self.assertRaises(MissingOpenAIConfigurationError) as raised:
                resolve_openai_config()

        self.assertIn(MERIDIAN_PIPELINE_MODEL_ENV, str(raised.exception))

    def test_required_resolution_returns_explicit_config_when_present(self):
        with patch.dict(
            os.environ,
            {
                OPENAI_API_KEY_ENV: "sk-test",
                MERIDIAN_PIPELINE_MODEL_ENV: "gpt-5.4-mini",
            },
            clear=True,
        ):
            config = resolve_openai_config()

        self.assertEqual(config.api_key, "sk-test")
        self.assertEqual(config.model, "gpt-5.4-mini")


if __name__ == "__main__":
    unittest.main()
