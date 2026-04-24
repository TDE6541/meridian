import type { ControlRoomTimelineStep } from "../state/controlRoomState.ts";
import type { ScenarioKey } from "../types/scenario.ts";
import type { AbsenceSignalFamily } from "./absenceSignals.ts";

export interface DirectorBookmark {
  citationPath: string;
  id: string;
  primaryFamily: AbsenceSignalFamily;
  stepId: string;
  stepIndex: number;
  summary: string;
  title: string;
}

type DirectorBookmarkSpec = {
  citationPath: string;
  id: string;
  primaryFamily: AbsenceSignalFamily;
  scenarioKey: ScenarioKey;
  stepId: string;
  summary: string;
  title: string;
  validate: (timelineStep: ControlRoomTimelineStep) => boolean;
};

function hasPermittingAbsence(
  timelineStep: ControlRoomTimelineStep,
  prefix: string
): boolean {
  const permitting = timelineStep.step.skins?.outputs?.permitting;
  const absences = Array.isArray(permitting?.absences) ? permitting.absences : [];

  return absences.some((absence) => {
    const displayText = typeof absence?.displayText === "string" ? absence.displayText : null;
    return displayText?.startsWith(prefix) === true;
  });
}

function getSelectedMatchType(timelineStep: ControlRoomTimelineStep): string | null {
  const selectedMatch = timelineStep.step.matching?.selectedMatch;

  return isRecord(selectedMatch) && typeof selectedMatch.matchType === "string"
    ? selectedMatch.matchType
    : null;
}

function getRevocationReason(timelineStep: ControlRoomTimelineStep): string | null {
  const revocation = timelineStep.step.governance?.result?.runtimeSubset?.civic?.revocation;

  return typeof revocation?.reason === "string" ? revocation.reason : null;
}

function getAuthorityResolutionDecision(
  timelineStep: ControlRoomTimelineStep
): string | null {
  const authorityResolution =
    timelineStep.step.governance?.result?.runtimeSubset?.civic?.authority_resolution;

  return typeof authorityResolution?.decision === "string"
    ? authorityResolution.decision
    : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

const DIRECTOR_BOOKMARK_SPECS: readonly DirectorBookmarkSpec[] = [
  {
    citationPath: "evidence_context.missing_types",
    id: "routine-inspection-hold",
    primaryFamily: "MISSING_EVIDENCE",
    scenarioKey: "routine",
    stepId: "R2",
    summary: "Inspection confirmation is still missing, so the flow stays on HOLD.",
    title: "Inspection hold",
    validate: (timelineStep) =>
      timelineStep.step.governance?.result?.decision === "HOLD" &&
      hasPermittingAbsence(timelineStep, "Missing evidence type:"),
  },
  {
    citationPath: "step.matching.selectedMatch.matchType",
    id: "contested-proposed-creation",
    primaryFamily: "PROPOSED_CREATION",
    scenarioKey: "contested",
    stepId: "C2",
    summary: "A proposed grant appears in the match layer, but authority remains unresolved.",
    title: "Proposed grant not confirmed",
    validate: (timelineStep) =>
      getSelectedMatchType(timelineStep) === "PROPOSED_CREATION" &&
      getAuthorityResolutionDecision(timelineStep) === "HOLD",
  },
  {
    citationPath: "step.governance.result.runtimeSubset.civic.revocation.reason",
    id: "contested-authority-revoked",
    primaryFamily: "AUTHORITY_REVOKED",
    scenarioKey: "contested",
    stepId: "C4",
    summary: "The memo path is explicitly revoked before it can persist as city state.",
    title: "Authority revoked",
    validate: (timelineStep) =>
      timelineStep.step.governance?.result?.decision === "REVOKE" &&
      getRevocationReason(timelineStep) === "authority_revoked_mid_action",
  },
  {
    citationPath: "step.governance.result.decision",
    id: "emergency-manual-lane-block",
    primaryFamily: "BLOCKED_ACTION",
    scenarioKey: "emergency",
    stepId: "E3",
    summary: "The hard-stop action stays BLOCK and remains outside this lane.",
    title: "Manual-lane block",
    validate: (timelineStep) => timelineStep.step.governance?.result?.decision === "BLOCK",
  },
  {
    citationPath: "authority_context.missing_approvals",
    id: "emergency-post-repair-hold",
    primaryFamily: "MISSING_AUTHORITY",
    scenarioKey: "emergency",
    stepId: "E5",
    summary: "Repair completes, but the follow-up obligation still holds for missing approval and evidence.",
    title: "Post-repair hold",
    validate: (timelineStep) =>
      timelineStep.step.governance?.result?.decision === "HOLD" &&
      hasPermittingAbsence(timelineStep, "Missing required approval:"),
  },
] as const;

export function resolveDirectorBookmarks(
  scenarioKey: ScenarioKey,
  timelineSteps: readonly ControlRoomTimelineStep[]
): DirectorBookmark[] {
  return DIRECTOR_BOOKMARK_SPECS.filter((spec) => spec.scenarioKey === scenarioKey)
    .map((spec) => {
      const timelineStep = timelineSteps.find((candidate) => candidate.stepId === spec.stepId);

      if (!timelineStep || !spec.validate(timelineStep)) {
        return null;
      }

      return {
        citationPath: spec.citationPath,
        id: spec.id,
        primaryFamily: spec.primaryFamily,
        stepId: spec.stepId,
        stepIndex: timelineStep.index,
        summary: spec.summary,
        title: spec.title,
      };
    })
    .filter((bookmark): bookmark is DirectorBookmark => bookmark !== null);
}
