import type { ScenarioRunnerReport } from "../types/scenario.ts";

type ValidationSuccess<T> = {
  ok: true;
  value: T;
};

type ValidationFailure = {
  ok: false;
  issues: string[];
};

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

const REQUIRED_STEP_SECTIONS = [
  "pipeline",
  "matching",
  "governance",
  "authority",
  "forensic",
  "skins",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function pushMissing(issues: string[], path: string, message: string) {
  issues.push(`${path}: ${message}`);
}

export class ScenarioValidationError extends Error {
  readonly issues: string[];

  constructor(sourceLabel: string, issues: string[]) {
    super(`${sourceLabel} failed validation:\n- ${issues.join("\n- ")}`);
    this.name = "ScenarioValidationError";
    this.issues = issues;
  }
}

export function validateScenarioPayload(
  value: unknown
): ValidationResult<ScenarioRunnerReport> {
  const issues: string[] = [];

  if (!isRecord(value)) {
    return {
      ok: false,
      issues: ["payload: expected top-level object"],
    };
  }

  if (!isNonEmptyString(value.contractVersion)) {
    pushMissing(issues, "contractVersion", "expected non-empty string");
  }

  if (!isRecord(value.runner)) {
    pushMissing(issues, "runner", "expected object");
  }

  if (!Array.isArray(value.scenarios)) {
    pushMissing(issues, "scenarios", "expected array");
  } else if (value.scenarios.length === 0) {
    pushMissing(issues, "scenarios", "expected at least one scenario entry");
  } else {
    value.scenarios.forEach((scenarioEntry, scenarioIndex) => {
      const scenarioPath = `scenarios[${scenarioIndex}]`;

      if (!isRecord(scenarioEntry)) {
        pushMissing(issues, scenarioPath, "expected object");
        return;
      }

      if (!isRecord(scenarioEntry.result)) {
        pushMissing(issues, `${scenarioPath}.result`, "expected object");
        return;
      }

      const result = scenarioEntry.result;

      if (!isNonEmptyString(result.contractVersion)) {
        pushMissing(
          issues,
          `${scenarioPath}.result.contractVersion`,
          "expected non-empty string"
        );
      }

      if (!isNonEmptyString(result.scenarioId)) {
        pushMissing(
          issues,
          `${scenarioPath}.result.scenarioId`,
          "expected non-empty string"
        );
      }

      if (!isNonEmptyString(result.status)) {
        pushMissing(
          issues,
          `${scenarioPath}.result.status`,
          "expected non-empty string"
        );
      }

      if (!Array.isArray(result.steps)) {
        pushMissing(issues, `${scenarioPath}.result.steps`, "expected array");
        return;
      }

      result.steps.forEach((step, stepIndex) => {
        const stepPath = `${scenarioPath}.result.steps[${stepIndex}]`;

        if (!isRecord(step)) {
          pushMissing(issues, stepPath, "expected object");
          return;
        }

        REQUIRED_STEP_SECTIONS.forEach((fieldName) => {
          if (!isRecord(step[fieldName])) {
            pushMissing(issues, `${stepPath}.${fieldName}`, "expected object");
          }
        });
      });
    });
  }

  if (issues.length > 0) {
    return {
      ok: false,
      issues,
    };
  }

  return {
    ok: true,
    value: value as ScenarioRunnerReport,
  };
}

export function assertValidScenarioPayload(
  value: unknown,
  sourceLabel: string
): ScenarioRunnerReport {
  const result = validateScenarioPayload(value);

  if (!result.ok) {
    throw new ScenarioValidationError(sourceLabel, result.issues);
  }

  return result.value;
}
