import type { ScenarioKey } from "../types/scenario.ts";

export interface DemoScenarioMeta {
  description: string;
  displayLabel: string;
  key: ScenarioKey;
  presenterOrder: number;
}

export const demoScenarioOrder = [
  "routine",
  "contested",
  "emergency",
] as const satisfies readonly ScenarioKey[];

export const demoScenarios = {
  routine: {
    key: "routine",
    displayLabel: "Routine",
    description: "Baseline approval flow with inspection scheduling and permit issuance.",
    presenterOrder: 1,
  },
  contested: {
    key: "contested",
    displayLabel: "Contested",
    description: "Authority friction with a revoke-and-recovery sequence across five steps.",
    presenterOrder: 2,
  },
  emergency: {
    key: "emergency",
    displayLabel: "Emergency",
    description: "Repair escalation with a blocked action and follow-up hold posture.",
    presenterOrder: 3,
  },
} as const satisfies Record<ScenarioKey, DemoScenarioMeta>;

export function getDemoScenarioMeta(key: ScenarioKey): DemoScenarioMeta {
  return demoScenarios[key];
}
