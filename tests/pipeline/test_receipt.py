import os
import unittest
import sys
from pathlib import Path
from unittest.mock import patch

THIS_DIR = Path(__file__).resolve().parent
if str(THIS_DIR) not in sys.path:
    sys.path.insert(0, str(THIS_DIR))

from fort_worth_proof_support import build_fort_worth_proof_bundle


class ReceiptTests(unittest.TestCase):
    maxDiff = None

    def test_run_level_receipt_truthfully_summarizes_fort_worth_proof_outputs(self):
        with patch.dict(
            os.environ,
            {
                "OPENAI_API_KEY": "sk-host",
                "MERIDIAN_PIPELINE_MODEL": "gpt-5.4",
            },
            clear=False,
        ):
            bundle = build_fort_worth_proof_bundle()
        receipt = bundle["receipt"]

        self.assertEqual(receipt["meeting_id"], "fort-worth-city-council-day-meeting-2025-09-30")
        self.assertEqual(receipt["source_label"], "fort_worth_official_agenda_pair")
        self.assertEqual(receipt["segment_count"], 7)
        self.assertEqual(receipt["extracted_decision_count"], 5)
        self.assertEqual(receipt["unresolved_item_count"], 2)
        self.assertFalse(receipt["fallback_used"])
        self.assertEqual(receipt["governance_handoff_count"], 1)
        self.assertEqual(
            receipt["agreement_confidence_summary"],
            {
                "agreement_ratio": {"min": 1.0, "max": 1.0, "average": 1.0},
                "model_confidence": {"min": 0.82, "max": 0.88, "average": 0.85},
                "final_confidence": {"min": 0.91, "max": 0.94, "average": 0.925},
            },
        )
        self.assertEqual(
            receipt["governance_outcome_summary"],
            {
                "scenario_count": 1,
                "governed_non_event_proof_passed": True,
                "decision_counts": {"HOLD": 1},
                "primary_decision": "HOLD",
                "primary_reason": "missing_approvals=city_council;evidence_gap=1/2;missing_evidence_types=site_plan",
                "primary_confidence_tier": "HOLD",
            },
        )
        self.assertEqual(
            receipt["proof_artifact_locations"],
            [
                "tests/pipeline/fixtures/fort_worth_proof/fort_worth_official_agenda_excerpt.txt",
                "tests/pipeline/fixtures/fort_worth_proof/fort_worth_motion_video_excerpt.txt",
                "tests/pipeline/fixtures/fort_worth_proof/fort_worth_official_agenda_provenance.json",
                "tests/pipeline/fixtures/fort_worth_proof/fort_worth_motion_video_provenance.json",
            ],
        )


if __name__ == "__main__":
    unittest.main()
