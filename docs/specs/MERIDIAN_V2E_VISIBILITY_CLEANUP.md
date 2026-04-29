# Meridian V2-E Visibility Cleanup

Status: V2-E shipped / E0-E4 implementation complete / P0 browser-proof defect patch complete / finish-lane current.

## Purpose

V2-E is the Visibility Cleanup + Demo Thesis Lock lane. It records the dashboard UI hierarchy and proof visibility work that makes the existing Meridian demo legible as a five-minute guided proof path.

The governing thesis is:

The AI tried to act. Meridian refused. The Foreman explained why. The chain proves it. The city is safer.

V2-E is visibility cleanup and demo thesis lock only. It is not feature expansion, runtime expansion, or contract expansion.

## Scope

V2-E scope is dashboard UI hierarchy and visibility only:

- product-facing default state
- guided six-act reveal visibility
- completion-derived Review Mode
- proof-surface visibility and review framing
- browser-proof defect repair for guided mission progression
- duplicate React child-key warning repair in the disclosure preview panel

This finish lane records truth only. It does not change dashboard source, tests, packages, auth/deploy/env files, runtime contracts, governance engines, authority logic, ForensicChain logic, or data contracts.

## Shipped Behavior

| Packet | Status | Shipped truth |
|---|---|---|
| E0 | PASS | Hard CSS/className visibility contract using mounted mission-surface wrappers. |
| E1 | PASS | Product-facing default state with Meridian branding, Fictional Demo Permit #4471, Mission Rail, HOLD focal card, Why This Is Safe card, Begin Mission CTA, and compact Foreman ready state. |
| E2 | PASS | Six-act guided reveal derived from existing mission playback state. |
| E3 | PASS | Completion-derived Review Mode using existing playback completion state only; all proof groups are visible after completion. |
| E4 | PASS | Mission Rail, HOLD focal card, compact Foreman, review framing, and proof card consistency polish; Failure Injection surfaced through the existing review-only collapsed Proof Tools path. |
| P0 | PASS | Guided mission controls repaired so browser proof reaches all six acts and Review Mode; `DisclosurePreviewPanel` duplicate React child-key warnings fixed with stable composite keys. |

The Constellation bridge artifact surface was cut from E4 because it required new data plumbing. That work remains deferred rather than widened into this lane.

## Six-Act Sequence

V2-E preserves the existing mission playback order:

1. Capture
2. Authority
3. Governance
4. Absence
5. Chain
6. Public

The six acts are derived from existing `MISSION_STAGE_IDS` mission playback state. V2-E does not add a new state machine.

## Key UI Contract

V2-D++ proof surfaces remain mounted. V2-E controls visibility around those mounted surfaces:

- `mission-surface`
- `is-visible`
- `is-review-visible`

Hidden surfaces are hard-hidden, non-clickable, and non-focusable through the existing visibility contract:

- inactive `mission-surface` wrappers use `display: none`
- hidden surfaces use `pointer-events: none`
- active surfaces use `display: block` or grid display when visible/review-visible
- `aria-hidden` reflects inactive stage and review state

Review Mode is completion-derived from existing playback completion state. It does not create independent proof truth.

## Browser Proof Posture

Recorded P0 browser proof used local URL:

```text
http://127.0.0.1:5173/
```

| Proof item | Status |
|---|---|
| Default state | PASS |
| Mission start | PASS |
| All six acts reachable | PASS |
| Absence climax | PASS |
| Review Mode | PASS |
| Failure Injection review-only surfacing | PASS |
| Duplicate-key warnings fixed | PASS |

Screenshots were captured for default state, Act 4 Absence, Review Mode, and Proof Tools open. The proof recorded no duplicate-key warnings. One Chrome favicon 404 was observed; it is non-UI and outside the V2-E fence.

## Explicit Non-Goals

V2-E does not ship:

- new state machine
- new contracts
- new packages
- new external API/model calls
- production city behavior
- legal, TPIA, or TRAIGA sufficiency
- live city integration
- live OpenFGA
- CIBA
- delivered notifications
- public portal behavior
- Whisper/audio upload/transcription
- root ForensicChain writes from dashboard
- live Constellation broker proof

V2-E does not claim Fort Worth is using Meridian, production city deployment, legal certification, official workflow status, model/API-backed Foreman, external voice service, or public portal behavior.

## Carried HOLDs

- Broader V2-C and V2-D++ manual/global proof HOLDs remain unchanged unless explicitly proven elsewhere.
- Production, legal, live-city, OpenFGA, CIBA, notification, public-portal, model/API, audio, and root-ForensicChain claims remain unshipped.
- Constellation artifact surfacing is deferred because it would require new data plumbing.

## Contract / Migration Status

Shared contracts changed: NO.

Dashboard UI behavior changed before this finish lane: YES.

`MIGRATIONS.md` touched by this finish lane: NO.

Migration required: NO.

V2-E records dashboard UI visibility and proof hierarchy only. It does not widen root/shared runtime contracts, V1 contracts, V2-A contracts, V2-B/GARP contracts, V2-D++ dashboard-local contracts, LiveFeedEvent kinds, ForensicChain vocabulary, package dependencies, auth/config/deploy/env surfaces, or protected runtime surfaces.
