import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.pipeline.models import MeetingMetadata
from src.pipeline.pipeline import MeridianPipeline
from src.pipeline.segmentation import (
    segment_structured_transcript,
    segment_transcript_file,
    segment_transcript_text,
)

FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures"


class SegmentationTests(unittest.TestCase):
    def test_timestamped_fixture_segments_truthfully(self):
        segments = segment_transcript_file(FIXTURES_DIR / "timestamped_civic_transcript.txt")

        self.assertEqual(len(segments), 5)
        self.assertEqual(segments[0].segment_type, "procedural")
        self.assertEqual(segments[0].timestamp_start, "00:00:01")
        self.assertEqual(segments[0].cue_markers, ["procedural"])

        self.assertEqual(segments[1].segment_type, "agenda_item")
        self.assertEqual(segments[1].timestamp_start, "00:00:12")
        self.assertEqual(segments[1].timestamp_end, "00:01:22")
        self.assertIn("department_report", segments[1].cue_markers)
        self.assertIn("WATER DIRECTOR", segments[1].speakers)

        self.assertEqual(segments[2].segment_type, "motion_vote")
        self.assertEqual(segments[2].timestamp_start, "00:01:48")
        self.assertEqual(segments[2].timestamp_end, "00:02:22")
        self.assertIn("agenda_item", segments[2].cue_markers)
        self.assertIn("motion_vote", segments[2].cue_markers)

        self.assertEqual(segments[3].segment_type, "public_comment")
        self.assertIn("public_comment", segments[3].cue_markers)
        self.assertIn("JANE DOE", segments[3].speakers)

        self.assertEqual(segments[4].segment_type, "procedural")
        self.assertIn("adjourn", segments[4].text.lower())

    def test_plain_text_fixture_uses_deterministic_fallback(self):
        plain_text = (FIXTURES_DIR / "plain_civic_transcript.txt").read_text(
            encoding="utf-8"
        )

        segments = segment_transcript_text(plain_text)

        self.assertEqual(len(segments), 3)
        self.assertEqual(segments[0].segment_type, "agenda_item")
        self.assertEqual(segments[0].timestamp_start, None)
        self.assertEqual(segments[1].segment_type, "public_comment")
        self.assertIn("public_comment", segments[1].cue_markers)
        self.assertEqual(segments[2].segment_type, "procedural")
        self.assertIn("adjourned", segments[2].text.lower())

    def test_structured_transcript_supports_timestamps_and_speakers(self):
        structured_items = [
            {
                "timestamp_start": 0.0,
                "timestamp_end": 10.0,
                "speaker": "MAYOR",
                "text": "Agenda item 5 is the library update.",
            },
            {
                "timestamp_start": 11.0,
                "timestamp_end": 40.0,
                "speaker": "LIBRARY DIRECTOR",
                "text": "Department report on branch repairs begins next week.",
            },
            {
                "timestamp_start": 41.0,
                "timestamp_end": 52.0,
                "speaker": "COUNCILMEMBER REED",
                "text": "I move to accept the report.",
            },
        ]

        segments = segment_structured_transcript(structured_items)

        self.assertEqual(len(segments), 2)
        self.assertEqual(segments[0].timestamp_start, "00:00:00")
        self.assertEqual(segments[0].timestamp_end, "00:00:40")
        self.assertIn("MAYOR", segments[0].speakers)
        self.assertIn("LIBRARY DIRECTOR", segments[0].speakers)
        self.assertEqual(segments[1].segment_type, "motion_vote")
        self.assertIn("motion_vote", segments[1].cue_markers)

    def test_pipeline_stage_metadata_and_segment_text_are_truthful(self):
        pipeline = MeridianPipeline()
        phases = {stage.name: stage for stage in pipeline.describe_phases()}
        meeting = MeetingMetadata(org_id="fortworth-dev", meeting_id="meeting-001")

        segmented = pipeline.segment_text(
            meeting,
            "[00:00:01] MAYOR: Call to order.\n[00:00:10] MAYOR: Agenda item 1 is open.",
        )

        self.assertTrue(phases["transcribe_audio"].shipped_in_block_a)
        self.assertTrue(phases["segment_transcript"].shipped_in_block_a)
        self.assertEqual(len(segmented.segments), 2)


if __name__ == "__main__":
    unittest.main()
