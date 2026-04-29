import type {
  ForemanAutonomousConductorOutput,
} from "./foremanAutonomousConductor.ts";
import { getAuthorityHandoffBeatsForStage } from "./authorityHandoffBeats.ts";
import { getAbsenceShadowSlotsForStage } from "./absenceShadowSlots.ts";
import { getForemanMissionCueForStage } from "./foremanMissionCues.ts";
import type {
  MissionPlaybackEvent,
  MissionPlaybackState,
} from "./missionPlaybackController.ts";
import {
  getMissionStageDefinition,
  MISSION_PLAYBACK_STAGES,
  type MissionPlaybackMode,
  type MissionPlaybackStatus,
  type MissionStageId,
} from "./missionPlaybackPlan.ts";
import type {
  MissionPhysicalProjectionV1,
  MissionPhysicalStageProjection,
} from "./missionPhysicalProjection.ts";
import { getProofSpotlightTargetsForStage } from "./proofSpotlightTargets.ts";
import type { JudgeTouchboardCard } from "./judgeTouchboardDeck.ts";
import {
  carryMissionRunHold,
  carryMissionRunWarning,
  createMissionRunRecorder,
  missionReceiptTimestampFromMs,
  recordAbsenceShadow,
  recordAuthorityHandoff,
  recordFallbackUsed,
  recordForemanCue,
  recordHoldRaised,
  recordJudgeInterrupt,
  recordMissionCompleted,
  recordMissionStarted,
  recordProofSpotlight,
  recordStageEntered,
  type MissionRunReceipt,
  type MissionRunReceiptStage,
} from "./missionRunRecorder.ts";

export interface BuildMissionRunReceiptInput {
  conductorOutput?: ForemanAutonomousConductorOutput | null;
  judgeCard?: JudgeTouchboardCard | null;
  judgeInterruptStatus?: "idle" | "interrupted" | "paused";
  playbackState?: MissionPlaybackState | null;
  projection?: MissionPhysicalProjectionV1 | null;
}

function receiptRunIdFor(
  playbackState: MissionPlaybackState | null | undefined,
  projection: MissionPhysicalProjectionV1 | null | undefined
): string | undefined {
  const sourceRunId = playbackState?.runId ?? projection?.run_id;

  return sourceRunId ? `mission-receipt-${sourceRunId}` : undefined;
}

function modeFor(
  playbackState: MissionPlaybackState | null | undefined,
  projection: MissionPhysicalProjectionV1 | null | undefined
): MissionPlaybackMode {
  return playbackState?.mode ?? projection?.mode ?? "guided";
}

function statusFor(
  playbackState: MissionPlaybackState | null | undefined,
  projection: MissionPhysicalProjectionV1 | null | undefined
): MissionPlaybackStatus {
  return playbackState?.status ?? projection?.playback_status ?? "idle";
}

function stageStatusFor(
  stage: MissionPhysicalStageProjection
): MissionRunReceiptStage["status"] {
  return stage.playback_state;
}

function stagesFor(
  projection: MissionPhysicalProjectionV1 | null | undefined
): readonly MissionRunReceiptStage[] {
  if (projection) {
    return projection.stages.map((stage) => ({
      label: stage.label,
      source_ref: `dashboard/src/demo/missionPhysicalProjection.ts:stage:${stage.stage_id}`,
      stage_id: stage.stage_id,
      status: stageStatusFor(stage),
    }));
  }

  return MISSION_PLAYBACK_STAGES.map((stage) => ({
    label: stage.label,
    source_ref: `dashboard/src/demo/missionPlaybackPlan.ts:stage:${stage.id}`,
    stage_id: stage.id,
    status: "pending" as const,
  }));
}

function timestampForEvent(event: MissionPlaybackEvent): string {
  return missionReceiptTimestampFromMs(event.atMs);
}

function stageLabel(stageId: MissionStageId): string {
  return getMissionStageDefinition(stageId).label;
}

