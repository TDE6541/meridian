import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  createMissionRunRecorder,
  recordAbsenceShadow,
  recordAuthorityHandoff,
  recordFallbackUsed,
  recordForemanCue,
  recordHoldRaised,
  recordJudgeInterrupt,
  recordMissionCompleted,
  recordMissionStarted,
  recordProofSpotlight,
  recordStageEntered,
  resetMissionRunRecorder,
  type MissionRunReceipt,
} from "../src/demo/missionRunRecorder.ts";
import { runTests } from "./scenarioTestUtils.ts";

function ticketKinds(receipt: MissionRunReceipt): readonly string[] {
  return receipt.events.map((event) => event.kind);
}

function startReceipt(): MissionRunReceipt {
  return recordMissionStarted(createMissionRunRecorder(), {
    source_ref: "test:mission",
    summary: "Mission started.",
    timestamp: "2026-04-28T12:00:00.000Z",
  });
}

await runTests([
  {
    name: "recorder initializes a fresh dashboard-local run id",
    run() {
      const first = createMissionRunRecorder();
      const second = createMissionRunRecorder({ runSequence: 2 });

      assert.equal(first.version, "meridian.v2d.missionRunReceipt.v1");
      assert.equal(first.run_id, "mission-receipt-run-1");
      assert.equal(second.run_id, "mission-receipt-run-2");
      assert.notEqual(first.run_id, second.run_id);
      assert.equal(first.status, "idle");
      assert.equal(first.events.length, 0);
    },
  },
  {
    name: "recorder records mission.started with legal audit claim false",
    run() {
      const receipt = startReceipt();

      assert.deepEqual(ticketKinds(receipt), ["mission.started"]);
      assert.equal(receipt.started_at, "2026-04-28T12:00:00.000Z");
      assert.equal(receipt.events[0]?.legal_audit_claim, false);
      assert.equal(receipt.events[0]?.version, "meridian.v2d.missionReceiptTicket.v1");
    },
  },
  {
    name: "recorder records stage.entered once per stage",
    run() {
      const once = recordStageEntered(startReceipt(), "capture", {
        source_ref: "test:stage",
        summary: "Capture entered.",
        timestamp: "2026-04-28T12:00:01.000Z",
      });
      const twice = recordStageEntered(once, "capture", {
        source_ref: "test:stage",
        summary: "Capture entered again.",
        timestamp: "2026-04-28T12:00:02.000Z",
      });

      assert.equal(
        twice.events.filter((event) => event.kind === "stage.entered").length,
        1
      );
      assert.equal(twice.active_stage_id, "capture");
      assert.equal(twice.stages.find((stage) => stage.stage_id === "capture")?.status, "active");
    },
  },
  {
    name: "recorder records foreman cue proof spotlight absence authority judge hold fallback and completion",
    run() {
      let receipt = recordStageEntered(startReceipt(), "authority", {
        source_ref: "test:stage",
        summary: "Authority entered.",
      });

      receipt = recordForemanCue(receipt, "authority", {
        source_ref: "test:foreman",
        summary: "Foreman cue.",
      });
      receipt = recordProofSpotlight(receipt, "authority", {
        source_ref: "test:spotlight",
        summary: "Spotlight shown.",
      });
      receipt = recordAbsenceShadow(receipt, "authority", {
        source_ref: "test:absence",
        summary: "Absence shadow shown.",
      });
      receipt = recordAuthorityHandoff(receipt, "authority", {
        source_ref: "test:authority",
        summary: "Authority handoff shown.",
      });
      receipt = recordJudgeInterrupt(receipt, "authority", {
        source_ref: "test:judge",
        summary: "Judge interrupted.",
      });
      receipt = recordHoldRaised(receipt, "authority", {
        source_ref: "test:hold",
        summary: "HOLD raised.",
      });
      receipt = recordFallbackUsed(receipt, "authority", {
        source_ref: "test:fallback",
        summary: "Typed fallback used.",
      });
      receipt = recordMissionCompleted(receipt, {
        source_ref: "test:complete",
        summary: "Mission completed.",
      });

      assert.deepEqual(ticketKinds(receipt), [
        "mission.started",
        "stage.entered",
        "foreman.cue",
        "proof.spotlight",
        "absence.shadow",
        "authority.handoff",
        "judge.interrupt",
        "hold.raised",
        "fallback.used",
        "mission.completed",
      ]);
      assert.equal(receipt.holds.some((hold) => hold.summary === "HOLD raised."), true);
      assert.equal(
        receipt.warnings.some((warning) => warning.summary === "Typed fallback used."),
        true
      );
      assert.equal(receipt.status, "completed");
    },
  },
  {
    name: "recorder records mission.completed once and preserves sequence ordering",
    run() {
      const completed = recordMissionCompleted(startReceipt(), {
        source_ref: "test:complete",
        summary: "Mission completed.",
      });
      const duplicate = recordMissionCompleted(completed, {
        source_ref: "test:complete",
        summary: "Mission completed again.",
      });

      assert.equal(
        duplicate.events.filter((event) => event.kind === "mission.completed").length,
        1
      );
      assert.deepEqual(
        duplicate.events.map((event) => event.sequence),
        [1, 2]
      );
    },
  },
  {
    name: "reset creates a fresh run id and keeps holds out of the new run",
    run() {
      const held = recordHoldRaised(startReceipt(), "capture", {
        source_ref: "test:hold",
        summary: "HOLD raised.",
      });
      const reset = resetMissionRunRecorder(held);

      assert.notEqual(reset.run_id, held.run_id);
      assert.equal(reset.run_id, "mission-receipt-run-2");
      assert.equal(reset.events.length, 0);
      assert.equal(reset.holds.length, 0);
    },
  },
  {
    name: "run receipt includes all required boundary flags",
    run() {
      const receipt = createMissionRunRecorder();

      for (const flag of [
        "demo_only",
        "no_production_city_claim",
        "no_legal_sufficiency_claim",
        "no_live_fort_worth_claim",
        "no_official_workflow_claim",
        "no_openfga_claim",
        "no_ciba_claim",
        "no_delivered_notification_claim",
        "no_model_api_foreman_claim",
        "no_root_forensic_chain_write",
      ] as const) {
        assert.equal(receipt.boundary[flag], true, flag);
      }
    },
  },
  {
    name: "recorder source avoids root forensic chain mutation behavior",
    async run() {
      const source = await readFile("src/demo/missionRunRecorder.ts", "utf8");

      for (const token of [
        "appendForensicChain",
        "writeForensicChain",
        "recordForensicChain",
        "localStorage",
        "fetch(",
        "Blob",
        ["step", "skins", "renders"].join("."),
      ]) {
        assert.equal(source.includes(token), false, token);
      }
    },
  },
]);
