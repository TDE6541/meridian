from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import re
from typing import Iterable, List, Mapping, Optional, Sequence

from .models import Segment
from .transcript_cache import normalize_transcript

MAX_TIMESTAMP_UNITS_PER_SEGMENT = 6
MAX_PLAIN_UNITS_PER_SEGMENT = 3
MAX_PLAIN_CHARS_PER_SEGMENT = 900
TIMESTAMP_GAP_BOUNDARY_SECONDS = 300

_TIMESTAMP_PATTERN = re.compile(r"(?P<value>(?:\d{1,2}:)?\d{1,2}:\d{2})")
_LEADING_TIMESTAMP_PATTERN = re.compile(
    r"^\s*(?:[\[(])?(?P<value>(?:\d{1,2}:)?\d{1,2}:\d{2})(?:[\])])?\s*(?P<rest>.*)$"
)
_SPEAKER_PATTERN = re.compile(
    r"^(?P<speaker>[A-Z][A-Za-z0-9 .'\-]{1,40}?)(?:\s*\([^)]+\))?\s*:\s*(?P<text>.+)$"
)

_CUE_PATTERNS = {
    "agenda_item": (
        re.compile(r"\bagenda item\b", re.IGNORECASE),
        re.compile(r"\bitem\s+\d+[a-z]?\b", re.IGNORECASE),
        re.compile(r"\bconsent agenda\b", re.IGNORECASE),
        re.compile(r"\bpublic hearing\b", re.IGNORECASE),
    ),
    "motion_vote": (
        re.compile(r"\bi move\b", re.IGNORECASE),
        re.compile(r"\bmove to approve\b", re.IGNORECASE),
        re.compile(r"\bmotion\b", re.IGNORECASE),
        re.compile(r"\bsecond\b", re.IGNORECASE),
        re.compile(r"\bcast your votes\b", re.IGNORECASE),
        re.compile(r"\ball in favor\b", re.IGNORECASE),
        re.compile(r"\bmotion passes\b", re.IGNORECASE),
        re.compile(r"\bapproved\b", re.IGNORECASE),
    ),
    "public_comment": (
        re.compile(r"\bpublic comment\b", re.IGNORECASE),
        re.compile(r"\bcitizen comments?\b", re.IGNORECASE),
        re.compile(r"\bopen public hearing\b", re.IGNORECASE),
        re.compile(r"\bclose public hearing\b", re.IGNORECASE),
        re.compile(r"\bnonagenda items\b", re.IGNORECASE),
    ),
    "procedural": (
        re.compile(r"\bcall(?:ed)? to order\b", re.IGNORECASE),
        re.compile(r"\bto order\b", re.IGNORECASE),
        re.compile(r"\broll call\b", re.IGNORECASE),
        re.compile(r"\bquorum\b", re.IGNORECASE),
        re.compile(r"\brecess\b", re.IGNORECASE),
        re.compile(r"\badjourn(?:ed|ment)?\b", re.IGNORECASE),
        re.compile(r"\bpledge of allegiance\b", re.IGNORECASE),
        re.compile(r"\bapprove(?:d)? the minutes\b", re.IGNORECASE),
    ),
    "department_report": (
        re.compile(r"\bdepartment report\b", re.IGNORECASE),
        re.compile(r"\bstaff report\b", re.IGNORECASE),
        re.compile(
            r"\b(?:water|public works|planning|transportation|police|fire|parks|library)\s+(?:director|department)\b",
            re.IGNORECASE,
        ),
    ),
}

_SEGMENT_TYPE_PRIORITY = (
    "motion_vote",
    "agenda_item",
    "department_report",
    "procedural",
    "public_comment",
)


@dataclass(frozen=True)
class _TranscriptUnit:
    raw_text: str
    text: str
    timestamp_start: Optional[str] = None
    timestamp_end: Optional[str] = None
    speaker: Optional[str] = None
    cue_markers: tuple[str, ...] = ()


def _format_timestamp(value) -> Optional[str]:
    if value is None:
        return None

    if isinstance(value, (int, float)):
        total_seconds = int(float(value))
        hours = total_seconds // 3600
        minutes = (total_seconds % 3600) // 60
        seconds = total_seconds % 60
        return f"{hours:02d}:{minutes:02d}:{seconds:02d}"

    text = str(value).strip()
    if not text:
        return None

    if text.replace(".", "", 1).isdigit():
        return _format_timestamp(float(text))

    match = _TIMESTAMP_PATTERN.search(text)
    if not match:
        return None

    parts = match.group("value").split(":")
    if len(parts) == 2:
        minutes, seconds = (int(part) for part in parts)
        return f"00:{minutes:02d}:{seconds:02d}"

    hours, minutes, seconds = (int(part) for part in parts)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}"


