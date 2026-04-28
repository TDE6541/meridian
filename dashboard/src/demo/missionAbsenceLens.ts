import type { AbsenceLensView } from "../adapters/absenceSignalAdapter.ts";
import type {
  AbsenceSignalFamily,
  AbsenceSignalView,
} from "../director/absenceSignals.ts";

export type MissionAbsenceCategory =
  | "authority"
  | "evidence"
  | "public boundary"
  | "owner"
  | "inspection"
  | "jurisdiction";

export interface MissionAbsenceFinding {
  category: MissionAbsenceCategory;
  detail: string;
  evidenceId: string | null;
  id: string;
  sourceKind: string;
  sourcePath: string;
  summary: string;
  title: string;
}

export interface MissionAbsenceLensOverlayView {
  activeStepId: string | null;
  findings: readonly MissionAbsenceFinding[];
  sourceMode: "mapped-from-existing-absence-signals";
  topCap: 3;
  truncatedCount: number;
}

const CATEGORY_BY_FAMILY: Record<AbsenceSignalFamily, MissionAbsenceCategory> = {
  AMBIGUOUS_MATCH: "jurisdiction",
  AUTHORITY_REVOKED: "authority",
  BLOCKED_ACTION: "authority",
  FORENSIC_ACCUMULATION: "evidence",
  HELD_DECISION: "authority",
  MISSING_AUTHORITY: "authority",
  MISSING_EVIDENCE: "evidence",
  PROPOSED_CREATION: "jurisdiction",
  PUBLIC_REDACTION: "public boundary",
  SKIN_DIVERGENCE: "public boundary",
  UNMATCHED_GOVERNANCE_ITEM: "owner",
};

function mapSignal(signal: AbsenceSignalView): MissionAbsenceFinding {
  const citation = signal.citations[0];

  return {
    category: CATEGORY_BY_FAMILY[signal.family],
    detail: signal.detail,
    evidenceId: citation?.evidenceId ?? null,
    id: signal.id,
    sourceKind: citation?.sourceKind ?? "HOLD: source kind unavailable",
    sourcePath: citation?.sourcePath ?? "HOLD: source path unavailable",
    summary: signal.summary,
    title: signal.title,
  };
}

export function buildMissionAbsenceLensOverlay(
  absenceLens: AbsenceLensView
): MissionAbsenceLensOverlayView {
  const findings = absenceLens.signals.slice(0, 3).map(mapSignal);

  return {
    activeStepId: absenceLens.activeStepId,
    findings,
    sourceMode: "mapped-from-existing-absence-signals",
    topCap: 3,
    truncatedCount: Math.max(absenceLens.signals.length - findings.length, 0),
  };
}
