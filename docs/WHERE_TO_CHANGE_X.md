# Where To Change X

| Change Target | Primary Path(s) | Notes |
|---|---|---|
| Front-door repo truth | `README.md`, `REPO_INDEX.md`, `docs/INDEX.md` | Keep top-level discoverability truthful and synchronized. |
| Agent start surfaces | `README.md`, `CLAUDE.md` | Start links and execution posture live here. |
| Bridge runtime | `src/bridge/*.js` | Transport-only Wave 3 bridge surfaces; adapter activation may delegate into `src/governance/runtime/`, but no entity or KV mutation belongs here. |
| Governance runtime activation | `src/governance/runtime/*.js` | Wave 4A bounded `command_request` evaluator plus the static civic policy pack and Block C runtime subset; no event-side routing, publisher widening, or shape widening belongs here. |
| Bridge specs | `docs/specs/WAVE3_NATS_BRIDGE.md`, `docs/specs/NATS_EVENT_COMMAND_TRANSLATION.md` | Describe shipped bridge truth only; do not imply live broker proof or actor-level authority. |
| Governance runtime spec and closeouts | `docs/specs/WAVE4A_GOVERNANCE_RUNTIME.md`, `docs/closeouts/WAVE4A_BLOCK_A_CLOSEOUT.md`, `docs/closeouts/WAVE4A_BLOCK_B_CLOSEOUT.md`, `docs/closeouts/WAVE4A_BLOCK_C_CLOSEOUT.md` | Record Wave 4A activation, static policy-pack truth, and Block C runtime subset behavior without rewriting frozen Wave 3 docs. |
| Bridge and runtime tests/fixtures | `tests/bridge*.test.js`, `tests/governance.runtime.test.js`, `tests/governance.policyPack.test.js`, `tests/governance.runtimeSubset.test.js`, `tests/fixtures/governance/*.json`, `tests/fixtures/nats/*.json`, `scripts/synthetic-constellation.js` | Fixture-backed proof for subject cataloging, translation, subscribers, publications, adapter delegation, and bounded governance runtime outcomes including `SUPERVISE`. |
| Governance shadows | `src/governance/shadows.js` | Shared shadow substrate for entity scaffolds. |
| Entity scaffolds | `src/entities/*.js` | 13 locked scaffold files; do not widen without explicit scope. |
| Entity ontology spec | `docs/specs/ENTITY_ONTOLOGY.md` | Wave 2 shipped typed `signal_tree` and status rules live here. |
| Constellation config | `src/config/constellation.js` | Read-only Meridian publisher/config substrate imported by the bridge. |
| Structural proof tests | `tests/config.test.js`, `tests/deny-patterns.test.js`, `tests/entities.test.js` | Keep package/config/entity posture truthful. |
| Closeouts | `docs/closeouts/README.md`, `docs/closeouts/WAVE1_CLOSEOUT.md`, `docs/closeouts/WAVE2_CLOSEOUT.md`, `docs/closeouts/WAVE3_CLOSEOUT.md`, `docs/closeouts/WAVE4A_BLOCK_A_CLOSEOUT.md`, `docs/closeouts/WAVE4A_BLOCK_B_CLOSEOUT.md`, `docs/closeouts/WAVE4A_BLOCK_C_CLOSEOUT.md` | Durable delivered-wave summaries. |
| Deny matrix | `CLAUDE.md` (Block 0 Deny Matrix) | Sensitive edit guard posture and patterns. |
