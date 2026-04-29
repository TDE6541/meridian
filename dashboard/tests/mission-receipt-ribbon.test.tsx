import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import React from "react";
import { ControlRoomShell } from "../src/components/ControlRoomShell.tsx";
import { ForensicReceiptRibbon } from "../src/components/ForensicReceiptRibbon.tsx";
import {
  createMissionRunRecorder,
  recordForemanCue,
  recordMissionStarted,
  recordProofSpotlight,
  recordStageEntered,
  type MissionRunReceipt,
} from "../src/demo/missionRunRecorder.ts";
import { buildMissionReceiptRibbonView } from "../src/demo/missionReceiptRibbon.ts";
import { loadAllScenarioRecords, renderMarkup, runTests } from "./scenarioTestUtils.ts";

const D11_SOURCE_FILES = [
  "src/demo/missionRunRecorder.ts",
  "src/demo/missionRunReceipt.ts",
  "src/demo/missionReceiptRibbon.ts",
  "src/components/ForensicReceiptRibbon.tsx",
  "src/components/MissionRunReceiptPanel.tsx",
  "src/components/MissionPresentationShell.tsx",
] as const;

function receiptWithTickets(): MissionRunReceipt {
  let receipt = recordMissionStarted(createMissionRunRecorder(), {
    source_ref: "test:mission",
    summary: "Mission started.",
    timestamp: "2026-04-28T12:00:00.000Z",
  });

  receipt = recordStageEntered(receipt, "capture", {
    source_ref: "test:stage",
    summary: "Capture entered.",
    timestamp: "2026-04-28T12:00:01.000Z",
  });
  receipt = recordForemanCue(receipt, "capture", {
    source_ref: "test:foreman",
    summary: "Foreman cue rendered.",
    timestamp: "2026-04-28T12:00:02.000Z",
  });
  receipt = recordProofSpotlight(receipt, "capture", {
    source_ref: "dashboard/src/demo/proofSpotlightTargets.ts",
    summary: "Evidence Beam rendered.",
    timestamp: "2026-04-28T12:00:03.000Z",
  });

  return receipt;
}

async function readD11Source(): Promise<string> {
  return (await Promise.all(D11_SOURCE_FILES.map((file) => readFile(file, "utf8")))).join(
    "\n"
  );
}

