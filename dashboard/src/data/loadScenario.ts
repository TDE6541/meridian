import {
  getScenarioRegistryEntry,
  scenarioRegistry,
} from "./scenarioRegistry.ts";
import {
  assertValidScenarioPayload,
} from "./validateScenario.ts";
import type {
  ScenarioKey,
  ScenarioRegistryEntry,
  ScenarioRunnerReport,
} from "../types/scenario.ts";

export interface LoadedScenario {
  entry: ScenarioRegistryEntry;
  payload: ScenarioRunnerReport;
}

export interface LoadScenarioOptions {
  basePath?: string;
  entries?: readonly ScenarioRegistryEntry[];
  fetcher?: typeof fetch;
}

function trimTrailingSeparators(value: string): string {
  return value.replace(/[\\/]+$/, "");
}

export function buildScenarioUrl(
  entry: ScenarioRegistryEntry,
  basePath = "/scenarios"
): string {
  return `${trimTrailingSeparators(basePath).replace(/\\/g, "/")}/${entry.fileName}`;
}

export async function loadScenario(
  key: ScenarioKey | ScenarioRegistryEntry,
  options: LoadScenarioOptions = {}
): Promise<LoadedScenario> {
  const entry = typeof key === "string" ? getScenarioRegistryEntry(key) : key;
  const fetcher = options.fetcher ?? fetch;

  if (typeof fetcher !== "function") {
    throw new Error("No fetch implementation available for scenario loading.");
  }

  const response = await fetcher(buildScenarioUrl(entry, options.basePath));

  if (!response.ok) {
    throw new Error(
      `Failed to load ${entry.fileName}: ${response.status} ${response.statusText}`
    );
  }

  const payload = assertValidScenarioPayload(await response.json(), entry.fileName);

  return {
    entry,
    payload,
  };
}

export async function loadAllScenarios(
  options: LoadScenarioOptions = {}
): Promise<LoadedScenario[]> {
  const entries = options.entries ?? scenarioRegistry;

  return Promise.all(
    entries.map((entry) =>
      loadScenario(entry, {
        ...options,
      })
    )
  );
}
