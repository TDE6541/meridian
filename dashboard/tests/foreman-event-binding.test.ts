import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  DISCLOSURE_PREVIEW_DEMO_DISCLAIMER,
  DISCLOSURE_PREVIEW_REPORT_CONTRACT,
  type DisclosurePreviewReportV1,
} from "../src/authority/authorityDashboardTypes.ts";
import type {
  SharedAuthorityEventPayload,
  SharedAuthorityRequest,
} from "../src/authority/sharedAuthorityClient.ts";
import { buildForemanGuideContext } from "../src/foremanGuide/buildForemanGuideContext.ts";
import {
  buildForemanGuideSignals,
  createForemanSignalState,
  createProactiveForemanResponse,
  dedupeForemanGuideSignals,
  FOREMAN_GUIDE_SIGNAL_VERSION,
  type ForemanSharedAuthoritySignalInput,
} from "../src/foremanGuide/foremanSignals.ts";
import { appendProactiveForemanSignals } from "../src/foremanGuide/useForemanGuide.ts";
import {
  ROLE_SESSION_PROOF_CONTRACT,
  type DashboardRoleSessionProofV1,
} from "../src/roleSession/roleSessionTypes.ts";
import { createTestLiveProjection, runTests } from "./scenarioTestUtils.ts";

function createRoleSession(
  activeSkin: DashboardRoleSessionProofV1["active_skin"] = "public"
): DashboardRoleSessionProofV1 {
  return {
    active_skin: activeSkin,
    allowed_skins: ["public", "operations", "permitting", "council"],
    auth_status: "authenticated",
    contract: ROLE_SESSION_PROOF_CONTRACT,
    department: "public_works",
    display_name: "B4 tester",
    holds: [],
    role: "public_works_director",
    source: "auth0_role_claim",
    subject_ref: "auth0|b4",
  };
}

function createContext(activeSkin: DashboardRoleSessionProofV1["active_skin"] = "public") {
  return buildForemanGuideContext({
    liveProjection: createTestLiveProjection(),
    roleSession: createRoleSession(activeSkin),
    snapshot: {
      activePanel: "control-room",
      activeSkin,
      scenarioId: "scenario-b4-a",
      sessionId: "snapshot:b4",
      sourceRefs: [
        {
          evidence_id: "scenario-b4-a",
          label: "B4 committed scenario snapshot",
          path: "dashboard/public/scenarios/routine.json",
          source_kind: "snapshot.file",
          source_ref: "snapshot.file:dashboard/public/scenarios/routine.json",
        },
      ],
    },
  });
}

function createDisclosureReport(): DisclosurePreviewReportV1 {
  return {
    contract: DISCLOSURE_PREVIEW_REPORT_CONTRACT,
    disclaimer: DISCLOSURE_PREVIEW_DEMO_DISCLAIMER,
    generated_at: "2026-04-27T12:00:00.000Z",
    public_safe_summary: "Public-safe B4 disclosure preview.",
    redaction_summary: ["Restricted fields excluded."],
    restricted_fields_excluded: ["restricted_detail"],
    scenario_label: "B4",
    session_label: "snapshot:b4",
    source_refs: [{ id: "disclosure-b4", label: "B4 disclosure source" }],
    status: "ready",
    unresolved_holds: [],
    visible_facts: ["Public-safe fact."],
  };
}

function createAuthorityInput(
  status: "approved" | "denied" | "pending",
  type: SharedAuthorityEventPayload["type"]
): ForemanSharedAuthoritySignalInput {
  const request: SharedAuthorityRequest = {
    binding_context: {
      source_refs: ["dashboard.authority.shared_endpoint"],
    },
    request_id: `ARR-B4-${status}`,
    status,
  };

  return {
    endpointStatus: "connected",
    events: [
      {
        event_payload_only: true,
        request,
        request_id: request.request_id,
        sequence: 1,
        type,
      },
    ],
    hold: null,
    requests: [request],
  };
}

