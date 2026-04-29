import assert from "node:assert/strict";
import {
  buildMissionRehearsalCertification,
  MISSION_REHEARSAL_CERTIFICATION_VERSION,
  MISSION_REHEARSAL_MANUAL_HOLDS,
  type MissionRehearsalCheckId,
} from "../src/demo/missionRehearsalCertification.ts";
import { runTests } from "./scenarioTestUtils.ts";

function checkStatus(
  missing: MissionRehearsalCheckId,
  expectedStatus = "HOLD"
) {
  const certification = buildMissionRehearsalCertification({
    surfaces: {
      [missing]: false,
    },
  });
  const check = certification.checks.find((entry) => entry.check_id === missing);

  assert.ok(check);
  assert.equal(check.status, expectedStatus);

  return certification;
}

const tests = [
  {
    name: "certification helper returns meridian.v2d.missionRehearsalCertification.v1",
    run: () => {
      const certification = buildMissionRehearsalCertification({
        certificationId: "d13-test-cert",
        createdAt: "2026-04-28T00:00:00.000Z",
      });

      assert.equal(certification.version, MISSION_REHEARSAL_CERTIFICATION_VERSION);
      assert.equal(
        certification.version,
        "meridian.v2d.missionRehearsalCertification.v1"
      );
      assert.equal(certification.certification_id, "d13-test-cert");
      assert.equal(certification.created_at, "2026-04-28T00:00:00.000Z");
      assert.equal(certification.status, "PASS");
      assert.equal(certification.injected_failures.length >= 14, true);
    },
  },
  {
    name: "certification PASS requires blocking checks to pass",
    run: () => {
      const passing = buildMissionRehearsalCertification();
      const nonblocking = buildMissionRehearsalCertification({
        surfaces: {
          nonblocking_warning_policy: false,
        },
      });
      const blocking = buildMissionRehearsalCertification({
        surfaces: {
          presenter_cockpit: false,
        },
      });

      assert.equal(passing.status, "PASS");
      assert.equal(nonblocking.status, "PASS");
      assert.equal(
        nonblocking.checks.find(
          (check) => check.check_id === "nonblocking_warning_policy"
        )?.status,
        "HOLD"
      );
      assert.equal(blocking.status, "HOLD");
    },
  },
  {
    name: "missing Presenter Cockpit check creates HOLD",
    run: () => {
      const certification = checkStatus("presenter_cockpit");

      assert.equal(certification.status, "HOLD");
      assert.equal(
        certification.checks.find((check) => check.check_id === "presenter_cockpit")
          ?.blocking,
        true
      );
    },
  },
  {
    name: "missing required theater surfaces create HOLD checks",
    run: () => {
      const requiredMissing: readonly MissionRehearsalCheckId[] = [
        "mission_playback_controller",
        "foreman_autonomous_policy",
        "proof_spotlight",
        "absence_shadow_map",
        "authority_handoff_theater",
        "judge_touchboard",
        "civic_twin_diorama",
        "forensic_receipt_ribbon",
      ];

      for (const checkId of requiredMissing) {
        const certification = checkStatus(checkId);

        assert.equal(certification.status, "HOLD", checkId);
      }
    },
  },
  {
    name: "certification carries all required D13 surface checks",
    run: () => {
      const certification = buildMissionRehearsalCertification();
      const checkIds = new Set(certification.checks.map((check) => check.check_id));

      for (const checkId of [
        "presenter_cockpit",
        "mission_rail",
        "permit_4471_anchor",
        "current_decision_hold_focal_card",
        "proof_tools_disclosure",
        "foreman_mount_avatar_bay",
        "guided_policy",
        "foreman_autonomous_policy",
        "mission_playback_controller",
        "foreman_autonomous_conductor",
        "mission_control_physical_mode",
        "proof_spotlight",
        "absence_shadow_map",
        "authority_handoff_theater",
        "judge_touchboard",
        "evidence_navigator",
        "civic_twin_diorama",
        "forensic_receipt_ribbon",
        "mission_run_receipt_panel",
        "reset_behavior",
        "required_scenario_demo_data_posture",
        "boundary_non_claim_posture",
      ] as const) {
        assert.equal(checkIds.has(checkId), true, checkId);
      }
    },
  },
  {
    name: "manual proof HOLDs are listed separately",
    run: () => {
      const certification = buildMissionRehearsalCertification();
      const manualLabels = certification.remaining_manual_holds.map(
        (hold) => hold.label
      );
      const checkLabels = certification.checks.map((check) => check.label);

      assert.deepEqual(
        manualLabels,
        MISSION_REHEARSAL_MANUAL_HOLDS.map((hold) => hold.label)
      );
      for (const label of [
        "mobile / judge-device proof",
        "full authority choreography screenshot proof",
        "clean logout proof",
        "deploy-hook cleanup proof",
        "final V2-B closeout",
        "Walk-mode MP4 proof",
        "phone smoke",
        "production city status",
        "official Fort Worth workflow",
        "legal/TPIA/TRAIGA sufficiency",
        "public portal behavior",
        "live OpenFGA",
        "CIBA",
        "delivered notifications",
        "model/API-backed Foreman",
        "external voice service",
        "Whisper/audio upload/transcription",
        "root ForensicChain writes",
      ]) {
        assert.equal(manualLabels.includes(label), true, label);
        assert.equal(checkLabels.includes(label), false, label);
      }
    },
  },
  {
    name: "certification boundary flags preserve non-claims",
    run: () => {
      const boundary = buildMissionRehearsalCertification().boundary;

      assert.equal(boundary.demo_only, true);
      assert.equal(boundary.no_mobile_judge_device_proof_claim, true);
      assert.equal(boundary.no_production_city_claim, true);
      assert.equal(boundary.no_legal_sufficiency_claim, true);
      assert.equal(boundary.no_live_fort_worth_claim, true);
      assert.equal(boundary.no_openfga_ciba_claim, true);
      assert.equal(boundary.no_delivered_notification_claim, true);
      assert.equal(boundary.no_model_api_foreman_claim, true);
      assert.equal(boundary.no_root_forensic_chain_write_claim, true);
    },
  },
  {
    name: "certification exposes Guided Mission and Foreman Autonomous modes tested",
    run: () => {
      const certification = buildMissionRehearsalCertification();

      assert.deepEqual(
        certification.modes_tested.map((mode) => [mode.mode_id, mode.status]),
        [
          ["guided", "PASS"],
          ["foreman_autonomous", "PASS"],
        ]
      );
      assert.equal(
        certification.injected_failures.some(
          (failure) => failure.failure_id === "guided_accelerated_full_run"
        ),
        true
      );
      assert.equal(
        certification.injected_failures.some(
          (failure) =>
            failure.failure_id === "foreman_autonomous_accelerated_full_run"
        ),
        true
      );
    },
  },
];

await runTests(tests);
