import type { DashboardForensicChainView } from "../adapters/forensicAdapter.ts";
import type { DashboardSkinView } from "../adapters/skinPayloadAdapter.ts";
import type { AuthorityDashboardStateV1 } from "../authority/authorityDashboardTypes.ts";
import type {
  DashboardLiveProjectionV1,
  LiveFeedEventV1,
} from "../live/liveTypes.ts";
import type { ControlRoomTimelineStep } from "../state/controlRoomState.ts";

export const MISSION_RAIL_LABELS = [
  "Capture",
  "Authority",
  "Governance",
  "Absence",
  "Chain",
  "Public",
] as const;

export type MissionRailLabel = (typeof MISSION_RAIL_LABELS)[number];
export type MissionRailStageState = "active" | "complete" | "pending";

export interface MissionRailStage {
  index: number;
  label: MissionRailLabel;
  source: string;
  state: MissionRailStageState;
}

export interface BuildMissionRailStagesInput {
  activeStepIndex: number;
  authorityState: AuthorityDashboardStateV1 | null;
  currentStep: ControlRoomTimelineStep | null;
  dashboardMode: "live" | "snapshot";
  forensicChain: DashboardForensicChainView | null;
  liveProjection: DashboardLiveProjectionV1 | null;
  publicSkinView: DashboardSkinView | null;
  totalSteps: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasRecordValue(value: unknown): boolean {
  return isRecord(value) && Object.keys(value).length > 0;
}

function hasLiveEvent(
  liveProjection: DashboardLiveProjectionV1 | null,
  predicate: (event: LiveFeedEventV1) => boolean
): boolean {
  return liveProjection?.events.some(predicate) ?? false;
}

function getStageIndexForEvent(event: LiveFeedEventV1): number | null {
  if (event.kind.startsWith("skins.") || event.refs.skin_ref) {
    return 5;
  }
  if (event.kind.startsWith("forensic.") || event.refs.forensic_refs.length > 0) {
    return 4;
  }
  if (event.kind.startsWith("absence.") || event.refs.absence_refs.length > 0) {
    return 3;
  }
  if (event.kind.startsWith("governance.") || event.refs.governance_ref) {
    return 2;
  }
  if (event.kind.startsWith("authority.") || event.refs.authority_ref) {
    return 1;
  }
  if (
    event.kind.startsWith("capture.") ||
    event.kind.startsWith("entity.") ||
    event.refs.evidence_ids.length > 0
  ) {
    return 0;
  }

  return null;
}

function getLiveStageIndex(
  liveProjection: DashboardLiveProjectionV1 | null
): number | null {
  if (!liveProjection) {
    return null;
  }

  const eventIndexes = liveProjection.events
    .map(getStageIndexForEvent)
    .filter((entry): entry is number => entry !== null);
  const latestIndexes = [
    hasRecordValue(liveProjection.latest.capture) ? 0 : null,
    hasRecordValue(liveProjection.latest.authority) ? 1 : null,
    hasRecordValue(liveProjection.latest.governance) ? 2 : null,
    hasRecordValue(liveProjection.latest.absence) ? 3 : null,
    hasRecordValue(liveProjection.latest.forensic) ? 4 : null,
    hasRecordValue(liveProjection.skins.outputs.public) ? 5 : null,
  ].filter((entry): entry is number => entry !== null);
  const allIndexes = [...eventIndexes, ...latestIndexes];

  return allIndexes.length > 0 ? Math.max(...allIndexes) : null;
}

function getSnapshotStageIndex({
  activeStepIndex,
  currentStep,
  totalSteps,
}: BuildMissionRailStagesInput): number {
  if (!currentStep) {
    return -1;
  }

  if (totalSteps <= 1) {
    return 0;
  }

  const lastStepIndex = Math.max(totalSteps - 1, 1);
  const progressRatio = Math.min(Math.max(activeStepIndex, 0), lastStepIndex) / lastStepIndex;

  return Math.min(5, Math.round(progressRatio * (MISSION_RAIL_LABELS.length - 1)));
}

function getActiveStageIndex(input: BuildMissionRailStagesInput): number {
  if (input.dashboardMode === "live") {
    const liveStageIndex = getLiveStageIndex(input.liveProjection);
    if (liveStageIndex !== null) {
      return liveStageIndex;
    }
  }

  return getSnapshotStageIndex(input);
}

function getStageSources(input: BuildMissionRailStagesInput): readonly boolean[] {
  const { authorityState, currentStep, forensicChain, liveProjection, publicSkinView } = input;

  return [
    Boolean(
      currentStep ||
        hasRecordValue(liveProjection?.latest.capture) ||
        hasLiveEvent(liveProjection, (event) => getStageIndexForEvent(event) === 0)
    ),
    Boolean(
      currentStep ||
        (authorityState && authorityState.status !== "unavailable") ||
        hasRecordValue(liveProjection?.latest.authority) ||
        hasLiveEvent(liveProjection, (event) => getStageIndexForEvent(event) === 1)
    ),
    Boolean(
      currentStep?.decision ||
        currentStep?.step.governance ||
        hasRecordValue(liveProjection?.latest.governance) ||
        hasLiveEvent(liveProjection, (event) => getStageIndexForEvent(event) === 2)
    ),
    Boolean(
      currentStep ||
        hasRecordValue(liveProjection?.latest.absence) ||
        hasLiveEvent(liveProjection, (event) => getStageIndexForEvent(event) === 3)
    ),
    Boolean(
      forensicChain?.hasEntries ||
        hasRecordValue(liveProjection?.latest.forensic) ||
        hasLiveEvent(liveProjection, (event) => getStageIndexForEvent(event) === 4)
    ),
    Boolean(
      publicSkinView?.hasPayload ||
        hasRecordValue(liveProjection?.skins.outputs.public) ||
        hasLiveEvent(liveProjection, (event) => getStageIndexForEvent(event) === 5)
    ),
  ];
}

export function buildMissionRailStages(
  input: BuildMissionRailStagesInput
): MissionRailStage[] {
  const activeStageIndex = getActiveStageIndex(input);
  const sources = getStageSources(input);
  const sourceLabel =
    input.dashboardMode === "live" && input.liveProjection
      ? "existing live projection/event state"
      : "existing scenario snapshot state";

  return MISSION_RAIL_LABELS.map((label, index) => {
    const state: MissionRailStageState =
      activeStageIndex < 0 || (!sources[index] && index > activeStageIndex)
        ? "pending"
        : index < activeStageIndex
          ? "complete"
          : index === activeStageIndex
            ? "active"
            : "pending";

    return {
      index,
      label,
      source: state === "pending" ? "awaiting existing state" : sourceLabel,
      state,
    };
  });
}
