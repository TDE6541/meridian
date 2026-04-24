import { getDashboardSkinView, type DashboardSkinView } from "./skinPayloadAdapter.ts";
import type { DashboardForensicChainView } from "./forensicAdapter.ts";
import type { ControlRoomTimelineStep } from "../state/controlRoomState.ts";
import {
  ABSENCE_SIGNAL_FAMILIES,
  getAbsenceSignalLabel,
  sortAbsenceSignals,
  type AbsencePanelHighlight,
  type AbsenceSignalCitation,
  type AbsenceSignalFamily,
  type AbsenceSignalFamilyState,
  type AbsenceSignalView,
  type DirectorPanelKey,
} from "../director/absenceSignals.ts";
import type { ScenarioObject, ScenarioSourceRef } from "../types/scenario.ts";

export interface AbsenceSignalAdapterInput {
  activeSkinView: DashboardSkinView | null;
  currentStep: ControlRoomTimelineStep | null;
  forensicChain: DashboardForensicChainView;
  skinViews: readonly DashboardSkinView[];
}

export interface AbsenceLensView {
  activeStepId: string | null;
  familyStates: readonly AbsenceSignalFamilyState[];
  highlights: readonly AbsencePanelHighlight[];
  signals: readonly AbsenceSignalView[];
}

function isRecord(value: unknown): value is ScenarioObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

function makeFallbackCitation(
  stepId: string,
  sourcePath: string,
  sourceKind: string,
  evidenceId: string | null = null
): AbsenceSignalCitation {
  return {
    evidenceId,
    sourceKind,
    sourcePath,
    stepId,
  };
}

function fromSourceRef(
  stepId: string,
  sourceRef: ScenarioSourceRef | undefined,
  fallbackPath: string,
  fallbackSourceKind: string,
  evidenceId: string | null = null
): AbsenceSignalCitation {
  const sourcePath = asString(sourceRef?.path) ?? fallbackPath;
  const sourceKind = asString(sourceRef?.sourceKind) ?? fallbackSourceKind;

  return makeFallbackCitation(stepId, sourcePath, sourceKind, evidenceId);
}

function buildSignal(
  stepId: string,
  family: AbsenceSignalFamily,
  title: string,
  summary: string,
  detail: string,
  panelTargets: readonly DirectorPanelKey[],
  citations: readonly AbsenceSignalCitation[]
): AbsenceSignalView {
  return {
    citations,
    detail,
    family,
    id: `${stepId}:${family.toLowerCase()}`,
    panelTargets,
    summary,
    title,
  };
}

function getMatchingResult(currentStep: ControlRoomTimelineStep): ScenarioObject | null {
  return isRecord(currentStep.step.matching?.result)
    ? currentStep.step.matching.result
    : null;
}

function getSelectedMatch(currentStep: ControlRoomTimelineStep): ScenarioObject | null {
  return isRecord(currentStep.step.matching?.selectedMatch)
    ? currentStep.step.matching.selectedMatch
    : null;
}

function getAuthorityResolution(currentStep: ControlRoomTimelineStep): ScenarioObject | null {
  const runtimeResolution =
    currentStep.step.governance?.result?.runtimeSubset?.civic?.authority_resolution;

  if (isRecord(runtimeResolution)) {
    return runtimeResolution;
  }

  return isRecord(currentStep.step.authority?.resolution)
    ? currentStep.step.authority.resolution
    : null;
}

function getRevocation(currentStep: ControlRoomTimelineStep): ScenarioObject | null {
  const runtimeRevocation = currentStep.step.governance?.result?.runtimeSubset?.civic?.revocation;

  if (isRecord(runtimeRevocation)) {
    return runtimeRevocation;
  }

  return isRecord(currentStep.step.authority?.revocation)
    ? currentStep.step.authority.revocation
    : null;
}

