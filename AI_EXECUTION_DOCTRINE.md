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
  bridge/*.js
  config/constellation.js
  entities/*.js
  governance/runtime/*.js
  governance/shadows.js
tests/
  bridge*.test.js
  config.test.js
  deny-patterns.test.js
  entities.test.js
  governance.policyPack.test.js
  governance.runtime.test.js
  fixtures/governance/*.json
  fixtures/nats/*.json
docs/
  INDEX.md
  ENGINE_INDEX.md
  UI_INDEX.md
  WHERE_TO_CHANGE_X.md
  closeouts/README.md
  closeouts/WAVE1_CLOSEOUT.md
  closeouts/WAVE2_CLOSEOUT.md
  closeouts/WAVE3_CLOSEOUT.md
  closeouts/WAVE4A_BLOCK_A_CLOSEOUT.md
  closeouts/WAVE4A_BLOCK_B_CLOSEOUT.md
  specs/ENTITY_ONTOLOGY.md
  specs/NATS_EVENT_COMMAND_TRANSLATION.md
  specs/WAVE4A_GOVERNANCE_RUNTIME.md
  specs/WAVE3_NATS_BRIDGE.md
scripts/
  synthetic-constellation.js
```

## Operating Rules

- Work from evidence that exists in the repo or approved session input.
- Keep scope locked to the approved block.
- Preserve canon alignment across root documents.
- Treat upstream references as references unless their contents are available in this repo.
- Surface uncertainty as HOLD.
- Describe Wave 3 only as a transport-only bridge and fail-closed governance stub.
- Describe Wave 4A Blocks A-B only as bounded `command_request` runtime activation plus the static local policy pack, not as event-side routing, publisher widening, or full governance runtime completion.

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
- Do not widen Wave 3 into actor-level authority or mutation behavior.
- Stop if repo truth conflicts with the approved task.

## Verification Rules

- Inspect the resulting repo tree.
- Confirm root canon matches actual filesystem truth.
- Confirm blocked surfaces remain untouched.
- Confirm required placeholders exist only where approved.
- Confirm no extra files entered the repo.
- Confirm the two reference files remain unstaged.

## Contract And Migration Rules

- Root canon is a contract surface and must stay synchronized.
- Bridge-local contracts do not widen the persistent Wave 2 entity contract.
- Wave 4A Blocks A-B do not widen `GovernanceEvaluationRequest`, `GovernancePublication`, or `signal_tree`.
- Migration records are append-only after real changes require them.
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
