import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.pipeline.transcript_cache import normalize_transcript, transcript_hash


class TranscriptCacheTests(unittest.TestCase):
    def test_normalize_transcript_is_newline_stable_and_trimmed(self):
        raw = "\r\n  line one\r\nline two\rline three  \n"
        self.assertEqual(normalize_transcript(raw), "line one\nline two\nline three")

    def test_transcript_hash_is_deterministic_for_equivalent_normalized_text(self):
        left = normalize_transcript("alpha\r\nbeta\r\n")
        right = normalize_transcript("\nalpha\nbeta\n")
        self.assertEqual(transcript_hash(left), transcript_hash(right))
        self.assertEqual(len(transcript_hash(left)), 64)


if __name__ == "__main__":
    unittest.main()
