import {
  PREVENTED_ACTION_FAMILIES,
  type AbsenceSignalFamily,
  type AbsenceSignalView,
} from "./absenceSignals.ts";
import type { ControlRoomTimelineStep } from "../state/controlRoomState.ts";
import type { DirectorBookmark } from "./directorBookmarks.ts";

export interface DirectorCueCardView {
  citation: string;
  eyebrow: string;
  lines: readonly string[];
  summary: string;
  title: string;
}

export interface JudgeCueLine {
  citation: string;
  family: AbsenceSignalFamily;
  text: string;
}

export interface JudgeCuePanelView {
  lines: readonly JudgeCueLine[];
}

export interface PreventedActionCardView {
  citation: string;
  detail: string;
  empty: boolean;
  summary: string;
  title: string;
}

export interface DirectorSceneView {
  activeBookmark: DirectorBookmark | null;
  bookmarks: readonly DirectorBookmark[];
  cueCard: DirectorCueCardView;
  judgePanel: JudgeCuePanelView;
  preventedAction: PreventedActionCardView;
}

export interface DirectorSceneInput {
  bookmarks: readonly DirectorBookmark[];
  currentStep: ControlRoomTimelineStep | null;
  signals: readonly AbsenceSignalView[];
}

function formatCitation(signal: AbsenceSignalView | null): string {
  const firstCitation = signal?.citations[0];

  if (!firstCitation) {
    return "source unavailable";
  }

  return `${firstCitation.sourceKind}:${firstCitation.sourcePath}`;
}

function findPrimarySignal(
  signals: readonly AbsenceSignalView[]
): AbsenceSignalView | null {
  return signals[0] ?? null;
}

function findPreventedActionSignal(
  signals: readonly AbsenceSignalView[]
): AbsenceSignalView | null {
  return (
    PREVENTED_ACTION_FAMILIES.map((family) =>
      signals.find((signal) => signal.family === family)
    ).find((signal): signal is AbsenceSignalView => signal !== undefined) ?? null
  );
}

function buildJudgeCueText(signal: AbsenceSignalView): string {
  switch (signal.family) {
    case "AUTHORITY_REVOKED":
      return "This state never became city state because authority was revoked.";
    case "BLOCKED_ACTION":
      return "This action stayed blocked in this lane.";
    case "HELD_DECISION":
      return "This step held and did not become city state.";
    case "MISSING_AUTHORITY":
      return "Required authority stayed unresolved on this step.";
    case "MISSING_EVIDENCE":
      return "This step held because evidence was missing.";
    case "PROPOSED_CREATION":
      return "This step marks a proposed creation signal, not a confirmed city-state item.";
    case "UNMATCHED_GOVERNANCE_ITEM":
      return "Open governance items remained unmatched in this step.";
    case "PUBLIC_REDACTION":
      return "This view withholds detail already flagged by the payload.";
    case "FORENSIC_ACCUMULATION":
      return "The forensic chain accumulates through this step using snapshot entries only.";
    case "SKIN_DIVERGENCE":
      return "Audience views diverge because the payload carries different absence notes.";
    case "AMBIGUOUS_MATCH":
      return "This step leaves the match ambiguous in the payload.";
    default:
      return signal.summary;
  }
}

function buildJudgePanel(signals: readonly AbsenceSignalView[]): JudgeCuePanelView {
  const lines = signals.slice(0, 3).map((signal) => ({
    citation: formatCitation(signal),
    family: signal.family,
    text: buildJudgeCueText(signal),
  }));

  if (lines.length === 0) {
    return {
      lines: [
        {
          citation: "source unavailable",
          family: "FORENSIC_ACCUMULATION",
          text: "No supported governed non-event signal is active on this step.",
        },
      ],
    };
  }

  return { lines };
}

function buildCueCard(
  currentStep: ControlRoomTimelineStep | null,
  activeBookmark: DirectorBookmark | null,
  primarySignal: AbsenceSignalView | null
): DirectorCueCardView {
  const eyebrow = currentStep
    ? `${currentStep.stepId} · ${currentStep.action ?? "ACTION_UNSPECIFIED"}`
    : "No active step";
  const summary =
    activeBookmark?.summary ??
    primarySignal?.summary ??
    "No supported governed non-event signal is active on this step.";
  const lines = [
    primarySignal?.detail ?? "No bounded absence detail is active for this step.",
    activeBookmark
      ? `Bookmark source: ${activeBookmark.citationPath}`
      : `Signal source: ${formatCitation(primarySignal)}`,
  ];

  return {
    citation: activeBookmark?.citationPath ?? formatCitation(primarySignal),
    eyebrow,
    lines,
    summary,
    title: activeBookmark?.title ?? primarySignal?.title ?? "Current step absence lens",
  };
}

function buildPreventedActionCard(
  preventedSignal: AbsenceSignalView | null
): PreventedActionCardView {
  if (!preventedSignal) {
    return {
      citation: "source unavailable",
      detail: "No prevented-action signal is active on this step.",
      empty: true,
      summary: "This step does not carry a held, blocked, revoked, or proposed-only prevented action.",
      title: "Prevented action",
    };
  }

  return {
    citation: formatCitation(preventedSignal),
    detail: preventedSignal.detail,
    empty: false,
    summary: buildJudgeCueText(preventedSignal),
    title: "Prevented action",
  };
}

export function buildDirectorScene({
  bookmarks,
  currentStep,
  signals,
}: DirectorSceneInput): DirectorSceneView {
  const activeBookmark = currentStep
    ? bookmarks.find((bookmark) => bookmark.stepId === currentStep.stepId) ?? null
    : null;
  const primarySignal = findPrimarySignal(signals);
  const preventedSignal = findPreventedActionSignal(signals);

  return {
    activeBookmark,
    bookmarks,
    cueCard: buildCueCard(currentStep, activeBookmark, primarySignal),
    judgePanel: buildJudgePanel(signals),
    preventedAction: buildPreventedActionCard(preventedSignal),
  };
}
