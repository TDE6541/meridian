const test = require("node:test");
const assert = require("node:assert/strict");
const refusalFixture = require("./fixtures/governance/refusal.commandRequest.json");
const safePassFixture = require("./fixtures/governance/safe-pass.commandRequest.json");
const hardStopFixture = require("./fixtures/governance/hard-stop.commandRequest.json");
const {
  evaluateGovernanceRequest,
} = require("../src/governance/runtime/index.js");

test("runtime subset emits structured omission-backed HOLD details", () => {
  const result = evaluateGovernanceRequest(refusalFixture);

  assert.equal(result.decision, "HOLD");
  assert.equal(result.hold.blocking, true);
  assert.equal(result.hold.status, "active");
  assert.deepEqual(
    result.runtimeSubset.omissions.activeOmissionPackIds,
    ["action_without_authority"]
  );
  assert.equal(
    result.runtimeSubset.openItemsBoard.groups["Missing now"][0].missingItemCode,
    "action_without_authority"
  );
});

test("runtime subset can HOLD on standing risk without persistence widening", () => {
  const result = evaluateGovernanceRequest({
    ...safePassFixture,
    confidence_context: {
      evaluation_session_id: "session-2026-04-14-standing-risk",
      continuity_entries: [
        {
          entry_id: "standing-risk-entry",
          entry_type: "hold",
          summary: "Prior unresolved inspection review still carries operational risk.",
          origin_session_id: "session-2026-04-10",
          last_seen_session_id: "session-2026-04-14-standing-risk",
          session_count: 3,
          carry_count: 2,
          source_refs: ["continuity://standing-risk-entry"],
          evidence_refs: ["evidence://standing-risk-entry"]
        }
      ],
      continuation_signals: [
        {
          entry_id: "standing-risk-entry",
          relevant_work_continued: true,
          blast_radius_still_exists: true,
          evidence_refs: ["continuation://standing-risk-entry"]
        }
      ],
      current_session_resolved_outcomes: [
        {
          entry_id: "resolved-entry",
          summary: "Earlier inspection note was resolved in this session.",
          outcome: "resolve",
          source_refs: ["continuity://resolved-entry"],
          evidence_refs: []
        }
      ]
    }
  });

  assert.equal(result.decision, "HOLD");
  assert.equal(result.reason, "standing_risk_states=standing-risk-entry:STANDING");
  assert.equal(result.runtimeSubset.standingRisk.blockingItems[0].state, "STANDING");
  assert.equal(
    result.runtimeSubset.openItemsBoard.groups["Aging into risk"][0].itemId,
    "standing-risk-entry"
  );
  assert.equal(
    result.runtimeSubset.openItemsBoard.groups["Resolved this session"][0].itemId,
    "resolved-entry"
  );
});

test("runtime subset routes hard-stop posture through the safety interlock layer", () => {
  const result = evaluateGovernanceRequest(hardStopFixture);

  assert.equal(result.decision, "BLOCK");
  assert.equal(result.runtimeSubset.controlRod.effectivePosture, "HARD_STOP");
  assert.equal(
    result.runtimeSubset.interlocks.effective.interlockId,
    "hard_stop_domain_block"
  );
});
