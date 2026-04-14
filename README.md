# Meridian

Meridian is a governed city digital twin intelligence repo. This repository currently contains the Wave 1 foundation and the Wave 2 entity ontology extension work. It is a controlled build substrate, not a runnable application or a production runtime.

## Agent Start Here

1. [CLAUDE.md](CLAUDE.md)
2. [REPO_INDEX.md](REPO_INDEX.md)
3. [docs/INDEX.md](docs/INDEX.md)

## Current Status

Wave 2 — entity ontology extension over the Wave 1 foundation

## What This Is

- A Meridian-native repo substrate for governed execution.
- A root canon set for scope, posture, and closeout discipline.
- A Wave 1 foundation surface widened in Wave 2 with typed signal_tree ontology, 13 civic entity scaffolds, and structural test artifacts.

## What This Is Not

- Not a runnable application.
- Not a full production runtime, messaging integration, or deployment surface.
- Not a setup guide or dependency surface.
- Not a source of ontology detail beyond the upstream filename reference.

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
.gitignore
src/
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
    shadows.js
tests/
  .gitkeep
  config.test.js
  deny-patterns.test.js
  entities.test.js
docs/
  INDEX.md
  ENGINE_INDEX.md
  UI_INDEX.md
  WHERE_TO_CHANGE_X.md
  closeouts/
    README.md
    WAVE1_CLOSEOUT.md
    WAVE2_CLOSEOUT.md
  specs/
    ENTITY_ONTOLOGY.md
    .gitkeep
  schemas/
    .gitkeep
  learning-notes/
    .gitkeep
scripts/
  .gitkeep
```

## Upstream References

- Plugin repo: github.com/TDE6541/blue-collar-governance-plugin
- Ontology reference: MERIDIAN_ONTOLOGY_MASTER_CONVERGENCE.md
