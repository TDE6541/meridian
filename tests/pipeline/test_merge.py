import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.pipeline.merge import merge_directives, merge_holds
from src.pipeline.models import Directive, Hold


class MergeTests(unittest.TestCase):
    def test_directives_require_agreement_threshold(self):
        directive_runs = [
            [
                Directive(
                    segment_id="S1",
                    directive_summary="Adopt Resolution 2026-09.",
                    responsible_party="Council",
                    status="confirmed",
                    confidence=0.8,
                    model_confidence=0.8,
                    source_quote="The motion passed.",
                ),
                Directive(
                    segment_id="S2",
                    directive_summary="Schedule a ribbon cutting.",
                    responsible_party="Clerk",
                    status="proposed",
                    confidence=0.6,
                    model_confidence=0.6,
                    source_quote="The clerk can schedule a ribbon cutting.",
                ),
            ],
            [
                Directive(
                    segment_id="S1",
                    directive_summary="Resolution 2026-09 was adopted.",
                    responsible_party="Council",
                    status="confirmed",
                    confidence=0.7,
                    model_confidence=0.7,
                    source_quote="Adopted six to one.",
                )
            ],
            [],
        ]

        merged = merge_directives(directive_runs)

        self.assertEqual(len(merged), 1)
        self.assertEqual(merged[0].responsible_party, "Council")
        self.assertAlmostEqual(merged[0].agreement_ratio, 0.667, places=3)
        self.assertAlmostEqual(merged[0].model_confidence, 0.75, places=3)
        self.assertAlmostEqual(merged[0].final_confidence, 0.709, places=3)

    def test_holds_preserve_hold_over_guess_and_keep_confidence_triplet(self):
        hold_runs = [
            [
                Hold(
                    segment_id="S3",
                    hold_type="approval",
                    hold_summary="Legal review is still required before final action.",
                    owner_to_clarify="City Attorney",
                    blocking_scope="Resolution 2026-22",
                    severity="high",
                    confidence=0.8,
                    model_confidence=0.8,
                    source_quote="The city attorney needed to review the revised language.",
                ),
                Hold(
                    segment_id="S3",
                    hold_type="schedule",
                    hold_summary="The hearing was continued for a later meeting.",
                    owner_to_clarify="Council",
                    blocking_scope="Resolution 2026-22",
                    severity="medium",
                    confidence=0.5,
                    model_confidence=0.5,
                    source_quote="They should continue the hearing until staff returns.",
                ),
            ],
            [
                Hold(
                    segment_id="S3",
                    hold_type="approval",
                    hold_summary="Final action is blocked pending city attorney review.",
                    owner_to_clarify="City Attorney",
                    blocking_scope="Resolution 2026-22",
                    severity="high",
                    confidence=0.7,
                    model_confidence=0.7,
                    source_quote="The city attorney needed to review the revised language.",
                )
            ],
            [],
        ]

        merged = merge_holds(hold_runs)

        self.assertEqual(len(merged), 2)
        legal_review_hold = next(
            hold for hold in merged if hold.owner_to_clarify == "City Attorney"
        )
        continued_hearing_hold = next(
            hold for hold in merged if hold.owner_to_clarify == "Council"
        )

        self.assertAlmostEqual(legal_review_hold.agreement_ratio, 0.667, places=3)
        self.assertAlmostEqual(legal_review_hold.model_confidence, 0.75, places=3)
        self.assertAlmostEqual(legal_review_hold.final_confidence, 0.709, places=3)
        self.assertAlmostEqual(continued_hearing_hold.agreement_ratio, 0.333, places=3)
        self.assertGreater(continued_hearing_hold.final_confidence, 0.0)


if __name__ == "__main__":
    unittest.main()
