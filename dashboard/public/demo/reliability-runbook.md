# Meridian demo reliability runbook

This runbook is dashboard-local demo support only. It is not production recovery, official city workflow, legal/TPIA guidance, or proof of mobile/device behavior.

## Engineer-only reset

Use Engineer Mode -> Reset to clean snapshot before repeated judge interactions or after visible scenario drift.

Reset target:

- snapshot mode
- first committed scenario
- step 1
- paused playback
- overlays closed
- mission presentation visible
- existing shared authority reset client invoked without changing endpoint behavior

## Verbatim recovery cues

- Auth0 hiccup: "Auth0 is slow; stay on the public snapshot view while I keep the demo moving."
- Audio failure: "Audio is optional; Foreman remains visible and I will narrate the same source-bounded cue."
- Browser voice/audio failure: "Browser voice did not start; the typed Foreman fallback is the supported path."
- Phone/mobile failure: "The phone path is HOLD; use the main screen authority cockpit and keep the judge flow manual."
- Scenario state drift: "State drift detected; I am resetting to the committed clean snapshot before continuing."
- Authority endpoint hiccup: "The shared authority endpoint is HOLD; stay on snapshot proof and refresh after reset."
- Projection/render issue: "Projection rendering is holding; switch to Engineer Mode and use the local runbook panel."

## Five eval account warm-tab checklist

Manual proof status: HOLD unless Tim supplies evidence.

- field_inspector eval tab warmed and mapped to permitting_staff.
- department_director eval tab warmed and mapped to public_works_director.
- operations_lead eval tab warmed and mapped to public_works_director.
- council_member eval tab warmed on the public proof path.
- public_viewer eval tab warmed on the public snapshot path.

## Phone smoke checklist

Manual proof status: HOLD unless Tim supplies evidence.

- Judge phone opens deployed dashboard URL.
- Authority request arrival is visible before any manual approval.
- Vibration support is observed or marked unsupported without blocking the demo.

## Walk-mode MP4 recording checklist

Manual proof status: HOLD. No MP4 fallback proof is claimed until a real asset exists.

- Record Walk mode with the dashboard URL visible.
- Verify the file is a real local MP4 asset before claiming fallback media proof.
- Place the verified asset in `dashboard/public/demo/` only after Tim supplies proof.

## Saturday warm-up checklist

- Start from snapshot mode.
- Reset to the clean scenario before judge rotations.
- Warm the authority cockpit and Foreman typed fallback.
- Carry manual phone, account, MP4, logout, and deploy-hook proof as HOLD unless supplied.
