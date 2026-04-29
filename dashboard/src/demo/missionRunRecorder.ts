import {
  MISSION_PLAYBACK_STAGES,
  type MissionPlaybackMode,
  type MissionPlaybackStatus,
  type MissionStageId,
} from "./missionPlaybackPlan.ts";

export const MISSION_RECEIPT_TICKET_VERSION =
  "meridian.v2d.missionReceiptTicket.v1" as const;

export const MISSION_RUN_RECEIPT_VERSION =
  "meridian.v2d.missionRunReceipt.v1" as const;

export type MissionReceiptTicketKind =
  | "mission.started"
  | "stage.entered"
  | "foreman.cue"
  | "proof.spotlight"
  | "absence.shadow"
  | "authority.handoff"
  | "judge.interrupt"
  | "hold.raised"
  | "fallback.used"
  | "mission.completed";

export interface MissionReceiptTicket {
  kind: MissionReceiptTicketKind;
  legal_audit_claim: false;
  run_id: string;
  sequence: number;
  source_ref: string;
  stage_id: MissionStageId | null;
  summary: string;
  ticket_id: string;
  timestamp: string;
  version: typeof MISSION_RECEIPT_TICKET_VERSION;
}

export type MissionRunReceiptStageStatus =
  | "active"
  | "complete"
  | "hold"
  | "pending";

export interface MissionRunReceiptStage {
  label: string;
  source_ref: string;
  stage_id: MissionStageId;
  status: MissionRunReceiptStageStatus;
}

export interface MissionRunReceiptHold {
  hold_id: string;
  source_ref: string | null;
  status: "active_hold" | "carried_hold";
  summary: string;
}

export interface MissionRunReceiptWarning {
  source_ref: string | null;
  summary: string;
  warning_id: string;
}

export interface MissionRunReceiptBoundary {
  demo_only: true;
  no_ciba_claim: true;
  no_delivered_notification_claim: true;
  no_legal_sufficiency_claim: true;
  no_live_fort_worth_claim: true;
  no_model_api_foreman_claim: true;
  no_official_workflow_claim: true;
  no_openfga_claim: true;
  no_production_city_claim: true;
  no_root_forensic_chain_write: true;
}

export interface MissionRunReceipt {
  active_stage_id: MissionStageId | null;
  boundary: MissionRunReceiptBoundary;
  completed_at: string | null;
  events: readonly MissionReceiptTicket[];
  holds: readonly MissionRunReceiptHold[];
  mode: MissionPlaybackMode;
  run_id: string;
  stages: readonly MissionRunReceiptStage[];
  started_at: string | null;
  status: MissionPlaybackStatus;
  version: typeof MISSION_RUN_RECEIPT_VERSION;
  warnings: readonly MissionRunReceiptWarning[];
}

export interface CreateMissionRunRecorderInput {
  activeStageId?: MissionStageId | null;
  completedAt?: string | null;
  mode?: MissionPlaybackMode;
  runId?: string;
  runSequence?: number;
  stages?: readonly MissionRunReceiptStage[];
  startedAt?: string | null;
  status?: MissionPlaybackStatus;
}

export interface RecordMissionTicketInput {
  kind: MissionReceiptTicketKind;
  source_ref: string;
  stage_id?: MissionStageId | null;
  summary: string;
  timestamp?: string;
}

export interface RecordMissionRunMessageInput {
  source_ref?: string | null;
  status?: "active_hold" | "carried_hold";
  summary: string;
}

export const MISSION_RUN_RECEIPT_BOUNDARY: MissionRunReceiptBoundary = {
  demo_only: true,
  no_ciba_claim: true,
  no_delivered_notification_claim: true,
  no_legal_sufficiency_claim: true,
  no_live_fort_worth_claim: true,
  no_model_api_foreman_claim: true,
  no_official_workflow_claim: true,
  no_openfga_claim: true,
  no_production_city_claim: true,
  no_root_forensic_chain_write: true,
};

export const MISSION_RUN_RECEIPT_DEFAULT_TIMESTAMP =
  "1970-01-01T00:00:00.000Z" as const;

export function createMissionRunId(runSequence: number): string {
  return `mission-receipt-run-${runSequence}`;
}

export function missionReceiptTimestampFromMs(atMs: number): string {
  const safeMs = Number.isFinite(atMs) ? Math.max(0, atMs) : 0;

  return new Date(safeMs).toISOString();
}

function buildDefaultStages(): readonly MissionRunReceiptStage[] {
  return MISSION_PLAYBACK_STAGES.map((stage) => ({
    label: stage.label,
    source_ref: `dashboard/src/demo/missionPlaybackPlan.ts:stage:${stage.id}`,
    stage_id: stage.id,
    status: "pending" as const,
  }));
}

function stageIndex(stageId: MissionStageId): number {
  return MISSION_PLAYBACK_STAGES.findIndex((stage) => stage.id === stageId);
}

