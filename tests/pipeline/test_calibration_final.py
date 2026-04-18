import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from tests.pipeline.calibration.report import build_final_report
from tests.pipeline.calibration.runner import (
    FINAL_FALLBACK_PATH,
    FINAL_PRIMARY_PATH,
    FINAL_REPORT_PATH,
    load_recorded_bundle,
)


class CalibrationFinalTests(unittest.TestCase):
    maxDiff = None

    def test_offline_replay_matches_committed_final_report(self):
        committed_report = json.loads(FINAL_REPORT_PATH.read_text(encoding="utf-8"))
        rebuilt_report = build_final_report(
            primary_bundle=load_recorded_bundle(FINAL_PRIMARY_PATH),
            fallback_bundle=load_recorded_bundle(FINAL_FALLBACK_PATH),
        )

        self.assertEqual(rebuilt_report, committed_report)
        self.assertEqual(committed_report["report_version"], "wave4.5-blockd-final-v1")
        self.assertEqual(committed_report["primary_lane"]["model"], "gpt-5.4")
        self.assertEqual(len(committed_report["primary_lane"]["by_meeting"]), 4)
        self.assertEqual(len(committed_report["forced_fallback_lane"]["by_meeting"]), 4)
        self.assertEqual(committed_report["primary_lane"]["dev_aggregate"]["meeting_count"], 3)
        self.assertEqual(committed_report["primary_lane"]["holdout"]["meeting_count"], 1)

        self.assertEqual(
            committed_report["primary_lane"]["all_meetings"]["counts"]["matched_items"],
            26,
        )
        self.assertEqual(
            committed_report["primary_lane"]["all_meetings"]["counts"]["runtime_items"],
            54,
        )
        self.assertEqual(
            committed_report["primary_lane"]["all_meetings"]["scores"]["micro_f1"],
            0.5591,
        )
        self.assertEqual(
            committed_report["primary_lane"]["holdout"]["scores"]["micro_f1"],
            0.5,
        )
        self.assertEqual(
            committed_report["forced_fallback_lane"]["all_meetings"]["fallback_metrics"][
                "misses"
            ],
            39,
        )


if __name__ == "__main__":
    unittest.main()