await runTests([
  {
    name: "ForensicReceiptRibbon renders empty ready state",
    run() {
      const markup = renderMarkup(<ForensicReceiptRibbon receipt={createMissionRunRecorder()} />);

      assert.equal(markup.includes('data-forensic-receipt-ribbon="true"'), true);
      assert.equal(markup.includes("Demo mission receipt"), true);
      assert.equal(markup.includes("No receipt tickets yet"), true);
      assert.equal(markup.includes("Empty receipt trail."), true);
      assert.equal(markup.includes("not a legal audit trail"), true);
      assert.equal(markup.includes("no root ForensicChain write"), true);
    },
  },
  {
    name: "ForensicReceiptRibbon renders ticket list latest ticket kind stage and source ref",
    run() {
      const receipt = receiptWithTickets();
      const view = buildMissionReceiptRibbonView(receipt);
      const markup = renderMarkup(<ForensicReceiptRibbon receipt={receipt} />);

      assert.equal(view.ticket_count, 4);
      assert.equal(view.latest_ticket?.ticket.kind, "proof.spotlight");
      assert.equal(markup.includes('data-latest-mission-receipt-ticket="true"'), true);
      assert.equal(markup.includes("proof spotlight"), true);
      assert.equal(markup.includes("Capture"), true);
      assert.equal(markup.includes("dashboard/src/demo/proofSpotlightTargets.ts"), true);
      assert.equal(markup.includes("legal_audit_claim: false"), true);
      assert.equal(markup.includes("Receipt Ribbon records what this demo showed."), true);
    },
  },
  {
    name: "Presenter Cockpit includes receipt ribbon run receipt panel and preserves proof surfaces",
    async run() {
      const records = await loadAllScenarioRecords();
      const markup = renderMarkup(<ControlRoomShell records={records} />);

      assert.equal(markup.includes('data-forensic-receipt-ribbon="true"'), true);
      assert.equal(markup.includes('data-mission-run-receipt-panel="true"'), true);
      assert.equal(markup.includes("Forensic Receipt Ribbon"), true);
      assert.equal(markup.includes("Mission Run Receipt"), true);
      assert.equal(markup.includes('data-foreman-avatar-bay="true"'), true);
      assert.equal(markup.includes('data-proof-spotlight="true"'), true);
      assert.equal(markup.includes('data-absence-shadow-map="true"'), true);
      assert.equal(markup.includes('data-authority-handoff-theater="true"'), true);
      assert.equal(markup.includes('data-judge-touchboard="true"'), true);
      assert.equal(markup.includes('data-mission-evidence-navigator="true"'), true);
      assert.equal(markup.includes('data-civic-twin-diorama="true"'), true);
    },
  },
  {
    name: "Presenter Cockpit keeps Proof Tools Permit anchor six-stage rail and focal card visible",
    async run() {
      const records = await loadAllScenarioRecords();
      const markup = renderMarkup(<ControlRoomShell records={records} />);

      assert.equal(markup.includes('data-proof-tools="collapsed-by-default"'), true);
      assert.equal(markup.includes("<summary>Proof Tools</summary>"), true);
      assert.equal(/<details[^>]*class="mission-proof-tools"[^>]* open/.test(markup), false);
      assert.equal(markup.includes("Permit #4471"), true);
      assert.equal(markup.includes('data-current-decision-card="true"'), true);
      assert.equal(markup.includes("Current decision / HOLD"), true);
      for (const label of ["Capture", "Authority", "Governance", "Absence", "Chain", "Public"]) {
        assert.equal(markup.includes(`data-mission-stage-label="${label}"`), true, label);
      }
    },
  },
  {
    name: "D11 source avoids model keys package root skins stale renders and chain mutation behavior",
    async run() {
      const source = await readD11Source();

      for (const token of [
        "OPENAI_API_KEY",
        "ANTHROPIC_API_KEY",
        "api.openai.com",
        "api.anthropic.com",
        "browser-exposed-key",
        "fetch(",
        "XMLHttpRequest",
        "WebSocket",
        "EventSource",
        "package.json",
        "vite.config",
        "vercel",
        "process.env",
        "../src/skins",
        "../../src/skins",
        ["src", "skins"].join("/"),
        ["step", "skins", "renders"].join("."),
        "appendForensicChain",
        "writeForensicChain",
        "recordForensicChain",
        "localStorage",
        "Blob",
        "URL.createObjectURL",
      ]) {
        assert.equal(source.includes(token), false, token);
      }
    },
  },
  {
    name: "D11 rendered copy avoids production legal live city auth and notification overclaims",
    async run() {
      const records = await loadAllScenarioRecords();
      const markup = renderMarkup(<ControlRoomShell records={records} />);
      const lowerMarkup = markup.toLowerCase();

      for (const forbidden of [
        "production city operation",
        "official fort worth workflow",
        "tpia compliance",
        "traiga compliance",
        "certifies legal",
        "public portal behavior is shipped",
        "live openfga is active",
        "ciba approval",
        "live phone dependency active",
        "delivered notification behavior is active",
        "whisper/audio is active",
      ]) {
        assert.equal(lowerMarkup.includes(forbidden), false, forbidden);
      }
    },
  },
  {
    name: "step.skins.outputs remains canonical",
    async run() {
      const adapterSource = await readFile("src/adapters/skinPayloadAdapter.ts", "utf8");

      assert.equal(adapterSource.includes(["step", "skins", "outputs"].join(".")), true);
      assert.equal(adapterSource.includes(["step", "skins", "renders"].join(".")), false);
    },
  },
]);
