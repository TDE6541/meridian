# Where To Change X

| Change Target | Primary Path(s) | Notes |
|---|---|---|
| Front-door repo truth | `README.md`, `REPO_INDEX.md`, `docs/INDEX.md` | Keep top-level discoverability truthful and synchronized. |
| Agent start surfaces | `README.md`, `CLAUDE.md` | Start links and execution posture live here. |
| Bridge runtime | `src/bridge/*.js` | Transport-only Wave 3 bridge surfaces; no entity or KV mutation belongs here. |
| Bridge specs | `docs/specs/WAVE3_NATS_BRIDGE.md`, `docs/specs/NATS_EVENT_COMMAND_TRANSLATION.md` | Describe shipped bridge truth only; do not imply live broker proof or actor-level authority. |
| Bridge tests and fixtures | `tests/bridge*.test.js`, `tests/fixtures/nats/*.json`, `scripts/synthetic-constellation.js` | Fixture-backed proof for subject cataloging, translation, subscribers, publications, and fail-closed governance transport. |
| Governance shadows | `src/governance/shadows.js` | Shared shadow substrate for entity scaffolds. |
| Entity scaffolds | `src/entities/*.js` | 13 locked scaffold files; do not widen without explicit scope. |
| Entity ontology spec | `docs/specs/ENTITY_ONTOLOGY.md` | Wave 2 shipped typed `signal_tree` and status rules live here. |
| Constellation config | `src/config/constellation.js` | Read-only Meridian publisher/config substrate imported by the bridge. |
| Structural proof tests | `tests/config.test.js`, `tests/deny-patterns.test.js`, `tests/entities.test.js` | Keep package/config/entity posture truthful. |
| Closeouts | `docs/closeouts/README.md`, `docs/closeouts/WAVE1_CLOSEOUT.md`, `docs/closeouts/WAVE2_CLOSEOUT.md`, `docs/closeouts/WAVE3_CLOSEOUT.md` | Durable delivered-wave summaries. |
| Deny matrix | `CLAUDE.md` (Block 0 Deny Matrix) | Sensitive edit guard posture and patterns. |
