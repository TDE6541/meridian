import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import React from "react";
import { ControlRoomShell } from "../src/components/ControlRoomShell.tsx";
import { MissionRehearsalPanel } from "../src/components/MissionRehearsalPanel.tsx";
import { buildMissionRehearsalCertification } from "../src/demo/missionRehearsalCertification.ts";
import {
  loadAllScenarioRecords,
  renderMarkup,
  runTests,
} from "./scenarioTestUtils.ts";

async function collectFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(root, entry.name);

      if (entry.isDirectory()) {
        return collectFiles(fullPath);
      }

      if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) {
        return [fullPath];
      }

      return [];
    })
  );

  return nested.flat();
}

async function readSourceTree(root = "src"): Promise<string> {
  const files = await collectFiles(root);
  const contents = await Promise.all(files.map((file) => readFile(file, "utf8")));

  return contents.join("\n");
}

async function readFiles(files: readonly string[]): Promise<string> {
  return (await Promise.all(files.map((file) => readFile(file, "utf8")))).join("\n");
}

function assertMissing(haystack: string, tokens: readonly string[]) {
  for (const token of tokens) {
    assert.equal(haystack.includes(token), false, token);
  }
}

const D14_RELIABILITY_SOURCE = [
  "src/demo/missionReliabilityGuards.ts",
  "src/demo/missionPlaybackController.ts",
  "src/demo/foremanAutonomousConductor.ts",
  "src/demo/missionFailureInjection.ts",
  "src/demo/missionPhysicalProjection.ts",
  "src/demo/proofSpotlightView.ts",
  "src/demo/authorityHandoffView.ts",
  "src/demo/absenceShadowView.ts",
  "src/demo/missionEvidenceNavigator.ts",
  "src/components/MissionPresentationShell.tsx",
  "src/components/MissionPlaybackControls.tsx",
  "src/components/ForemanAvatarBay.tsx",
  "src/components/ProofSpotlight.tsx",
  "src/components/AbsenceShadowMap.tsx",
  "src/components/AuthorityHandoffTheater.tsx",
  "src/components/JudgeTouchboard.tsx",
  "src/components/MissionEvidenceNavigator.tsx",
  "src/components/CivicTwinDiorama.tsx",
  "src/components/ForensicReceiptRibbon.tsx",
  "src/components/MissionRunReceiptPanel.tsx",
  "src/components/MissionControlPhysicalMode.tsx",
  "src/components/MissionRehearsalPanel.tsx",
] as const;

