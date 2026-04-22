# Wave 8 Corridor Scenario

## Purpose

Wave 8 adds a bounded integration lane for deterministic corridor scenario replay, deterministic matching, single-state scenario composition, multi-step resolution cascade replay, and runner-level verification over frozen scenario fixtures.

## Integration perimeter

Wave 8 shipped integration surfaces are bounded to:

- `src/integration/contracts.js`
- `src/integration/pipelineBridge.js`
- `src/integration/matchingEngine.js`
- `src/integration/corridorScenario.js`
- `src/integration/resolutionCascade.js`
- `scripts/run-corridor-scenario.js`
- `tests/fixtures/scenarios/**` (routine, contested, emergency fixture sets)
- `tests/integration/scenarioFixtures.test.js`
- `tests/integration/pipelineBridge.test.js`
- `tests/integration/matchingEngine.test.js`
- `tests/integration/corridorScenario.test.js`
- `tests/integration/corridorCascade.test.js`
- `tests/integration/corridorRunner.test.js`

Wave 8 is additive at the integration layer and does not widen Wave 1-7 runtime/module contracts.

## Scenario fixture sets

Wave 8 ships three frozen scenario fixture sets under `tests/fixtures/scenarios/`:

- `routine/lancaster-avenue-corridor-reconstruction`: routine approval flow with inspection scheduling/passing and permit issuance.
- `contested/hemphill-street-mixed-use-contested-authority`: contested authority flow with defer/condition/revoke/resolution sequence.
- `emergency/camp-bowie-water-main-break`: emergency escalation/repair flow with expected follow-up hold posture.

Each set carries the required file inventory (`scenario.json`, `beforeState.json`, `afterState.json`, `pipelineReplayOutput.json`, `expectedMatches.json`, `resolutionSequence.json`, `expectedScenarioSummary.json`, `fixtureProvenance.json`, `transcript.txt`), and provenance remains synthetic hand-curated with `NO_REAL_TPIA_OR_TRAIGA_SUFFICIENCY_CLAIM`.

## PipelineBridgeOutputV1

`src/integration/contracts.js` defines `PipelineBridgeOutputV1` (`wave8.pipelineBridgeOutput.v1`) and `src/integration/pipelineBridge.js` enforces it for both replay and live modes.

Shipped behavior:

- `REPLAY` mode consumes frozen replay artifacts deterministically.
- `LIVE` mode requires `OPENAI_API_KEY` and `MERIDIAN_PIPELINE_MODEL`.
- missing live env keys produce structured `HOLD` (`live_env_missing`) instead of unsafe fallback behavior.
- live env presence is reported as booleans only; secret values are not exposed.
- bridge output includes bounded artifact references, command info, env info, holds/errors, and provenance.

## Deterministic matching and absence detection

`src/integration/matchingEngine.js` ships deterministic clause-to-entity matching with local contract version `wave8.matchResult.v1`.

Shipped matching posture:

- deterministic token/action/corridor/evidence scoring over replayed extraction output and governance state.
- explicit unsupported/ambiguous paths return `UNMATCHED` with bounded hold codes.
- deterministic absence detection emits `unmatchedGovernanceItems` for open governance entities not addressed by supported matches.
- no LLM, embedding, vector, or network lookup path exists in matching logic.

## Single-state orchestrator behavior

`src/integration/corridorScenario.js` composes pipeline, matching, governance, authority, forensic, and skins stages into `wave8.scenarioResult.v1`.

Shipped composition posture:

- single-state scenario-profile composition over frozen fixtures.
- deterministic stage status emission (`PASS`, `HOLD`, `FAIL`, `SKIPPED`).
- governance decisions are evaluated against scenario-profile expected decision.
- expected bounded governance outcomes (`HOLD`, `BLOCK`, `REVOKE`) remain valid governed outcomes when they match frozen expectations.
- five skins (`permitting`, `council`, `operations`, `dispatch`, `public`) render each scenario output.

## Resolution cascade behavior

`src/integration/resolutionCascade.js` composes multi-step scenario execution into `wave8.cascadeResult.v1`.

Shipped cascade posture:

- frozen `resolutionSequence.steps` is the authoritative step/action order.
- per-step state transitions are evaluated for lifecycle regression; revocation rollback is only allowed on explicit `REVOKE` steps.
- each cascade step executes through full single-scenario composition and records transition evidence.
- five-skin rendering is preserved at every cascade step with step-level absence evidence by skin.
- expected bounded step holds are marked as expected; structural unexpected holds are separated from pass posture.

## Runner behavior and exit codes

`scripts/run-corridor-scenario.js` ships a bounded runner report contract (`wave8.packet5.runnerReport.v1`) local to the runner script.

Shipped runner posture:

- supported scenarios: `routine`, `contested`, `emergency`, `all`.
- supported modes: `replay`, `live`.
- `--cascade` toggles single-state vs multi-step cascade path.
- `--json` emits structured report only.
- exit codes:
  - `0` = `MATCHED_EXPECTATIONS`
  - `1` = `TECHNICAL_FAILURE`
  - `2` = `UNEXPECTED_HOLD`
- expected replay outcomes that include scenario-level `HOLD`, `BLOCK`, or `REVOKE` still classify as matched expectations when frozen comparisons pass.
- live mode without required env keys returns structured hold posture and exit code `2`.

## Carried HOLDs outside Wave 8 claim scope

- README stale Wave 7 phrasing correction is a docs sync task only.
- `src/skins/index.js` widening remains out of scope; non-default civic skin access remains per-file/integration-path based.
- this wave does not strengthen repository remote-state claims beyond locally provable state.

## Explicit non-goals

Wave 8 does not ship:

- dashboard or UI
- deployment or hosting
- live NATS broker proof
- live Auth0/OpenFGA wiring
- live Whisper/audio ingestion
- new entity types
- entity validator edits
- governance decision logic changes
- authority-topology logic changes
- forensic chain contract changes
- skin behavior changes
- real TPIA legal sufficiency
- TRAIGA 2.0 compliance
- multi-corridor routing in one scenario run
- persistent match-result store
- chain replay engine
- package/dependency expansion
- Wave 9 or Wave 10 product surfaces
