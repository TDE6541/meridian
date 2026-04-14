# [Wave 2] Closeout

## Changes made

- Added `createTypedSignalTree()` and `validateTypedSignalTree()` in `src/governance/shadows.js` while preserving `createEmptySignalTree()` and `validateMinimalSignalTree()` unchanged as compatibility shims.
- Switched all 12 existing entity validators to typed `signal_tree` validation, enforced lifecycle-bound `status` rules, promoted `utility_asset` to stateful, and added `src/entities/evidence_artifact.js` as entity 13.
- Added `docs/specs/ENTITY_ONTOLOGY.md`, appended the first real migration row in `MIGRATIONS.md`, expanded `tests/entities.test.js`, and synchronized the required canon and closeout surfaces inside the approved fence.

## Acceptance criteria

- PASS: typed `signal_tree` creator and typed validator shipped additively.
- PASS: `createEmptySignalTree()` output and `validateMinimalSignalTree()` behavior remain preserved.
- PASS: lifecycle-bound `status` validation is enforced for stateful entities.
- PASS: null-only `status` enforcement is enforced for stateless entities.
- PASS: `utility_asset` is promoted to stateful with the approved lifecycle states.
- PASS: `evidence_artifact` ships as entity 13 with the approved lifecycle states.
- PASS: `docs/specs/ENTITY_ONTOLOGY.md` documents shipped Wave 2 truth only and carries deferred/reserved surfaces explicitly.
- PASS: `tests/entities.test.js` is expanded inside fence and the structural suite is green.
- PASS: `MIGRATIONS.md` lede is `Status: Active.` and the 2026-04-14 real migration row is present.
- PASS: required canon sync surfaces were updated and `docs/UI_INDEX.md` remained untouched.
- PASS: blocked files stayed untouched and no dependency or package drift landed.

## Contract/migration status

- Entity validators now require the shipped typed `signal_tree` subset.
- Stateful entities accept `status === null` or a value from `LIFECYCLE_STATES`; stateless entities require `status === null`.
- `MIGRATIONS.md` is now active and contains the first real Meridian migration entry dated 2026-04-14.
- Out-of-repo callers relying on arbitrary free-text `status` will now fail validation.

## Test count delta

- Baseline before Wave 2: 67 total tests.
- Post-Wave 2: 102 total tests.
- Delta: +35 tests.

## Remaining HOLDs

- Ontology filename seam remains carried forward unchanged and out of scope for this wave.

## Front-door sync status

- PASS: `README.md`, `REPO_INDEX.md`, `docs/INDEX.md`, `docs/ENGINE_INDEX.md`, `docs/WHERE_TO_CHANGE_X.md`, `CLAUDE.md`, `AI_EXECUTION_DOCTRINE.md`, `TEAM_CHARTER.md`, `docs/closeouts/README.md`, and `docs/specs/ENTITY_ONTOLOGY.md` now reflect the shipped Wave 2 truth inside the approved fence.

## Lane routing confirmation

- Direct ship lane on `main`.
- No merge step is required for this wave.
- No edits made to blocked config, package, or non-approved test surfaces.

## Next action

- Carry forward the remaining HOLDs only.

## Signoff status

- Verification complete.
- Approved for ship on `main`.
