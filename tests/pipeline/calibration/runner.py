from __future__ import annotations

import hashlib
import json
import os
import sys
from dataclasses import dataclass
from pathlib import Path
from types import SimpleNamespace
from typing import Any, Mapping, Optional, Sequence

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.pipeline.llm_client import (  # noqa: E402
    MERIDIAN_PIPELINE_MODEL_ENV,
    OPENAI_API_KEY_ENV,
    inspect_openai_env,
)
from src.pipeline.models import Directive, Hold, MeetingMetadata  # noqa: E402
from src.pipeline.pipeline import MeridianPipeline  # noqa: E402


RUNNER_VERSION = "wave4.5-blockb-baseline-v1"
CALIBRATION_DIR = Path(__file__).resolve().parent
BASELINES_DIR = CALIBRATION_DIR / "baselines"
FINAL_DIR = CALIBRATION_DIR / "final"
CORPUS_ROOT = CALIBRATION_DIR.parent / "fixtures" / "calibration_corpus"
CORPUS_MANIFEST_PATH = CORPUS_ROOT / "corpus_manifest.json"
PRIMARY_BASELINE_PATH = BASELINES_DIR / "recorded_primary_runs.json"
FALLBACK_BASELINE_PATH = BASELINES_DIR / "recorded_fallback_runs.json"
REPORT_BASELINE_PATH = BASELINES_DIR / "baseline_report.json"
FINAL_PRIMARY_PATH = FINAL_DIR / "recorded_primary_runs.json"
FINAL_FALLBACK_PATH = FINAL_DIR / "recorded_fallback_runs.json"
FINAL_REPORT_PATH = FINAL_DIR / "final_report.json"
FINAL_RUNNER_VERSION = "wave4.5-blockd-final-v1"
FINAL_MODEL_PIN = "gpt-5.4"
CALIBRATION_ORG_ID = "wave45-calibration"


@dataclass(frozen=True)
class CorpusMeeting:
    directory: str
    slot: str
    meeting_id: str
    excerpt_path: Path
    gold_path: Path
    provenance_path: Path
    order_index: int


class _ForcedFailureCompletions:
    def create(self, **kwargs):
        raise RuntimeError("forced fallback calibration lane")


class ForcedFailureClient:
    def __init__(self):
        self.chat = SimpleNamespace(completions=_ForcedFailureCompletions())


def _read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def _sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _relative_path(path: Path) -> str:
    return path.resolve().relative_to(ROOT).as_posix()


def _resolved_env(env: Optional[Mapping[str, str]] = None) -> dict[str, str]:
    source = os.environ if env is None else env
    return {
        OPENAI_API_KEY_ENV: str(source.get(OPENAI_API_KEY_ENV, "")).strip(),
        MERIDIAN_PIPELINE_MODEL_ENV: str(source.get(MERIDIAN_PIPELINE_MODEL_ENV, "")).strip(),
    }


def _meeting_metadata(meeting: CorpusMeeting) -> MeetingMetadata:
    return MeetingMetadata(
        org_id=CALIBRATION_ORG_ID,
        meeting_id=meeting.meeting_id,
        capture_source="calibration_corpus_excerpt",
        title=meeting.directory,
    )


def _directive_payload(directive: Directive, index: int, fallback_used: bool) -> dict[str, Any]:
    return {
        "runtime_item_id": f"directive:{directive.segment_id}:{index}",
        "capture_class": "directive",
        "segment_id": directive.segment_id,
        "directive_summary": directive.directive_summary,
        "hold_summary": None,
        "source_quote": directive.source_quote,
        "confidence": directive.confidence,
        "model_confidence": directive.model_confidence,
        "agreement_ratio": directive.agreement_ratio,
        "final_confidence": directive.final_confidence,
        "fallback_used": fallback_used,
    }


