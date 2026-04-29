# Meridian AGENTS Map

## Repo Identity

Meridian is a governed city digital twin intelligence repo.

## Read First

1. [`README.md`](README.md)
2. [`CLAUDE.md`](CLAUDE.md)
3. [`REPO_INDEX.md`](REPO_INDEX.md)
4. [`AI_EXECUTION_DOCTRINE.md`](AI_EXECUTION_DOCTRINE.md)
5. [`docs/INDEX.md`](docs/INDEX.md)
6. [`docs/MERIDIAN_CURRENT_STATE_LEDGER.md`](docs/MERIDIAN_CURRENT_STATE_LEDGER.md)
7. [`docs/ENGINE_INDEX.md`](docs/ENGINE_INDEX.md)
8. [`docs/WHERE_TO_CHANGE_X.md`](docs/WHERE_TO_CHANGE_X.md)
9. [`docs/specs/MERIDIAN_V2A_LIVE_CIVIC_NERVOUS_SYSTEM.md`](docs/specs/MERIDIAN_V2A_LIVE_CIVIC_NERVOUS_SYSTEM.md)
10. [`docs/closeouts/MERIDIAN_V2A_CLOSEOUT.md`](docs/closeouts/MERIDIAN_V2A_CLOSEOUT.md)
11. [`docs/specs/MERIDIAN_V2B_GARP_AUTHORITY_RUNWAY.md`](docs/specs/MERIDIAN_V2B_GARP_AUTHORITY_RUNWAY.md)
12. [`docs/closeouts/MERIDIAN_V2B_GARP_CLOSEOUT.md`](docs/closeouts/MERIDIAN_V2B_GARP_CLOSEOUT.md)
13. [`docs/specs/MERIDIAN_V2B_FOREMAN_GUIDED_PROOF_COCKPIT.md`](docs/specs/MERIDIAN_V2B_FOREMAN_GUIDED_PROOF_COCKPIT.md)
14. [`docs/closeouts/MERIDIAN_V2B_FOREMAN_PLATINUM_LOCAL_CLOSEOUT.md`](docs/closeouts/MERIDIAN_V2B_FOREMAN_PLATINUM_LOCAL_CLOSEOUT.md)
15. [`docs/closeouts/MERIDIAN_V2B_AUTH5_DEPLOYED_PROOF_CLOSEOUT.md`](docs/closeouts/MERIDIAN_V2B_AUTH5_DEPLOYED_PROOF_CLOSEOUT.md)
16. [`docs/specs/MERIDIAN_V2C_DEMO_PRESENTATION_LAYER.md`](docs/specs/MERIDIAN_V2C_DEMO_PRESENTATION_LAYER.md)
17. [`docs/closeouts/MERIDIAN_V2C_DEMO_PRESENTATION_LAYER_CLOSEOUT.md`](docs/closeouts/MERIDIAN_V2C_DEMO_PRESENTATION_LAYER_CLOSEOUT.md)
18. [`docs/specs/MERIDIAN_V2D_EMBODIED_FOREMAN_CIVIC_PROOF_THEATER.md`](docs/specs/MERIDIAN_V2D_EMBODIED_FOREMAN_CIVIC_PROOF_THEATER.md)
19. [`docs/closeouts/MERIDIAN_V2D_EMBODIED_FOREMAN_CIVIC_PROOF_THEATER_CLOSEOUT.md`](docs/closeouts/MERIDIAN_V2D_EMBODIED_FOREMAN_CIVIC_PROOF_THEATER_CLOSEOUT.md)
20. [`docs/specs/MERIDIAN_V2E_VISIBILITY_CLEANUP.md`](docs/specs/MERIDIAN_V2E_VISIBILITY_CLEANUP.md)
21. [`docs/closeouts/MERIDIAN_V2E_VISIBILITY_CLEANUP_CLOSEOUT.md`](docs/closeouts/MERIDIAN_V2E_VISIBILITY_CLEANUP_CLOSEOUT.md)
22. Relevant active-task specs in `docs/specs/`
23. Relevant active-task closeouts in `docs/closeouts/`

## Operating Posture

