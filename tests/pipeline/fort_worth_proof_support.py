import json
import subprocess
import sys
from pathlib import Path
from types import SimpleNamespace

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.pipeline.llm_client import MERIDIAN_PIPELINE_MODEL_ENV, OPENAI_API_KEY_ENV
from src.pipeline.models import MeetingMetadata
from src.pipeline.pipeline import MeridianPipeline
from src.pipeline.receipt import (
    build_frozen_proof_manifest,
    build_run_level_capture_receipt,
)


FORT_WORTH_PROOF_DIR = Path("tests/pipeline/fixtures/fort_worth_proof")
NODE_SWEEP_SCRIPT = """
const fs = require("node:fs");
const { runGovernanceSweep } = require("./src/governance/runtime/index.js");

const payload = JSON.parse(fs.readFileSync(0, "utf8"));
process.stdout.write(JSON.stringify(runGovernanceSweep(payload)));
""".strip()


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


def _directive(
    segment_id,
    directive_summary,
    responsible_party,
    status,
    confidence,
    source_quote,
):
    return {
        "segment_id": segment_id,
        "directive_summary": directive_summary,
        "responsible_party": responsible_party,
        "status": status,
        "confidence": confidence,
        "source_quote": source_quote,
    }


def _hold(
    segment_id,
    hold_type,
    hold_summary,
    owner_to_clarify,
    blocking_scope,
    severity,
    confidence,
    source_quote,
):
    return {
        "segment_id": segment_id,
        "hold_type": hold_type,
        "hold_summary": hold_summary,
        "owner_to_clarify": owner_to_clarify,
        "blocking_scope": blocking_scope,
        "severity": severity,
        "confidence": confidence,
        "source_quote": source_quote,
    }


def _agenda_segment_payloads():
    return {
        "S1": {"directives": [], "holds": []},
        "S2": {
            "directives": [
                _directive(
                    "S2",
                    "Council agenda schedules proposed authorization and appropriation action for M&C 25-0933 on Atmos gas facility relocations tied to the Randol Mill mitigation project.",
                    "Council",
                    "proposed",
                    0.88,
                    "Authorize Execution of a Reimbursement Agreement with Atmos Energy Corporation in the Amount of $419,000.00 for Gas Facilities Relocations to Accommodate the Randol Mill Hazardous Road Overtopping Mitigation Project",
                ),
                _directive(
                    "S2",
                    "Council agenda schedules proposed appropriation action for M&C 25-0941 on the emergency sanitary sewer leak repair south of Hart Street and Interstate Highway 820.",
                    "Council",
                    "proposed",
                    0.85,
                    "Adopt Appropriation Ordinance in the Amount of $1,000,000.00 for Emergency 15-Inch Sanitary Sewer Leak Repair South of the Hart Street and Interstate Highway 820 Intersection",
                ),
            ],
            "holds": [],
        },
        "S3": {
            "directives": [
                _directive(
                    "S3",
                    "Council agenda schedules proposed action on Resolution 25-5420 for the 2026 council meeting calendar.",
                    "Council",
                    "proposed",
                    0.83,
                    "A Resolution of the City Council of the City of Fort Worth, Texas, Setting the Regularly Scheduled City Council Work Sessions and City Council Meetings for January 2026 through December 2026",
                )
            ],
            "holds": [],
        },
        "S4": {
            "directives": [],
            "holds": [
                _hold(
                    "S4",
                    "approval",
                    "ZC-25-131 remains unresolved because the agenda text still marks the zoning item as site plan required before final decision closure.",
                    "Council",
                    "ZC-25-131",
                    "high",
                    0.86,
                    "site plan required",
                )
            ],
        },
        "S5": {
            "directives": [
                _directive(
                    "S5",
                    "Council agenda schedules proposed authorization and appropriation action for M&C 25-0866 (REVISED) on the TIF development agreement at State Highway 114 and Championship Parkway.",
                    "Council",
                    "proposed",
                    0.84,
                    "M&C 25-0866 (REVISED)",
                )
            ],
            "holds": [
                _hold(
                    "S5",
                    "schedule",
                    "M&C 25-0866 remains unresolved because the agenda still shows the original agreement item as continued from a previous meeting.",
                    "Council",
                    "M&C 25-0866",
                    "medium",
                    0.82,
                    "(Continued from a Previous Meeting)",
                )
            ],
        },
        "S6": {
            "directives": [
                _directive(
                    "S6",
                    "Council agenda schedules proposed ordinance, resolution, and appropriation action for M&C 25-0918 on the Water Department lead service line replacement financing package.",
                    "Council",
                    "proposed",
                    0.87,
                    "Adopt Ordinance Authorizing Issuance of Series 2025 Taxable Combination Tax and Surplus Revenue Certificates of Obligation in an Aggregate Principal Amount Not to Exceed $6,500,000.00 for the Water Department's Lead Service Line Replacement Project",
                )
            ],
            "holds": [],
        },
        "S7": {"directives": [], "holds": []},
    }


