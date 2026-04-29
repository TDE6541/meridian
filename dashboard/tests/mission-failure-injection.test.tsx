import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import React from "react";
import { MissionRehearsalPanel } from "../src/components/MissionRehearsalPanel.tsx";
import {
  runMissionFailureInjectionSuite,
  type MissionFailureInjectionId,
} from "../src/demo/missionFailureInjection.ts";
import { buildMissionRehearsalCertification } from "../src/demo/missionRehearsalCertification.ts";
import { renderMarkup, runTests } from "./scenarioTestUtils.ts";

function resultById(id: MissionFailureInjectionId) {
  const suite = runMissionFailureInjectionSuite();
  const result = suite.results.find((entry) => entry.failure_id === id);

  assert.ok(result, id);
  return result;
}

const tests = [
  {
    name: "failure injection suite returns dashboard-local PASS contract",
    run: () => {
      const suite = runMissionFailureInjectionSuite();

      assert.equal(suite.version, "meridian.v2d.missionFailureInjection.v1");
      assert.equal(suite.status, "PASS");
      assert.equal(suite.boundary.dashboard_local_only, true);
      assert.equal(suite.boundary.no_external_service_call, true);
      assert.equal(suite.boundary.no_scenario_payload_mutation, true);
      assert.equal(suite.boundary.no_root_forensic_chain_write, true);
      assert.equal(suite.boundary.no_mobile_judge_device_proof_claim, true);
    },
  },
  {
    name: "guided and autonomous accelerated full run injections pass",
    run: () => {
      const guided = resultById("guided_accelerated_full_run");
      const autonomous = resultById("foreman_autonomous_accelerated_full_run");

      assert.equal(guided.status, "PASS");
      assert.equal(guided.observed_behavior.includes("Guided Mission completed"), true);
      assert.equal(autonomous.status, "PASS");
      assert.equal(
        autonomous.observed_behavior.includes("Foreman Autonomous completed"),
        true
      );
    },
  },
  {
    name: "judge interrupt during Authority and Absence injections pass",
    run: () => {
      const authority = resultById("judge_interrupt_authority");
      const absence = resultById("judge_interrupt_absence");

      assert.equal(authority.status, "PASS");
      assert.equal(authority.observed_behavior.includes("authority"), true);
      assert.equal(absence.status, "PASS");
      assert.equal(absence.observed_behavior.includes("absence"), true);
    },
  },
  {
    name: "reset mid-run and second-run injections pass",
    run: () => {
      const midRun = resultById("reset_mid_run");
      const secondRun = resultById("reset_after_completion_second_run");

      assert.equal(midRun.status, "PASS");
      assert.equal(midRun.observed_behavior.includes("clean idle"), true);
      assert.equal(secondRun.status, "PASS");
      assert.equal(secondRun.observed_behavior.includes("second run started"), true);
    },
  },
  {
    name: "optional proof cue failure warns and required proof cue failure holds",
    run: () => {
      const optional = resultById("optional_proof_cue_failure");
      const required = resultById("required_proof_cue_failure");

      assert.equal(optional.status, "PASS");
      assert.equal(optional.expected_behavior, "warn_and_continue");
      assert.equal(optional.observed_behavior.includes("warned"), true);
      assert.equal(required.status, "PASS");
      assert.equal(required.expected_behavior, "hold_and_disable_begin");
      assert.equal(required.observed_behavior.includes("HOLD"), true);
    },
  },
  {
    name: "no-audio condition uses typed fallback",
    run: () => {
      const noAudio = resultById("no_audio_condition");

      assert.equal(noAudio.status, "PASS");
      assert.equal(noAudio.expected_behavior, "warn_and_continue");
      assert.equal(
        noAudio.evidence.some((entry) => entry.startsWith("fallback:")),
        true
      );
      assert.equal(noAudio.observed_behavior.includes("typed fallback"), true);
    },
  },
  {
    name: "reduced-motion condition preserves labels",
    run: () => {
      const reducedMotion = resultById("reduced_motion_condition");

      assert.equal(reducedMotion.status, "PASS");
      assert.equal(reducedMotion.evidence.join("|").includes("reduced_motion_safe:true"), true);
      for (const label of ["Capture", "Authority", "Governance", "Absence", "Chain", "Public"]) {
        assert.equal(reducedMotion.evidence.join("|").includes(label), true, label);
      }
    },
  },
  {
    name: "authority endpoint unavailable produces HOLD fallback without mutation",
    run: () => {
      const authority = resultById("authority_endpoint_unavailable");

      assert.equal(authority.status, "PASS");
      assert.equal(authority.expected_behavior, "hold_and_disable_begin");
      assert.equal(authority.observed_behavior.includes("without endpoint mutation"), true);
      assert.equal(authority.evidence.join("|").includes("authority_endpoint_unavailable"), true);
    },
  },
  {
    name: "proof target unavailable behavior matches required and optional posture",
    run: () => {
      const optional = resultById("proof_target_unavailable_optional");
      const required = resultById("proof_target_unavailable_required");

      assert.equal(optional.status, "PASS");
      assert.equal(optional.expected_behavior, "warn_and_continue");
      assert.equal(optional.observed_behavior.includes("warned"), true);
      assert.equal(required.status, "PASS");
      assert.equal(required.expected_behavior, "hold_and_disable_begin");
      assert.equal(required.observed_behavior.includes("HOLD"), true);
    },
  },
  {
    name: "vibration unsupported warns and continues",
    run: () => {
      const vibration = resultById("vibration_unsupported");

      assert.equal(vibration.status, "PASS");
      assert.equal(vibration.expected_behavior, "warn_and_continue");
      assert.equal(vibration.evidence.includes("vibration:unsupported"), true);
    },
  },
  {
    name: "failure injection does not mutate scenario payload or call external services",
    run: () => {
      const payload = {
        scenario: {
          steps: [{ id: "C1", value: "unchanged" }],
        },
      };
      const before = JSON.stringify(payload);
      const suite = runMissionFailureInjectionSuite({ scenarioPayload: payload });

      assert.equal(JSON.stringify(payload), before);
      assert.equal(suite.scenario_payload_mutated, false);
      assert.equal(suite.external_service_calls, 0);
      assert.equal(suite.root_forensic_chain_writes, 0);
    },
  },
  {
    name: "MissionRehearsalPanel renders certification status checks failures holds and boundary",
    run: () => {
      const certification = buildMissionRehearsalCertification({
        certificationId: "d13-panel-test",
        createdAt: "2026-04-28T00:00:00.000Z",
      });
      const markup = renderMarkup(
        <MissionRehearsalPanel certification={certification} />
      );

      assert.equal(markup.includes('data-mission-rehearsal-panel="operator-proof"'), true);
      assert.equal(markup.includes('data-rehearsal-certification-status="PASS"'), true);
      assert.equal(markup.includes("d13-panel-test"), true);
      assert.equal(markup.includes("Checks"), true);
      assert.equal(markup.includes('data-rehearsal-check="presenter_cockpit"'), true);
      assert.equal(markup.includes("Injected Failures"), true);
      assert.equal(
        markup.includes('data-rehearsal-failure="guided_accelerated_full_run"'),
        true
      );
      assert.equal(markup.includes("Remaining Manual HOLDs"), true);
      assert.equal(
        markup.includes('data-rehearsal-manual-hold="mobile_judge_device_proof"'),
        true
      );
      assert.equal(markup.includes("Boundary"), true);
      assert.equal(
        markup.includes('data-rehearsal-boundary="no_mobile_judge_device_proof_claim"'),
        true
      );
      assert.equal(markup.includes("does not prove mobile/judge-device smoke"), true);
    },
  },
  {
    name: "D13 source avoids external behavior package skin render and key strings",
    run: async () => {
      const source = (
        await Promise.all(
          [
            "src/demo/missionFailureInjection.ts",
            "src/demo/missionRehearsalCertification.ts",
            "src/components/MissionRehearsalPanel.tsx",
          ].map((file) => readFile(file, "utf8"))
        )
      ).join("\n");
      const lowerSource = source.toLowerCase();

      for (const forbidden of [
        "openai_api_key",
        "anthropic_api_key",
        "api.openai.com",
        "api.anthropic.com",
        "browser-exposed-key",
        "fetch(",
        "xmlhttprequest",
        "websocket",
        "eventsource",
        "navigator.clipboard",
        "localstorage",
        "indexeddb",
        "package.json",
        "vite.config",
        "vercel",
        "process.env",
        "../src/skins",
        "../../src/skins",
        ["src", "skins"].join("/"),
        ["step", "skins", "renders"].join("."),
        "appendforensicchain",
        "writeforensicchain",
        "recordforensicchain",
      ]) {
        assert.equal(lowerSource.includes(forbidden), false, forbidden);
      }
    },
  },
  {
    name: "D13 rendered copy avoids production legal live-city mobile and notification overclaims",
    run: () => {
      const markup = renderMarkup(
        <MissionRehearsalPanel certification={buildMissionRehearsalCertification()} />
      ).toLowerCase();

      for (const forbidden of [
        "mobile/judge-device smoke passed",
        "production city operation",
        "production readiness",
        "certifies legal",
        "official fort worth workflow is active",
        "live openfga is active",
        "ciba approval",
        "delivered notification behavior is active",
        "phone proof passed",
      ]) {
        assert.equal(markup.includes(forbidden), false, forbidden);
      }
    },
  },
];

await runTests(tests);
