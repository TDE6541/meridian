import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import React from "react";
import { AuthorityHandoffTheater } from "../src/components/AuthorityHandoffTheater.tsx";
import { ControlRoomShell } from "../src/components/ControlRoomShell.tsx";
import type {
  AuthorityHandoffBeat,
  AuthorityHandoffTokenState,
} from "../src/demo/authorityHandoffBeats.ts";
import { AUTHORITY_HANDOFF_BEAT_REGISTRY_VERSION } from "../src/demo/authorityHandoffBeats.ts";
import {
  AUTHORITY_HANDOFF_TOKEN_STATES,
  deriveAuthorityHandoffTheaterView,
} from "../src/demo/authorityHandoffView.ts";
import {
  createInitialMissionPlaybackState,
  type MissionPlaybackState,
} from "../src/demo/missionPlaybackController.ts";
import {
  getForemanModeForMissionStage,
  type MissionStageId,
} from "../src/demo/missionPlaybackPlan.ts";
import {
  buildMissionPhysicalProjection,
  type MissionPhysicalProjectionV1,
} from "../src/demo/missionPhysicalProjection.ts";
import { loadAllScenarioRecords, renderMarkup, runTests } from "./scenarioTestUtils.ts";

function runningStage(stageId: MissionStageId): MissionPlaybackState {
  const idle = createInitialMissionPlaybackState("guided");

  return {
    ...idle,
    activeForemanMode: getForemanModeForMissionStage(stageId),
    currentStageId: stageId,
    stageEnteredAtMs: 0,
    startedAtMs: 0,
    status: "running",
  };
}

function projectionFor(stageId: MissionStageId): MissionPhysicalProjectionV1 {
  return buildMissionPhysicalProjection({
    playback_state: runningStage(stageId),
  });
}

function withAuthorityBeats(
  projection: MissionPhysicalProjectionV1,
  activeBeats: readonly AuthorityHandoffBeat[]
): MissionPhysicalProjectionV1 {
  return {
    ...projection,
    authority_handoff: {
      ...projection.authority_handoff,
      active_beats: activeBeats,
    },
  };
}

function customBeat(
  tokenState: AuthorityHandoffTokenState,
  overrides: Partial<AuthorityHandoffBeat> = {}
): AuthorityHandoffBeat {
  return {
    approver_role: "director_authorized_approver",
    beat_id: `test-authority-beat-${tokenState}`,
    non_claims: [
      "no_live_phone_claim",
      "no_openfga_claim",
      "no_ciba_claim",
      "no_production_auth_claim",
      "no_delivered_notification_claim",
      "no_public_portal_claim",
    ],
    requester_role: "inspector_requester",
    source_ref: "dashboard/tests/authority-handoff-theater.test.tsx",
    stage_id: "authority",
    token_state: tokenState,
    version: AUTHORITY_HANDOFF_BEAT_REGISTRY_VERSION,
    visible_claim: `Visible ${tokenState} handoff claim from D4 beat data.`,
    ...overrides,
  };
}

async function readD8Source(): Promise<string> {
  return (
    await Promise.all(
      [
        "src/components/AuthorityHandoffTheater.tsx",
        "src/demo/authorityHandoffView.ts",
      ].map((file) => readFile(file, "utf8"))
    )
  ).join("\n");
}

