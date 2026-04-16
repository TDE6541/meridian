import sys
import unittest
from dataclasses import fields, is_dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.pipeline.models import (
    CaptureArtifact,
    ConfidenceTriplet,
    Directive,
    GovernanceHandoffPayload,
    Hold,
    LineageRef,
    MeetingMetadata,
    Segment,
)
from src.pipeline.pipeline import MeridianPipeline
from src.pipeline.translation import (
    build_governance_handoff_payload,
)


class ModelContractTests(unittest.TestCase):
    def test_internal_models_keep_holdpoint_native_names(self):
        self.assertTrue(is_dataclass(Segment))
        self.assertTrue(is_dataclass(Directive))
        self.assertTrue(is_dataclass(Hold))
        self.assertIn("directive_summary", {field.name for field in fields(Directive)})
        self.assertIn("hold_summary", {field.name for field in fields(Hold)})
        self.assertIn("segment_id", {field.name for field in fields(Segment)})

    def test_boundary_models_are_generic_and_separate_from_internal_models(self):
        capture_field_names = {field.name for field in fields(CaptureArtifact)}
        handoff_field_names = {field.name for field in fields(GovernanceHandoffPayload)}

        self.assertNotIn("directive_summary", capture_field_names)
        self.assertNotIn("hold_summary", capture_field_names)
        self.assertIn("artifact_kind", capture_field_names)
        self.assertIn("capture_artifacts", handoff_field_names)
        self.assertFalse(issubclass(Directive, CaptureArtifact))
        self.assertFalse(issubclass(Hold, CaptureArtifact))

    def test_boundary_payload_builder_freezes_additive_handoff_shape(self):
        meeting = MeetingMetadata(org_id="fortworth-dev", meeting_id="meeting-001")
        artifact = CaptureArtifact(
            artifact_kind="directive",
            summary="Confirm approved conduit reroute.",
            source_quote="Let's confirm the conduit reroute before framing.",
            lineage=LineageRef(
                transcript_hash="abc123",
                segment_id="S1",
                stage_name="extract_capture_artifacts",
            ),
            confidence=ConfidenceTriplet(final_confidence=0.7),
            status="proposed",
            responsible_party="Builder",
        )

        payload = build_governance_handoff_payload(
            meeting=meeting,
            transcript_hash="abc123",
            capture_artifacts=[artifact],
            notes=["runtime wiring deferred"],
        )

        self.assertEqual(payload.meeting.meeting_id, "meeting-001")
        self.assertEqual(payload.capture_artifacts[0].artifact_kind, "directive")
        self.assertIn("runtime_wiring", payload.deferred_stages)

    def test_pipeline_scaffold_prepares_context_and_exposes_local_handoff_stage(self):
        pipeline = MeridianPipeline()
        meeting = MeetingMetadata(org_id="fortworth-dev", meeting_id="meeting-001")
        prepared = pipeline.prepare(meeting=meeting, transcript_text="hello\r\nworld")
        phases = {stage.name: stage for stage in pipeline.describe_phases()}

        self.assertEqual(prepared.normalized_transcript, "hello\nworld")
        self.assertEqual(len(prepared.transcript_sha256), 64)
        self.assertTrue(phases["translate_boundary_handoff"].shipped_in_block_a)


if __name__ == "__main__":
    unittest.main()
