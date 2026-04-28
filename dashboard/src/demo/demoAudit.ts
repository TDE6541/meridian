import type { DashboardRoleSessionProofV1 } from "../roleSession/roleSessionTypes.ts";
import type { ControlRoomTimelineStep } from "../state/controlRoomState.ts";
import type { ScenarioObject } from "../types/scenario.ts";

export type DemoDecisionCounterCategory = "made" | "held" | "blocked" | "revoked";

export interface DemoDecisionCounterItem {
  category: DemoDecisionCounterCategory;
  count: number;
  label: string;
  sourceNote: string;
}

export interface DemoDecisionCounterView {
  items: readonly DemoDecisionCounterItem[];
  label: "Current Scenario";
  sourceSummary: string;
  totalSourceDecisions: number;
}

export interface DemoAuditTickerRow {
  action: string;
  outcome: string;
  refHash: string;
  role: string;
  sourcePath: string;
  timestamp: string;
}

export interface DemoAuditWallView {
  boundaryNotice: string;
  counter: DemoDecisionCounterView;
  rows: readonly DemoAuditTickerRow[];
  runLabel: string;
  sourceNote: string;
  statusLabel: string;
  title: "Demo Audit Wall";
}

interface BuildDemoAuditWallViewInput {
  roleSession: DashboardRoleSessionProofV1;
  scenarioLabel: string;
  scenarioStatus: string;
  timelineSteps: readonly ControlRoomTimelineStep[];
}

const COUNTER_DEFINITIONS: readonly {
  category: DemoDecisionCounterCategory;
  label: string;
  matches: (decision: string) => boolean;
  zeroNote: string;
}[] = [
  {
    category: "made",
    label: "Decisions made",
    matches: () => true,
    zeroNote: "No source-supported governance decisions are present in this scenario.",
  },
  {
    category: "held",
    label: "Held",
    matches: (decision) => decision === "HOLD",
    zeroNote: "No source-supported HOLD outcomes are present in this scenario.",
  },
  {
    category: "blocked",
    label: "Blocked",
    matches: (decision) => decision === "BLOCK",
    zeroNote: "No source-supported BLOCK outcomes are present in this scenario.",
  },
  {
    category: "revoked",
    label: "Revoked",
    matches: (decision) => decision === "REVOKE",
    zeroNote: "No source-supported REVOKE outcomes are present in this scenario.",
  },
];

function isRecord(value: unknown): value is ScenarioObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function getStepForensicEntries(step: ControlRoomTimelineStep): ScenarioObject[] {
  return Array.isArray(step.step.forensic?.entries)
    ? step.step.forensic.entries.filter(isRecord)
    : [];
}

function getEntryId(entry: ScenarioObject, fallback: string): string {
  return (
    asString(entry.entry_id) ??
    asString(entry.entryId) ??
    asString(entry.id) ??
    fallback
  );
}

function getEntryTimestamp(entry: ScenarioObject | null): string | null {
  if (!entry) {
    return null;
  }

  return asString(entry.occurred_at) ?? asString(entry.occurredAt);
}

function getAction(step: ControlRoomTimelineStep, entry: ScenarioObject | null): string {
  return (
    step.action ??
    asString(step.transition?.action) ??
    asString(entry?.entry_type) ??
    asString(entry?.entryType) ??
    asString(entry?.type) ??
    "HOLD: action not supplied"
  );
}

function getOutcome(step: ControlRoomTimelineStep): string {
  return (
    step.decision ??
    asString(step.transition?.governanceDecision) ??
    asString(step.step.status) ??
    "HOLD: outcome not supplied"
  );
}

function decisionValues(timelineSteps: readonly ControlRoomTimelineStep[]): string[] {
  return timelineSteps
    .map((step) => asString(step.decision ?? step.transition?.governanceDecision))
    .filter((decision): decision is string => decision !== null);
}

export function buildDecisionCounter(
  timelineSteps: readonly ControlRoomTimelineStep[]
): DemoDecisionCounterView {
  const decisions = decisionValues(timelineSteps);

  return {
    items: COUNTER_DEFINITIONS.map((definition) => {
      const count = decisions.filter(definition.matches).length;

      return {
        category: definition.category,
        count,
        label: definition.label,
        sourceNote:
          count > 0
            ? "Counted from source-supported governance decision fields."
            : definition.zeroNote,
      };
    }),
    label: "Current Scenario",
    sourceSummary: "Counts derive from existing scenario governance decision fields only.",
    totalSourceDecisions: decisions.length,
  };
}

export function buildDemoAuditWallView({
  roleSession,
  scenarioLabel,
  scenarioStatus,
  timelineSteps,
}: BuildDemoAuditWallViewInput): DemoAuditWallView {
  const rows = timelineSteps.map((step) => {
    const entries = getStepForensicEntries(step);
    const entry = entries[0] ?? null;
    const entryId = entry ? getEntryId(entry, step.stepId) : step.stepId;
    const timestamp = getEntryTimestamp(entry);

    return {
      action: getAction(step, entry),
      outcome: getOutcome(step),
      refHash: entryId,
      role: roleSession.role,
      sourcePath: entry
        ? `steps[${step.index}].forensic.entries[0]`
        : `steps[${step.index}]`,
      timestamp: timestamp ?? "HOLD: timestamp not supplied",
    } satisfies DemoAuditTickerRow;
  });

  return {
    boundaryNotice:
      "Dashboard-local demo wall over scenario data only; it carries no city, production, portal, or legal posture.",
    counter: buildDecisionCounter(timelineSteps),
    rows,
    runLabel: scenarioLabel,
    sourceNote:
      "Rows are mapped from existing scenario transition, governance, role-session, and forensic fields. No chain entry is created here.",
    statusLabel: scenarioStatus,
    title: "Demo Audit Wall",
  };
}
