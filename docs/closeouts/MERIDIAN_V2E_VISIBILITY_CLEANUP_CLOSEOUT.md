# Meridian V2-E Visibility Cleanup Closeout

## Status

PASS / remote-backed on origin/main.

## Purpose

Record V2-E Visibility Cleanup + Demo Thesis Lock:

The AI tried to act. Meridian refused. The Foreman explained why. The chain proves it. The city is safer.

This closeout records dashboard UI visibility/proof hierarchy truth only. It does not change behavior.

## Packet Summary

| Packet | Status | Summary |
|---|---|---|
| E0 | PASS | Hard CSS/className visibility contract using mounted mission-surface wrappers. |
| E1 | PASS | Product-facing default state with Meridian branding, Fictional Demo Permit #4471, Mission Rail, HOLD focal card, Why This Is Safe card, Begin Mission CTA, and compact Foreman ready state. |
| E2 | PASS | Six-act guided reveal derived from existing mission playback state: Capture, Authority, Governance, Absence, Chain, Public. |
| E3 | PASS | Completion-derived Review Mode using existing playback completion state only; all proof groups visible after completion. |
| E4 | PASS | Mission Rail, HOLD focal card, compact Foreman, review framing, proof card consistency, and Failure Injection surfacing through existing review-only collapsed Proof Tools path. |
| P0 | PASS | Browser-proof defect patch restored guided mission progression to all six acts and Review Mode; duplicate React child-key warnings fixed with stable composite keys in `DisclosurePreviewPanel`. |

## Changes Made

- Created `docs/specs/MERIDIAN_V2E_VISIBILITY_CLEANUP.md`.
- Created this closeout for V2-E shipped visibility cleanup truth.
- Synced front-door docs and dashboard README so future agents can route to V2-E without widening runtime scope.
- Updated the existing master closeout compilation additively because it already exists and is maintained as a convenience artifact.
- Left `MIGRATIONS.md` unchanged because no shared contract changed.

Behavior recorded by this closeout:

- default product-facing hero
- guided six-act reveal
- completion Review Mode
- review-mode proof inspection
- Failure Injection through review-only Proof Tools
- hard-hidden inactive proof surfaces
- P0 guided mission progression repair
- P0 duplicate-key warning repair

## Acceptance Criteria

| Item | Status | Evidence |
|---|---|---|
| Default product state | PASS | E1 recorded default product-facing hero, Fictional Demo Permit #4471, Mission Rail, HOLD focal card, Why This Is Safe card, Begin Mission CTA, and compact Foreman ready state. |
| Six-act guided reveal | PASS | E2/P0 recorded all six acts reachable: Capture, Authority, Governance, Absence, Chain, Public. |
| Absence climax | PASS | Browser proof recorded Act 4 Absence PASS. |
| Completion Review Mode | PASS | E3/P0 recorded completion-derived Review Mode PASS. |
| Failure Injection review-only surfacing | PASS | E4/P0 recorded surfacing through the existing review-only collapsed Proof Tools path. |
| Duplicate-key warning fix | PASS | P0 fixed `DisclosurePreviewPanel` child keys with stable composite keys; browser proof recorded no duplicate-key warnings. |
| Hidden surfaces hard-hidden | PASS | E0 visibility contract uses `mission-surface`, `is-visible`, `is-review-visible`, hard-hidden inactive wrappers, and non-clickable inactive surfaces. |
| No source-contract/package/test/auth/deploy/runtime widening | PASS | Finish lane changed docs/front-door files only; no dashboard source, tests, package, auth/deploy/env, runtime, governance, authority, ForensicChain, or data-contract files are touched. |
| Browser proof pass | PASS | Local browser proof passed after P0 at `http://127.0.0.1:5173/`. |
| Screenshot capture pass | PASS | Default state, Act 4 Absence, Review Mode, and Proof Tools open screenshots were captured during P0 proof. |
| Constellation artifact cut/deferred | HOLD | Deferred because it required new data plumbing and would have widened the V2-E lane. |

## Contract / Migration Status

Shared contract changed: NO.

Migration row required: NO.

Dashboard UI behavior only: YES.

Root runtime/governance/authority/ForensicChain/data-contract behavior changed by this finish lane: NO.

`MIGRATIONS.md` touched: NO.

## Test Count Delta

- Dashboard floor: `593/593`.
- Repo-wide JS floor: `719/719`.
- Docs finish-lane delta: no dashboard source, tests, package, or root runtime files touched; no new test-count delta is claimed beyond the observed floors.

## Verification Commands / Results

- `npm --prefix dashboard run typecheck`: PASS.
- `npm --prefix dashboard test`: PASS, `593/593`.
- `npm --prefix dashboard run build`: PASS; Vite reported the existing large-chunk advisory only.
- `npm test`: PASS, `719/719`.
- `git diff --check`: PASS; Git reported LF-to-CRLF working-copy warnings only.

## Browser Proof Result

Local URL used:

```text
http://127.0.0.1:5173/
```

| Browser proof item | Status |
|---|---|
| Default state | PASS |
| Mission start | PASS |
| Act progression | PASS, all six acts observed |
| Absence climax | PASS |
| Review Mode | PASS |
| Failure Injection surfacing | PASS via review-only Proof Tools path |
| Console/runtime errors | PASS: no duplicate-key warnings; one Chrome favicon 404 observed, non-UI and outside V2-E fence |
| Screenshots captured | PASS: default state, Act 4 Absence, Review Mode, Proof Tools open |

## Remaining HOLDs

- Production, legal, live-city, OpenFGA, CIBA, notification, public-portal, model/API, audio, and root-ForensicChain claims remain unshipped.
- Broader manual/global proof HOLDs outside V2-E remain unchanged.
- Constellation artifact surfacing remains deferred because new data plumbing would be required.

## Front-Door Sync Status

PASS: V2-E routing was added to:

- `README.md`
- `AGENTS.md`
- `CLAUDE.md`
- `REPO_INDEX.md`
- `TEAM_CHARTER.md`
- `AI_EXECUTION_DOCTRINE.md`
- `CONTRIBUTING.md`
- `docs/INDEX.md`
- `docs/UI_INDEX.md`
- `docs/WHERE_TO_CHANGE_X.md`
- `docs/closeouts/README.md`
- `dashboard/README.md`
- `docs/closeouts/MERIDIAN_MASTER_CLOSEOUT_COMPILATION.md`

## Lane Routing Confirmation

PASS: This was dashboard UI visibility/proof hierarchy plus docs finish lane only. Runtime, dashboard source, dashboard tests, package files, auth/deploy/env files, governance engines, authority logic, ForensicChain logic, data contracts, and `MIGRATIONS.md` remain out of scope.

## Final Signoff

V2-E is shippable as a five-minute demo visibility cleanup.
