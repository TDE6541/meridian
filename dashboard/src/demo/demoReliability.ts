export type DemoRunbookCueKey =
  | "auth0_hiccup"
  | "audio_failure"
  | "browser_voice_audio_failure"
  | "phone_mobile_failure"
  | "scenario_state_drift"
  | "authority_endpoint_hiccup"
  | "projection_render_issue";

export interface DemoRunbookCue {
  key: DemoRunbookCueKey;
  label: string;
  cueSentence: string;
}

export interface DemoChecklist {
  key: string;
  label: string;
  status: "HOLD" | "READY";
  items: readonly string[];
}

export interface WalkModeFallbackState {
  assetPath: string | null;
  checklistRef: string;
  proofStatus: "HOLD" | "READY";
  summary: string;
}

export const demoRunbookCues: readonly DemoRunbookCue[] = [
  {
    key: "auth0_hiccup",
    label: "Auth0 hiccup",
    cueSentence:
      "Auth0 is slow; stay on the public snapshot view while I keep the demo moving.",
  },
  {
    key: "audio_failure",
    label: "Audio failure",
    cueSentence:
      "Audio is optional; Foreman remains visible and I will narrate the same source-bounded cue.",
  },
  {
    key: "browser_voice_audio_failure",
    label: "Browser voice/audio failure",
    cueSentence:
      "Browser voice did not start; the typed Foreman fallback is the supported path.",
  },
  {
    key: "phone_mobile_failure",
    label: "Phone/mobile failure",
    cueSentence:
      "The phone path is HOLD; use the main screen authority cockpit and keep the judge flow manual.",
  },
  {
    key: "scenario_state_drift",
    label: "Scenario state drift",
    cueSentence:
      "State drift detected; I am resetting to the committed clean snapshot before continuing.",
  },
  {
    key: "authority_endpoint_hiccup",
    label: "Authority endpoint hiccup",
    cueSentence:
      "The shared authority endpoint is HOLD; stay on snapshot proof and refresh after reset.",
  },
  {
    key: "projection_render_issue",
    label: "Projection/render issue",
    cueSentence:
      "Projection rendering is holding; switch to Engineer Mode and use the local runbook panel.",
  },
];

export const demoReliabilityChecklists: readonly DemoChecklist[] = [
  {
    key: "eval_account_warm_tabs",
    label: "Five eval account warm-tab checklist",
    status: "HOLD",
    items: [
      "field_inspector eval tab warmed and mapped to permitting_staff.",
      "department_director eval tab warmed and mapped to public_works_director.",
      "operations_lead eval tab warmed and mapped to public_works_director.",
      "council_member eval tab warmed on the public proof path.",
      "public_viewer eval tab warmed on the public snapshot path.",
    ],
  },
  {
    key: "phone_smoke",
    label: "Phone smoke checklist",
    status: "HOLD",
    items: [
      "Judge phone opens deployed dashboard URL.",
      "Authority request arrival is visible before any manual approval.",
      "Vibration support is observed or marked unsupported without blocking the demo.",
    ],
  },
  {
    key: "walk_mode_mp4",
    label: "Walk-mode MP4 recording checklist",
    status: "HOLD",
    items: [
      "Record Walk mode with the dashboard URL visible.",
      "Verify the file is a real local MP4 asset before claiming fallback media proof.",
      "Place the verified asset in dashboard/public/demo only after Tim supplies proof.",
    ],
  },
  {
    key: "saturday_warm_up",
    label: "Saturday warm-up checklist",
    status: "READY",
    items: [
      "Start from snapshot mode.",
      "Reset to the clean scenario before judge rotations.",
      "Warm the authority cockpit and Foreman typed fallback.",
      "Carry manual phone, account, MP4, logout, and deploy-hook proof as HOLD unless supplied.",
    ],
  },
];

export const walkModeFallbackState: WalkModeFallbackState = {
  assetPath: null,
  checklistRef: "dashboard/public/demo/reliability-runbook.md#walk-mode-mp4-recording-checklist",
  proofStatus: "HOLD",
  summary:
    "HOLD: no verified Walk-mode MP4 asset is shipped. The fallback slot is ready for a real supplied asset.",
};