def _timestamp_to_seconds(value: Optional[str]) -> Optional[int]:
    if not value:
        return None

    hours, minutes, seconds = (int(part) for part in value.split(":"))
    return hours * 3600 + minutes * 60 + seconds


def _extract_markers(text: str) -> tuple[str, ...]:
    markers = []
    for marker, patterns in _CUE_PATTERNS.items():
        if any(pattern.search(text) for pattern in patterns):
            markers.append(marker)
    return tuple(markers)


def _extract_speaker(text: str) -> tuple[Optional[str], str]:
    match = _SPEAKER_PATTERN.match(text.strip())
    if not match:
        return None, text.strip()
    speaker = match.group("speaker").strip()
    return speaker, match.group("text").strip()


def _render_raw_text(
    text: str, timestamp_start: Optional[str], speaker: Optional[str]
) -> str:
    prefix = []
    if timestamp_start:
        prefix.append(f"[{timestamp_start}]")
    if speaker:
        prefix.append(f"{speaker}:")
    if prefix:
        return " ".join(prefix + [text]).strip()
    return text


def _build_summary(text: str, max_chars: int = 160) -> str:
    candidate = text.strip()
    if len(candidate) <= max_chars:
        return candidate
    return candidate[: max_chars - 3].rstrip() + "..."


def _coerce_structured_item(item) -> Optional[_TranscriptUnit]:
    if isinstance(item, Mapping):
        text = str(item.get("text") or "").strip()
        timestamp_start = _format_timestamp(
            item.get("timestamp_start", item.get("start"))
        )
        timestamp_end = _format_timestamp(item.get("timestamp_end", item.get("end")))
        speaker = str(item.get("speaker") or "").strip() or None
    else:
        text = str(getattr(item, "text", "") or "").strip()
        timestamp_start = _format_timestamp(
            getattr(item, "timestamp_start", getattr(item, "start", None))
        )
        timestamp_end = _format_timestamp(
            getattr(item, "timestamp_end", getattr(item, "end", None))
        )
        speaker = str(getattr(item, "speaker", "") or "").strip() or None

    if not text:
        return None

    return _TranscriptUnit(
        raw_text=_render_raw_text(text, timestamp_start, speaker),
        text=text,
        timestamp_start=timestamp_start,
        timestamp_end=timestamp_end or timestamp_start,
        speaker=speaker,
        cue_markers=_extract_markers(text),
    )


def _parse_timestamped_lines(transcript_text: str) -> List[_TranscriptUnit]:
    units: List[_TranscriptUnit] = []
    current: Optional[_TranscriptUnit] = None

    for raw_line in transcript_text.splitlines():
        stripped = raw_line.strip()
        if not stripped:
            current = None
            continue

        match = _LEADING_TIMESTAMP_PATTERN.match(stripped)
        if match:
            timestamp = _format_timestamp(match.group("value"))
            remainder = match.group("rest").strip()
            speaker, text = _extract_speaker(remainder)
            unit_text = text or remainder
            current = _TranscriptUnit(
                raw_text=stripped,
                text=unit_text,
                timestamp_start=timestamp,
                timestamp_end=timestamp,
                speaker=speaker,
                cue_markers=_extract_markers(unit_text),
            )
            units.append(current)
            continue

        if current is not None:
            merged_text = "\n".join([current.text, stripped]).strip()
            current = _TranscriptUnit(
                raw_text="\n".join([current.raw_text, stripped]),
                text=merged_text,
                timestamp_start=current.timestamp_start,
                timestamp_end=current.timestamp_end,
                speaker=current.speaker,
                cue_markers=_extract_markers(merged_text),
            )
            units[-1] = current
            continue

        speaker, text = _extract_speaker(stripped)
        unit_text = text or stripped
        current = _TranscriptUnit(
            raw_text=stripped,
            text=unit_text,
            speaker=speaker,
            cue_markers=_extract_markers(unit_text),
        )
        units.append(current)

    return units


def _parse_plain_units(transcript_text: str) -> List[_TranscriptUnit]:
    paragraphs = [
        block.strip()
        for block in re.split(r"\n\s*\n", transcript_text)
        if block.strip()
    ]
    units = []
    for paragraph in paragraphs:
        speaker, text = _extract_speaker(paragraph)
        unit_text = text or paragraph
        units.append(
            _TranscriptUnit(
                raw_text=paragraph,
                text=unit_text,
                speaker=speaker,
                cue_markers=_extract_markers(unit_text),
            )
        )
    return units