const tests = [
  {
    name: "D14 source guard blocks model API and browser-exposed key tokens",
    run: async () => {
      const source = await readSourceTree();

      assertMissing(source, [
        "VITE_ANTHROPIC",
        "ANTHROPIC_API_KEY",
        "OPENAI_API_KEY",
        "api.anthropic",
        "api.openai",
        "browser-exposed model key",
      ]);
    },
  },
  {
    name: "D14 source guard blocks stale skin render seam and keeps outputs canonical",
    run: async () => {
      const source = await readSourceTree();
      const adapter = await readFile("src/adapters/skinPayloadAdapter.ts", "utf8");

      assert.equal(source.includes(["step", "skins", "renders"].join(".")), false);
      assert.equal(adapter.includes(["step", "skins", "outputs"].join(".")), true);
      assert.equal(adapter.includes(["step", "skins", "renders"].join(".")), false);
    },
  },
  {
    name: "D14 source guard blocks root skin browser imports and root chain write calls",
    run: async () => {
      const source = await readSourceTree();

      assertMissing(source, [
        "../src/skins",
        "../../src/skins",
        ["src", "skins"].join("/"),
        ["src", "skins"].join("\\"),
        "appendForensicChain",
        "writeForensicChain",
        "recordForensicChain",
      ]);
    },
  },
  {
    name: "D14 proof routing sources do not use DOM poking or imperative click choreography",
    run: async () => {
      const source = await readFiles([
        "src/demo/missionEvidenceNavigator.ts",
        "src/components/MissionEvidenceNavigator.tsx",
        "src/demo/proofSpotlightView.ts",
        "src/components/ProofSpotlight.tsx",
        "src/demo/missionReliabilityGuards.ts",
      ]);

      assertMissing(source, [
        "document.",
        "querySelector",
        "getElementById",
        ".click()",
        "scrollIntoView",
        "dispatchEvent",
      ]);
    },
  },
  {
    name: "D14 reliability source has no package config auth deploy or external service behavior",
    run: async () => {
      const source = await readFiles(["src/demo/missionReliabilityGuards.ts"]);

      assertMissing(source, [
        "fetch(",
        "XMLHttpRequest",
        "WebSocket",
        "EventSource",
        "navigator.mediaDevices",
        "MediaRecorder",
        "localStorage",
        "indexedDB",
        "package.json",
        "package-lock.json",
        "vite.config",
        "vercel",
        "Auth0Provider",
        "import.meta.env",
        "process.env",
        "pdf",
        "mapbox",
        "arcgis",
      ]);
    },
  },
  {
    name: "D14 rendered theater copy avoids positive production legal live-city and phone claims",
    run: async () => {
      const records = await loadAllScenarioRecords();
      const markup = [
        renderMarkup(React.createElement(ControlRoomShell, { records })),
        renderMarkup(
          React.createElement(MissionRehearsalPanel, {
            certification: buildMissionRehearsalCertification({
              certificationId: "d14-boundary-copy",
              createdAt: "dashboard-local-d14",
            }),
          })
        ),
      ].join("\n");
      const lowerMarkup = markup.toLowerCase();

      assertMissing(lowerMarkup, [
        "mobile/judge-device smoke passed",
        "judge-device proof passed",
        "phone smoke passed",
        "production city operation",
        "production readiness achieved",
        "legal sufficiency certified",
        "legal audit trail certified",
        "tpia compliant",
        "traiga compliant",
        "official fort worth workflow is active",
        "live fort worth data connected",
        "live gis connected",
        "live accela connected",
        "real permit-record verified",
        "public portal active",
        "live openfga is active",
        "ciba approval completed",
        "notification delivered",
        "delivered notification behavior is active",
        "model/api-backed foreman is active",
        "whisper upload complete",
      ]);
      for (const carriedHold of [
        "mobile / judge-device proof",
        "phone smoke",
        "live openfga",
        "ciba",
        "delivered notifications",
        "model/api-backed foreman",
        "external voice service",
        "root forensicchain writes",
      ]) {
        assert.equal(lowerMarkup.includes(carriedHold), true, carriedHold);
      }
      assert.equal(
        lowerMarkup.includes('data-rehearsal-manual-hold="legal_tpia_traiga_sufficiency"'),
        true
      );
      assert.equal(lowerMarkup.includes("tpia/traiga review"), true);
      assert.equal(
        lowerMarkup.includes('data-rehearsal-manual-hold="whisper_audio_upload_transcription"'),
        true
      );
      assert.equal(lowerMarkup.includes("whisper/audio transcription"), true);
    },
  },
  {
    name: "D14 reliability source preserves no-audio and no audio-duration mission clock behavior",
    run: async () => {
      const source = await readFiles([
        "src/demo/foremanAutonomousConductor.ts",
        "src/demo/missionPlaybackController.ts",
        "src/demo/missionReliabilityGuards.ts",
      ]);

      assert.equal(source.includes("typedFallbackText"), true);
      assert.equal(source.includes("voiceRequired: false"), true);
      assertMissing(source, [
        "speechSynthesis",
        "SpeechSynthesisUtterance",
        "audioDuration",
        "durationMsFromAudio",
        "onended",
      ]);
    },
  },
  {
    name: "D14 boundary guard source covers all V2-D++ theater files",
    run: async () => {
      const source = await readFiles(D14_RELIABILITY_SOURCE);

      assert.equal(source.includes("MISSION_RELIABILITY_GUARDS_VERSION"), true);
      assert.equal(source.includes("MissionPresentationShell"), true);
      assert.equal(source.includes("MissionRehearsalPanel"), true);
      assert.equal(source.includes("MissionRunReceiptPanel"), true);
      assertMissing(source, [
        "VITE_ANTHROPIC",
        "ANTHROPIC_API_KEY",
        "OPENAI_API_KEY",
        ["step", "skins", "renders"].join("."),
      ]);
    },
  },
  {
    name: "D14 normal dashboard runner discovers the reliability and boundary guard tests",
    run: async () => {
      const runner = await readFile("tests/run-dashboard-tests.ts", "utf8");
      const testFiles = await readdir("tests");

      assert.equal(runner.includes("readdirSync(testsDir)"), true);
      assert.equal(runner.includes("testFilePattern"), true);
      assert.equal(testFiles.includes("mission-reliability-regression.test.tsx"), true);
      assert.equal(testFiles.includes("mission-boundary-guards.test.ts"), true);
    },
  },
];

await runTests(tests);
