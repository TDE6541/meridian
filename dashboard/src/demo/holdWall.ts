import type { AbsenceLensView } from "../adapters/absenceSignalAdapter.ts";
import type { DashboardForensicChainView } from "../adapters/forensicAdapter.ts";
import type { DashboardSkinView } from "../adapters/skinPayloadAdapter.ts";
import type { AuthorityDashboardStateV1 } from "../authority/authorityDashboardTypes.ts";
import type {
  AbsenceSignalCitation,
  AbsenceSignalFamily,
  AbsenceSignalView,
} from "../director/absenceSignals.ts";
import type { ControlRoomTimelineStep } from "../state/controlRoomState.ts";

export const HOLD_WALL_SILENCE_BEAT_MS = 700;
export const HOLD_WALL_SILENCE_BEATS = [1, 2, 3] as const;

type HoldWallFieldKey =
  | "missing_authority"
  | "missing_evidence"
  | "missing_public_boundary"
  | "required_next_proof";

export interface HoldWallField {
  evidenceId: string | null;
  key: HoldWallFieldKey;
  label: string;
  sourceKind: string | null;
  sourcePath: string | null;
  status: "sourced" | "unresolved";
  value: string;
}

export interface HoldWallView {
  activeStepId: string | null;
  chainClaim: string;
  chainEntryCount: number;
  chainWriteClaimed: false;
  decision: string | null;
  fields: readonly HoldWallField[];
  silence: {
    audioCue: "none";
    beatCount: 3;
    beatDurationMs: typeof HOLD_WALL_SILENCE_BEAT_MS;
    beats: typeof HOLD_WALL_SILENCE_BEATS;
  };
  sourceMode: "existing-dashboard-state-only";
  triggered: boolean;
  triggerSource: string;
}

export interface BuildHoldWallViewInput {
  absenceLens: AbsenceLensView;
  authorityState: AuthorityDashboardStateV1;
  currentStep: ControlRoomTimelineStep | null;
  forensicChain: DashboardForensicChainView;
  publicSkinView: DashboardSkinView | null;
}

const AUTHORITY_FAMILIES: readonly AbsenceSignalFamily[] = [
  "MISSING_AUTHORITY",
  "AUTHORITY_REVOKED",
  "BLOCKED_ACTION",
  "HELD_DECISION",
];

const EVIDENCE_FAMILIES: readonly AbsenceSignalFamily[] = [
  "MISSING_EVIDENCE",
];

const PUBLIC_BOUNDARY_FAMILIES: readonly AbsenceSignalFamily[] = [
  "PUBLIC_REDACTION",
  "SKIN_DIVERGENCE",
];