const tests = [
  {
    name: "AuthorityHandoffTheater renders safe fallback state",
    run() {
      const markup = renderMarkup(<AuthorityHandoffTheater projection={null} />);

      assert.equal(markup.includes('data-authority-handoff-theater="true"'), true);
      assert.equal(markup.includes('data-authority-handoff-status="unavailable"'), true);
      assert.equal(markup.includes("HOLD: projection unavailable"), true);
      assert.equal(markup.includes("HOLD: role cards unavailable"), true);
      assert.equal(markup.includes("no authority role is invented"), true);
    },
  },
  {
    name: "theater renders D4 projection beat data",
    run() {
      const projection = projectionFor("authority");
      const beat = projection.authority_handoff.active_beats[0];
      const markup = renderMarkup(<AuthorityHandoffTheater projection={projection} />);

      assert.ok(beat);
      assert.equal(markup.includes('data-authority-handoff-source-mode="d4_projection_active_beat"'), true);
      assert.equal(markup.includes(beat.beat_id), true);
      assert.equal(markup.includes(beat.visible_claim), true);
      assert.equal(markup.includes(beat.source_ref), true);
      assert.equal(markup.includes('data-authority-token-state="fallback_simulated"'), true);
    },
  },
  {
    name: "requester role card renders",
    run() {
      const markup = renderMarkup(<AuthorityHandoffTheater projection={projectionFor("authority")} />);

      assert.equal(markup.includes('data-authority-role-card="inspector_requester"'), true);
      assert.equal(markup.includes('data-authority-role-side="requester"'), true);
      assert.equal(markup.includes("Inspector / requester"), true);
      assert.equal(markup.includes("Can request"), true);
      assert.equal(markup.includes("Mapped from D4 authority handoff beat requester_role"), true);
    },
  },
  {
    name: "approver role card renders when present",
    run() {
      const markup = renderMarkup(<AuthorityHandoffTheater projection={projectionFor("authority")} />);

      assert.equal(
        markup.includes('data-authority-role-card="director_authorized_approver"'),
        true
      );
      assert.equal(markup.includes('data-authority-role-side="approver"'), true);
      assert.equal(markup.includes("Director / authorized approver"), true);
      assert.equal(markup.includes("Can approve"), true);
      assert.equal(markup.includes("Can deny"), true);
    },
  },
  {
    name: "public-boundary role card renders when present",
    run() {
      const markup = renderMarkup(<AuthorityHandoffTheater projection={projectionFor("public")} />);

      assert.equal(markup.includes('data-authority-role-card="restricted_proof_boundary"'), true);
      assert.equal(markup.includes('data-authority-role-side="public-boundary"'), true);
      assert.equal(markup.includes("Public / restricted proof boundary"), true);
      assert.equal(markup.includes("View only"), true);
      assert.equal(markup.includes("Public viewer"), true);
    },
  },
  {
    name: "operations and council labels render when present in beat data",
    run() {
      const projection = withAuthorityBeats(
        projectionFor("authority"),
        [
          customBeat("in_review", {
            approver_role: "council_authorized_observer",
            requester_role: "operations_requester",
          }),
        ]
      );
      const markup = renderMarkup(<AuthorityHandoffTheater projection={projection} />);

      assert.equal(markup.includes("Operations observer"), true);
      assert.equal(markup.includes("Council observer"), true);
      assert.equal(markup.includes("In review"), true);
    },
  },
  {
    name: "authority token state renders",
    run() {
      const projection = withAuthorityBeats(projectionFor("authority"), [customBeat("approved")]);
      const markup = renderMarkup(<AuthorityHandoffTheater projection={projection} />);

      assert.equal(markup.includes('data-authority-token-state="approved"'), true);
      assert.equal(markup.includes("Authority token"), true);
      assert.equal(markup.includes("Approved"), true);
      assert.equal(markup.includes("Approved in the local projection only."), true);
    },
  },
  {
    name: "all token states have visible labels",
    run() {
      const markup = renderMarkup(<AuthorityHandoffTheater projection={projectionFor("authority")} />);

      for (const state of AUTHORITY_HANDOFF_TOKEN_STATES) {
        assert.equal(
          markup.includes(`data-authority-token-visible-label="${state}"`),
          true,
          state
        );
      }
      for (const label of [
        "Not requested",
        "Request created",
        "In review",
        "Approved",
        "Denied",
        "Held",
        "Fallback simulated",
      ]) {
        assert.equal(markup.includes(label), true, label);
      }
    },
  },
  {
    name: "visible claim non-claims source ref and local proof copy render",
    run() {
      const markup = renderMarkup(<AuthorityHandoffTheater projection={projectionFor("authority")} />);

      assert.equal(markup.includes("Visible claim"), true);
      assert.equal(markup.includes("Source ref"), true);
      assert.equal(markup.includes("Local proof posture"), true);
      assert.equal(markup.includes("local deterministic proof"), true);
      assert.equal(markup.includes("GARP/Auth proof access remains available"), true);
    },
  },
  {
    name: "OpenFGA CIBA phone notification non-claims render",
    run() {
      const markup = renderMarkup(<AuthorityHandoffTheater projection={projectionFor("authority")} />);

      assert.equal(markup.includes('data-authority-non-claim="no_openfga_claim"'), true);
      assert.equal(markup.includes('data-authority-non-claim="no_ciba_claim"'), true);
      assert.equal(markup.includes('data-authority-non-claim="no_live_phone_claim"'), true);
      assert.equal(
        markup.includes('data-authority-non-claim="no_delivered_notification_claim"'),
        true
      );
      assert.equal(markup.includes("OpenFGA: unshipped"), true);
      assert.equal(markup.includes("CIBA: unshipped"), true);
      assert.equal(markup.includes("Phone approval: carried HOLD"), true);
      assert.equal(markup.includes("Delivered notifications: unshipped"), true);
    },
  },
  {
    name: "official workflow legal public and production boundaries remain non-claims",
    run() {
      const markup = renderMarkup(<AuthorityHandoffTheater projection={projectionFor("public")} />);

      assert.equal(markup.includes("Fort Worth workflow: unclaimed"), true);
      assert.equal(markup.includes("Legal sufficiency: unclaimed"), true);
      assert.equal(markup.includes("Production auth: unclaimed"), true);
      assert.equal(markup.includes("Public portal: unclaimed"), true);
    },
  },
  {
    name: "no live phone production auth official workflow or delivered notification proof claim appears",
    run() {
      const lowerMarkup = renderMarkup(
        <AuthorityHandoffTheater projection={projectionFor("authority")} />
      ).toLowerCase();

      for (const forbidden of [
        "live phone proof passed",
        "phone approval active",
        "production auth active",
        "production auth proven",
        "official fort worth workflow active",
        "official fort worth workflow proven",
        "delivered notifications sent",
        "delivered notifications proven",
      ]) {
        assert.equal(lowerMarkup.includes(forbidden), false, forbidden);
      }
    },
  },
  {
    name: "missing required authority beat creates HOLD posture",
    run() {
      const projection = withAuthorityBeats(projectionFor("authority"), []);
      const view = deriveAuthorityHandoffTheaterView(projection);
      const markup = renderMarkup(<AuthorityHandoffTheater projection={projection} />);

      assert.equal(view.status, "holding");
      assert.equal(view.source_mode, "d4_projection_required_beat_missing");
      assert.equal(markup.includes('data-authority-handoff-status="holding"'), true);
      assert.equal(markup.includes("HOLD: required authority beat missing"), true);
      assert.equal(markup.includes("HOLD: this authority-relevant stage has no D4 authority handoff beat."), true);
    },
  },
  {
    name: "non-authority stages render compact idle ready posture",
    run() {
      const projection = projectionFor("capture");
      const view = deriveAuthorityHandoffTheaterView(projection);
      const markup = renderMarkup(<AuthorityHandoffTheater projection={projection} />);

      assert.equal(view.status, "idle");
      assert.equal(view.compact, true);
      assert.equal(markup.includes('data-authority-handoff-compact="true"'), true);
      assert.equal(markup.includes("READY: no authority handoff active"), true);
      assert.equal(markup.includes("No authority transfer active for this stage"), true);
    },
  },
  {
    name: "reduced-motion-safe labels render",
    run() {
      const markup = renderMarkup(<AuthorityHandoffTheater projection={projectionFor("governance")} />);

      assert.equal(markup.includes("Reduced motion safe"), true);
      assert.equal(
        markup.includes("role cards, token state, claim, non-claims, and source refs remain visible"),
        true
      );
      assert.equal(markup.includes("Authority token"), true);
    },
  },
  {
    name: "Presenter Cockpit includes Authority Handoff Theater",
    run: async () => {
      const records = await loadAllScenarioRecords();
      const markup = renderMarkup(<ControlRoomShell records={records} />);

      assert.equal(markup.includes("Presenter Cockpit"), true);
      assert.equal(markup.includes('data-authority-handoff-theater="true"'), true);
      assert.equal(markup.includes("Authority Handoff Theater"), true);
      assert.equal(markup.includes("Permission Transfer"), true);
    },
  },
  {
    name: "Foreman Avatar Bay Proof Spotlight and Absence Shadow Map remain visible",
    run: async () => {
      const records = await loadAllScenarioRecords();
      const markup = renderMarkup(<ControlRoomShell records={records} />);

      assert.equal(markup.includes('data-foreman-avatar-bay="true"'), true);
      assert.equal(markup.includes("Foreman Avatar Bay"), true);
      assert.equal(markup.includes('data-proof-spotlight="true"'), true);
      assert.equal(markup.includes("Evidence Beam"), true);
      assert.equal(markup.includes('data-absence-shadow-map="true"'), true);
      assert.equal(markup.includes("Absence Shadow Map"), true);
    },
  },
  {
    name: "Proof Tools remain grouped and collapsed by default",
    run: async () => {
      const records = await loadAllScenarioRecords();
      const markup = renderMarkup(<ControlRoomShell records={records} />);

      assert.equal(markup.includes('data-proof-tools="collapsed-by-default"'), true);
      assert.equal(markup.includes("<summary>Proof Tools</summary>"), true);
      assert.equal(/<details[^>]*class="mission-proof-tools"[^>]* open/.test(markup), false);
    },
  },
  {
    name: "Permit anchor rail and current decision focal card remain visible",
    run: async () => {
      const records = await loadAllScenarioRecords();
      const markup = renderMarkup(<ControlRoomShell records={records} />);

      assert.equal(markup.includes("Permit #4471"), true);
      assert.equal(markup.includes('data-current-decision-card="true"'), true);
      assert.equal(markup.includes("Current decision / HOLD"), true);
      assert.equal(markup.includes('data-mission-rail="true"'), true);
      for (const label of ["Capture", "Authority", "Governance", "Absence", "Chain", "Public"]) {
        assert.equal(markup.includes(`data-mission-stage-label="${label}"`), true, label);
      }
    },
  },
  {
    name: "D8 source performs no endpoint mutation or live authority call",
    run: async () => {
      const source = await readD8Source();

      for (const forbidden of [
        "/api/authority-requests",
        "authority-requests",
        "fetch(",
        "XMLHttpRequest",
        "Auth0Provider",
        "sendNotification",
        "navigator.vibrate",
      ]) {
        assert.equal(source.includes(forbidden), false, forbidden);
      }
    },
  },
  {
    name: "D8 source has no model key package root skin stale render or ForensicChain write behavior",
    run: async () => {
      const source = await readD8Source();

      for (const forbidden of [
        ["OPENAI", "API", "KEY"].join("_"),
        ["ANTHROPIC", "API", "KEY"].join("_"),
        "apiKey",
        "browser-exposed",
        "package.json",
        "../src/skins",
        "../../src/skins",
        ["src", "skins"].join("/"),
        ["step", "skins", "renders"].join("."),
        "appendForensicChain",
        "writeForensicChain",
        "recordForensicChain",
      ]) {
        assert.equal(source.includes(forbidden), false, forbidden);
      }
    },
  },
  {
    name: "D8 source has no direct DOM poking or imperative click choreography",
    run: async () => {
      const source = await readD8Source();

      for (const forbidden of [
        "document.",
        "querySelector",
        "getElementById",
        ".click()",
        "dispatchEvent",
        "scrollIntoView",
        "useEffect",
      ]) {
        assert.equal(source.includes(forbidden), false, forbidden);
      }
    },
  },
  {
    name: "step.skins.outputs remains canonical",
    run: async () => {
      const adapterSource = await readFile("src/adapters/skinPayloadAdapter.ts", "utf8");

      assert.equal(adapterSource.includes(["step", "skins", "outputs"].join(".")), true);
      assert.equal(adapterSource.includes(["step", "skins", "renders"].join(".")), false);
    },
  },
  {
    name: "D8 markup avoids production legal and live-city overclaims",
    run() {
      const lowerMarkup = renderMarkup(
        <AuthorityHandoffTheater projection={projectionFor("authority")} />
      ).toLowerCase();

      for (const forbidden of [
        "production city operation",
        "production city active",
        "live fort worth data",
        "legally sufficient",
        "certified legal",
        "tpia compliance",
        "traiga compliance",
        "public portal behavior active",
      ]) {
        assert.equal(lowerMarkup.includes(forbidden), false, forbidden);
      }
    },
  },
];

await runTests(tests);
