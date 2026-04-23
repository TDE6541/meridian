import type { ControlRoomTimelineStep } from "../state/controlRoomState.ts";
import type { ScenarioObject, ScenarioStep } from "../types/scenario.ts";

export interface DashboardForensicEntry {
  entryId: string;
  entryType: string;
  firstSeenStepId: string;
  firstSeenStepIndex: number;
  isCurrentStep: boolean;
  linkedEntryIds: readonly string[];
  occurredAt: string | null;
  payload: ScenarioObject | null;
  refs: ScenarioObject | null;
  sourcePath: string;
}

export interface DashboardForensicChainView {
  activeStepId: string | null;
  cumulativeEntries: readonly DashboardForensicEntry[];
  currentStepEntryIds: ReadonlySet<string>;
  entryVocabulary: readonly string[];
  hasEntries: boolean;
  sourceMode: "derived-from-step-entries";
  stepEntryCount: number;
  totalEntryCount: number;
}

function isRecord(value: unknown): value is ScenarioObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function asStringArray(value: unknown): readonly string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

function getStepEntries(step: ScenarioStep): ScenarioObject[] {
  return Array.isArray(step.forensic?.entries)
    ? step.forensic.entries.filter(isRecord)
    : [];
}

function normalizeEntry(
  entry: ScenarioObject,
  stepId: string,
  stepIndex: number,
  entryIndex: number,
  isCurrentStep: boolean
): DashboardForensicEntry | null {
  const entryId = asString(entry.entry_id) ?? asString(entry.entryId) ?? asString(entry.id);
  const entryType =
    asString(entry.entry_type) ?? asString(entry.entryType) ?? asString(entry.type);

  if (!entryId || !entryType) {
    return null;
  }

  return {
    entryId,
    entryType,
    firstSeenStepId: stepId,
    firstSeenStepIndex: stepIndex,
    isCurrentStep,
    linkedEntryIds: asStringArray(entry.linked_entry_ids ?? entry.linkedEntryIds),
    occurredAt: asString(entry.occurred_at) ?? asString(entry.occurredAt),
    payload: isRecord(entry.payload) ? entry.payload : null,
    refs: isRecord(entry.refs) ? entry.refs : null,
    sourcePath: `steps[${stepIndex}].forensic.entries[${entryIndex}]`,
  };
}

export function getForensicStepEntries(step: ScenarioStep): DashboardForensicEntry[] {
  return getStepEntries(step)
    .map((entry, entryIndex) =>
      normalizeEntry(entry, "active-step", 0, entryIndex, true)
    )
    .filter((entry): entry is DashboardForensicEntry => entry !== null);
}

export function adaptForensicChain(
  timelineSteps: readonly ControlRoomTimelineStep[],
  activeStepIndex: number
): DashboardForensicChainView {
  const activeStep = timelineSteps[activeStepIndex] ?? null;
  const priorEntryIds = new Set<string>();
  const cumulativeById = new Map<string, DashboardForensicEntry>();

  timelineSteps.slice(0, Math.max(activeStepIndex, 0)).forEach((timelineStep) => {
    getStepEntries(timelineStep.step).forEach((entry, entryIndex) => {
      const normalized = normalizeEntry(
        entry,
        timelineStep.stepId,
        timelineStep.index,
        entryIndex,
        false
      );

      if (normalized) {
        priorEntryIds.add(normalized.entryId);
        if (!cumulativeById.has(normalized.entryId)) {
          cumulativeById.set(normalized.entryId, normalized);
        }
      }
    });
  });

  const activeEntries = activeStep ? getStepEntries(activeStep.step) : [];
  const currentStepEntryIds = new Set<string>();

  if (activeStep) {
    activeEntries.forEach((entry, entryIndex) => {
      const normalized = normalizeEntry(
        entry,
        activeStep.stepId,
        activeStep.index,
        entryIndex,
        false
      );

      if (!normalized) {
        return;
      }

      const isCurrentStep = !priorEntryIds.has(normalized.entryId);
      if (isCurrentStep) {
        currentStepEntryIds.add(normalized.entryId);
      }

      if (!cumulativeById.has(normalized.entryId)) {
        cumulativeById.set(normalized.entryId, {
          ...normalized,
          isCurrentStep,
        });
      } else if (isCurrentStep) {
        const existing = cumulativeById.get(normalized.entryId);
        if (existing) {
          cumulativeById.set(normalized.entryId, {
            ...existing,
            isCurrentStep: true,
          });
        }
      }
    });
  }

  const cumulativeEntries = [...cumulativeById.values()].map((entry) => ({
    ...entry,
    isCurrentStep: currentStepEntryIds.has(entry.entryId),
  }));
  const vocabulary = [...new Set(cumulativeEntries.map((entry) => entry.entryType))];

  return {
    activeStepId: activeStep?.stepId ?? null,
    cumulativeEntries,
    currentStepEntryIds,
    entryVocabulary: vocabulary,
    hasEntries: cumulativeEntries.length > 0,
    sourceMode: "derived-from-step-entries",
    stepEntryCount: currentStepEntryIds.size,
    totalEntryCount: cumulativeEntries.length,
  };
}