function collectDisplayAbsences(
  skinViews: readonly DashboardSkinView[],
  prefix: string
): Array<{
  displayText: string;
  skinKey: DashboardSkinView["key"];
  sourceRef: ScenarioSourceRef | undefined;
}> {
  const matches: Array<{
    displayText: string;
    skinKey: DashboardSkinView["key"];
    sourceRef: ScenarioSourceRef | undefined;
  }> = [];

  skinViews.forEach((view) => {
    view.absences.forEach((absence) => {
      const displayText = asString(absence.displayText);
      if (!displayText || !displayText.startsWith(prefix)) {
        return;
      }

      matches.push({
        displayText,
        skinKey: view.key,
        sourceRef: Array.isArray(absence.sourceRefs)
          ? (absence.sourceRefs.find(isRecord) as ScenarioSourceRef | undefined)
          : undefined,
      });
    });
  });

  return matches;
}

function collectPublicDisclosureHolds(publicView: DashboardSkinView | undefined) {
  if (!publicView) {
    return [];
  }

  return publicView.absences
    .filter((absence) => absence.reason === "PUBLIC_DISCLOSURE_HOLD")
    .map((absence) => ({
      displayText: asString(absence.displayText) ?? "Public disclosure hold.",
      sourceRef: Array.isArray(absence.sourceRefs)
        ? (absence.sourceRefs.find(isRecord) as ScenarioSourceRef | undefined)
        : undefined,
    }));
}

function createHighlights(signals: readonly AbsenceSignalView[]): AbsencePanelHighlight[] {
  return signals.flatMap((signal) =>
    signal.panelTargets.map((panel) => ({
      family: signal.family,
      id: signal.id,
      label: getAbsenceSignalLabel(signal.family),
      panel,
    }))
  );
}

function buildFamilyStates(
  signals: readonly AbsenceSignalView[]
): AbsenceSignalFamilyState[] {
  const presentFamilies = new Set(signals.map((signal) => signal.family));

  return ABSENCE_SIGNAL_FAMILIES.map((family) => ({
    family,
    label: getAbsenceSignalLabel(family),
    status: presentFamilies.has(family) ? "present" : "absent",
  }));
}

