import json
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.pipeline.extraction import (
    ENSEMBLE_RUN_PATTERN,
    build_extraction_system_prompt,
    build_extraction_user_prompt,
    extract_segments_with_archetype,
    prompt_contains_construction_residue,
    run_ensemble_extraction,
)
from src.pipeline.llm_client import MERIDIAN_PIPELINE_MODEL_ENV, OPENAI_API_KEY_ENV
from src.pipeline.segmentation import segment_transcript_file

FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures"


class _FakeCompletions:
    def __init__(self, payloads):
        self._payloads = list(payloads)

    def create(self, **kwargs):
        payload = self._payloads.pop(0)
        return SimpleNamespace(
            choices=[
                SimpleNamespace(
                    message=SimpleNamespace(content=json.dumps(payload))
                )
            ]
        )


class _FakeClient:
    def __init__(self, payloads):
        self.chat = SimpleNamespace(completions=_FakeCompletions(payloads))


class ExtractionTests(unittest.TestCase):
    def test_prompts_are_civic_and_free_of_construction_residue(self):
        segments = segment_transcript_file(FIXTURES_DIR / "decision_rich_capture.txt")
        system_prompt = build_extraction_system_prompt("heavy-decision")
        user_prompt = build_extraction_user_prompt(segments[0])

        self.assertIn("civic meeting", system_prompt.lower())
        self.assertFalse(prompt_contains_construction_residue(system_prompt, user_prompt))

    def test_decision_rich_fixture_extracts_directives_without_network(self):
        segments = segment_transcript_file(FIXTURES_DIR / "decision_rich_capture.txt")
        expected = json.loads(
            (FIXTURES_DIR / "decision_rich_expected.json").read_text(encoding="utf-8")
        )
        payload = {
            "directives": [
                {
                    "segment_id": segments[0].segment_id,
                    "timestamp_start": segments[0].timestamp_start,
                    "timestamp_end": segments[0].timestamp_end,
                    "directive_summary": expected["directives"][0]["directive_summary"],
                    "responsible_party": expected["directives"][0]["responsible_party"],
                    "status": expected["directives"][0]["status"],
                    "confidence": 0.8,
                    "source_quote": "Councilmember Reed moved to adopt Ordinance 2026-14. The motion passed six to one.",
                },
                {
                    "segment_id": segments[0].segment_id,
                    "timestamp_start": segments[0].timestamp_start,
                    "timestamp_end": segments[0].timestamp_end,
                    "directive_summary": expected["directives"][1]["directive_summary"],
                    "responsible_party": expected["directives"][1]["responsible_party"],
                    "status": expected["directives"][1]["status"],
                    "confidence": 0.7,
                    "source_quote": "The mayor directed Public Works to post detour notices before the lane closure.",
                },
            ],
            "holds": [],
        }
        client = _FakeClient([payload])

        result = extract_segments_with_archetype(
            segments,
            archetype="heavy-decision",
            client=client,
            env={
                OPENAI_API_KEY_ENV: "sk-test",
                MERIDIAN_PIPELINE_MODEL_ENV: "gpt-5.4-mini",
            },
        )

        self.assertEqual(result.archetype, "heavy-decision")
        self.assertEqual(
            [directive.directive_summary for directive in result.directives],
            [item["directive_summary"] for item in expected["directives"]],
        )
        self.assertEqual(result.directives[0].model_confidence, 0.8)
        self.assertEqual(result.directives[1].responsible_party, "Public Works")
        self.assertEqual(len(result.holds), 0)

    def test_ambiguity_fixture_preserves_three_run_two_archetype_ensemble(self):
        segments = segment_transcript_file(FIXTURES_DIR / "ambiguity_heavy_capture.txt")
        expected = json.loads(
            (FIXTURES_DIR / "ambiguity_heavy_expected.json").read_text(encoding="utf-8")
        )
        client = _FakeClient(
            [
                {
                    "directives": [],
                    "holds": [
                        {
                            "segment_id": segments[0].segment_id,
                            "timestamp_start": segments[0].timestamp_start,
                            "timestamp_end": segments[0].timestamp_end,
                            "hold_summary": expected["holds"][0]["hold_summary"],
                            "owner_to_clarify": expected["holds"][0]["owner_to_clarify"],
                            "hold_type": expected["holds"][0]["hold_type"],
                            "blocking_scope": "Resolution 2026-22",
                            "severity": "high",
                            "confidence": 0.7,
                            "source_quote": "The city attorney needed to review the revised language.",
                        }
                    ],
                },
                {
                    "directives": [],
                    "holds": [
                        {
                            "segment_id": segments[0].segment_id,
                            "timestamp_start": segments[0].timestamp_start,
                            "timestamp_end": segments[0].timestamp_end,
                            "hold_summary": expected["holds"][0]["hold_summary"],
                            "owner_to_clarify": expected["holds"][0]["owner_to_clarify"],
                            "hold_type": expected["holds"][0]["hold_type"],
                            "blocking_scope": "Resolution 2026-22",
                            "severity": "high",
                            "confidence": 0.8,
                            "source_quote": "Staff returns with a corrected draft and compliance timeline.",
                        }
                    ],
                },
                {
                    "directives": [],
                    "holds": [
                        {
                            "segment_id": segments[0].segment_id,
                            "timestamp_start": segments[0].timestamp_start,
                            "timestamp_end": segments[0].timestamp_end,
                            "hold_summary": expected["holds"][0]["hold_summary"],
                            "owner_to_clarify": expected["holds"][0]["owner_to_clarify"],
                            "hold_type": expected["holds"][0]["hold_type"],
                            "blocking_scope": "Resolution 2026-22",
                            "severity": "high",
                            "confidence": 0.7,
                            "source_quote": "The fiscal note was still incomplete.",
                        }
                    ],
                },
            ]
        )

        results = run_ensemble_extraction(
            segments,
            client=client,
            env={
                OPENAI_API_KEY_ENV: "sk-test",
                MERIDIAN_PIPELINE_MODEL_ENV: "gpt-5.4-mini",
            },
        )

        self.assertEqual(
            ENSEMBLE_RUN_PATTERN,
            ("heavy-decision", "heavy-risk", "heavy-decision"),
        )
        self.assertEqual(tuple(result.archetype for result in results), ENSEMBLE_RUN_PATTERN)
        self.assertEqual(len(set(ENSEMBLE_RUN_PATTERN)), 2)
        self.assertEqual(
            results[1].holds[0].hold_summary, expected["holds"][0]["hold_summary"]
        )
        self.assertTrue(all(len(result.directives) == 0 for result in results))


if __name__ == "__main__":
    unittest.main()