def _hold_payload(hold: Hold, index: int, fallback_used: bool) -> dict[str, Any]:
    return {
        "runtime_item_id": f"hold:{hold.segment_id}:{index}",
        "capture_class": "hold",
        "segment_id": hold.segment_id,
        "directive_summary": None,
        "hold_summary": hold.hold_summary,
        "source_quote": hold.source_quote,
        "confidence": hold.confidence,
        "model_confidence": hold.model_confidence,
        "agreement_ratio": hold.agreement_ratio,
        "final_confidence": hold.final_confidence,
        "fallback_used": fallback_used,
    }


def load_corpus_manifest() -> dict[str, Any]:
    return _read_json(CORPUS_MANIFEST_PATH)


def list_corpus_meetings() -> tuple[CorpusMeeting, ...]:
    manifest = load_corpus_manifest()
    meetings = []
    for index, entry in enumerate(manifest["meetings"]):
        meeting_dir = CORPUS_ROOT / entry["directory"]
        meetings.append(
            CorpusMeeting(
                directory=entry["directory"],
                slot=entry["slot"],
                meeting_id=entry["meeting_id"],
                excerpt_path=meeting_dir / "excerpt.txt",
                gold_path=meeting_dir / "gold_annotation.json",
                provenance_path=meeting_dir / "provenance.json",
                order_index=index,
            )
        )
    return tuple(meetings)


def load_gold_annotation(meeting: CorpusMeeting) -> dict[str, Any]:
    return _read_json(meeting.gold_path)


def load_excerpt_text(meeting: CorpusMeeting) -> str:
    return meeting.excerpt_path.read_text(encoding="utf-8")


def load_recorded_bundle(path: Path) -> dict[str, Any]:
    return _read_json(path)


def write_recorded_bundle(path: Path, bundle: dict[str, Any]) -> None:
    _write_json(path, bundle)


def _run_meeting_capture(
    meeting: CorpusMeeting,
    *,
    lane: str,
    capture_mode: str,
    client=None,
    env: Optional[Mapping[str, str]] = None,
) -> dict[str, Any]:
    resolved_env = _resolved_env(env)
    pipeline = MeridianPipeline()
    transcript_text = load_excerpt_text(meeting)
    captured = pipeline.capture_text(
        _meeting_metadata(meeting),
        transcript_text,
        client=client,
        env=resolved_env,
    )

    runtime_items = [
        _directive_payload(directive, index, captured.fallback_used)
        for index, directive in enumerate(captured.directives, start=1)
    ]
    runtime_items.extend(
        _hold_payload(hold, index, captured.fallback_used)
        for index, hold in enumerate(captured.holds, start=1)
    )

    return {
        "lane": lane,
        "capture_mode": capture_mode,
        "meeting_id": meeting.meeting_id,
        "meeting_directory": meeting.directory,
        "slot": meeting.slot,
        "order_index": meeting.order_index,
        "excerpt_path": _relative_path(meeting.excerpt_path),
        "excerpt_sha256": _sha256_file(meeting.excerpt_path),
        "gold_annotation_path": _relative_path(meeting.gold_path),
        "provenance_path": _relative_path(meeting.provenance_path),
        "transcript_hash": captured.transcript_sha256,
        "llm_config_status": {
            "api_key_present": captured.llm_config_status.api_key_present,
            "model_present": captured.llm_config_status.model_present,
            "model": captured.llm_config_status.model,
        },
        "fallback_used": captured.fallback_used,
        "capture_counts": {
            "segment_count": len(captured.segments),
            "directive_count": len(captured.directives),
            "hold_count": len(captured.holds),
        },
        "notes": list(captured.notes),
        "runtime_items": runtime_items,
    }


