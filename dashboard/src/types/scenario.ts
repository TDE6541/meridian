export type ScenarioKey = "routine" | "contested" | "emergency";

export type ScenarioObject = Record<string, unknown>;

export interface ScenarioStep extends ScenarioObject {
  pipeline: ScenarioObject;
  matching: ScenarioObject;
  governance: ScenarioObject;
  authority: ScenarioObject;
  forensic: ScenarioObject;
  skins: ScenarioObject;
}

export interface ScenarioResult extends ScenarioObject {
  contractVersion: string;
  scenarioId: string;
  status: string;
  steps: ScenarioStep[];
}

export interface ScenarioResultEnvelope extends ScenarioObject {
  result: ScenarioResult;
}

export interface ScenarioRunner extends ScenarioObject {
  script?: string;
  mode?: string;
  requestedScenario?: string;
  cascade?: boolean;
}

export interface ScenarioRunnerReport extends ScenarioObject {
  contractVersion: string;
  runner: ScenarioRunner;
  scenarios: ScenarioResultEnvelope[];
}

export interface ScenarioRegistryEntry {
  key: ScenarioKey;
  label: string;
  fileName: `${ScenarioKey}.json`;
}
