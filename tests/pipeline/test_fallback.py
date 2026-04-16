import sys
import unittest
from pathlib import Path
from types import SimpleNamespace

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.pipeline.llm_client import MERIDIAN_PIPELINE_MODEL_ENV, OPENAI_API_KEY_ENV
from src.pipeline.models import MeetingMetadata
from src.pipeline.pipeline import MeridianPipeline
from src.pipeline.segmentation import segment_transcript_file

FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures"


class _FailingCompletions:
    def create(self, **_kwargs):
        raise RuntimeError("forced llm failure for fallback test")


class _FailingClient:
    def __init__(self):
        self.chat = SimpleNamespace(completions=_FailingCompletions())


class FallbackTests(unittest.TestCase):
    def test_forced_llm_failure_uses_bounded_non_empty_fallback(self):
        transcript_text = (FIXTURES_DIR / "fallback_capture.txt").read_text(encoding="utf-8")
        meeting = MeetingMetadata(org_id="fortworth-dev", meeting_id="meeting-002")

        context = MeridianPipeline().capture_text(
            meeting=meeting,
            transcript_text=transcript_text,
            client=_FailingClient(),
            env={
                OPENAI_API_KEY_ENV: "sk-test",
                MERIDIAN_PIPELINE_MODEL_ENV: "gpt-5.4-mini",
            },
        )

        self.assertTrue(context.fallback_used)
        self.assertGreaterEqual(len(context.directives) + len(context.holds), 2)
        self.assertTrue(
            any("Resolution 2026-22" in item.directive_summary for item in context.directives)
        )
        self.assertTrue(
            any("Resolution 2026-22" in item.hold_summary for item in context.holds)
        )
        self.assertTrue(
            all((item.final_confidence or item.confidence) <= 0.55 for item in context.directives)
        )
        self.assertTrue(
            all((item.final_confidence or item.confidence) <= 0.45 for item in context.holds)
        )

    def test_fallback_fixture_segments_before_capture(self):
        segments = segment_transcript_file(FIXTURES_DIR / "fallback_capture.txt")

        self.assertEqual(len(segments), 1)
        self.assertIn("hearing", segments[0].text.lower())


if __name__ == "__main__":
    unittest.main()
