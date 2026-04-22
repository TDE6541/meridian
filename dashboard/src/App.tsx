import { useEffect, useState } from "react";
import { loadAllScenarios } from "./data/loadScenario";
import { scenarioRegistry } from "./data/scenarioRegistry";
import type {
  ScenarioResultEnvelope,
  ScenarioRunnerReport,
  ScenarioStep,
} from "./types/scenario";

type ScenarioCardState =
  | {
      entry: (typeof scenarioRegistry)[number];
      status: "loading";
    }
  | {
      entry: (typeof scenarioRegistry)[number];
      status: "ready";
      payload: ScenarioRunnerReport;
      scenario: ScenarioResultEnvelope;
    }
  | {
      entry: (typeof scenarioRegistry)[number];
      status: "error";
      error: string;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function getDecision(step: ScenarioStep): string {
  const governance = step.governance;
  if (!isRecord(governance)) {
    return "unknown";
  }

  const result = governance.result;
  if (!isRecord(result) || typeof result.decision !== "string") {
    return "unknown";
  }

  return result.decision;
}

function getRenderedSkinCount(step: ScenarioStep): number {
  const skins = step.skins;
  if (!isRecord(skins) || !Array.isArray(skins.renderedSkinIds)) {
    return 0;
  }

  return skins.renderedSkinIds.length;
}

function stepHasRequiredSections(step: ScenarioStep): boolean {
  return [
    step.pipeline,
    step.matching,
    step.governance,
    step.authority,
    step.forensic,
    step.skins,
  ].every(isRecord);
}

function describeScenario(scenario: ScenarioResultEnvelope) {
  const decisionSequence = scenario.result.steps.map(getDecision).join(" -> ");
  const stepCoverage = scenario.result.steps.filter(stepHasRequiredSections).length;
  const renderedSkinCount = getRenderedSkinCount(
    scenario.result.steps[scenario.result.steps.length - 1]
  );

  return {
    decisionSequence,
    renderedSkinCount,
    stepCoverage,
  };
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown dashboard load failure.";
}

export default function App() {
  const [cards, setCards] = useState<ScenarioCardState[]>(
    scenarioRegistry.map((entry) => ({
      entry,
      status: "loading",
    }))
  );

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      const nextCards = await Promise.all(
        scenarioRegistry.map(async (entry) => {
          try {
            const loaded = await loadAllScenarios({
              entries: [entry],
            });
            const payload = loaded[0].payload;
            const scenario = payload.scenarios[0];

            return {
              entry,
              payload,
              scenario,
              status: "ready" as const,
            };
          } catch (error) {
            return {
              entry,
              error: formatError(error),
              status: "error" as const,
            };
          }
        })
      );

      if (!cancelled) {
        setCards(nextCards);
      }
    }

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, []);

  const readyCount = cards.filter((card) => card.status === "ready").length;
  const errorCount = cards.filter((card) => card.status === "error").length;
  const overallStatus =
    errorCount > 0 ? "FAIL" : readyCount === scenarioRegistry.length ? "PASS" : "LOAD";

  return (
    <main className="app-shell">
      <section className="hero">
        <p className="eyebrow">Wave 9 Packet 1</p>
        <h1>Dashboard Package + Scenario Data Seam</h1>
        <p className="hero-copy">
          Consumption-only proof surface for fresh Wave 8 replay+cascade payloads.
          No runner edits, no skin imports, no recomputation.
        </p>
        <div className="status-strip">
          <div className="status-chip">
            <span className="status-label">overall</span>
            <strong>{overallStatus}</strong>
          </div>
          <div className="status-chip">
            <span className="status-label">loaded</span>
            <strong>
              {readyCount}/{scenarioRegistry.length}
            </strong>
          </div>
          <div className="status-chip">
            <span className="status-label">failures</span>
            <strong>{errorCount}</strong>
          </div>
        </div>
      </section>

      <section className="card-grid" aria-label="Scenario payload status">
        {cards.map((card) => {
          if (card.status === "loading") {
            return (
              <article className="scenario-card" key={card.entry.key}>
                <header className="card-header">
                  <p className="card-kicker">{card.entry.fileName}</p>
                  <h2>{card.entry.label}</h2>
                </header>
                <p className="card-status card-status--loading">Loading scenario payload...</p>
              </article>
            );
          }

          if (card.status === "error") {
            return (
              <article className="scenario-card scenario-card--error" key={card.entry.key}>
                <header className="card-header">
                  <p className="card-kicker">{card.entry.fileName}</p>
                  <h2>{card.entry.label}</h2>
                </header>
                <p className="card-status card-status--error">Validation failed</p>
                <p className="card-error">{card.error}</p>
              </article>
            );
          }

          const proof = describeScenario(card.scenario);

          return (
            <article className="scenario-card scenario-card--ready" key={card.entry.key}>
              <header className="card-header">
                <p className="card-kicker">{card.entry.fileName}</p>
                <h2>{card.entry.label}</h2>
              </header>
              <p className="card-status card-status--ready">Validated runner payload</p>
              <dl className="fact-list">
                <div>
                  <dt>runner contract</dt>
                  <dd>{card.payload.contractVersion}</dd>
                </div>
                <div>
                  <dt>result contract</dt>
                  <dd>{card.scenario.result.contractVersion}</dd>
                </div>
                <div>
                  <dt>scenario id</dt>
                  <dd>{card.scenario.result.scenarioId}</dd>
                </div>
                <div>
                  <dt>result status</dt>
                  <dd>{card.scenario.result.status}</dd>
                </div>
                <div>
                  <dt>steps with required sections</dt>
                  <dd>
                    {proof.stepCoverage}/{card.scenario.result.steps.length}
                  </dd>
                </div>
                <div>
                  <dt>final-step rendered skins</dt>
                  <dd>{proof.renderedSkinCount}</dd>
                </div>
              </dl>
              <div className="decision-proof">
                <p className="decision-label">decision sequence</p>
                <code>{proof.decisionSequence}</code>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
