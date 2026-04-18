import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from tests.pipeline.calibration.report import build_baseline_report
from tests.pipeline.calibration.runner import (
    FALLBACK_BASELINE_PATH,
    PRIMARY_BASELINE_PATH,
    REPORT_BASELINE_PATH,
    load_recorded_bundle,
)


class CalibrationBaselineTests(unittest.TestCase):
    maxDiff = None

    def test_offline_replay_matches_committed_baseline_report(self):
        committed_report = json.loads(REPORT_BASELINE_PATH.read_text(encoding="utf-8"))
        rebuilt_report = build_baseline_report(
            primary_bundle=load_recorded_bundle(PRIMARY_BASELINE_PATH),
            fallback_bundle=load_recorded_bundle(FALLBACK_BASELINE_PATH),
        )

        self.assertEqual(rebuilt_report, committed_report)
        self.assertEqual(len(committed_report["primary_lane"]["by_meeting"]), 4)
        self.assertEqual(len(committed_report["forced_fallback_lane"]["by_meeting"]), 4)
        self.assertEqual(committed_report["primary_lane"]["dev_aggregate"]["meeting_count"], 3)
        self.assertEqual(committed_report["primary_lane"]["holdout"]["meeting_count"], 1)
        self.assertIn(
            "exact_match_score",
            committed_report["primary_lane"]["dev_aggregate"]["scores"],
        )
        self.assertIn(
            "relaxed_match_score",
            committed_report["primary_lane"]["dev_aggregate"]["scores"],
        )
        self.assertIn(
            "confidence_buckets",
            committed_report["primary_lane"]["dev_aggregate"],
        )
        self.assertIn(
            "fallback_metrics",
            committed_report["forced_fallback_lane"]["all_meetings"],
        )


if __name__ == "__main__":
    unittest.main()
