# Where To Change X

| Change Target | Primary Path(s) | Notes |
|---|---|---|
| Front-door repo truth | `README.md`, `REPO_INDEX.md`, `docs/INDEX.md` | Keep top-level discoverability truthful and synchronized. |
| Agent start surfaces | `README.md`, `CLAUDE.md` | Start links and execution posture live here. |
| Governance shadows | `src/governance/shadows.js` | Shared shadow substrate for entity scaffolds. |
| Entity scaffolds | `src/entities/*.js` | 13 locked scaffold files; do not widen without explicit scope. |
| Entity ontology spec | `docs/specs/ENTITY_ONTOLOGY.md` | Wave 2 shipped typed signal_tree and status rules live here. |
| Constellation config | `src/config/constellation.js` | Narrow Wave 1 config/subject builder substrate. |
| Structural proof tests | `tests/config.test.js`, `tests/deny-patterns.test.js`, `tests/entities.test.js` | Structural verification lanes only. |
| Closeouts | `docs/closeouts/README.md`, `docs/closeouts/WAVE1_CLOSEOUT.md`, `docs/closeouts/WAVE2_CLOSEOUT.md` | Durable delivered-wave summaries. |
| Deny matrix | `CLAUDE.md` (Block 0 Deny Matrix) | Sensitive edit guard posture and patterns. |
