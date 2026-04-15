function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }

  Object.freeze(value);

  for (const key of Object.keys(value)) {
    deepFreeze(value[key]);
  }

  return value;
}

const MERIDIAN_GOVERNANCE_CONFIG = {
  version: "wave4a-block-b-static-civic-policy-pack-v1",
  source: {
    mode: "static_local_module",
    wave: "4A",
    block: "B",
    runtimeConfigSource: "only_runtime_config_source",
    notes: [
      "This module is the only runtime config source for Wave 4A governance evaluation.",
      "Live NATS KV reads, env branching, dynamic fetch, and filesystem reads are out of scope for Block B.",
    ],
  },
  decisionVocabulary: {
    emittedNow: ["ALLOW", "HOLD", "BLOCK"],
    reservedOnly: ["SUPERVISE", "REVOKE"],
    notes:
      "Reserved decisions remain documented policy metadata only in Block B and are not emitted by the runtime.",
  },
  domains: {
    permit_authorization: {
      rodPosition: "SUPERVISED",
      description:
        "Permit authorization stays supervised until required approvals and evidence resolve.",
      appliesTo: {
        entityTypes: ["permit_application"],
        subjectIncludes: ["permit"],
      },
    },
    inspection_resolution: {
      rodPosition: "FULL_AUTO",
      description:
        "Inspection resolution may auto-allow only when the bounded authority and evidence checks are fully resolved.",
      appliesTo: {
        entityTypes: ["inspection"],
        subjectIncludes: ["inspection"],
      },
    },
    utility_corridor_action: {
      rodPosition: "HARD_STOP",
      description:
        "Utility corridor action stops on missing conflict evidence or unresolved approvals.",
      appliesTo: {
        entityTypes: ["permit_application", "action_request"],
        subjectIncludes: ["utility", "corridor"],
      },
    },
    decision_closure: {
      rodPosition: "HARD_STOP",
      description:
        "Decision closure requires closure-supporting evidence before any terminal action proceeds.",
      appliesTo: {
        entityTypes: ["decision_record"],
        subjectIncludes: ["closure", "closeout"],
      },
      notes: "Closure evidence posture is frozen here; richer promise-status work remains later-wave.",
    },
    public_notice_action: {
      rodPosition: "SUPERVISED",
      description:
        "Public notice action remains supervised until disclosure evidence is complete and supportable.",
      appliesTo: {
        entityTypes: ["action_request"],
        subjectIncludes: ["notice", "public-notice"],
      },
    },
  },
  constraints: {
    malformed_or_unsupported_input: {
      appliesTo: [
        "permit_authorization",
        "inspection_resolution",
        "utility_corridor_action",
        "decision_closure",
        "public_notice_action",
      ],
      description:
        "No action path should silently proceed on malformed or unsupported governance input.",
      requiredFacts: [
        "request is a plain object",
        "kind is a supported bounded runtime kind",
        "authority_context shape is bounded and readable",
        "evidence_context shape is bounded and readable",
      ],
      defaultDecision: "BLOCK",
    },
    unresolved_required_approvals: {
      appliesTo: [
        "permit_authorization",
        "inspection_resolution",
        "utility_corridor_action",
        "decision_closure",
        "public_notice_action",
      ],
      description:
        "No permit authorization or governed action proceeds when required approvals are unresolved.",
      requiredFacts: [
        "authority_context.resolved is true",
        "missing_approvals is empty",
      ],
      defaultDecision: "HOLD",
    },
    incomplete_required_evidence: {
      appliesTo: [
        "permit_authorization",
        "inspection_resolution",
        "utility_corridor_action",
        "decision_closure",
        "public_notice_action",
      ],
      description:
        "No permit, closure, or related action proceeds when required evidence is incomplete.",
      requiredFacts: [
        "present_count meets required_count",
        "missing_types is empty",
      ],
      defaultDecision: "HOLD",
    },
    utility_conflict_evidence_present: {
      appliesTo: ["utility_corridor_action"],
      description:
        "No utility corridor action proceeds when required conflict evidence is missing.",
      requiredFacts: ["utility_conflict_assessment is present"],
      defaultDecision: "HOLD",
    },
    closure_evidence_present: {
      appliesTo: ["decision_closure"],
      description: "No closure action proceeds when closure evidence is absent.",
      requiredFacts: [
        "closure evidence is present",
        "required closure evidence counts are resolved",
      ],
      defaultDecision: "HOLD",
    },
  },
  confidenceThresholds: {
    WATCH: {
      posture: "advisory-only concern, non-blocking",
    },
    GAP: {
      posture: "meaningful missing signal, not yet fatal by itself",
    },
    HOLD: {
      posture: "blocking absence or unresolved required condition",
    },
    KILL: {
      posture:
        "malformed request, impossible state, invalid config, or unsupported path",
    },
  },
  omissionPacks: {
    permit_without_inspection: {
      detects:
        "Permit authorization without the inspection signal or equivalent inspection-ready evidence required by the case.",
      relevantDomains: ["permit_authorization", "inspection_resolution"],
      requiredFacts: [
        "inspection evidence is present when permit flow depends on inspection",
        "required evidence counts are resolved",
      ],
      defaultConsequence: "HOLD",
    },
    action_without_authority: {
      detects:
        "Any governed action missing generic authority resolution or required approvals.",
      relevantDomains: [
        "permit_authorization",
        "inspection_resolution",
        "utility_corridor_action",
        "decision_closure",
        "public_notice_action",
      ],
      requiredFacts: [
        "authority_context.resolved is true",
        "missing_approvals is empty",
      ],
      defaultConsequence: "HOLD",
    },
    closure_without_evidence: {
      detects: "Decision closure without closure-supporting evidence.",
      relevantDomains: ["decision_closure"],
      requiredFacts: [
        "closure evidence is present",
        "required closure evidence counts are resolved",
      ],
      defaultConsequence: "HOLD",
    },
  },
};

module.exports = deepFreeze(MERIDIAN_GOVERNANCE_CONFIG);
