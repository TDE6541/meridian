import unittest
import sys
from pathlib import Path

THIS_DIR = Path(__file__).resolve().parent
if str(THIS_DIR) not in sys.path:
    sys.path.insert(0, str(THIS_DIR))

from fort_worth_proof_support import build_fort_worth_proof_bundle


class EndToEndProofTests(unittest.TestCase):
    maxDiff = None

    def test_frozen_fort_worth_agenda_path_runs_capture_translation_and_governance(self):
        bundle = build_fort_worth_proof_bundle()
        pipeline_result = bundle["pipeline_result"]
        proof_manifest = bundle["proof_manifest"]
        governance_request = bundle["governance_request"]
        governance_sweep = bundle["governance_sweep"]

        self.assertEqual(pipeline_result.capture_artifact["capture_counts"]["segment_count"], 7)
        self.assertEqual(
            pipeline_result.capture_artifact["capture_counts"]["directive_count"], 5
        )
        self.assertEqual(pipeline_result.capture_artifact["capture_counts"]["hold_count"], 2)
        self.assertEqual(pipeline_result.governance_handoff["selected_item_count"], 1)
        self.assertEqual(
            pipeline_result.governance_handoff["selected_items"][0]["capture_item_id"],
            "hold:S4:1",
        )
        self.assertEqual(
            pipeline_result.governance_handoff["selected_items"][0]["lineage"]["segment_id"],
            "S4",
        )
        self.assertEqual(
            proof_manifest["source_label"], "fort_worth_official_agenda_pair"
        )
        self.assertEqual(proof_manifest["governance_handoff_count"], 1)
        self.assertEqual(proof_manifest["extracted_decision_count"], 5)
        self.assertEqual(proof_manifest["unresolved_item_count"], 2)
        self.assertEqual(proof_manifest["proof_artifacts"][0]["role"], "official_agenda_pair")
        self.assertTrue(proof_manifest["proof_artifacts"][0]["primary_verbatim_source"])
        self.assertEqual(proof_manifest["proof_artifacts"][0]["source_purity"], "single_source_verbatim")
        self.assertEqual(proof_manifest["proof_artifacts"][1]["role"], "motion_video_pair")
        self.assertFalse(proof_manifest["proof_artifacts"][1]["primary_verbatim_source"])
        self.assertFalse(proof_manifest["proof_artifacts"][1]["is_verbatim"])
        self.assertEqual(
            governance_request["candidate_signal_patch"]["governance"]["capture_handoff"],
            pipeline_result.governance_handoff,
        )
        self.assertEqual(governance_sweep["scenarioCount"], 1)
        self.assertTrue(governance_sweep["governedNonEventProofPassed"])
        self.assertEqual(
            governance_sweep["scenarios"][0],
            {
                "scenarioId": "fort-worth-zoning-hold-proof",
                "decision": "HOLD",
                "reason": "missing_approvals=city_council;evidence_gap=1/2;missing_evidence_types=site_plan",
                "rationale": "Required approvals and evidence remain unresolved.",
                "promiseStatus": {
                    "conditions_total": 6,
                    "conditions_satisfied": 2,
                    "oldest_open_condition_at": None,
                },
                "confidenceTier": "HOLD",
                "omissionSummary": {
                    "activeOmissionPackIds": [
                        "action_without_authority",
                        "closure_without_evidence",
                    ],
                    "findingCount": 2,
                },
                "standingRiskSummary": {
                    "blockingItemCount": 0,
                    "blockingEntryIds": [],
                },
                "governedNonEventProofPassed": True,
            },
        )


if __name__ == "__main__":
    unittest.main()