- HOLD > GUESS
- Evidence-first
- Minimal diffs
- No silent mangling
- Contract discipline
- Keep claims bounded to visible repo truth.
- Keep root canon synchronized when tracked truth changes.
- Treat Meridian V1 as closed through Wave 9; there is no Wave 10 in V1.
- Treat V2-A as local/demo-day extension truth only unless a later approved envelope widens it.
- Treat V2-B/GARP Authority Runway as a local G1-G5 sublane only; it does not close full V2-B Foreman.
- Treat V2-B Foreman/Auth local proof cockpit as shipped local/pre-deployment guide/explainer truth only; AUTH-5 deployed Vercel/Auth0 demo proof is recorded separately and remains a proof cockpit, not production civic infrastructure.
- Treat V2-C Demo Presentation Layer as shipped dashboard-local presentation/choreography/reliability truth only; DEMO-1 through DEMO-10 are implementation-complete and no root/shared contracts were widened.
- Treat V2-D++ Embodied Foreman Civic Proof Theater as shipped dashboard-local demo/proof theater truth only; D1-D14 are implementation-complete, D15 validated dashboard `593/593` plus repo-wide JS `719/719`, and no root/shared contracts were widened.
- Treat V2-E Visibility Cleanup + Demo Thesis Lock as shipped dashboard-local visibility/proof hierarchy truth only; E0-E4 are implementation-complete, P0 restored guided mission progression and fixed duplicate-key warnings, browser proof passed at `http://127.0.0.1:5173/`, and no root/shared contracts were widened.
- Treat V2-C/V2-D++ manual proof items as HOLD: eval account warm-tabs, phone smoke, mobile/judge-device proof, full authority choreography screenshots, Walk-mode MP4 proof, clean logout proof, deploy-hook cleanup proof, and final V2-B closeout.
- Treat Foreman behavior beyond the shipped dashboard-local guide/explainer cockpit as gated until Tim approves a later widening packet.

## Codex Scope Note

- This `AGENTS.md` is a Codex navigation/control surface.
- The deeper tracked canon is the system of record.
- If this file and tracked canon diverge, tracked canon wins until this file is resynced.

## Hard Boundaries

- Do not widen scope without explicit approval.
- Do not claim runtime behavior that is not proven in repo truth.
- Do not touch auth/config/security surfaces without explicit scope approval.
- Do not claim production, live city integration, legal sufficiency, live broker proof, Auth0/OpenFGA, live Whisper/audio, or Foreman behavior without explicit shipped proof.
- Do not claim live OpenFGA, CIBA, delivered notifications, public portal behavior, legal/TPIA sufficiency, official Fort Worth workflow, or full V2-B Foreman closure from the GARP Authority Runway.
- Do not claim AUTH-5 deployed Vercel/Auth0 proof beyond `docs/closeouts/MERIDIAN_V2B_AUTH5_DEPLOYED_PROOF_CLOSEOUT.md`; do not claim mobile/judge device proof, full authority choreography proof, clean logout proof, deploy hook cleanup, final V2-B closeout, model/API calls, external voice service, Whisper/audio upload/transcription, or browser-exposed model API keys from the B7/AUTH-5 proof cockpit.
- Do not claim V2-C proves production city behavior, legal/TPIA/TRAIGA sufficiency, official Fort Worth workflow, public portal behavior, live OpenFGA, CIBA, delivered notifications, model/API-backed Foreman, external voice service, Whisper/audio upload/transcription, or any manual proof item still marked HOLD in `docs/closeouts/MERIDIAN_V2C_DEMO_PRESENTATION_LAYER_CLOSEOUT.md`.
- Do not claim V2-D++ proves production city behavior, official Fort Worth workflow, legal/TPIA/TRAIGA sufficiency, public portal behavior, live OpenFGA, CIBA, delivered notifications, live LLM/model/API-backed Foreman, browser-exposed keys, external voice service, Whisper/audio upload/transcription, root ForensicChain writes, legal audit trail behavior, live GIS/Accela/city-record behavior, mobile/judge-device proof, or any manual/global HOLD still carried in `docs/closeouts/MERIDIAN_V2D_EMBODIED_FOREMAN_CIVIC_PROOF_THEATER_CLOSEOUT.md`.
- Do not claim V2-E proves production city behavior, official Fort Worth workflow, legal/TPIA/TRAIGA sufficiency, public portal behavior, live OpenFGA, CIBA, delivered notifications, live LLM/model/API-backed Foreman, external voice service, Whisper/audio upload/transcription, root ForensicChain writes, live Constellation broker proof, mobile/judge-device proof, or any broader manual/global HOLD still carried in `docs/closeouts/MERIDIAN_V2E_VISIBILITY_CLEANUP_CLOSEOUT.md`.