def _coerce_units_from_text(transcript_text: str) -> List[_TranscriptUnit]:
    timestamped_lines = sum(
        1 for line in transcript_text.splitlines() if _LEADING_TIMESTAMP_PATTERN.match(line.strip())
    )
    if timestamped_lines:
        return _parse_timestamped_lines(transcript_text)
    return _parse_plain_units(transcript_text)


def _current_markers(units: Sequence[_TranscriptUnit]) -> set[str]:
    markers = set()
    for unit in units:
        markers.update(unit.cue_markers)
    return markers


def _should_flush(
    current_units: Sequence[_TranscriptUnit],
    next_unit: _TranscriptUnit,
    *,
    timestamped_mode: bool,
) -> bool:
    if not current_units:
        return False

    current_markers = _current_markers(current_units)
    next_markers = set(next_unit.cue_markers)

    if "agenda_item" in next_markers and "agenda_item" not in current_markers:
        return True
    if "public_comment" in next_markers and "public_comment" not in current_markers:
        return True
    if (
        "department_report" in next_markers
        and "department_report" not in current_markers
        and "agenda_item" not in current_markers
    ):
        return True
    if "motion_vote" in next_markers and "motion_vote" not in current_markers:
        return True
    if "procedural" in next_markers and current_markers.difference({"procedural"}):
        return True

    last_timestamp = _timestamp_to_seconds(current_units[-1].timestamp_end)
    next_timestamp = _timestamp_to_seconds(next_unit.timestamp_start)
    if (
        timestamped_mode
        and last_timestamp is not None
        and next_timestamp is not None
        and next_timestamp - last_timestamp >= TIMESTAMP_GAP_BOUNDARY_SECONDS
    ):
        return True

    if timestamped_mode and len(current_units) >= MAX_TIMESTAMP_UNITS_PER_SEGMENT:
        return True

    if not timestamped_mode:
        current_chars = sum(len(unit.text) for unit in current_units)
        if len(current_units) >= MAX_PLAIN_UNITS_PER_SEGMENT:
            return True
        if current_chars >= MAX_PLAIN_CHARS_PER_SEGMENT:
            return True

    return False


def _resolve_segment_type(markers: Iterable[str]) -> Optional[str]:
    marker_set = set(markers)
    for segment_type in _SEGMENT_TYPE_PRIORITY:
        if segment_type in marker_set:
            return segment_type
    if marker_set:
        return sorted(marker_set)[0]
    return "discussion"


def _build_segment(segment_index: int, units: Sequence[_TranscriptUnit]) -> Segment:
    speakers = []
    seen_speakers = set()
    for unit in units:
        if unit.speaker and unit.speaker not in seen_speakers:
            speakers.append(unit.speaker)
            seen_speakers.add(unit.speaker)

    cue_markers = sorted(_current_markers(units))
    rendered_text = "\n".join(unit.raw_text for unit in units).strip()
    summary_source = next((unit.text for unit in units if unit.text.strip()), rendered_text)
    return Segment(
        segment_id=f"S{segment_index}",
        timestamp_start=next((unit.timestamp_start for unit in units if unit.timestamp_start), None),
        timestamp_end=next(
            (unit.timestamp_end for unit in reversed(tuple(units)) if unit.timestamp_end),
            None,
        ),
        summary=_build_summary(summary_source),
        topics=[],
        speakers=speakers,
        segment_type=_resolve_segment_type(cue_markers),
        cue_markers=cue_markers,
        text=rendered_text,
    )


def _segment_units(units: Sequence[_TranscriptUnit]) -> List[Segment]:
    segments: List[Segment] = []
    current_units: List[_TranscriptUnit] = []
    timestamped_mode = any(unit.timestamp_start for unit in units)

    for unit in units:
        if _should_flush(current_units, unit, timestamped_mode=timestamped_mode):
            segments.append(_build_segment(len(segments) + 1, current_units))
            current_units = []
        current_units.append(unit)

    if current_units:
        segments.append(_build_segment(len(segments) + 1, current_units))

    return segments


def segment_transcript_text(transcript_text: str) -> List[Segment]:
    """Segment transcript text into deterministic civic meeting blocks."""

    normalized = normalize_transcript(transcript_text)
    if not normalized:
        return []

    units = _coerce_units_from_text(normalized)
    return _segment_units(units)


def segment_structured_transcript(items: Sequence[object]) -> List[Segment]:
    """Segment a structured transcript sequence with timestamps and optional speakers."""

    units = [unit for item in items if (unit := _coerce_structured_item(item)) is not None]
    if not units:
        return []
    return _segment_units(units)


def segment_transcript_file(transcript_path) -> List[Segment]:
    """Load a transcript fixture from disk and segment it deterministically."""

    path = Path(transcript_path)
    return segment_transcript_text(path.read_text(encoding="utf-8"))
