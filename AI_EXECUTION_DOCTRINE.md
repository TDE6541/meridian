# Meridian AI Execution Doctrine

## Document Hierarchy

1. Approved session input
2. `CLAUDE.md`
3. `TEAM_CHARTER.md`
4. `AI_EXECUTION_DOCTRINE.md`
5. `README.md`
6. `CONTRIBUTING.md`
7. `MIGRATIONS.md`

## Repo Map

```text
LICENSE
README.md
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
  specs/
    .gitkeep
  schemas/
    .gitkeep
  learning-notes/
    .gitkeep
scripts/
  .gitkeep
```

## Operating Rules

- Work from evidence that exists in the repo or approved session input.
- Keep scope locked to the approved block.
- Preserve canon alignment across root documents.
- Treat upstream references as references unless their contents are available in this repo.
- Surface uncertainty as HOLD.

## Planning Gate

- Confirm the repo perimeter before editing.
- Name the exact files and directories to touch.
- State the verification path before execution.
- Stop for approval when the session requires a gated plan.

## Execution Rules

- Change only the approved surfaces.
- Keep prose plain and direct.
- Do not invent runtime behavior, ontology detail, or dependency detail.
- Do not add adjacent improvements.
- Stop if repo truth conflicts with the approved task.

## Verification Rules

- Inspect the resulting repo tree.
- Confirm root canon matches actual filesystem truth.
- Confirm blocked surfaces remain untouched.
- Confirm required placeholders exist only where approved.
- Confirm no extra files entered the repo.

## Contract And Migration Rules

- Root canon is a contract surface and must stay synchronized.
- Migration records are append-only after real changes require them.
- A template migration file must not imply history that did not happen.
- If a future task changes structure, update every affected canon surface in the same session.

## HOLD Format

```text
HOLD
- Trigger:
- Evidence:
- Why blocked:
- Needed to unblock:
```

## Closeout Format

```text
Changes made
Acceptance criteria status
Remaining HOLDs
Contract / migration status
Blast radius
Exact files touched
Signoff status
```