function recordStageSurfaceTickets(
  receipt: MissionRunReceipt,
  stageId: MissionStageId,
  timestamp: string,
  conductorOutput: ForemanAutonomousConductorOutput | null | undefined
): MissionRunReceipt {
  let next = receipt;
  const cue = getForemanMissionCueForStage(stageId);

  if (cue) {
    next = recordForemanCue(next, stageId, {
      source_ref: `dashboard/src/demo/foremanMissionCues.ts:${cue.cueId}`,
      summary: cue.line,
      timestamp,
    });
  }

  const spotlightTargets = getProofSpotlightTargetsForStage(stageId);
  if (spotlightTargets.length > 0) {
    const primaryTarget = spotlightTargets[0];

    next = recordProofSpotlight(next, stageId, {
      source_ref: primaryTarget?.source_ref ?? "dashboard/src/demo/proofSpotlightTargets.ts",
      summary: `${spotlightTargets.length} proof spotlight target(s) visible for ${stageLabel(stageId)}.`,
      timestamp,
    });
  }

  const absenceSlots = getAbsenceShadowSlotsForStage(stageId);
  if (absenceSlots.length > 0) {
    const carriedCount = absenceSlots.filter(
      (slot) => slot.presence_status === "carried_hold"
    ).length;
    const sourceSlot = absenceSlots.find((slot) => slot.source_ref) ?? absenceSlots[0];

    next = recordAbsenceShadow(next, stageId, {
      source_ref:
        sourceSlot?.source_ref ??
        sourceSlot?.hold_ref ??
        "dashboard/src/demo/absenceShadowSlots.ts",
      summary: `${absenceSlots.length} absence shadow slot(s) visible; ${carriedCount} carried HOLD(s).`,
      timestamp,
    });
  }

  const authorityBeats = getAuthorityHandoffBeatsForStage(stageId);
  if (authorityBeats.length > 0) {
    const primaryBeat = authorityBeats[0];

    next = recordAuthorityHandoff(next, stageId, {
      source_ref:
        primaryBeat?.source_ref ?? "dashboard/src/demo/authorityHandoffBeats.ts",
      summary:
        primaryBeat?.visible_claim ??
        `${authorityBeats.length} authority handoff beat(s) visible.`,
      timestamp,
    });
  }

  const fallbackWarning = conductorOutput?.warnings.find(
    (warning) =>
      cue &&
      warning.includes("typed_fallback_used") &&
      warning.includes(cue.cueId)
  );

  if (cue && fallbackWarning) {
    next = recordFallbackUsed(next, stageId, {
      source_ref: `dashboard/src/demo/foremanMissionCues.ts:${cue.cueId}`,
      summary: cue.typedFallbackText,
      timestamp,
    });
  }

  return next;
}

function recordPlaybackEvent(
  receipt: MissionRunReceipt,
  event: MissionPlaybackEvent,
  conductorOutput: ForemanAutonomousConductorOutput | null | undefined
): MissionRunReceipt {
  const timestamp = timestampForEvent(event);

  if (event.type === "mission_begin") {
    return recordMissionStarted(receipt, {
      source_ref: `dashboard/src/demo/missionPlaybackController.ts:${event.eventId}`,
      summary: "Mission playback started.",
      timestamp,
    });
  }

  if (event.type === "stage_enter" && event.stageId) {
    const stageEntered = recordStageEntered(receipt, event.stageId, {
      source_ref: `dashboard/src/demo/missionPlaybackController.ts:${event.eventId}`,
      summary: `${stageLabel(event.stageId)} stage entered.`,
      timestamp,
    });

    return recordStageSurfaceTickets(
      stageEntered,
      event.stageId,
      timestamp,
      conductorOutput
    );
  }

  if (event.type === "mission_hold") {
    return recordHoldRaised(receipt, event.stageId, {
      source_ref: `dashboard/src/demo/missionPlaybackController.ts:${event.eventId}`,
      summary: "Mission playback raised a HOLD.",
      timestamp,
    });
  }

  if (event.type === "mission_complete") {
    return recordMissionCompleted(receipt, {
      source_ref: `dashboard/src/demo/missionPlaybackController.ts:${event.eventId}`,
      summary: "Mission playback completed.",
      timestamp,
    });
  }

  return receipt;
}

function carryPlaybackMessages(
  receipt: MissionRunReceipt,
  playbackState: MissionPlaybackState | null | undefined
): MissionRunReceipt {
  if (!playbackState) {
    return receipt;
  }

  let next = receipt;

  if (playbackState.hold) {
    next = carryMissionRunHold(next, {
      source_ref: playbackState.hold.stageId,
      status: "active_hold",
      summary: playbackState.hold.reason,
    });
  }

  for (const warning of playbackState.warnings) {
    next = carryMissionRunWarning(next, {
      source_ref: warning.stageId,
      summary: warning.message,
    });
  }

  return next;
}

function carryConductorMessages(
  receipt: MissionRunReceipt,
  conductorOutput: ForemanAutonomousConductorOutput | null | undefined
): MissionRunReceipt {
  if (!conductorOutput) {
    return receipt;
  }

  let next = receipt;

  for (const hold of conductorOutput.holds) {
    next = carryMissionRunHold(next, {
      source_ref: conductorOutput.currentStageId,
      status: "active_hold",
      summary: hold,
    });
  }

  for (const warning of conductorOutput.warnings) {
    next = carryMissionRunWarning(next, {
      source_ref: conductorOutput.currentStageId,
      summary: warning,
    });
  }

  return next;
}