def run_primary_live_recording(
    meetings: Optional[Sequence[CorpusMeeting]] = None,
    *,
    env: Optional[Mapping[str, str]] = None,
    runner_version: str = RUNNER_VERSION,
) -> dict[str, Any]:
    corpus_meetings = tuple(meetings or list_corpus_meetings())
    resolved_env = _resolved_env(env)
    config_status = inspect_openai_env(resolved_env)
    if not config_status.is_configured:
        raise RuntimeError(
            "Primary calibration lane requires OPENAI_API_KEY and MERIDIAN_PIPELINE_MODEL."
        )

    meeting_records = [
        _run_meeting_capture(
            meeting,
            lane="primary",
            capture_mode="live_openai",
            env=resolved_env,
        )
        for meeting in corpus_meetings
    ]
    return {
        "runner_version": runner_version,
        "lane": "primary",
        "capture_mode": "live_openai",
        "model": resolved_env.get(MERIDIAN_PIPELINE_MODEL_ENV) or None,
        "meeting_count": len(meeting_records),
        "corpus_manifest_path": _relative_path(CORPUS_MANIFEST_PATH),
        "corpus_manifest_sha256": _sha256_file(CORPUS_MANIFEST_PATH),
        "replay_ready": True,
        "meetings": meeting_records,
    }


def run_forced_fallback_recording(
    meetings: Optional[Sequence[CorpusMeeting]] = None,
    *,
    env: Optional[Mapping[str, str]] = None,
    runner_version: str = RUNNER_VERSION,
) -> dict[str, Any]:
    corpus_meetings = tuple(meetings or list_corpus_meetings())
    resolved_env = _resolved_env(env)
    meeting_records = [
        _run_meeting_capture(
            meeting,
            lane="forced_fallback",
            capture_mode="injected_failure_client",
            client=ForcedFailureClient(),
            env=resolved_env,
        )
        for meeting in corpus_meetings
    ]
    return {
        "runner_version": runner_version,
        "lane": "forced_fallback",
        "capture_mode": "injected_failure_client",
        "model": resolved_env.get(MERIDIAN_PIPELINE_MODEL_ENV) or None,
        "meeting_count": len(meeting_records),
        "corpus_manifest_path": _relative_path(CORPUS_MANIFEST_PATH),
        "corpus_manifest_sha256": _sha256_file(CORPUS_MANIFEST_PATH),
        "replay_ready": True,
        "meetings": meeting_records,
    }


def generate_and_write_baselines(
    *,
    env: Optional[Mapping[str, str]] = None,
) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any]]:
    primary_bundle = run_primary_live_recording(env=env)
    write_recorded_bundle(PRIMARY_BASELINE_PATH, primary_bundle)

    fallback_bundle = run_forced_fallback_recording(env=env)
    write_recorded_bundle(FALLBACK_BASELINE_PATH, fallback_bundle)

    from .report import build_baseline_report

    report = build_baseline_report(
        primary_bundle=primary_bundle,
        fallback_bundle=fallback_bundle,
    )
    _write_json(REPORT_BASELINE_PATH, report)
    return primary_bundle, fallback_bundle, report


def generate_and_write_final_artifacts(
    *,
    env: Optional[Mapping[str, str]] = None,
) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any]]:
    resolved_env = _resolved_env(env)
    config_status = inspect_openai_env(resolved_env)
    model = resolved_env.get(MERIDIAN_PIPELINE_MODEL_ENV, "")
    if not config_status.api_key_present or model != FINAL_MODEL_PIN:
        raise RuntimeError(
            "Final calibration lane requires OPENAI_API_KEY and MERIDIAN_PIPELINE_MODEL=gpt-5.4."
        )

    primary_bundle = run_primary_live_recording(
        env=resolved_env,
        runner_version=FINAL_RUNNER_VERSION,
    )
    write_recorded_bundle(FINAL_PRIMARY_PATH, primary_bundle)

    fallback_bundle = run_forced_fallback_recording(
        env=resolved_env,
        runner_version=FINAL_RUNNER_VERSION,
    )
    write_recorded_bundle(FINAL_FALLBACK_PATH, fallback_bundle)

    from .report import build_final_report

    report = build_final_report(
        primary_bundle=primary_bundle,
        fallback_bundle=fallback_bundle,
    )
    _write_json(FINAL_REPORT_PATH, report)
    return primary_bundle, fallback_bundle, report
