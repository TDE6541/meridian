import json
import os
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.pipeline.llm_client import MERIDIAN_PIPELINE_MODEL_ENV, OPENAI_API_KEY_ENV
from src.pipeline.models import MeetingMetadata
from src.pipeline.pipeline import MeridianPipeline

FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures"


class _FakeCompletions:
    def __init__(self, payloads):
        self._payloads = list(payloads)

    def create(self, **kwargs):
        payload = self._payloads.pop(0)
        return SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(content=json.dumps(payload)))]
        )


class _FakeClient:
    def __init__(self, payloads):
        self.chat = SimpleNamespace(completions=_FakeCompletions(payloads))


def _collect_dict_keys(value):
    keys = set()
    if isinstance(value, dict):
        keys.update(value.keys())
        for nested in value.values():
            keys.update(_collect_dict_keys(nested))
    elif isinstance(value, list):
        for nested in value:
            keys.update(_collect_dict_keys(nested))
    return keys


class TranslationTests(unittest.TestCase):
    maxDiff = None

    def _build_fixture_translation(self):
        transcript_text = (FIXTURES_DIR / "utility_refusal_capture.txt").read_text(
            encoding="utf-8"
        )
        expected = json.loads(
            (FIXTURES_DIR / "utility_refusal_translation_expected.json").read_text(
                encoding="utf-8"
            )
        )
        meeting = MeetingMetadata(
            org_id="fortworth-dev",
            meeting_id="permit-utility-2026-0847",
            capture_source="fixture",
            title="Utility Permit Review 2026-0847",
        )
        pipeline = MeridianPipeline()
        segments = pipeline.segment_text(meeting, transcript_text).segments
        hold_payload = {
            "directives": [],
            "holds": [
                {
                    "segment_id": segments[0].segment_id,
                    "timestamp_start": segments[0].timestamp_start,
                    "timestamp_end": segments[0].timestamp_end,
                    "hold_type": "approval",
                    "hold_summary": (
                        "Permit utility 2026-0847 remains blocked pending TPW ROW "
                        "and Development Services approvals plus the utility conflict "
                        "assessment."
                    ),
                    "owner_to_clarify": "Staff",
                    "blocking_scope": "permit utility 2026-0847",
                    "severity": "high",
                    "confidence": 0.86,
                    "source_quote": (
                        "TPW ROW and Development Services approvals are still missing, "
                        "and the utility conflict assessment is not complete."
                    ),
                }
            ],
        }
        client = _FakeClient([hold_payload, hold_payload, hold_payload])

        with patch.dict(
            os.environ,
            {
                OPENAI_API_KEY_ENV: "sk-host",
                MERIDIAN_PIPELINE_MODEL_ENV: "gpt-5.4",
            },
            clear=False,
        ):
            result = pipeline.run(
                meeting,
                transcript_text,
                client=client,
                env={
                    OPENAI_API_KEY_ENV: "sk-test",
                    MERIDIAN_PIPELINE_MODEL_ENV: "gpt-5.4-mini",
                },
                selected_item_ids=["hold:S1:1"],
                notes=["runtime-owned fields remain deferred to the existing JS lane"],
            )

        return expected, result

    def test_capture_artifact_preserves_meeting_lineage_items_confidence_quotes_and_flags(self):
        expected, result = self._build_fixture_translation()

        self.assertEqual(result.capture_artifact, expected["capture_artifact"])
        self.assertEqual(result.capture_artifact["capture_counts"]["hold_count"], 1)
        self.assertEqual(result.capture_artifact["segment_lineage"][0]["segment_id"], "S1")
        self.assertEqual(
            result.capture_artifact["extracted_items"][0]["confidence_backbone"][
                "agreement_ratio"
            ],
            1.0,
        )
        self.assertEqual(result.captured.llm_config_status.model, "gpt-5.4-mini")

    def test_bounded_handoff_payload_stays_reduced_and_preserves_boundary_ambiguity(self):
        expected, result = self._build_fixture_translation()
        handoff_keys = _collect_dict_keys(result.governance_handoff)

        self.assertEqual(result.governance_handoff, expected["governance_handoff"])
        self.assertNotIn("entity_ref", handoff_keys)
        self.assertNotIn("raw_subject", handoff_keys)
        self.assertNotIn("authority_context", handoff_keys)
        self.assertNotIn("evidence_context", handoff_keys)
        self.assertEqual(
            result.governance_handoff["selected_items"][0]["boundary_flags"][
                "entity_mapping_status"
            ],
            "deferred",
        )
        self.assertEqual(
            result.governance_handoff["runtime_boundary"]["proof_mode"],
            "local_frozen_only",
        )

    def test_pipeline_run_exposes_capture_and_handoff_generation_without_runtime_widening(self):
        expected, result = self._build_fixture_translation()
        phases = {stage.name: stage for stage in MeridianPipeline().describe_phases()}

        self.assertTrue(phases["translate_boundary_handoff"].shipped_in_block_a)
        self.assertEqual(result.capture_artifact["artifact_id"], expected["capture_artifact"]["artifact_id"])
        self.assertEqual(result.governance_handoff["selected_item_count"], 1)
        self.assertEqual(len(result.captured.holds), 1)
        self.assertEqual(len(result.captured.directives), 0)
        self.assertEqual(result.captured.fallback_used, False)

    def test_pipeline_run_uses_host_env_when_caller_env_is_omitted(self):
        transcript_text = (FIXTURES_DIR / "utility_refusal_capture.txt").read_text(
            encoding="utf-8"
        )
        meeting = MeetingMetadata(
            org_id="fortworth-dev",
            meeting_id="permit-utility-2026-0847",
            capture_source="fixture",
            title="Utility Permit Review 2026-0847",
        )
        pipeline = MeridianPipeline()
        segments = pipeline.segment_text(meeting, transcript_text).segments
        hold_payload = {
            "directives": [],
            "holds": [
                {
                    "segment_id": segments[0].segment_id,
                    "timestamp_start": segments[0].timestamp_start,
                    "timestamp_end": segments[0].timestamp_end,
                    "hold_type": "approval",
                    "hold_summary": (
                        "Permit utility 2026-0847 remains blocked pending TPW ROW "
                        "and Development Services approvals plus the utility conflict "
                        "assessment."
                    ),
                    "owner_to_clarify": "Staff",
                    "blocking_scope": "permit utility 2026-0847",
                    "severity": "high",
                    "confidence": 0.86,
                    "source_quote": (
                        "TPW ROW and Development Services approvals are still missing, "
                        "and the utility conflict assessment is not complete."
                    ),
                }
            ],
        }
        client = _FakeClient([hold_payload, hold_payload, hold_payload])

        with patch.dict(
            os.environ,
            {
                OPENAI_API_KEY_ENV: "sk-host",
                MERIDIAN_PIPELINE_MODEL_ENV: "gpt-5.4",
            },
            clear=False,
        ):
            result = pipeline.run(
                meeting,
                transcript_text,
                client=client,
                selected_item_ids=["hold:S1:1"],
                notes=["runtime-owned fields remain deferred to the existing JS lane"],
            )

        self.assertEqual(result.captured.llm_config_status.model, "gpt-5.4")
        self.assertEqual(
            result.capture_artifact["extracted_items"][0]["confidence_backbone"]["final_confidence"],
            0.79,
        )


if __name__ == "__main__":
    unittest.main()