def _payload_sequence(segments):
    segment_payloads = _agenda_segment_payloads()
    payloads = []
    for _run_index in range(3):
        for segment in segments:
            payloads.append(segment_payloads[segment.segment_id])
    return payloads


def _load_json(relative_path: Path):
    return json.loads((ROOT / relative_path).read_text(encoding="utf-8"))


def run_governance_sweep(sweep_options):
    completed = subprocess.run(
        ["node", "-e", NODE_SWEEP_SCRIPT],
        cwd=ROOT,
        input=json.dumps(sweep_options),
        text=True,
        capture_output=True,
        check=True,
    )
    return json.loads(completed.stdout)


def build_fort_worth_proof_bundle():
    official_excerpt_path = FORT_WORTH_PROOF_DIR / "fort_worth_official_agenda_excerpt.txt"
    official_provenance_path = (
        FORT_WORTH_PROOF_DIR / "fort_worth_official_agenda_provenance.json"
    )
    motion_excerpt_path = FORT_WORTH_PROOF_DIR / "fort_worth_motion_video_excerpt.txt"
    motion_provenance_path = (
        FORT_WORTH_PROOF_DIR / "fort_worth_motion_video_provenance.json"
    )

    transcript_text = (ROOT / official_excerpt_path).read_text(encoding="utf-8")
    meeting = MeetingMetadata(
        org_id="fortworth-dev",
        meeting_id="fort-worth-city-council-day-meeting-2025-09-30",
        capture_source="official_agenda_pair",
        title="Fort Worth City Council Day Meeting",
    )
    pipeline = MeridianPipeline()
    segments = pipeline.segment_text(meeting, transcript_text).segments
    client = _FakeClient(_payload_sequence(segments))

    pipeline_result = pipeline.run(
        meeting,
        transcript_text,
        client=client,
        env={
            OPENAI_API_KEY_ENV: "sk-test",
            MERIDIAN_PIPELINE_MODEL_ENV: "gpt-5.4-mini",
        },
        selected_item_ids=["hold:S4:1"],
        notes=[
            "Official agenda pair is the primary verbatim Fort Worth proof source.",
            "Motion-video pair is supplemental context only and is not a primary verbatim proof source.",
        ],
    )

    proof_manifest = build_frozen_proof_manifest(
        pipeline_result,
        source_label="fort_worth_official_agenda_pair",
        primary_artifact={
            "role": "official_agenda_pair",
            "excerpt_path": official_excerpt_path,
            "provenance_path": official_provenance_path,
            "provenance": _load_json(official_provenance_path),
        },
        supplemental_artifacts=[
            {
                "role": "motion_video_pair",
                "excerpt_path": motion_excerpt_path,
                "provenance_path": motion_provenance_path,
                "provenance": _load_json(motion_provenance_path),
            }
        ],
    )

    governance_request = {
        "kind": "command_request",
        "org_id": "fortworth-dev",
        "entity_ref": {
            "entity_id": "zc-25-131",
            "entity_type": "decision_record",
        },
        "authority_context": {
            "resolved": True,
            "requested_by_role": "planning_director",
            "required_approvals": ["zoning_commission", "city_council"],
            "resolved_approvals": ["zoning_commission"],
            "missing_approvals": ["city_council"],
        },
        "evidence_context": {
            "required_count": 2,
            "present_count": 1,
            "missing_types": ["site_plan"],
        },
        "confidence_context": None,
        "candidate_signal_patch": {
            "governance": {
                "proof_mode": "local_frozen_capture_handoff",
                "capture_handoff": pipeline_result.governance_handoff,
            }
        },
        "raw_subject": "constellation.commands.fortworth-dev.decision-closeout-zc-25-131",
    }
    governance_sweep = run_governance_sweep(
        {
            "evaluatedAt": "2026-04-16T15:30:00.000Z",
            "scenarios": [
                {
                    "scenarioId": "fort-worth-zoning-hold-proof",
                    "request": governance_request,
                    "expectedDecision": "HOLD",
                    "governedNonEventProof": True,
                }
            ],
        }
    )
    receipt = build_run_level_capture_receipt(
        pipeline_result,
        proof_manifest=proof_manifest,
        governance_sweep=governance_sweep,
    )

    return {
        "pipeline_result": pipeline_result,
        "proof_manifest": proof_manifest,
        "governance_request": governance_request,
        "governance_sweep": governance_sweep,
        "receipt": receipt,
    }