function carryProjectionHolds(
  receipt: MissionRunReceipt,
  projection: MissionPhysicalProjectionV1 | null | undefined
): MissionRunReceipt {
  if (!projection) {
    return receipt;
  }

  return projection.holds.reduce(
    (next, hold) =>
      carryMissionRunHold(next, {
        source_ref: hold.source_ref,
        status: hold.status,
        summary: hold.summary,
      }),
    receipt
  );
}

function ensureStartedTicket(
  receipt: MissionRunReceipt,
  playbackState: MissionPlaybackState | null | undefined
): MissionRunReceipt {
  if (
    playbackState?.startedAtMs === null ||
    playbackState?.startedAtMs === undefined ||
    receipt.events.length > 0
  ) {
    return receipt;
  }

  return recordMissionStarted(receipt, {
    source_ref: "dashboard/src/demo/missionPlaybackController.ts:startedAtMs",
    summary: "Mission playback started.",
    timestamp: missionReceiptTimestampFromMs(playbackState.startedAtMs),
  });
}

function ensureActiveStageTicket(
  receipt: MissionRunReceipt,
  playbackState: MissionPlaybackState | null | undefined,
  projection: MissionPhysicalProjectionV1 | null | undefined,
  conductorOutput: ForemanAutonomousConductorOutput | null | undefined
): MissionRunReceipt {
  const stageId = playbackState?.currentStageId ?? projection?.active_stage_id;

  if (!stageId || receipt.events.some((event) => event.kind === "stage.entered")) {
    return receipt;
  }

  const timestamp = missionReceiptTimestampFromMs(
    playbackState?.stageEnteredAtMs ?? playbackState?.startedAtMs ?? 0
  );
  const stageEntered = recordStageEntered(receipt, stageId, {
    source_ref: "dashboard/src/demo/missionPhysicalProjection.ts:active_stage_id",
    summary: `${stageLabel(stageId)} stage entered.`,
    timestamp,
  });

  return recordStageSurfaceTickets(stageEntered, stageId, timestamp, conductorOutput);
}

function ensureCompletedTicket(
  receipt: MissionRunReceipt,
  playbackState: MissionPlaybackState | null | undefined
): MissionRunReceipt {
  if (playbackState?.status !== "completed") {
    return receipt;
  }

  return recordMissionCompleted(receipt, {
    source_ref: "dashboard/src/demo/missionPlaybackController.ts:completedAtMs",
    summary: "Mission playback completed.",
    timestamp: missionReceiptTimestampFromMs(playbackState.completedAtMs ?? 0),
  });
}

function recordJudgeTicket(
  receipt: MissionRunReceipt,
  input: BuildMissionRunReceiptInput
): MissionRunReceipt {
  if (!input.judgeCard || input.judgeInterruptStatus === "idle") {
    return receipt;
  }

  const stageId =
    input.judgeCard.related_stage_id ??
    input.playbackState?.currentStageId ??
    input.projection?.active_stage_id ??
    null;

  return recordJudgeInterrupt(receipt, stageId, {
    source_ref: `dashboard/src/demo/judgeTouchboardDeck.ts:${input.judgeCard.question_id}`,
    summary: input.judgeCard.safe_claim,
    timestamp: missionReceiptTimestampFromMs(
      input.playbackState?.pausedAtMs ??
        input.playbackState?.events.at(-1)?.atMs ??
        0
    ),
  });
}

export function buildMissionRunReceipt(
  input: BuildMissionRunReceiptInput = {}
): MissionRunReceipt {
  const { conductorOutput, playbackState, projection } = input;
  let receipt = createMissionRunRecorder({
    activeStageId: playbackState?.currentStageId ?? projection?.active_stage_id ?? null,
    completedAt:
      playbackState?.completedAtMs === null || playbackState?.completedAtMs === undefined
        ? null
        : missionReceiptTimestampFromMs(playbackState.completedAtMs),
    mode: modeFor(playbackState, projection),
    runId: receiptRunIdFor(playbackState, projection),
    stages: stagesFor(projection),
    startedAt:
      playbackState?.startedAtMs === null || playbackState?.startedAtMs === undefined
        ? null
        : missionReceiptTimestampFromMs(playbackState.startedAtMs),
    status: statusFor(playbackState, projection),
  });

  for (const event of playbackState?.events ?? []) {
    receipt = recordPlaybackEvent(receipt, event, conductorOutput);
  }

  receipt = ensureStartedTicket(receipt, playbackState);
  receipt = ensureActiveStageTicket(receipt, playbackState, projection, conductorOutput);
  receipt = ensureCompletedTicket(receipt, playbackState);
  receipt = carryPlaybackMessages(receipt, playbackState);
  receipt = carryConductorMessages(receipt, conductorOutput);
  receipt = carryProjectionHolds(receipt, projection);
  receipt = recordJudgeTicket(receipt, input);

  return receipt;
}