export function adaptAbsenceSignals({
  activeSkinView,
  currentStep,
  forensicChain,
  skinViews,
}: AbsenceSignalAdapterInput): AbsenceLensView {
  if (!currentStep) {
    return {
      activeStepId: null,
      familyStates: buildFamilyStates([]),
      highlights: [],
      signals: [],
    };
  }

  const stepId = currentStep.stepId;
  const matchingResult = getMatchingResult(currentStep);
  const selectedMatch = getSelectedMatch(currentStep);
  const authorityResolution = getAuthorityResolution(currentStep);
  const revocation = getRevocation(currentStep);
  const publicView = getDashboardSkinView(skinViews, "public");
  const signals: AbsenceSignalView[] = [];

  const unmatchedItems = Array.isArray(matchingResult?.unmatchedGovernanceItems)
    ? matchingResult.unmatchedGovernanceItems.filter(isRecord)
    : [];

  if (unmatchedItems.length > 0) {
    const firstItem = unmatchedItems[0];
    const entityId = asString(firstItem.entityId);
    const entityType = asString(firstItem.entityType) ?? "governance item";
    const status = asString(firstItem.status) ?? "open";

    signals.push(
      buildSignal(
        stepId,
        "UNMATCHED_GOVERNANCE_ITEM",
        `${unmatchedItems.length} unmatched governance item${
          unmatchedItems.length === 1 ? "" : "s"
        }`,
        `Open governance items remain unmatched in this step.`,
        `${entityType} ${entityId ?? "without-id"} remains ${status}.`,
        ["governance", "relationships", "choreography"],
        [
          makeFallbackCitation(
            stepId,
            "step.matching.result.matchSummary.unmatchedGovernanceItemCount",
            "matching.result",
            String(unmatchedItems.length)
          ),
          makeFallbackCitation(
            stepId,
            "step.matching.result.unmatchedGovernanceItems[0].entityId",
            "matching.result",
            entityId
          ),
        ]
      )
    );
  }

  const selectedMatchType = asString(selectedMatch?.matchType);
  const selectedMatchId = asString(selectedMatch?.matchId);
  if (selectedMatchType === "PROPOSED_CREATION") {
    const target = isRecord(selectedMatch?.targetGovernanceItem)
      ? selectedMatch.targetGovernanceItem
      : null;
    const targetType = asString(target?.entityType) ?? "governance item";
    const reasonCode = isRecord(selectedMatch?.proposedAction)
      ? asString(selectedMatch.proposedAction.reasonCode)
      : null;

    signals.push(
      buildSignal(
        stepId,
        "PROPOSED_CREATION",
        "Proposed creation only",
        "This step carries a PROPOSED_CREATION match, not a confirmed city-state item.",
        `${targetType} remains proposed only${reasonCode ? ` (${reasonCode})` : ""}.`,
        ["governance", "relationships", "choreography"],
        [
          makeFallbackCitation(
            stepId,
            "step.matching.selectedMatch.matchType",
            "matching.selectedMatch",
            selectedMatchId
          ),
          makeFallbackCitation(
            stepId,
            "step.matching.selectedMatch.proposedAction.reasonCode",
            "matching.selectedMatch",
            reasonCode
          ),
        ]
      )
    );
  }

  const matchSummary = isRecord(matchingResult?.matchSummary)
    ? matchingResult.matchSummary
    : null;
  const byConfidenceTier = isRecord(matchSummary?.byConfidenceTier)
    ? matchSummary.byConfidenceTier
    : null;
  const ambiguousCount = byConfidenceTier
    ? Number(byConfidenceTier.AMBIGUOUS ?? 0)
    : 0;
  if (asString(selectedMatch?.confidenceTier) === "AMBIGUOUS" || ambiguousCount > 0) {
    const holdCodes = Array.isArray(selectedMatch?.holds)
      ? selectedMatch.holds
          .filter(isRecord)
          .map((entry) => asString(entry.code))
          .filter((entry): entry is string => entry !== null)
      : [];

    signals.push(
      buildSignal(
        stepId,
        "AMBIGUOUS_MATCH",
        "Ambiguous match remains unresolved",
        "The payload keeps this match ambiguous at the current step.",
        holdCodes.length > 0
          ? `Hold codes: ${holdCodes.join(", ")}.`
          : "No bounded hold code was present for the ambiguity.",
        ["governance", "relationships", "choreography"],
        [
          makeFallbackCitation(
            stepId,
            "step.matching.selectedMatch.confidenceTier",
            "matching.selectedMatch",
            selectedMatchId
          ),
        ]
      )
    );
  }

  const authorityDecision = asString(authorityResolution?.decision);
  const authorityReason = asString(authorityResolution?.reason);
  const missingApprovalAbsences = collectDisplayAbsences(
    skinViews,
    "Missing required approval:"
  );

  if (authorityDecision === "HOLD" || missingApprovalAbsences.length > 0) {
    const firstMissingApproval = missingApprovalAbsences[0];
    const title =
      missingApprovalAbsences.length > 1
        ? `${missingApprovalAbsences.length} approvals unresolved`
        : "Authority remains unresolved";
    const detailParts = [
      firstMissingApproval?.displayText,
      authorityDecision === "HOLD" && authorityReason
        ? `authority_resolution.reason=${authorityReason}`
        : null,
    ].filter((value): value is string => value !== null);
    const panelTargets: DirectorPanelKey[] = ["governance", "relationships"];

    if (
      firstMissingApproval &&
      activeSkinView?.key === firstMissingApproval.skinKey
    ) {
      panelTargets.push("skin");
    }

    signals.push(
      buildSignal(
        stepId,
        "MISSING_AUTHORITY",
        title,
        "Required authority is still unresolved on this step.",
        detailParts.join(" | ") || "Authority remains unresolved in current input.",
        panelTargets,
        [
          firstMissingApproval
            ? fromSourceRef(
                stepId,
                firstMissingApproval.sourceRef,
                "authority_context.missing_approvals",
                "authorityContext",
                firstMissingApproval.displayText
              )
            : makeFallbackCitation(
                stepId,
                "step.governance.result.runtimeSubset.civic.authority_resolution.reason",
                "runtimeSubset.civic",
                authorityReason
              ),
          authorityDecision === "HOLD"
            ? makeFallbackCitation(
                stepId,
                "step.governance.result.runtimeSubset.civic.authority_resolution.decision",
                "runtimeSubset.civic",
                authorityDecision
              )
            : makeFallbackCitation(
                stepId,
                "authority_context.missing_approvals",
                "authorityContext",
                String(missingApprovalAbsences.length)
              ),
        ]
      )
    );
  }

  if (revocation?.active === true || asString(revocation?.decision) === "REVOKE") {
    const reason = asString(revocation?.reason) ?? "reason unavailable";
    const rationale = asString(revocation?.rationale);

    signals.push(
      buildSignal(
        stepId,
        "AUTHORITY_REVOKED",
        "Authority revoked before state change",
        "This state never becomes city state because authority was revoked.",
        rationale ? `${reason} | ${rationale}` : reason,
        ["governance", "relationships", "choreography"],
        [
          makeFallbackCitation(
            stepId,
            "step.governance.result.runtimeSubset.civic.revocation.reason",
            "runtimeSubset.civic",
            reason
          ),
          makeFallbackCitation(
            stepId,
            "step.governance.result.runtimeSubset.civic.revocation.decision",
            "runtimeSubset.civic",
            asString(revocation?.decision)
          ),
        ]
      )
    );
  }

  const stepDecision = asString(currentStep.step.governance?.result?.decision);
  const stepReason = asString(currentStep.step.governance?.result?.reason)
    ?? asString(currentStep.step.governance?.reason);

  if (stepDecision === "BLOCK") {
    signals.push(
      buildSignal(
        stepId,
        "BLOCKED_ACTION",
        "Blocked action stays in manual lane",
        "This action stays blocked in the current lane.",
        stepReason ?? "No bounded reason string was present for the block.",
        ["governance", "choreography"],
        [
          makeFallbackCitation(
            stepId,
            "step.governance.result.decision",
            "governance.result",
            stepDecision
          ),
          makeFallbackCitation(
            stepId,
            "step.governance.result.reason",
            "governance.result",
            stepReason
          ),
        ]
      )
    );
  }

  if (stepDecision === "HOLD") {
    signals.push(
      buildSignal(
        stepId,
        "HELD_DECISION",
        "Held decision remains unresolved",
        "This step holds and does not become city state.",
        stepReason ?? "No bounded reason string was present for the hold.",
        ["governance", "choreography"],
        [
          makeFallbackCitation(
            stepId,
            "step.governance.result.decision",
            "governance.result",
            stepDecision
          ),
          makeFallbackCitation(
            stepId,
            "step.governance.result.reason",
            "governance.result",
            stepReason
          ),
        ]
      )
    );
  }

  const publicDisclosureHolds = collectPublicDisclosureHolds(publicView);
  const publicRedactionCount = publicView?.redactions.length ?? 0;
  if (publicRedactionCount > 0 || publicDisclosureHolds.length > 0) {
    const firstDisclosureHold = publicDisclosureHolds[0];
    const firstRedaction = publicView?.redactions[0];
    const detail =
      firstDisclosureHold?.displayText ??
      asString(firstRedaction?.text) ??
      "The public payload already marks a bounded redaction on this step.";

    signals.push(
      buildSignal(
        stepId,
        "PUBLIC_REDACTION",
        publicDisclosureHolds.length > 0
          ? "Public detail is held"
          : `${publicRedactionCount} public redactions active`,
        "The public view withholds detail already flagged by the payload.",
        detail,
        activeSkinView?.key === "public" ? ["skin"] : [],
        [
          firstDisclosureHold
            ? fromSourceRef(
                stepId,
                firstDisclosureHold.sourceRef,
                "step.skins.outputs.public.absences[0]",
                "skin.output.public",
                firstDisclosureHold.displayText
              )
            : fromSourceRef(
                stepId,
                Array.isArray(firstRedaction?.sourceRefs)
                  ? (firstRedaction?.sourceRefs.find(isRecord) as ScenarioSourceRef | undefined)
                  : undefined,
                "step.skins.outputs.public.redactions[0]",
                "skin.output.public",
                asString(firstRedaction?.id)
              ),
        ]
      )
    );
  }

  const missingEvidenceAbsences = collectDisplayAbsences(
    skinViews,
    "Missing evidence type:"
  );

  if (missingEvidenceAbsences.length > 0) {
    const firstMissingEvidence = missingEvidenceAbsences[0];
    const panelTargets: DirectorPanelKey[] = ["governance", "choreography"];
    if (activeSkinView?.key === firstMissingEvidence.skinKey) {
      panelTargets.push("skin");
    }

    signals.push(
      buildSignal(
        stepId,
        "MISSING_EVIDENCE",
        missingEvidenceAbsences.length > 1
          ? `${missingEvidenceAbsences.length} evidence gaps remain`
          : "Evidence remains missing",
        "Evidence required by this step is still missing.",
        firstMissingEvidence.displayText,
        panelTargets,
        [
          fromSourceRef(
            stepId,
            firstMissingEvidence.sourceRef,
            "evidence_context.missing_types",
            "rawInput",
            firstMissingEvidence.displayText
          ),
        ]
      )
    );
  }

  if (forensicChain.hasEntries && currentStep.index > 0) {
    const citationSource =
      forensicChain.cumulativeEntries.find((entry) => entry.isCurrentStep) ??
      forensicChain.cumulativeEntries[0];

    signals.push(
      buildSignal(
        stepId,
        "FORENSIC_ACCUMULATION",
        "Forensic chain accumulates through this step",
        "The forensic chain accumulates through this step using snapshot entries only.",
        `${forensicChain.stepEntryCount} current-step entr${
          forensicChain.stepEntryCount === 1 ? "y" : "ies"
        }; ${forensicChain.totalEntryCount} cumulative entries.`,
        ["forensic", "choreography"],
        citationSource
          ? [
              makeFallbackCitation(
                stepId,
                citationSource.sourcePath,
                "forensic.entries",
                citationSource.entryId
              ),
            ]
          : [makeFallbackCitation(stepId, "step.forensic.entries", "forensic.entries")],
      )
    );
  }

  const absenceBySkin = isRecord(currentStep.transition?.absenceBySkin)
    ? currentStep.transition.absenceBySkin
    : null;
  if (absenceBySkin) {
    const nonEmptyAbsenceEntries = Object.entries(absenceBySkin).filter((entry) =>
      Array.isArray(entry[1]) && entry[1].length > 0
    );
    const emptyAbsenceEntries = Object.entries(absenceBySkin).filter((entry) =>
      Array.isArray(entry[1]) && entry[1].length === 0
    );

    if (nonEmptyAbsenceEntries.length > 0 && (emptyAbsenceEntries.length > 0 || nonEmptyAbsenceEntries.length > 1)) {
      const [firstSkinKey, firstMessages] = nonEmptyAbsenceEntries[0];
      const firstMessage = asStringArray(firstMessages)[0] ?? "Audience-specific absence note.";

      signals.push(
        buildSignal(
          stepId,
          "SKIN_DIVERGENCE",
          "Audience views diverge on this step",
          "Audience outputs carry different absence or withholding notes at the same step.",
          `${firstSkinKey} shows: ${firstMessage}`,
          ["skin", "choreography"],
          [
            makeFallbackCitation(
              stepId,
              `transitionEvidence.steps[${currentStep.index}].absenceBySkin.${firstSkinKey}`,
              "transitionEvidence",
              stepId
            ),
          ]
        )
      );
    }
  }

  const sortedSignals = sortAbsenceSignals(signals);

  return {
    activeStepId: stepId,
    familyStates: buildFamilyStates(sortedSignals),
    highlights: createHighlights(sortedSignals),
    signals: sortedSignals,
  };
}
