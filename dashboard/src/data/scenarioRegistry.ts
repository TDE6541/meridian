import type { ScenarioKey, ScenarioRegistryEntry } from "../types/scenario.ts";

export const scenarioRegistry = [
  {
    key: "routine",
    label: "Routine",
    fileName: "routine.json",
  },
  {
    key: "contested",
    label: "Contested",
    fileName: "contested.json",
  },
  {
    key: "emergency",
    label: "Emergency",
    fileName: "emergency.json",
  },
] as const satisfies readonly ScenarioRegistryEntry[];

export function getScenarioRegistryEntry(key: ScenarioKey): ScenarioRegistryEntry {
  const entry = scenarioRegistry.find((candidate) => candidate.key === key);

  if (!entry) {
    throw new Error(`Unknown scenario key: ${key}`);
  }

  return entry;
}
