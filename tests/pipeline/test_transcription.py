import os
import sys
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock, patch

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.pipeline.llm_client import OPENAI_API_KEY_ENV
from src.pipeline.transcription import (
    MERIDIAN_TRANSCRIPTION_MODEL_ENV,
    InvalidTranscriptionConfigurationError,
    MissingTranscriptionConfigurationError,
    inspect_transcription_env,
    resolve_transcription_config,
    transcribe_audio_file,
)


class TranscriptionConfigTests(unittest.TestCase):
    def test_inspect_transcription_env_reports_missing_and_invalid_state(self):
        with patch.dict(os.environ, {}, clear=True):
            status = inspect_transcription_env()
        self.assertFalse(status.api_key_present)
        self.assertFalse(status.model_present)
        self.assertFalse(status.model_valid)
        self.assertFalse(status.is_configured)

        with patch.dict(
            os.environ,
            {
                OPENAI_API_KEY_ENV: "sk-test",
                MERIDIAN_TRANSCRIPTION_MODEL_ENV: "gpt-5.4-mini",
            },
            clear=True,
        ):
            invalid_status = inspect_transcription_env()

        self.assertTrue(invalid_status.api_key_present)
        self.assertTrue(invalid_status.model_present)
        self.assertFalse(invalid_status.model_valid)
        self.assertFalse(invalid_status.is_configured)

    def test_resolve_transcription_config_fails_when_api_key_missing(self):
        with patch.dict(
            os.environ,
            {MERIDIAN_TRANSCRIPTION_MODEL_ENV: "gpt-4o-transcribe"},
            clear=True,
        ):
            with self.assertRaises(MissingTranscriptionConfigurationError) as raised:
                resolve_transcription_config()

        self.assertIn(OPENAI_API_KEY_ENV, str(raised.exception))

    def test_resolve_transcription_config_fails_for_non_transcription_model(self):
        with patch.dict(
            os.environ,
            {
                OPENAI_API_KEY_ENV: "sk-test",
                MERIDIAN_TRANSCRIPTION_MODEL_ENV: "gpt-5.4-mini",
            },
            clear=True,
        ):
            with self.assertRaises(InvalidTranscriptionConfigurationError) as raised:
                resolve_transcription_config()

        self.assertIn(MERIDIAN_TRANSCRIPTION_MODEL_ENV, str(raised.exception))

    def test_transcribe_audio_file_uses_injected_client_without_network(self):
        response = {
            "text": "Call to order.\nAgenda item 2 follows.",
            "segments": [
                {"start": 0.0, "end": 2.4, "text": "Call to order."},
                {"start": 2.5, "end": 6.0, "text": "Agenda item 2 follows."},
            ],
        }

        transcriptions = Mock()
        transcriptions.create.return_value = response
        client = SimpleNamespace(audio=SimpleNamespace(transcriptions=transcriptions))

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as handle:
            handle.write(b"RIFFfakeWAVE")
            audio_path = Path(handle.name)

        self.addCleanup(lambda: audio_path.unlink(missing_ok=True))

        result = transcribe_audio_file(
            audio_path,
            client=client,
            env={
                OPENAI_API_KEY_ENV: "sk-test",
                MERIDIAN_TRANSCRIPTION_MODEL_ENV: "gpt-4o-transcribe",
            },
            language="en",
        )

        self.assertEqual(result.model, "gpt-4o-transcribe")
        self.assertEqual(result.text, "Call to order.\nAgenda item 2 follows.")
        self.assertEqual(len(result.chunks), 2)
        self.assertEqual(result.chunks[0].timestamp_start, "00:00:00")
        self.assertEqual(result.chunks[1].timestamp_end, "00:00:06")

        _, kwargs = transcriptions.create.call_args
        self.assertEqual(kwargs["model"], "gpt-4o-transcribe")
        self.assertEqual(kwargs["response_format"], "verbose_json")
        self.assertEqual(kwargs["timestamp_granularities"], ["segment"])
        self.assertEqual(kwargs["language"], "en")


if __name__ == "__main__":
    unittest.main()