const HOLD_WALL_TRIGGER_FAMILIES: readonly AbsenceSignalFamily[] = [
  ...AUTHORITY_FAMILIES,
  ...EVIDENCE_FAMILIES,
  ...PUBLIC_BOUNDARY_FAMILIES,
  "PROPOSED_CREATION",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function findSignal(
  signals: readonly AbsenceSignalView[],
  families: readonly AbsenceSignalFamily[]
): AbsenceSignalView | null {
  return signals.find((signal) => families.includes(signal.family)) ?? null;
}

function unresolvedField(key: HoldWallFieldKey, label: string): HoldWallField {
  return {
    evidenceId: null,
    key,
    label,
    sourceKind: null,
    sourcePath: null,
    status: "unresolved",
    value: `HOLD: ${label} has no source-supported field in the current dashboard state.`,
  };
}

function sourcedField(
  key: HoldWallFieldKey,
  label: string,
  value: string,
  citation: AbsenceSignalCitation
): HoldWallField {
  return {
    evidenceId: citation.evidenceId,
    key,
    label,
    sourceKind: citation.sourceKind,
    sourcePath: citation.sourcePath,
    status: "sourced",
    value,
  };
}

function signalField(
  key: HoldWallFieldKey,
  label: string,
  signal: AbsenceSignalView | null
): HoldWallField {
  const citation = signal?.citations[0] ?? null;

  return signal && citation
    ? sourcedField(key, label, `${signal.title}: ${signal.detail}`, citation)
    : unresolvedField(key, label);
}

function getRequiredNextProofField(
  currentStep: ControlRoomTimelineStep | null
): HoldWallField {
  const hold = currentStep?.step.governance?.result?.hold;

  if (isRecord(hold)) {
    const value =
      asString(hold.resolutionPath) ??
      asString(hold.summary) ??
      asString(hold.reason);

    if (value) {
      return {
        evidenceId: currentStep?.stepId ?? null,
        key: "required_next_proof",
        label: "Required next proof",
        sourceKind: "governance.result.hold",
        sourcePath: "step.governance.result.hold.resolutionPath",
        status: "sourced",
        value,
      };
    }
  }

  return unresolvedField("required_next_proof", "Required next proof");
}

function hasPublicBoundaryInput(publicSkinView: DashboardSkinView | null): boolean {
  return Boolean(
    publicSkinView &&
      (publicSkinView.absences.length > 0 || publicSkinView.redactions.length > 0)
  );
}

function getTriggerSource({
  absenceLens,
  authorityState,
  currentStep,
  publicSkinView,
}: BuildHoldWallViewInput): string {
  const decision = currentStep?.decision;
  const hasBlockingSignal = absenceLens.signals.some((signal) =>
    HOLD_WALL_TRIGGER_FAMILIES.includes(signal.family)
  );

  if (decision === "HOLD" || decision === "BLOCK") {
    return `step.governance.result.decision=${decision}`;
  }

  if (authorityState.status === "holding") {
    return "authorityState.status=holding";
  }

  if (authorityState.advisories.some((advisory) => advisory.severity === "HOLD")) {
    return "authorityState.advisories.HOLD";
  }

  if (hasBlockingSignal) {
    return "absenceLens.signals";
  }

  if (hasPublicBoundaryInput(publicSkinView)) {
    return "publicSkinView.boundaryInputs";
  }

  return "no HOLD/BLOCK source";
}

export function buildHoldWallView(input: BuildHoldWallViewInput): HoldWallView {
  const { absenceLens, authorityState, currentStep, forensicChain, publicSkinView } = input;
  const decision = currentStep?.decision ?? null;
  const authoritySignal = findSignal(absenceLens.signals, AUTHORITY_FAMILIES);
  const evidenceSignal = findSignal(absenceLens.signals, EVIDENCE_FAMILIES);
  const publicBoundarySignal = findSignal(absenceLens.signals, PUBLIC_BOUNDARY_FAMILIES);
  const triggerSource = getTriggerSource(input);
  const triggered = triggerSource !== "no HOLD/BLOCK source";

  return {
    activeStepId: currentStep?.stepId ?? absenceLens.activeStepId,
    chainClaim: forensicChain.hasEntries
      ? `Existing ForensicChain display has ${forensicChain.totalEntryCount} entries from ${forensicChain.sourceMode}; HOLD Wall creates no entry.`
      : "HOLD Wall rendered from existing state; no ForensicChain write is claimed.",
    chainEntryCount: forensicChain.totalEntryCount,
    chainWriteClaimed: false,
    decision,
    fields: [
      signalField("missing_authority", "Missing authority", authoritySignal),
      signalField("missing_evidence", "Missing evidence", evidenceSignal),
      signalField("missing_public_boundary", "Missing public boundary", publicBoundarySignal),
      getRequiredNextProofField(currentStep),
    ],
    silence: {
      audioCue: "none",
      beatCount: 3,
      beatDurationMs: HOLD_WALL_SILENCE_BEAT_MS,
      beats: HOLD_WALL_SILENCE_BEATS,
    },
    sourceMode: "existing-dashboard-state-only",
    triggered,
    triggerSource,
  };
}
