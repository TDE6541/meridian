const {
  GOVERNANCE_CONFIDENCE_TIERS,
  GOVERNANCE_DECISIONS,
} = require("./decisionVocabulary");

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function getConfidencePosture(tier, config) {
  return config?.confidenceThresholds?.[tier]?.posture || null;
}

function hasNonBlockingReviewSignal(standingRisk) {
  if (!Array.isArray(standingRisk?.view)) {
    return false;
  }

  return standingRisk.view.some(
    (item) =>
      isPlainObject(item) && (item.state === "OPEN" || item.state === "CARRIED")
  );
}

function deriveCivicConfidence(context, config) {
  const decision = context?.decision;
  let tier = GOVERNANCE_CONFIDENCE_TIERS.WATCH;
  let rationale = "watch_clear_path";

  if (decision === GOVERNANCE_DECISIONS.BLOCK) {
    tier = GOVERNANCE_CONFIDENCE_TIERS.KILL;
    rationale =
      context?.reason === "hard_stop_domain_requires_manual_lane"
        ? "kill_manual_lane_required"
        : "kill_fail_closed_posture";
  } else if (
    decision === GOVERNANCE_DECISIONS.HOLD ||
    context?.hold?.blocking === true
  ) {
    tier = GOVERNANCE_CONFIDENCE_TIERS.HOLD;
    rationale =
      Array.isArray(context?.standingRisk?.blockingItems) &&
      context.standingRisk.blockingItems.length > 0
        ? "hold_standing_risk_unresolved"
        : "hold_required_conditions_unresolved";
  } else if (
    decision === GOVERNANCE_DECISIONS.SUPERVISE ||
    hasNonBlockingReviewSignal(context?.standingRisk)
  ) {
    tier = GOVERNANCE_CONFIDENCE_TIERS.GAP;
    rationale =
      decision === GOVERNANCE_DECISIONS.SUPERVISE
        ? "gap_supervised_review_required"
        : "gap_review_signal_present";
  }

  return {
    tier,
    posture: getConfidencePosture(tier, config),
    rationale,
  };
}

function deriveDecisionRationale(context) {
  const decision = context?.decision;
  const reason = context?.reason;

  if (decision === GOVERNANCE_DECISIONS.BLOCK) {
    if (
      reason === "hard_stop_domain_requires_manual_lane" ||
      context?.controlRod?.effectivePosture === "HARD_STOP"
    ) {
      return "HARD_STOP domain requires the manual lane.";
    }

    if (reason === "event_observation_deferred_block_a_command_request_only") {
      return "Event-side governance routing remains deferred.";
    }

    if (reason === "unsupported_request_domain") {
      return "Request does not match a supported governance domain.";
    }

    if (
      typeof reason === "string" &&
      (reason.startsWith("request_") ||
        reason.startsWith("authority_context_") ||
        reason.startsWith("evidence_context_") ||
        reason.startsWith("candidate_signal_patch_") ||
        reason.startsWith("confidence_context_") ||
        reason.includes("unsupported") ||
        reason.includes("invalid"))
    ) {
      return "Request failed bounded governance validation.";
    }

    return "Runtime failed closed on a blocking governance condition.";
  }

  if (decision === GOVERNANCE_DECISIONS.HOLD) {
    if (
      Array.isArray(context?.standingRisk?.blockingItems) &&
      context.standingRisk.blockingItems.length > 0
    ) {
      return "Standing-risk escalation remains unresolved.";
    }

    if (
      context?.requestFacts &&
      context.requestFacts.authorityResolved === false &&
      context.requestFacts.evidenceResolved === false
    ) {
      return "Required approvals and evidence remain unresolved.";
    }

    if (context?.requestFacts?.authorityResolved === false) {
      return "Required approvals remain unresolved.";
    }

    if (context?.requestFacts?.evidenceResolved === false) {
      return "Required evidence remains unresolved.";
    }

    if (Array.isArray(context?.omissions?.findings) && context.omissions.findings.length > 0) {
      return "Omission findings remain unresolved.";
    }

    return "Blocking governance conditions remain unresolved.";
  }

  if (decision === GOVERNANCE_DECISIONS.SUPERVISE) {
    return "SUPERVISED domain requires operator review.";
  }

  return "Required approvals and evidence are resolved.";
}

module.exports = {
  deriveCivicConfidence,
  deriveDecisionRationale,
};
