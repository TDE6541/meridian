import assert from "node:assert/strict";
import React from "react";
import { AbsenceShadowMap } from "../src/components/AbsenceShadowMap.tsx";
import { AuthorityHandoffTheater } from "../src/components/AuthorityHandoffTheater.tsx";
import { CivicTwinDiorama } from "../src/components/CivicTwinDiorama.tsx";
import { ControlRoomShell } from "../src/components/ControlRoomShell.tsx";
import { ForemanAvatarBay } from "../src/components/ForemanAvatarBay.tsx";
import { ForensicReceiptRibbon } from "../src/components/ForensicReceiptRibbon.tsx";
import { MissionControlPhysicalMode } from "../src/components/MissionControlPhysicalMode.tsx";
import { MissionPlaybackControls } from "../src/components/MissionPlaybackControls.tsx";
import { MissionRehearsalPanel } from "../src/components/MissionRehearsalPanel.tsx";
import { MissionRunReceiptPanel } from "../src/components/MissionRunReceiptPanel.tsx";
import { ProofSpotlight } from "../src/components/ProofSpotlight.tsx";
import { runMissionFailureInjectionSuite } from "../src/demo/missionFailureInjection.ts";
import { getJudgeTouchboardCard } from "../src/demo/judgeTouchboardDeck.ts";
import {
  buildJudgeModeProjection,
  buildMissionEvidenceNavigatorView,
} from "../src/demo/missionEvidenceNavigator.ts";
import { buildMissionPhysicalModeView } from "../src/demo/missionPhysicalModeView.ts";
import { buildMissionPhysicalProjection } from "../src/demo/missionPhysicalProjection.ts";
import {
  buildMissionReliabilityReadiness,
  beginReliabilityMission,
  completeReliabilityGuidedMission,
  createReliabilityRuntime,
  evaluateAuthorityEndpointReliability,
  evaluateMissingScenarioReliability,
  evaluateProofTargetReliability,
  MISSION_RELIABILITY_BOUNDARY,
  resetReliabilityRuntime,
  runNoAudioReliabilityConductor,
} from "../src/demo/missionReliabilityGuards.ts";
import { buildMissionRehearsalCertification } from "../src/demo/missionRehearsalCertification.ts";
import { buildMissionRunReceipt } from "../src/demo/missionRunReceipt.ts";
import {
  createInitialMissionPlaybackState,
  missionPlaybackReducer,
  type MissionPlaybackState,
} from "../src/demo/missionPlaybackController.ts";
import { MISSION_STAGE_IDS } from "../src/demo/missionPlaybackPlan.ts";
import {
  loadAllScenarioRecords,
  renderMarkup,
  runTests,
} from "./scenarioTestUtils.ts";

function pauseState(state: MissionPlaybackState): MissionPlaybackState {
  return missionPlaybackReducer(state, {
    nowMs: 10,
    type: "pause",
  });
}

function holdState(state: MissionPlaybackState, reason: string): MissionPlaybackState {
  return missionPlaybackReducer(state, {
    nowMs: 11,
    reason,
    type: "hold",
  });
}

function beginFromReset(state: MissionPlaybackState): MissionPlaybackState {
  return missionPlaybackReducer(state, {
    nowMs: 200,
    readiness: buildMissionReliabilityReadiness(state),
    type: "begin_mission",
  });
}

function assertCleanReset(
  label: string,
  before: MissionPlaybackState,
  after: MissionPlaybackState
) {
  assert.equal(after.status, "idle", label);
  assert.equal(after.currentStageId, null, label);
  assert.equal(after.activeForemanMode, null, label);
  assert.equal(after.startedAtMs, null, label);
  assert.equal(after.completedAtMs, null, label);
  assert.equal(after.pausedAtMs, null, label);
  assert.equal(after.stageEnteredAtMs, null, label);
  assert.equal(after.hold, null, label);
  assert.deepEqual(after.completedStageIds, [], label);
  assert.deepEqual(after.events, [], label);
  assert.deepEqual(after.warnings, [], label);
  assert.equal(after.mode, before.mode, label);
  assert.notEqual(after.runId, before.runId, label);
}

