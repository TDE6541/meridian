export type ScenarioKey = "routine" | "contested" | "emergency";

export type DecisionOutcome =
  | "ALLOW"
  | "SUPERVISE"
  | "HOLD"
  | "BLOCK"
  | "REVOKE";

export type ScenarioTopLevelStatus = "PASS" | "HOLD" | "FAIL";
export type ScenarioStageStatus = "PASS" | "HOLD" | "FAIL" | "SKIPPED";
export type PlaybackStatus = "playing" | "paused";

export type ScenarioObject = Record<string, unknown>;

export interface ScenarioStageSection extends ScenarioObject {
  reason?: string;
  status?: ScenarioStageStatus | string;
}

export interface ScenarioStepSummary extends ScenarioObject {
  actualDecision?: string | null;
  expectedDecision?: string | null;
  expectedDecisionMatched?: boolean;
  expectedFinalDisposition?: string | null;
  expectedScenarioFinalStatus?: string | null;
  forensicEntryCount?: number;
  selectedClauseText?: string | null;
  selectedEntityId?: string | null;
  selectedEntityType?: string | null;
  selectedMatchTouchesAuthority?: boolean;
  selectedMatchType?: string | null;
  skinParityHolds?: boolean;
}

export interface ScenarioRuntimeSubsetCivic extends ScenarioObject {
  authority_resolution?: ScenarioObject;
  confidence?: ScenarioObject;
  promise_status?: ScenarioObject;
  rationale?: string | ScenarioObject;
  revocation?: ScenarioObject;
}

export interface ScenarioGovernanceResult extends ScenarioObject {
  decision?: DecisionOutcome | string;
  hold?: ScenarioObject;
  reason?: string;
  runtimeSubset?: {
    civic?: ScenarioRuntimeSubsetCivic;
  };
}

export interface ScenarioGovernanceSection extends ScenarioStageSection {
  expectedDecision?: string | null;
  matchedExpectedDecision?: boolean;
  request?: ScenarioObject;
  result: ScenarioGovernanceResult;
}

export interface ScenarioStageStatusMap {
  authority: ScenarioStageSection;
  forensic: ScenarioStageSection;
  governance: ScenarioStageSection;
  matching: ScenarioStageSection;
  pipeline: ScenarioStageSection;
  skins: ScenarioStageSection;
}

export interface ScenarioStep extends ScenarioObject {
  authority: ScenarioObject;
  contractVersion: string;
  forensic: ScenarioObject;
  governance: ScenarioGovernanceSection;
  holds?: ScenarioObject[];
  matching: ScenarioObject;
  pipeline: ScenarioObject;
  skins: ScenarioObject;
  stageStatus?: ScenarioStageStatusMap;
  status: ScenarioTopLevelStatus | string;
  summary?: ScenarioStepSummary;
  variantName?: string;
}

export interface ScenarioCascadeSummary extends ScenarioObject {
  expectedFinalDisposition?: string | null;
  expectedFinalStatus?: string | null;
  failedSteps?: number;
  finalForensicEntryCount?: number;
  finalTruthFingerprintDigest?: string | null;
  heldSteps?: number;
  passedSteps?: number;
  stateChangingSteps?: number;
  totalSteps?: number;
}

export interface ScenarioTransitionEvidenceStep extends ScenarioObject {
  absenceBySkin?: Record<string, string[]>;
  action?: string;
  afterStateFingerprint?: string | null;
  authorityDecision?: string | null;
  beforeStateFingerprint?: string | null;
  expectedFixtureStatus?: string | null;
  governanceDecision?: DecisionOutcome | string | null;
  previousStepId?: string | null;
  selectedClauseText?: string | null;
  stateChanged?: boolean;
  stepId: string;
  truthFingerprintDigest?: string | null;
  variantName?: string | null;
}

export interface ScenarioTransitionEvidence extends ScenarioObject {
  steps: ScenarioTransitionEvidenceStep[];
}

export interface ScenarioResult extends ScenarioObject {
  contractVersion: string;
  scenarioId: string;
  status: ScenarioTopLevelStatus | string;
  steps: ScenarioStep[];
  summary?: ScenarioCascadeSummary;
  transitionEvidence?: ScenarioTransitionEvidence;
  variantName?: string;
}

export interface ScenarioResultEnvelope extends ScenarioObject {
  result: ScenarioResult;
}

export interface ScenarioRunner extends ScenarioObject {
  cascade?: boolean;
  mode?: string;
  requestedScenario?: string;
  script?: string;
}

export interface ScenarioRunnerReport extends ScenarioObject {
  contractVersion: string;
  runner: ScenarioRunner;
  scenarios: ScenarioResultEnvelope[];
  summary?: ScenarioObject;
}

export interface ScenarioRegistryEntry {
  fileName: `${ScenarioKey}.json`;
  key: ScenarioKey;
  label: string;
}
