import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import React from "react";
import { AbsenceShadowMap } from "../src/components/AbsenceShadowMap.tsx";
import { ControlRoomShell } from "../src/components/ControlRoomShell.tsx";
import {
  ABSENCE_SHADOW_SLOTS,
  type AbsenceShadowPresenceStatus,
  type AbsenceShadowSlot,
} from "../src/demo/absenceShadowSlots.ts";
import {
  ABSENCE_SHADOW_STATUS_ORDER,
  deriveAbsenceShadowMapView,
  REQUIRED_ABSENCE_SHADOW_STAGE_SLOT_LABELS,
} from "../src/demo/absenceShadowView.ts";
import { createInitialMissionPlaybackState } from "../src/demo/missionPlaybackController.ts";
import { MISSION_STAGE_IDS } from "../src/demo/missionPlaybackPlan.ts";
import {
  buildMissionPhysicalProjection,
  type MissionPhysicalProjectionV1,
} from "../src/demo/missionPhysicalProjection.ts";
import { loadAllScenarioRecords, renderMarkup, runTests } from "./scenarioTestUtils.ts";

function baseProjection(): MissionPhysicalProjectionV1 {
  return buildMissionPhysicalProjection({
    playback_state: createInitialMissionPlaybackState("guided"),
  });
}

function projectionWithSlots(
  slots: readonly AbsenceShadowSlot[]
): MissionPhysicalProjectionV1 {
  return {
    ...baseProjection(),
    absence_shadow_slots: slots,
  };
}

function slotForStatus(
  presenceStatus: AbsenceShadowPresenceStatus
): AbsenceShadowSlot {
  const template = ABSENCE_SHADOW_SLOTS[0] as AbsenceShadowSlot;

  return {
    ...template,
    closure_hint: `${presenceStatus} closure hint remains visible.`,
    expected_label: `${presenceStatus} expected evidence slot`,
    hold_ref:
      presenceStatus === "blocked" || presenceStatus === "carried_hold"
        ? `hold:${presenceStatus}`
        : null,
    presence_status: presenceStatus,
    slot_id: `absence-shadow-test-${presenceStatus}`,
    source_ref: presenceStatus === "present" ? `source:${presenceStatus}` : null,
  };
}

async function readD7Source(): Promise<string> {
  return (
    await Promise.all(
      [
        "src/components/AbsenceShadowMap.tsx",
        "src/demo/absenceShadowView.ts",
      ].map((file) => readFile(file, "utf8"))
    )
  ).join("\n");
}