const tests = [
  {
    name: "D14 no-audio fallback leaves typed Foreman cue visible and autonomous mission unblocked",
    run: () => {
      const output = runNoAudioReliabilityConductor();
      const projection = buildMissionPhysicalProjection({
        conductor_output: output,
        playback_state: output.controllerState,
      });
      const fallbackText = output.cueEvent?.typedFallbackText ?? "";
      const avatarMarkup = renderMarkup(<ForemanAvatarBay projection={projection} />);
      const controlsMarkup = renderMarkup(
        <MissionPlaybackControls
          conductorOutput={output}
          playbackState={output.controllerState}
        />
      );
      const noAudio = runMissionFailureInjectionSuite().results.find(
        (entry) => entry.failure_id === "no_audio_condition"
      );

      assert.equal(output.controllerState.status, "running");
      assert.equal(output.cueEvent?.voiceRequired, false);
      assert.equal(output.cueEvent?.voiceStatus, "unavailable");
      assert.equal(output.warnings.some((warning) => warning.includes("typed_fallback_used")), true);
      assert.equal(fallbackText.length > 0, true);
      assert.equal(avatarMarkup.includes(fallbackText), true);
      assert.equal(avatarMarkup.includes("Typed fallback visible"), true);
      assert.equal(controlsMarkup.includes(fallbackText), true);
      assert.equal(noAudio?.status, "PASS");
      assert.equal(noAudio?.expected_behavior, "warn_and_continue");
    },
  },
  {
    name: "D14 reduced-motion-safe labels remain visible across major theater surfaces",
    run: () => {
      const playbackState = beginReliabilityMission("guided", 0);
      const projection = buildMissionPhysicalProjection({ playback_state: playbackState });
      const receipt = buildMissionRunReceipt({ playbackState, projection });
      const certification = buildMissionRehearsalCertification({
        certificationId: "d14-reduced-motion",
        createdAt: "dashboard-local-d14",
      });
      const markup = [
        renderMarkup(<ForemanAvatarBay projection={projection} />),
        renderMarkup(<ProofSpotlight projection={projection} />),
        renderMarkup(<AbsenceShadowMap projection={projection} />),
        renderMarkup(<AuthorityHandoffTheater projection={projection} />),
        renderMarkup(<CivicTwinDiorama projection={projection} />),
        renderMarkup(<ForensicReceiptRibbon receipt={receipt} />),
        renderMarkup(<MissionRunReceiptPanel receipt={receipt} />),
        renderMarkup(
          <MissionControlPhysicalMode
            enabled={true}
            view={buildMissionPhysicalModeView({ physicalMode: true })}
          />
        ),
        renderMarkup(<MissionRehearsalPanel certification={certification} />),
      ].join("\n");

      for (const required of [
        'data-foreman-avatar-motion="reduced-motion-safe"',
        'data-proof-spotlight-motion="visible"',
        'data-absence-shadow-motion="reduced-motion-safe"',
        'data-authority-token-state=',
        'data-civic-twin-node-state=',
        'data-civic-twin-edge-posture=',
        'data-mission-receipt-ticket=',
        'data-reduced-motion-safe="true"',
        "Reduced motion safe",
        "Reduced-motion-safe labels visible",
        "Mission Control Physical Mode",
        "Rehearsal Certification",
      ]) {
        assert.equal(markup.includes(required), true, required);
      }
    },
  },
  {
    name: "D14 reset is safe after every major V2-D++ mission state",
    run: () => {
      const guidedRunning = beginReliabilityMission("guided", 0);
      const autonomousOutput = runNoAudioReliabilityConductor();
      const paused = pauseState(guidedRunning);
      const held = holdState(guidedRunning, "d14_manual_hold");
      const completed = completeReliabilityGuidedMission();
      const receiptBefore = buildMissionRunReceipt({
        playbackState: completed,
        projection: buildMissionPhysicalProjection({ playback_state: completed }),
      });
      const cases = [
        createReliabilityRuntime(createInitialMissionPlaybackState("guided")),
        createReliabilityRuntime(guidedRunning),
        createReliabilityRuntime(autonomousOutput.controllerState, {
          conductorOutput: autonomousOutput,
          conductorState: autonomousOutput.conductorState,
        }),
        createReliabilityRuntime(paused),
        createReliabilityRuntime(paused, {
          selectedJudgeQuestionId: "autonomous_safe",
          selectedProofTargetId: "proof_spotlight",
        }),
        createReliabilityRuntime(held),
        createReliabilityRuntime(guidedRunning, {
          optionalWarning: "optional_proof_cue_missing",
        }),
        createReliabilityRuntime(guidedRunning, {
          physicalModeEnabled: true,
        }),
        createReliabilityRuntime(completed),
        createReliabilityRuntime(completed, {
          selectedProofTargetId: receiptBefore.events.at(-1)?.ticket_id ?? null,
        }),
        createReliabilityRuntime(guidedRunning, {
          optionalWarning: "rehearsal_panel_open",
        }),
      ];

      cases.forEach((runtime, index) => {
        const reset = resetReliabilityRuntime(runtime, 300 + index);

        assertCleanReset(`case-${index}`, runtime.playbackState, reset.playbackState);
        assert.equal(reset.conductorOutput, null, `case-${index}`);
        assert.deepEqual(reset.conductorState.emittedCueIds, [], `case-${index}`);
        assert.equal(reset.selectedJudgeQuestionId, null, `case-${index}`);
        assert.equal(reset.selectedProofTargetId, null, `case-${index}`);
        assert.equal(reset.optionalWarning, null, `case-${index}`);
        assert.equal(
          reset.physicalModeEnabled,
          runtime.physicalModeEnabled,
          `case-${index}`
        );
        assert.equal(reset.endpointMutationCount, 0, `case-${index}`);
      });
    },
  },
  {
    name: "D14 second run after reset is clean with fresh run and receipt ids",
    run: () => {
      const first = beginReliabilityMission("guided", 0);
      const dirtyRuntime = createReliabilityRuntime(first, {
        optionalWarning: "optional_attention_target_unavailable",
        selectedJudgeQuestionId: "production_system",
        selectedProofTargetId: "proof_spotlight",
      });
      const reset = resetReliabilityRuntime(dirtyRuntime, 100);
      const second = beginFromReset(reset.playbackState);
      const secondProjection = buildMissionPhysicalProjection({ playback_state: second });
      const secondReceipt = buildMissionRunReceipt({
        playbackState: second,
        projection: secondProjection,
      });
      const navigator = buildMissionEvidenceNavigatorView(null);
      const eventTypes = second.events.map((event) => event.type);

      assert.equal(second.status, "running");
      assert.equal(second.mode, "guided");
      assert.notEqual(second.runId, first.runId);
      assert.deepEqual(eventTypes, ["mission_begin", "stage_enter"]);
      assert.equal(second.events.filter((event) => event.type === "stage_enter").length, 1);
      assert.equal(second.hold, null);
      assert.deepEqual(second.warnings, []);
      assert.equal(reset.selectedJudgeQuestionId, null);
      assert.equal(reset.selectedProofTargetId, null);
      assert.equal(reset.optionalWarning, null);
      assert.equal(navigator.selected, false);
      assert.equal(navigator.targets.length, 0);
      assert.equal(secondReceipt.run_id, `mission-receipt-${second.runId}`);
      assert.equal(
        secondReceipt.events.every((event) => event.run_id === secondReceipt.run_id),
        true
      );
      assert.equal(
        secondReceipt.events.some((event) => event.run_id.includes(first.runId)),
        false
      );
    },
  },
  {
    name: "D14 proof target unavailable behavior warns for optional and HOLDS for required",
    run: () => {
      const optional = evaluateProofTargetReliability(false);
      const required = evaluateProofTargetReliability(true);
      const injectionSuite = runMissionFailureInjectionSuite();
      const optionalInjection = injectionSuite.results.find(
        (entry) => entry.failure_id === "proof_target_unavailable_optional"
      );
      const requiredInjection = injectionSuite.results.find(
        (entry) => entry.failure_id === "proof_target_unavailable_required"
      );

      assert.equal(optional.status, "ready");
      assert.equal(optional.ready, true);
      assert.equal(optional.warnings.some((warning) => warning.includes("optional_proof_cue_missing")), true);
      assert.deepEqual(optional.holds, []);
      assert.equal(required.status, "hold");
      assert.equal(required.ready, false);
      assert.equal(required.holds.includes("required_proof_cue_missing"), true);
      assert.equal(optionalInjection?.expected_behavior, "warn_and_continue");
      assert.equal(optionalInjection?.status, "PASS");
      assert.equal(requiredInjection?.expected_behavior, "hold_and_disable_begin");
      assert.equal(requiredInjection?.status, "PASS");
    },
  },
  {
    name: "D14 authority endpoint unavailable stays bounded and does not mutate endpoint state",
    run: () => {
      const authority = evaluateAuthorityEndpointReliability();
      const theaterMarkup = renderMarkup(<AuthorityHandoffTheater projection={null} />);
      const injection = runMissionFailureInjectionSuite().results.find(
        (entry) => entry.failure_id === "authority_endpoint_unavailable"
      );

      assert.equal(authority.status, "hold");
      assert.equal(
        authority.holds.some((hold) => hold.includes("authority_endpoint_unavailable")),
        true
      );
      assert.equal(authority.holds.includes("authority_panel_readiness_missing"), true);
      assert.equal(MISSION_RELIABILITY_BOUNDARY.no_endpoint_mutation, true);
      assert.equal(MISSION_RELIABILITY_BOUNDARY.no_external_service_call, true);
      assert.equal(theaterMarkup.includes('data-authority-handoff-status="unavailable"'), true);
      assert.equal(theaterMarkup.includes("HOLD: role cards unavailable"), true);
      assert.equal(theaterMarkup.includes("no authority role is invented"), true);
      assert.equal(injection?.status, "PASS");
      assert.equal(
        injection?.observed_behavior.includes("without endpoint mutation"),
        true
      );
    },
  },
  {
    name: "D14 missing scenario data produces safe HOLD with no live city fallback",
    run: () => {
      const readiness = evaluateMissingScenarioReliability();
      const markup = renderMarkup(<ControlRoomShell records={[]} />);
      const lowerMarkup = markup.toLowerCase();

      assert.equal(readiness.status, "hold");
      assert.equal(readiness.holds.includes("scenario_data_missing"), true);
      assert.equal(readiness.holds.includes("capture_snapshot_readiness_missing"), true);
      assert.equal(markup.includes("Scenario snapshot is unavailable."), true);
      assert.equal(markup.includes("HOLD: active step unavailable"), true);
      assert.equal(markup.includes('data-current-decision-card="true"'), true);
      assert.equal(markup.includes("Permit #4471"), true);
      assert.equal(lowerMarkup.includes("synthetic case"), true);
      for (const forbidden of [
        "live city fallback",
        "official fort worth record",
        "real permit record",
        "live gis fallback",
        "accela fallback",
        "production city operation",
      ]) {
        assert.equal(lowerMarkup.includes(forbidden), false, forbidden);
      }
    },
  },
  {
    name: "D14 full Presenter Cockpit theater surfaces remain mounted",
    run: async () => {
      const records = await loadAllScenarioRecords();
      const markup = renderMarkup(<ControlRoomShell records={records} />);
      const required = [
        ["Mission Playback Controls", 'data-mission-playback-controls="lobby"'],
        ["Foreman Avatar Bay", 'data-foreman-avatar-bay="true"'],
        ["Proof Spotlight", 'data-proof-spotlight="true"'],
        ["Absence Shadow Map", 'data-absence-shadow-map="true"'],
        ["Authority Handoff Theater", 'data-authority-handoff-theater="true"'],
        ["Judge Touchboard", 'data-judge-touchboard="true"'],
        ["Evidence Navigator", 'data-mission-evidence-navigator="true"'],
        ["Civic Twin Diorama", 'data-civic-twin-diorama="true"'],
        ["Forensic Receipt Ribbon", 'data-forensic-receipt-ribbon="true"'],
        ["Mission Run Receipt Panel", 'data-mission-run-receipt-panel="true"'],
        ["Mission Control Physical Mode", 'data-mission-control-physical-mode="off"'],
        ["Rehearsal Panel", 'data-mission-rehearsal-panel="operator-proof"'],
        ["Mission Rail", 'data-mission-rail="true"'],
        ["Permit #4471 anchor", "Permit #4471"],
        ["current decision/HOLD focal card", 'data-current-decision-card="true"'],
      ] as const;

      for (const [label, token] of required) {
        assert.equal(markup.includes(token), true, label);
      }
      for (const label of MISSION_STAGE_IDS.map((stageId) => stageId[0].toUpperCase() + stageId.slice(1))) {
        assert.equal(markup.includes(`data-mission-stage-label="${label}"`), true, label);
      }
    },
  },
  {
    name: "D14 Proof Tools remain grouped collapsed and contain Rehearsal Panel",
    run: async () => {
      const records = await loadAllScenarioRecords();
      const markup = renderMarkup(<ControlRoomShell records={records} />);

      assert.equal(markup.includes('data-proof-tools="collapsed-by-default"'), true);
      assert.equal(markup.includes("<summary>Proof Tools</summary>"), true);
      assert.equal(/<details[^>]*class="mission-proof-tools"[^>]* open/.test(markup), false);
      assert.equal(markup.includes('data-mission-rehearsal-panel="operator-proof"'), true);
      assert.equal(markup.includes("Rehearsal / operator proof"), true);
      assert.equal(markup.includes('data-rehearsal-failure="no_audio_condition"'), true);
      assert.equal(markup.includes('data-rehearsal-failure="authority_endpoint_unavailable"'), true);
    },
  },
  {
    name: "D14 Presenter Cockpit hierarchy remains ordered around proof and controls",
    run: async () => {
      const records = await loadAllScenarioRecords();
      const markup = renderMarkup(<ControlRoomShell records={records} />);
      const orderedTokens = [
        "Presenter Cockpit",
        "Permit #4471",
        'data-current-decision-card="true"',
        'data-forensic-receipt-ribbon="true"',
        'data-judge-touchboard="true"',
        'data-foreman-avatar-bay="true"',
        'data-mission-evidence-navigator="true"',
        'data-civic-twin-diorama="true"',
        'data-authority-handoff-theater="true"',
        'data-proof-spotlight="true"',
        'data-absence-shadow-map="true"',
        'data-mission-playback-controls="lobby"',
        'data-mission-run-receipt-panel="true"',
        'data-mission-rail="true"',
      ];
      const indexes = orderedTokens.map((token) => markup.indexOf(token));

      indexes.forEach((index, position) => {
        assert.notEqual(index, -1, orderedTokens[position]);
      });
      for (let index = 1; index < indexes.length; index += 1) {
        assert.equal(
          indexes[index] > indexes[index - 1],
          true,
          `${orderedTokens[index - 1]} before ${orderedTokens[index]}`
        );
      }
    },
  },
  {
    name: "D14 reset and failure injection do not mutate scenario payloads",
    run: () => {
      const scenarioPayload = {
        scenario: {
          steps: [
            {
              id: "d14-reset-probe",
              status: "unchanged",
            },
          ],
        },
      };
      const before = JSON.stringify(scenarioPayload);
      const suite = runMissionFailureInjectionSuite({ scenarioPayload });
      const reset = resetReliabilityRuntime(
        createReliabilityRuntime(beginReliabilityMission("guided", 0)),
        500
      );

      assert.equal(JSON.stringify(scenarioPayload), before);
      assert.equal(suite.scenario_payload_mutated, false);
      assert.equal(suite.external_service_calls, 0);
      assert.equal(suite.root_forensic_chain_writes, 0);
      assert.equal(reset.endpointMutationCount, 0);
      assert.equal(MISSION_RELIABILITY_BOUNDARY.no_scenario_payload_mutation, true);
      assert.equal(MISSION_RELIABILITY_BOUNDARY.no_root_forensic_chain_write, true);
    },
  },
  {
    name: "D14 receipt after reset does not preserve stale ticket sequence",
    run: () => {
      const completed = completeReliabilityGuidedMission();
      const completedReceipt = buildMissionRunReceipt({
        playbackState: completed,
        projection: buildMissionPhysicalProjection({ playback_state: completed }),
      });
      const reset = resetReliabilityRuntime(
        createReliabilityRuntime(completed, {
          selectedProofTargetId: completedReceipt.events.at(-1)?.ticket_id ?? null,
        }),
        600
      );
      const receiptAfterReset = buildMissionRunReceipt({
        playbackState: reset.playbackState,
        projection: buildMissionPhysicalProjection({ playback_state: reset.playbackState }),
      });
      const second = beginFromReset(reset.playbackState);
      const secondReceipt = buildMissionRunReceipt({
        playbackState: second,
        projection: buildMissionPhysicalProjection({ playback_state: second }),
      });

      assert.equal(receiptAfterReset.events.length, 0);
      assert.equal(
        receiptAfterReset.holds.some((hold) => hold.status === "active_hold"),
        false
      );
      assert.equal(receiptAfterReset.warnings.length, 0);
      assert.notEqual(receiptAfterReset.run_id, completedReceipt.run_id);
      assert.equal(secondReceipt.events[0]?.sequence, 1);
      assert.equal(secondReceipt.events[0]?.ticket_id.includes(completedReceipt.run_id), false);
      assert.equal(secondReceipt.run_id, `mission-receipt-${second.runId}`);
    },
  },
  {
    name: "D14 judge interruption reset clears stale card and proof target without ungrouping proof tools",
    run: () => {
      const card = getJudgeTouchboardCard("production_system");
      const paused = pauseState(beginReliabilityMission("guided", 0));
      const projection = buildMissionPhysicalProjection({ playback_state: paused });
      const judgeProjection = buildJudgeModeProjection(projection, card);
      const beforeMarkup = renderMarkup(
        <ForemanAvatarBay judgeChallenge={card} projection={judgeProjection} />
      );
      const reset = resetReliabilityRuntime(
        createReliabilityRuntime(paused, {
          selectedJudgeQuestionId: card?.question_id ?? null,
          selectedProofTargetId: judgeProjection?.foreman.attention_target_id ?? null,
        }),
        700
      );
      const afterProjection = buildMissionPhysicalProjection({
        playback_state: reset.playbackState,
      });
      const afterMarkup = renderMarkup(
        <ForemanAvatarBay judgeChallenge={null} projection={afterProjection} />
      );

      assert.ok(card);
      assert.equal(beforeMarkup.includes('data-foreman-avatar-card="judge-mode"'), true);
      assert.equal(reset.selectedJudgeQuestionId, null);
      assert.equal(reset.selectedProofTargetId, null);
      assert.equal(afterProjection.judge_touchboard.selected_question_id, null);
      assert.equal(afterMarkup.includes('data-foreman-avatar-card="judge-mode"'), false);
      assert.equal(afterMarkup.includes("Proof Tools remain grouped"), false);
    },
  },
];

await runTests(tests);