function withStageEntered(
  stages: readonly MissionRunReceiptStage[],
  stageId: MissionStageId
): readonly MissionRunReceiptStage[] {
  const activeIndex = stageIndex(stageId);

  return stages.map((stage) => {
    if (stage.stage_id === stageId) {
      return {
        ...stage,
        status: "active" as const,
      };
    }

    const currentIndex = stageIndex(stage.stage_id);

    if (currentIndex >= 0 && activeIndex >= 0 && currentIndex < activeIndex) {
      return {
        ...stage,
        status: "complete" as const,
      };
    }

    return stage;
  });
}

function withMissionCompleted(
  stages: readonly MissionRunReceiptStage[]
): readonly MissionRunReceiptStage[] {
  return stages.map((stage) => ({
    ...stage,
    status: "complete" as const,
  }));
}

function ticketIdFor(
  runId: string,
  sequence: number,
  kind: MissionReceiptTicketKind,
  stageId: MissionStageId | null
): string {
  return `${runId}:ticket-${sequence}:${kind}:${stageId ?? "mission"}`;
}

function hasTicket(
  receipt: MissionRunReceipt,
  kind: MissionReceiptTicketKind,
  stageId: MissionStageId | null
): boolean {
  return receipt.events.some(
    (event) => event.kind === kind && event.stage_id === stageId
  );
}

function appendTicket(
  receipt: MissionRunReceipt,
  input: RecordMissionTicketInput
): MissionRunReceipt {
  const stageId = input.stage_id ?? null;
  const duplicateGuarded =
    input.kind === "mission.completed" ||
    input.kind === "mission.started" ||
    input.kind === "stage.entered";

  if (duplicateGuarded && hasTicket(receipt, input.kind, stageId)) {
    return receipt;
  }

  const sequence = receipt.events.length + 1;
  const timestamp = input.timestamp ?? MISSION_RUN_RECEIPT_DEFAULT_TIMESTAMP;
  const ticket: MissionReceiptTicket = {
    kind: input.kind,
    legal_audit_claim: false,
    run_id: receipt.run_id,
    sequence,
    source_ref: input.source_ref,
    stage_id: stageId,
    summary: input.summary,
    ticket_id: ticketIdFor(receipt.run_id, sequence, input.kind, stageId),
    timestamp,
    version: MISSION_RECEIPT_TICKET_VERSION,
  };

  return {
    ...receipt,
    events: [...receipt.events, ticket],
  };
}

function nextRunSequence(receipt: MissionRunReceipt): number {
  const match = /^mission-receipt-run-(\d+)$/.exec(receipt.run_id);

  return match ? Number(match[1]) + 1 : 1;
}

function holdIdFor(receipt: MissionRunReceipt, summary: string): string {
  return `${receipt.run_id}:hold-${receipt.holds.length + 1}:${summary}`;
}

function warningIdFor(receipt: MissionRunReceipt, summary: string): string {
  return `${receipt.run_id}:warning-${receipt.warnings.length + 1}:${summary}`;
}

export function createMissionRunRecorder(
  input: CreateMissionRunRecorderInput = {}
): MissionRunReceipt {
  return {
    active_stage_id: input.activeStageId ?? null,
    boundary: MISSION_RUN_RECEIPT_BOUNDARY,
    completed_at: input.completedAt ?? null,
    events: [],
    holds: [],
    mode: input.mode ?? "guided",
    run_id: input.runId ?? createMissionRunId(input.runSequence ?? 1),
    stages: input.stages ?? buildDefaultStages(),
    started_at: input.startedAt ?? null,
    status: input.status ?? "idle",
    version: MISSION_RUN_RECEIPT_VERSION,
    warnings: [],
  };
}

export function resetMissionRunRecorder(
  receipt: MissionRunReceipt,
  input: Omit<CreateMissionRunRecorderInput, "runSequence"> = {}
): MissionRunReceipt {
  return createMissionRunRecorder({
    ...input,
    mode: input.mode ?? receipt.mode,
    runSequence: nextRunSequence(receipt),
  });
}

export function carryMissionRunHold(
  receipt: MissionRunReceipt,
  input: RecordMissionRunMessageInput
): MissionRunReceipt {
  const hold = {
    hold_id: holdIdFor(receipt, input.summary),
    source_ref: input.source_ref ?? null,
    status: input.status ?? "active_hold",
    summary: input.summary,
  } satisfies MissionRunReceiptHold;

  if (
    receipt.holds.some(
      (entry) =>
        entry.summary === hold.summary && entry.source_ref === hold.source_ref
    )
  ) {
    return receipt;
  }

  return {
    ...receipt,
    holds: [...receipt.holds, hold],
  };
}

