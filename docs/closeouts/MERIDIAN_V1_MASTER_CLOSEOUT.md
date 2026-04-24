# Meridian V1 Master Closeout

Status: V1 complete / remote-backed on origin/main

Date: 2026-04-23

## Purpose

This document closes the Meridian V1 arc. Meridian V1 is complete through Wave 9. Wave 9 is the final V1 wave, and there is no Wave 10 in V1.

Future expansion begins as Meridian V2 only under a new approved envelope.

## V1 Final Remote Truth

- Final Wave 9 implementation baseline SHA: `3374d0f4ad7d410cdd37a765db8d473b36f92482`
- Final V1 closure commit SHA: determined by this closeout commit after commit time.
- Final Wave 9 commit message: `docs(dashboard): close wave9 local dashboard lane`
- Repo-wide JS verification: `511` passing / `0` failing
- Dashboard verification: `36` passing / `0` failing across `14` dashboard test files
- Visual proof HOLDs remain carried for screenshot-level 1920x1080 and 1280x720 proof.

## V1 Wave Arc

- Wave 1: repo foundation, governance shadows, 12 entity scaffolds, config substrate, and structural tests.
- Wave 2: typed `signal_tree`, lifecycle-bound status rules, `evidence_artifact`, entity ontology, and migration activation.
- Wave 3: transport-only NATS bridge, bridge-local contracts, fake transport proof, and `nats` dependency.
- Wave 4A: bounded governance runtime activation for synthetic `command_request`, static civic policy pack, runtime subset, civic confidence / promise-status output, and read-only sweep.
- Wave 4B: bounded meeting-capture pipeline, frozen Fort Worth proof path, and local governance handoff seam.
- Wave 4.5: calibration corpus, baseline/final replay artifacts, and extraction/merge/fallback tuning truth.
- Wave 5: bounded authority topology, Fort Worth authority declaration, domain/actor evaluation, and REVOKE/projection-only propagation.
- Wave 6: bounded civic forensic chain, governance/authority entry vocabulary, DI writer/persistence/publisher seam.
- Wave 7: five civic skins, public disclosure boundary, and rendering-only proof.
- Wave 8: corridor scenario integration, replay bridge, deterministic matching, single-state composition, and cascade runner.
- Wave 9: local dashboard proof, committed payload consumption, skin switcher, forensic/relationship/choreography panels, demo hardening, Director Mode / Absence Lens, and the V1 local proof cockpit.

## Final V1 Shipped Capabilities

- governed city entity substrate
- transport bridge substrate
- bounded governance runtime
- meeting-capture pipeline
- authority topology
- forensic chain
- civic skins
- corridor scenario integration
- local dashboard proof cockpit
- deterministic tests and proof posture

## What V1 Does Not Ship

- no production app
- no deployed city system
- no live broker proof
- no Auth0/OpenFGA live integration
- no public portal
- no legal/TPIA/TRAIGA compliance certification
- no live Whisper/audio ingestion claim
- no persistent live city database
- no multi-city runtime
- no Wave 10

## Final Test Posture

- Dashboard: `36` passing / `0` failing across `14` dashboard test files.
- Repo-wide JS: `511` passing / `0` failing.
- Python: not rerun in this lane because this is a docs-only V1 closure lane and no Python runtime/test surface changed.

## Contract / Migration Status

No shared contracts changed in this V1 closure lane.

`MIGRATIONS.md` remains unchanged. Existing migration rows remain the record for actual shared contract changes in Wave 2, Wave 3, Wave 4A, Wave 5, Wave 6, Wave 7, and Wave 8.

## Remaining HOLDs

- HOLD-VISUAL-1920: 1920x1080 screenshot-level visual proof remains not screenshot-verified.
- HOLD-VISUAL-1280: 1280x720 screenshot-level visual proof remains not screenshot-verified.
- Legal, live-system, deployment, auth, broker, public-portal, compliance, live audio, database, and multi-city items are V1 non-goals, not unresolved V1 ship blockers.

## Final Signoff Posture

Meridian V1 is complete. Future work starts as Meridian V2 only after a new approved envelope.