const tests = [
  {
    name: "signal version string is pinned",
    run: () => {
      assert.equal(
        FOREMAN_GUIDE_SIGNAL_VERSION,
        "meridian.v2.foremanGuideSignal.v1"
      );
    },
  },
  {
    name: "scenario change creates a Foreman signal",
    run: () => {
      const previous = createForemanSignalState({
        activeScenarioId: "scenario-b4-a",
        context: createContext(),
      });
      const current = createForemanSignalState({
        activeScenarioId: "scenario-b4-b",
        context: createContext(),
      });
      const signals = buildForemanGuideSignals({ current, previous });

      assert.equal(signals.some((signal) => signal.kind === "scenario.changed"), true);
      assert.equal(signals[0]?.version, FOREMAN_GUIDE_SIGNAL_VERSION);
    },
  },
  {
    name: "skin change creates a Foreman signal",
    run: () => {
      const previous = createForemanSignalState({
        activeSkin: "operations",
        context: createContext("operations"),
      });
      const current = createForemanSignalState({
        activeSkin: "public",
        context: createContext("public"),
      });
      const signals = buildForemanGuideSignals({ current, previous });

      assert.equal(signals.some((signal) => signal.kind === "skin.changed"), true);
      assert.equal(
        signals.some((signal) => signal.kind === "public.view.selected"),
        true
      );
    },
  },
  {
    name: "authority requested creates a source-bounded signal",
    run: () => {
      const current = createForemanSignalState({
        context: createContext(),
        sharedAuthority: createAuthorityInput(
          "pending",
          "AUTHORITY_RESOLUTION_REQUESTED"
        ),
      });
      const signals = buildForemanGuideSignals({ current, previous: null });
      const requested = signals.find(
        (signal) => signal.kind === "authority.requested"
      );

      assert.ok(requested);
      assert.equal(requested.source_ref?.includes("dashboard.shared_authority"), true);
      assert.equal(requested.panel_id, "authority-resolution");
    },
  },
  {
    name: "authority approved and denied create lifecycle signals",
    run: () => {
      const approved = buildForemanGuideSignals({
        current: createForemanSignalState({
          context: createContext(),
          sharedAuthority: createAuthorityInput("approved", "AUTHORITY_APPROVED"),
        }),
        previous: null,
      });
      const denied = buildForemanGuideSignals({
        current: createForemanSignalState({
          context: createContext(),
          sharedAuthority: createAuthorityInput("denied", "AUTHORITY_DENIED"),
        }),
        previous: null,
      });

      assert.equal(
        approved.some((signal) => signal.kind === "authority.approved"),
        true
      );
      assert.equal(
        denied.some((signal) => signal.kind === "authority.denied"),
        true
      );
    },
  },
  {
    name: "absence finding creates a Foreman signal",
    run: () => {
      const signals = buildForemanGuideSignals({
        current: createForemanSignalState({ context: createContext() }),
        previous: null,
      });

      assert.equal(signals.some((signal) => signal.kind === "absence.observed"), true);
    },
  },
  {
    name: "disclosure boundary creates a Foreman signal",
    run: () => {
      const signals = buildForemanGuideSignals({
        current: createForemanSignalState({
          context: createContext(),
          disclosurePreviewReport: createDisclosureReport(),
        }),
        previous: null,
      });

      assert.equal(
        signals.some((signal) => signal.kind === "disclosure.boundary.observed"),
        true
      );
    },
  },
  {
    name: "repeated signals dedupe by dedupe key",
    run: () => {
      const [signal] = buildForemanGuideSignals({
        current: createForemanSignalState({
          activeScenarioId: "scenario-b4-b",
          context: createContext(),
        }),
        previous: createForemanSignalState({
          activeScenarioId: "scenario-b4-a",
          context: createContext(),
        }),
      });

      assert.ok(signal);
      assert.equal(dedupeForemanGuideSignals([signal, signal]).length, 1);
      assert.equal(dedupeForemanGuideSignals([signal], new Set([signal.dedupe_key])).length, 0);
    },
  },
  {
    name: "muted proactive narration does not append a message",
    run: () => {
      const [signal] = buildForemanGuideSignals({
        current: createForemanSignalState({
          context: createContext(),
          sharedAuthority: createAuthorityInput(
            "pending",
            "AUTHORITY_RESOLUTION_REQUESTED"
          ),
        }),
        previous: null,
      });

      assert.ok(signal);
      const result = appendProactiveForemanSignals({
        context: createContext(),
        messages: [],
        paused: true,
        signals: [signal],
      });

      assert.equal(result.messages.length, 0);
      assert.equal(result.processedSignals.length, 1);
    },
  },
  {
    name: "unmuted proactive narration appends a source-bounded response",
    run: () => {
      const [signal] = buildForemanGuideSignals({
        current: createForemanSignalState({
          context: createContext(),
          sharedAuthority: createAuthorityInput(
            "pending",
            "AUTHORITY_RESOLUTION_REQUESTED"
          ),
        }),
        previous: null,
      });

      assert.ok(signal);
      const result = appendProactiveForemanSignals({
        context: createContext(),
        messages: [],
        paused: false,
        signals: [signal],
      });

      assert.equal(result.messages.length, 1);
      assert.equal(result.messages[0]?.speaker, "foreman");
      assert.equal(
        (result.messages[0]?.response?.source_refs.length ?? 0) > 0,
        true
      );
      assert.equal(result.highlightedPanelId, "authority-resolution");
    },
  },
  {
    name: "endpoint HOLD signal produces HOLD-style response",
    run: () => {
      const signal = buildForemanGuideSignals({
        current: createForemanSignalState({
          context: createContext(),
          sharedAuthority: {
            endpointStatus: "holding",
            events: [],
            hold: {
              code: "shared_authority_endpoint_rejected",
              message: "HOLD: Shared authority endpoint rejected the request.",
              severity: "HOLD",
              source_ref: "/api/authority-requests",
            },
            requests: [],
          },
        }),
        previous: null,
      }).find((entry) => entry.kind === "endpoint.hold");

      assert.ok(signal);
      assert.equal(signal.kind, "endpoint.hold");
      const response = createProactiveForemanResponse(signal, createContext());

      assert.equal(response.response_kind, "hold");
      assert.equal(response.holds.length > 0, true);
    },
  },
  {
    name: "Foreman guide files do not add model, direct network, secret, or avatar tokens",
    run: async () => {
      const files = [
        "src/foremanGuide/foremanSignals.ts",
        "src/foremanGuide/useForemanEventBinding.ts",
        "src/foremanGuide/useForemanGuide.ts",
        "src/foremanGuide/ForemanMountPoint.tsx",
        "src/components/ForemanGuidePanel.tsx",
      ];
      const forbidden = [
        "VITE_ANTHROPIC_API_KEY",
        "anthropic",
        "openai",
        ".env.local",
        "ELEVENLABS_API_KEY",
        "api.elevenlabs.io",
        "xi-api-key",
        "fetch(",
        "avatar",
      ];

      for (const file of files) {
        const content = await readFile(path.resolve(process.cwd(), file), "utf8");
        for (const token of forbidden) {
          assert.equal(
            content.toLowerCase().includes(token.toLowerCase()),
            false,
            `${file} contains forbidden token ${token}`
          );
        }
      }
    },
  },
];

async function main() {
  await runTests(tests);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