export function carryMissionRunWarning(
  receipt: MissionRunReceipt,
  input: Omit<RecordMissionRunMessageInput, "status">
): MissionRunReceipt {
  const warning = {
    source_ref: input.source_ref ?? null,
    summary: input.summary,
    warning_id: warningIdFor(receipt, input.summary),
  } satisfies MissionRunReceiptWarning;

  if (
    receipt.warnings.some(
      (entry) =>
        entry.summary === warning.summary &&
        entry.source_ref === warning.source_ref
    )
  ) {
    return receipt;
  }

  return {
    ...receipt,
    warnings: [...receipt.warnings, warning],
  };
}

export function recordMissionStarted(
  receipt: MissionRunReceipt,
  input: Omit<RecordMissionTicketInput, "kind" | "stage_id">
): MissionRunReceipt {
  const next = appendTicket(receipt, {
    ...input,
    kind: "mission.started",
    stage_id: null,
  });

  return {
    ...next,
    started_at: receipt.started_at ?? input.timestamp ?? next.started_at,
    status: next.status === "idle" ? "running" : next.status,
  };
}

export function recordStageEntered(
  receipt: MissionRunReceipt,
  stageId: MissionStageId,
  input: Omit<RecordMissionTicketInput, "kind" | "stage_id">
): MissionRunReceipt {
  const next = appendTicket(receipt, {
    ...input,
    kind: "stage.entered",
    stage_id: stageId,
  });

  if (next === receipt) {
    return receipt;
  }

  return {
    ...next,
    active_stage_id: stageId,
    stages: withStageEntered(next.stages, stageId),
    status: next.status === "idle" ? "running" : next.status,
  };
}

export function recordForemanCue(
  receipt: MissionRunReceipt,
  stageId: MissionStageId,
  input: Omit<RecordMissionTicketInput, "kind" | "stage_id">
): MissionRunReceipt {
  return appendTicket(receipt, {
    ...input,
    kind: "foreman.cue",
    stage_id: stageId,
  });
}

export function recordProofSpotlight(
  receipt: MissionRunReceipt,
  stageId: MissionStageId,
  input: Omit<RecordMissionTicketInput, "kind" | "stage_id">
): MissionRunReceipt {
  return appendTicket(receipt, {
    ...input,
    kind: "proof.spotlight",
    stage_id: stageId,
  });
}

export function recordAbsenceShadow(
  receipt: MissionRunReceipt,
  stageId: MissionStageId,
  input: Omit<RecordMissionTicketInput, "kind" | "stage_id">
): MissionRunReceipt {
  return appendTicket(receipt, {
    ...input,
    kind: "absence.shadow",
    stage_id: stageId,
  });
}

export function recordAuthorityHandoff(
  receipt: MissionRunReceipt,
  stageId: MissionStageId,
  input: Omit<RecordMissionTicketInput, "kind" | "stage_id">
): MissionRunReceipt {
  return appendTicket(receipt, {
    ...input,
    kind: "authority.handoff",
    stage_id: stageId,
  });
}

export function recordJudgeInterrupt(
  receipt: MissionRunReceipt,
  stageId: MissionStageId | null,
  input: Omit<RecordMissionTicketInput, "kind" | "stage_id">
): MissionRunReceipt {
  return appendTicket(receipt, {
    ...input,
    kind: "judge.interrupt",
    stage_id: stageId,
  });
}

export function recordHoldRaised(
  receipt: MissionRunReceipt,
  stageId: MissionStageId | null,
  input: Omit<RecordMissionTicketInput, "kind" | "stage_id"> & {
    holdStatus?: "active_hold" | "carried_hold";
  }
): MissionRunReceipt {
  const ticketed = appendTicket(receipt, {
    ...input,
    kind: "hold.raised",
    stage_id: stageId,
  });

  return carryMissionRunHold(ticketed, {
    source_ref: input.source_ref,
    status: input.holdStatus ?? "active_hold",
    summary: input.summary,
  });
}

export function recordFallbackUsed(
  receipt: MissionRunReceipt,
  stageId: MissionStageId | null,
  input: Omit<RecordMissionTicketInput, "kind" | "stage_id">
): MissionRunReceipt {
  const ticketed = appendTicket(receipt, {
    ...input,
    kind: "fallback.used",
    stage_id: stageId,
  });

  return carryMissionRunWarning(ticketed, {
    source_ref: input.source_ref,
    summary: input.summary,
  });
}

export function recordMissionCompleted(
  receipt: MissionRunReceipt,
  input: Omit<RecordMissionTicketInput, "kind" | "stage_id">
): MissionRunReceipt {
  const next = appendTicket(receipt, {
    ...input,
    kind: "mission.completed",
    stage_id: null,
  });

  return {
    ...next,
    active_stage_id: null,
    completed_at: receipt.completed_at ?? input.timestamp ?? next.completed_at,
    stages: withMissionCompleted(next.stages),
    status: "completed",
  };
}