const tests = [
  {
    name: "AbsenceShadowMap renders safe fallback state",
    run() {
      const markup = renderMarkup(<AbsenceShadowMap projection={null} />);

      assert.equal(markup.includes('data-absence-shadow-map="true"'), true);
      assert.equal(markup.includes('data-absence-shadow-status="unavailable"'), true);
      assert.equal(markup.includes("HOLD: projection unavailable"), true);
      assert.equal(markup.includes("Projection unavailable"), false);
      assert.equal(markup.includes("HOLD: required stage slot missing"), true);
    },
  },
  {
    name: "AbsenceShadowMap renders D4 projection slots",
    run() {
      const projection = baseProjection();
      const view = deriveAbsenceShadowMapView(projection);
      const markup = renderMarkup(<AbsenceShadowMap projection={projection} />);

      assert.equal(view.source_mode, "d4_projection_slots");
      assert.equal(
        view.groups.reduce((count, group) => count + group.slots.length, 0),
        projection.absence_shadow_slots.length
      );
      assert.equal(markup.includes('data-absence-shadow-source-mode="d4_projection_slots"'), true);
      assert.equal(markup.includes("Source evidence for Permit #4471"), true);
    },
  },
  {
    name: "slots group by all six mission stages",
    run() {
      const markup = renderMarkup(<AbsenceShadowMap projection={baseProjection()} />);

      for (const stageId of MISSION_STAGE_IDS) {
        assert.equal(
          markup.includes(`data-absence-shadow-stage="${stageId}"`),
          true,
          stageId
        );
      }
    },
  },
  {
    name: "each mission stage has at least one slot",
    run() {
      const view = deriveAbsenceShadowMapView(baseProjection());

      for (const group of view.groups) {
        assert.equal(group.slots.length > 0, true, group.stage_id);
      }
    },
  },
  {
    name: "expected labels render",
    run() {
      const markup = renderMarkup(<AbsenceShadowMap projection={baseProjection()} />);

      for (const requiredLabel of Object.values(
        REQUIRED_ABSENCE_SHADOW_STAGE_SLOT_LABELS
      )) {
        assert.equal(markup.includes(requiredLabel), true, requiredLabel);
      }
    },
  },
  {
    name: "expected kind renders",
    run() {
      const markup = renderMarkup(<AbsenceShadowMap projection={baseProjection()} />);

      for (const kind of ["source_evidence", "authority_proof", "governed_hold"]) {
        assert.equal(markup.includes(kind), true, kind);
      }
    },
  },
  {
    name: "presence status renders",
    run() {
      const markup = renderMarkup(<AbsenceShadowMap projection={baseProjection()} />);

      assert.equal(markup.includes("Presence status"), true);
      assert.equal(markup.includes("present"), true);
      assert.equal(markup.includes("carried_hold"), true);
    },
  },
  {
    name: "source ref renders when present",
    run() {
      const markup = renderMarkup(<AbsenceShadowMap projection={baseProjection()} />);

      assert.equal(markup.includes("Source ref"), true);
      assert.equal(markup.includes("dashboard/src/demo/fictionalPermitAnchor.ts"), true);
    },
  },
  {
    name: "hold ref renders when carried or blocked",
    run() {
      const projection = projectionWithSlots([
        ...baseProjection().absence_shadow_slots,
        slotForStatus("blocked"),
      ]);
      const markup = renderMarkup(<AbsenceShadowMap projection={projection} />);

      assert.equal(markup.includes("Hold ref"), true);
      assert.equal(markup.includes("hold:blocked"), true);
      assert.equal(
        markup.includes(
          "docs/closeouts/MERIDIAN_V2C_DEMO_PRESENTATION_LAYER_CLOSEOUT.md#manual-proof-status"
        ),
        true
      );
    },
  },
  {
    name: "closure hints render",
    run() {
      const markup = renderMarkup(<AbsenceShadowMap projection={baseProjection()} />);

      assert.equal(
        markup.includes("Keep the capture slot tied to the committed demo permit anchor."),
        true
      );
      assert.equal(
        markup.includes("Keep clean logout and deploy-hook cleanup proof carried as manual HOLDs."),
        true
      );
    },
  },
  {
    name: "present status has visible label",
    run() {
      const markup = renderMarkup(<AbsenceShadowMap projection={baseProjection()} />);

      assert.equal(markup.includes("Present evidence visible"), true);
      assert.equal(markup.includes("Evidence present"), true);
    },
  },
  {
    name: "absent status has visible shadow label",
    run() {
      const markup = renderMarkup(
        <AbsenceShadowMap
          projection={projectionWithSlots([slotForStatus("absent")])}
        />
      );

      assert.equal(markup.includes("Absent"), true);
      assert.equal(markup.includes("Missing evidence shadow"), true);
      assert.equal(markup.includes('data-presence-status="absent"'), true);
    },
  },
  {
    name: "carried HOLD status has visible label",
    run() {
      const markup = renderMarkup(<AbsenceShadowMap projection={baseProjection()} />);

      assert.equal(markup.includes("Carried HOLD"), true);
      assert.equal(markup.includes("Carried HOLD shadow"), true);
      assert.equal(markup.includes('data-presence-status="carried_hold"'), true);
    },
  },
  {
    name: "blocked status has visible blocking label",
    run() {
      const markup = renderMarkup(
        <AbsenceShadowMap
          projection={projectionWithSlots([slotForStatus("blocked")])}
        />
      );

      assert.equal(markup.includes("Blocking HOLD"), true);
      assert.equal(markup.includes("Blocking shadow"), true);
      assert.equal(markup.includes('data-presence-status="blocked"'), true);
    },
  },
  {
    name: "not applicable status has visible label",
    run() {
      const markup = renderMarkup(
        <AbsenceShadowMap
          projection={projectionWithSlots([slotForStatus("not_applicable")])}
        />
      );

      assert.equal(markup.includes("Not applicable"), true);
      assert.equal(markup.includes("Not applicable shadow"), true);
      assert.equal(markup.includes('data-presence-status="not_applicable"'), true);
    },
  },
  {
    name: "missing required stage slot creates HOLD posture",
    run() {
      const missingCapture = baseProjection().absence_shadow_slots.filter(
        (slot) =>
          slot.expected_label !==
          REQUIRED_ABSENCE_SHADOW_STAGE_SLOT_LABELS.capture
      );
      const projection = projectionWithSlots(missingCapture);
      const view = deriveAbsenceShadowMapView(projection);
      const markup = renderMarkup(<AbsenceShadowMap projection={projection} />);

      assert.equal(view.status, "holding");
      assert.equal(view.source_mode, "d4_projection_slots_incomplete");
      assert.equal(view.missing_required_count > 0, true);
      assert.equal(markup.includes('data-absence-shadow-required-missing="true"'), true);
      assert.equal(markup.includes("HOLD: required stage slot missing"), true);
    },
  },
  {
    name: "carried manual proof gaps are not marked resolved",
    run() {
      const view = deriveAbsenceShadowMapView(baseProjection());
      const markup = renderMarkup(<AbsenceShadowMap projection={baseProjection()} />);

      assert.equal(view.carried_manual_hold_count > 0, true);
      assert.equal(markup.includes("Carried manual proof gaps remain unresolved."), true);
      assert.equal(markup.includes("manual proof gaps are resolved"), false);
    },
  },
  {
    name: "map copy says it does not create truth",
    run() {
      const markup = renderMarkup(<AbsenceShadowMap projection={baseProjection()} />);

      assert.equal(markup.includes("does not create new truth"), true);
      assert.equal(markup.includes("does not create truth"), false);
      assert.equal(markup.includes("does not resolve holds"), true);
    },
  },
  {
    name: "map copy does not claim legal sufficiency",
    run() {
      const markup = renderMarkup(<AbsenceShadowMap projection={baseProjection()} />);
      const lowerMarkup = markup.toLowerCase();

      assert.equal(lowerMarkup.includes("does not certify legal sufficiency"), true);
      assert.equal(lowerMarkup.includes("certifies legal sufficiency"), false);
      assert.equal(lowerMarkup.includes("legally sufficient"), false);
    },
  },
  {
    name: "stable target ids and labels exist for future spotlight targeting",
    run() {
      const firstSlot = baseProjection().absence_shadow_slots[0];
      const markup = renderMarkup(<AbsenceShadowMap projection={baseProjection()} />);

      assert.ok(firstSlot);
      assert.equal(
        markup.includes(`data-absence-shadow-target-id="${firstSlot.slot_id}"`),
        true
      );
      assert.equal(markup.includes("data-absence-shadow-target-label="), true);
      assert.equal(markup.includes("Capture: Source evidence for Permit #4471"), true);
    },
  },
  {
    name: "reduced-motion-safe labels render",
    run() {
      const markup = renderMarkup(<AbsenceShadowMap projection={baseProjection()} />);

      assert.equal(markup.includes('data-absence-shadow-motion="reduced-motion-safe"'), true);
      assert.equal(markup.includes("Reduced motion safe"), true);
      assert.equal(
        markup.includes("stage labels, statuses, refs, and closure hints remain visible"),
        true
      );
    },
  },
  {
    name: "status legend exposes all five presence states",
    run() {
      const markup = renderMarkup(<AbsenceShadowMap projection={baseProjection()} />);

      for (const status of ABSENCE_SHADOW_STATUS_ORDER) {
        assert.equal(
          markup.includes(`data-absence-shadow-legend-status="${status}"`),
          true,
          status
        );
      }
    },
  },
  {
    name: "Presenter Cockpit includes Absence Shadow Map",
    run: async () => {
      const records = await loadAllScenarioRecords();
      const markup = renderMarkup(<ControlRoomShell records={records} />);

      assert.equal(markup.includes("Presenter Cockpit"), true);
      assert.equal(markup.includes('data-absence-shadow-map="true"'), true);
      assert.equal(markup.includes("Absence Shadow Map"), true);
    },
  },
  {
    name: "Foreman Avatar Bay and Proof Spotlight remain visible",
    run: async () => {
      const records = await loadAllScenarioRecords();
      const markup = renderMarkup(<ControlRoomShell records={records} />);

      assert.equal(markup.includes('data-foreman-avatar-bay="true"'), true);
      assert.equal(markup.includes("Foreman Avatar Bay"), true);
      assert.equal(markup.includes('data-proof-spotlight="true"'), true);
      assert.equal(markup.includes("Evidence Beam"), true);
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
    name: "Permit anchor six-stage rail and current decision card remain visible",
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
    name: "D7 source has no model key package root skin or stale render behavior",
    run: async () => {
      const source = await readD7Source();
      const forbidden = [
        ["OPENAI", "API", "KEY"].join("_"),
        ["ANTHROPIC", "API", "KEY"].join("_"),
        ["model", "API"].join("/"),
        "apiKey",
        ["browser", "exposed", "key"].join("-"),
        "package.json",
        "../src/skins",
        "../../src/skins",
        ["src", "skins"].join("/"),
        ["step", "skins", "renders"].join("."),
      ];

      for (const token of forbidden) {
        assert.equal(source.includes(token), false, token);
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
    name: "D7 source does not write root forensic chain truth",
    run: async () => {
      const source = await readD7Source();

      for (const token of [
        "appendForensicChain",
        "writeForensicChain",
        "recordForensicChain",
        ["root", "ForensicChain", "write"].join(" "),
      ]) {
        assert.equal(source.includes(token), false, token);
      }
    },
  },
  {
    name: "Absence Shadow Map copy avoids production and live-city overclaims",
    run() {
      const markup = renderMarkup(<AbsenceShadowMap projection={baseProjection()} />);
      const lowerMarkup = markup.toLowerCase();

      for (const forbidden of [
        "production city operation",
        "official fort worth workflow",
        "tpia compliance",
        "traiga compliance",
        "public portal behavior",
        "delivered notification behavior",
        "live openfga",
        "ciba",
        "live city",
      ]) {
        assert.equal(lowerMarkup.includes(forbidden), false, forbidden);
      }
    },
  },
];

await runTests(tests);
