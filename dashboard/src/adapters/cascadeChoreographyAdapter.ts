import type { DashboardForensicChainView } from "./forensicAdapter.ts";
import type { DashboardSkinView } from "./skinPayloadAdapter.ts";
import type { ControlRoomTimelineStep } from "../state/controlRoomState.ts";
import type { ScenarioObject } from "../types/scenario.ts";

export interface CascadeChoreographyStage {
  detail: string;
  key: "governance" | "authority" | "forensic" | "skin-update";
  label: string;
  sourcePath: string;
  status: string;
  value: string;
}

export interface CascadeChoreographyView {
  activeStepId: string | null;
  fallbackMessage: string;
  stages: readonly CascadeChoreographyStage[];
}

function isRecord(value: unknown): value is ScenarioObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function getStageStatus(
  currentStep: ControlRoomTimelineStep,
  stageName: "authority" | "forensic" | "governance" | "skins"
): string {
  const fromStageStatus = asString(currentStep.step.stageStatus?.[stageName]?.status);
  const fromStage = asString(currentStep.step[stageName]?.status);

  return fromStageStatus ?? fromStage ?? "UNAVAILABLE";
}

function getAuthorityResolution(currentStep: ControlRoomTimelineStep): ScenarioObject | null {
  const stageResolution = currentStep.step.authority?.resolution;
  if (isRecord(stageResolution)) {
    return stageResolution;
  }

  const runtimeResolution =
    currentStep.step.governance?.result?.runtimeSubset?.civic?.authority_resolution;

  return isRecord(runtimeResolution) ? runtimeResolution : null;
}

function getAuthorityValue(currentStep: ControlRoomTimelineStep): string {
  const authorityResolution = getAuthorityResolution(currentStep);
  const decision = asString(authorityResolution?.decision);
  const reason =
    asString(currentStep.step.authority?.reason) ?? asString(authorityResolution?.reason);

  if (decision && reason) {
    return `${decision} · ${reason}`;
  }

  return decision ?? reason ?? "not present";
}

function getSkinOutputKeys(skinViews: readonly DashboardSkinView[]): string[] {
  return skinViews
    .filter((view) => view.hasPayload)
    .map((view) => view.key);
}

export function adaptCascadeChoreography(
  currentStep: ControlRoomTimelineStep | null,
  forensicChain: DashboardForensicChainView,
  skinViews: readonly DashboardSkinView[]
): CascadeChoreographyView {
  if (!currentStep) {
    return {
      activeStepId: null,
      fallbackMessage: "No active step is selected.",
      stages: [],
    };
  }

  const governanceDecision =
    asString(currentStep.step.governance?.result?.decision) ?? "decision unavailable";
  const governanceReason =
    asString(currentStep.step.governance?.result?.reason) ??
    asString(currentStep.step.governance?.reason) ??
    "reason unavailable";
  const skinOutputKeys = getSkinOutputKeys(skinViews);
  const fallbackSkinIds = Array.isArray(currentStep.step.skins?.fallbackSkinIds)
    ? currentStep.step.skins.fallbackSkinIds.filter(
        (entry): entry is string => typeof entry === "string"
      )
    : [];

  return {
    activeStepId: currentStep.stepId,
    fallbackMessage: "No choreography data is available for the active step.",
    stages: [
      {
        detail: governanceReason,
        key: "governance",
        label: "governance",
        sourcePath: "step.governance.result",
        status: getStageStatus(currentStep, "governance"),
        value: governanceDecision,
      },
      {
        detail: asString(currentStep.step.authority?.reason) ?? "authority reason unavailable",
        key: "authority",
        label: "authority",
        sourcePath: "step.authority",
        status: getStageStatus(currentStep, "authority"),
        value: getAuthorityValue(currentStep),
      },
      {
        detail: `${forensicChain.stepEntryCount} current-step entries; ${forensicChain.totalEntryCount} cumulative entries through this step.`,
        key: "forensic",
        label: "forensic",
        sourcePath: "step.forensic.entries",
        status: getStageStatus(currentStep, "forensic"),
        value:
          forensicChain.entryVocabulary.length > 0
            ? forensicChain.entryVocabulary.join(", ")
            : "no entries present",
      },
      {
        detail:
          fallbackSkinIds.length > 0
            ? `outputs: ${skinOutputKeys.join(", ")}; fallback: ${fallbackSkinIds.join(", ")}`
            : `outputs: ${skinOutputKeys.join(", ") || "none"}`,
        key: "skin-update",
        label: "skin update",
        sourcePath: "step.skins.outputs",
        status: getStageStatus(currentStep, "skins"),
        value: `${skinOutputKeys.length} frozen outputs`,
      },
    ],
  };
}
