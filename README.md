# Meridian

Meridian is a governed city digital twin intelligence repo. This repository now contains the Wave 1 foundation, the Wave 2 entity ontology extension, the shipped Wave 3 NATS bridge substrate, and the bounded Wave 4A runtime landing zone with the Block B static civic policy pack plus Block C runtime subset integration. It is still not a full governance runtime or a runnable application.

## Agent Start Here

1. [CLAUDE.md](CLAUDE.md)
2. [REPO_INDEX.md](REPO_INDEX.md)
3. [docs/INDEX.md](docs/INDEX.md)

## Current Status

Wave 4A Block C - runtime subset integration, real `ALLOW` / `SUPERVISE` / `HOLD` / `BLOCK` paths, and canon sync

## What This Is

- A Meridian-native repo substrate for governed execution.
- A Wave 1 and Wave 2 schema surface plus a Wave 3 transport-only bridge under `src/bridge/`.
- A bounded Wave 4A governance runtime landing zone under `src/governance/runtime/` for synthetic `command_request` evaluation only.
- A static Wave 4A civic policy pack under `src/governance/runtime/meridian-governance-config.js` that remains the only runtime config source for the current evaluator.
- A bounded Wave 4A Block C runtime subset that routes synthetic requests through control-rod posture, constraints, interlocks, hold shaping, omission evaluation, continuity, and standing-risk logic.
- A fake-transport proof harness for event normalization, fail-closed command handling, and Meridian publication shaping.
- A single external runtime dependency surface: `nats`.

## What This Is Not

- Not a runnable application.
- Not live-broker proof or production Constellation compatibility proof.
- Not actor-level authorization topology, event-side governance routing, or publisher widening for `ALLOW`, `SUPERVISE`, or fail-closed `BLOCK`.
- Not entity mutation, KV mutation, or civic ForensicChain runtime persistence.
- Not a source of ontology detail beyond the shipped in-repo specs.

## Repo Structure

```text
LICENSE
README.md
REPO_INDEX.md
CLAUDE.md
TEAM_CHARTER.md
AI_EXECUTION_DOCTRINE.md
CONTRIBUTING.md
MIGRATIONS.md
package.json
package-lock.json
.gitignore
src/
  bridge/
    commandSubscriber.js
    commandTranslator.js
    eventSubscriber.js
    eventTranslator.js
    governancePublisher.js
    governanceTransportAdapter.js
    natsTransport.js
    subjectCatalog.js
  config/
    constellation.js
  entities/
    action_request.js
    authority_grant.js
    corridor_zone.js
    critical_site.js
    decision_record.js
    device.js
    evidence_artifact.js
    incident_observation.js
    inspection.js
    obligation.js
    organization.js
    permit_application.js
    utility_asset.js
  governance/
    runtime/
      decisionVocabulary.js
      meridian-governance-config.js
      evaluateGovernanceRequest.js
      runtimeSubset.js
      index.js
    shadows.js
tests/
  bridge.commandSubscriber.test.js
  bridge.commandTranslator.test.js
  bridge.eventSubscriber.test.js
  bridge.eventTranslator.test.js
  bridge.governancePublisher.test.js
  bridge.governanceTransportAdapter.test.js
  bridge.subjectCatalog.test.js
  config.test.js
  deny-patterns.test.js
  entities.test.js
  governance.policyPack.test.js
  governance.runtime.test.js
  governance.runtimeSubset.test.js
  fixtures/
    governance/
      hard-stop.commandRequest.json
      refusal.commandRequest.json
      safe-pass.commandRequest.json
      supervised.commandRequest.json
    nats/
      commands.fixture.json
      events.fixture.json
      publications.fixture.json
      telemetry.fixture.json
docs/
  INDEX.md
  ENGINE_INDEX.md
  UI_INDEX.md
  WHERE_TO_CHANGE_X.md
  closeouts/
    README.md
    WAVE1_CLOSEOUT.md
    WAVE2_CLOSEOUT.md
    WAVE3_CLOSEOUT.md
    WAVE4A_BLOCK_A_CLOSEOUT.md
    WAVE4A_BLOCK_B_CLOSEOUT.md
    WAVE4A_BLOCK_C_CLOSEOUT.md
  specs/
    ENTITY_ONTOLOGY.md
    NATS_EVENT_COMMAND_TRANSLATION.md
    WAVE4A_GOVERNANCE_RUNTIME.md
    WAVE3_NATS_BRIDGE.md
scripts/
  synthetic-constellation.js
```

## Upstream References

- Plugin repo: github.com/TDE6541/blue-collar-governance-plugin
- Ontology reference: MERIDIAN_ONTOLOGY_MASTER_CONVERGENCE.md
