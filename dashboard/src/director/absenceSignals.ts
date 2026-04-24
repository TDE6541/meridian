export const ABSENCE_SIGNAL_FAMILIES = [
  "UNMATCHED_GOVERNANCE_ITEM",
  "PROPOSED_CREATION",
  "AMBIGUOUS_MATCH",
  "MISSING_AUTHORITY",
  "AUTHORITY_REVOKED",
  "BLOCKED_ACTION",
  "HELD_DECISION",
  "PUBLIC_REDACTION",
  "MISSING_EVIDENCE",
  "FORENSIC_ACCUMULATION",
  "SKIN_DIVERGENCE",
] as const;

export type AbsenceSignalFamily = (typeof ABSENCE_SIGNAL_FAMILIES)[number];

export const DIRECTOR_PANEL_KEYS = [
  "governance",
  "forensic",
  "skin",
  "relationships",
  "choreography",
] as const;

export type DirectorPanelKey = (typeof DIRECTOR_PANEL_KEYS)[number];

export interface AbsenceSignalCitation {
  evidenceId: string | null;
  sourceKind: string;
  sourcePath: string;
  stepId: string;
}

export interface AbsenceSignalView {
  citations: readonly AbsenceSignalCitation[];
  detail: string;
  family: AbsenceSignalFamily;
  id: string;
  panelTargets: readonly DirectorPanelKey[];
  summary: string;
  title: string;
}

export interface AbsenceSignalFamilyState {
  family: AbsenceSignalFamily;
  label: string;
  status: "absent" | "present";
}

export interface AbsencePanelHighlight {
  family: AbsenceSignalFamily;
  id: string;
  label: string;
  panel: DirectorPanelKey;
}

const ABSENCE_SIGNAL_LABELS: Record<AbsenceSignalFamily, string> = {
  AMBIGUOUS_MATCH: "Ambiguous match",
  AUTHORITY_REVOKED: "Authority revoked",
  BLOCKED_ACTION: "Blocked action",
  FORENSIC_ACCUMULATION: "Forensic accumulation",
  HELD_DECISION: "Held decision",
  MISSING_AUTHORITY: "Missing authority",
  MISSING_EVIDENCE: "Missing evidence",
  PROPOSED_CREATION: "Proposed creation",
  PUBLIC_REDACTION: "Public redaction",
  SKIN_DIVERGENCE: "Skin divergence",
  UNMATCHED_GOVERNANCE_ITEM: "Unmatched governance item",
};

export const ABSENCE_SIGNAL_PRIORITY: readonly AbsenceSignalFamily[] = [
  "AUTHORITY_REVOKED",
  "BLOCKED_ACTION",
  "HELD_DECISION",
  "MISSING_AUTHORITY",
  "MISSING_EVIDENCE",
  "PROPOSED_CREATION",
  "UNMATCHED_GOVERNANCE_ITEM",
  "PUBLIC_REDACTION",
  "FORENSIC_ACCUMULATION",
  "SKIN_DIVERGENCE",
  "AMBIGUOUS_MATCH",
];

export const PREVENTED_ACTION_FAMILIES: readonly AbsenceSignalFamily[] = [
  "AUTHORITY_REVOKED",
  "BLOCKED_ACTION",
  "HELD_DECISION",
  "MISSING_AUTHORITY",
  "MISSING_EVIDENCE",
  "PROPOSED_CREATION",
];

export function getAbsenceSignalLabel(family: AbsenceSignalFamily): string {
  return ABSENCE_SIGNAL_LABELS[family];
}

export function sortAbsenceSignals(
  signals: readonly AbsenceSignalView[]
): AbsenceSignalView[] {
  const indexByFamily = new Map(
    ABSENCE_SIGNAL_PRIORITY.map((family, index) => [family, index])
  );

  return [...signals].sort((left, right) => {
    const leftPriority = indexByFamily.get(left.family) ?? ABSENCE_SIGNAL_PRIORITY.length;
    const rightPriority = indexByFamily.get(right.family) ?? ABSENCE_SIGNAL_PRIORITY.length;

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    return left.title.localeCompare(right.title);
  });
}
