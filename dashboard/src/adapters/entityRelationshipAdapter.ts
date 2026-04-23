import type { ControlRoomTimelineStep } from "../state/controlRoomState.ts";
import type { ScenarioObject } from "../types/scenario.ts";

export interface EntityRelationshipIndicator {
  label: string;
  sourcePath: string;
  value: string;
}

export interface EntityRelationshipNode {
  detail: string | null;
  id: string;
  kind: "authority" | "corridor" | "entity" | "match" | "request";
  label: string;
  sourcePath: string;
}

export interface EntityRelationshipEdge {
  from: string;
  label: string;
  sourcePath: string;
  to: string;
}

export interface EntityRelationshipView {
  edges: readonly EntityRelationshipEdge[];
  fallbackMessage: string;
  hasGraph: boolean;
  indicators: readonly EntityRelationshipIndicator[];
  nodes: readonly EntityRelationshipNode[];
}

function isRecord(value: unknown): value is ScenarioObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function getSelectedMatch(currentStep: ControlRoomTimelineStep): ScenarioObject | null {
  return isRecord(currentStep.step.matching?.selectedMatch)
    ? currentStep.step.matching.selectedMatch
    : null;
}

function getTargetGovernanceItem(selectedMatch: ScenarioObject | null): ScenarioObject | null {
  return isRecord(selectedMatch?.targetGovernanceItem)
    ? selectedMatch.targetGovernanceItem
    : null;
}

function getMatchingResult(currentStep: ControlRoomTimelineStep): ScenarioObject | null {
  return isRecord(currentStep.step.matching?.result)
    ? currentStep.step.matching.result
    : null;
}

function getRequestEntityRef(currentStep: ControlRoomTimelineStep): ScenarioObject | null {
  return isRecord(currentStep.step.governance?.request?.entity_ref)
    ? currentStep.step.governance.request.entity_ref
    : null;
}

function getAuthorityResolution(currentStep: ControlRoomTimelineStep): ScenarioObject | null {
  const stageResolution = currentStep.step.authority?.resolution;
  if (isRecord(stageResolution)) {
    return stageResolution;
  }

  const runtimeResolution =
    currentStep.step.governance?.result?.runtimeSubset?.civic?.authority_resolution;
  return isRecord(runtimeResolution) ? runtimeResolution : null;
}

function getAuthorityDomainId(authorityResolution: ScenarioObject | null): string | null {
  if (!authorityResolution) {
    return null;
  }

  if (asString(authorityResolution.reason)?.includes("authority_not_requested")) {
    return null;
  }

  const domain = isRecord(authorityResolution.domain) ? authorityResolution.domain : null;
  return asString(domain?.domain_id) ?? asString(authorityResolution.domain_id);
}

function getCorridorId(currentStep: ControlRoomTimelineStep): string | null {
  const matchingResult = getMatchingResult(currentStep);
  const selectedMatch = getSelectedMatch(currentStep);
  const governancePatch = currentStep.step.governance?.request?.candidate_signal_patch;
  const governancePatchBody =
    isRecord(governancePatch) && isRecord(governancePatch.governance)
      ? governancePatch.governance
    : null;

  return (
    asString(matchingResult?.corridorId) ??
    asString(selectedMatch?.corridorId) ??
    asString(governancePatchBody?.corridor_id)
  );
}

function getOutputSourceRefCount(currentStep: ControlRoomTimelineStep): number {
  const outputs = currentStep.step.skins?.outputs;
  if (!isRecord(outputs)) {
    return 0;
  }

  const sourceRefs = new Set<string>();
  Object.values(outputs).forEach((payload) => {
    if (!isRecord(payload) || !Array.isArray(payload.sourceRefs)) {
      return;
    }

    payload.sourceRefs.forEach((sourceRef) => {
      if (!isRecord(sourceRef)) {
        return;
      }

      const path = asString(sourceRef.path);
      const sourceKind = asString(sourceRef.sourceKind);
      if (path || sourceKind) {
        sourceRefs.add(`${sourceKind ?? "source"}:${path ?? "path-unavailable"}`);
      }
    });
  });

  return sourceRefs.size;
}

function addNode(
  nodes: Map<string, EntityRelationshipNode>,
  kind: EntityRelationshipNode["kind"],
  value: string | null,
  detail: string | null,
  sourcePath: string
): string | null {
  if (!value) {
    return null;
  }

  const nodeId = `${kind}:${value}`;
  if (!nodes.has(nodeId)) {
    nodes.set(nodeId, {
      detail,
      id: nodeId,
      kind,
      label: value,
      sourcePath,
    });
  }

  return nodeId;
}

function addEdge(
  edges: EntityRelationshipEdge[],
  from: string | null,
  to: string | null,
  label: string,
  sourcePath: string
) {
  if (!from || !to || from === to) {
    return;
  }

  if (edges.some((edge) => edge.from === from && edge.to === to && edge.label === label)) {
    return;
  }

  edges.push({
    from,
    label,
    sourcePath,
    to,
  });
}

export function adaptEntityRelationships(
  currentStep: ControlRoomTimelineStep | null
): EntityRelationshipView {
  const nodes = new Map<string, EntityRelationshipNode>();
  const edges: EntityRelationshipEdge[] = [];
  const indicators: EntityRelationshipIndicator[] = [];

  if (!currentStep) {
    return {
      edges,
      fallbackMessage: "No active step is selected.",
      hasGraph: false,
      indicators,
      nodes: [],
    };
  }

  const selectedMatch = getSelectedMatch(currentStep);
  const target = getTargetGovernanceItem(selectedMatch);
  const requestEntityRef = getRequestEntityRef(currentStep);
  const matchingResult = getMatchingResult(currentStep);
  const authorityResolution = getAuthorityResolution(currentStep);
  const corridorId = getCorridorId(currentStep);
  const matchId = asString(selectedMatch?.matchId);
  const matchType = asString(selectedMatch?.matchType);
  const matchConfidence = asString(selectedMatch?.confidenceTier);
  const sourceExtraction = isRecord(selectedMatch?.sourceExtraction)
    ? selectedMatch.sourceExtraction
    : null;
  const selectedClauseText =
    currentStep.selectedClauseText ?? asString(sourceExtraction?.clauseText);
  const targetEntityId =
    asString(target?.entityId) ?? asString(currentStep.step.summary?.selectedEntityId);
  const targetEntityType =
    asString(target?.entityType) ?? asString(currentStep.step.summary?.selectedEntityType);
  const requestEntityId = asString(requestEntityRef?.entity_id);
  const requestEntityType = asString(requestEntityRef?.entity_type);
  const authorityDomainId = getAuthorityDomainId(authorityResolution);
  const unmatchedCount = isRecord(matchingResult?.matchSummary)
    ? asString(matchingResult.matchSummary.unmatchedGovernanceItemCount) ??
      String(matchingResult.matchSummary.unmatchedGovernanceItemCount ?? "")
    : null;
  const sourceRefCount = getOutputSourceRefCount(currentStep);

  const corridorNode = addNode(
    nodes,
    "corridor",
    corridorId,
    "corridorId",
    "step.matching.result.corridorId"
  );
  const matchNode = addNode(
    nodes,
    "match",
    matchId,
    selectedClauseText,
    "step.matching.selectedMatch.matchId"
  );
  const targetNode = addNode(
    nodes,
    "entity",
    targetEntityId,
    targetEntityType,
    "step.matching.selectedMatch.targetGovernanceItem.entityId"
  );
  const requestNode = addNode(
    nodes,
    "request",
    requestEntityId,
    requestEntityType,
    "step.governance.request.entity_ref.entity_id"
  );
  const authorityNode = addNode(
    nodes,
    "authority",
    authorityDomainId,
    "authority domain",
    "step.authority.resolution.domain.domain_id"
  );

  addEdge(edges, matchNode, targetNode, "selected match", "step.matching.selectedMatch");
  addEdge(edges, corridorNode, targetNode ?? requestNode, "corridor context", "step.matching.result.corridorId");
  addEdge(edges, requestNode, targetNode, "governance request", "step.governance.request.entity_ref");
  addEdge(edges, authorityNode, targetNode ?? requestNode, "authority posture", "step.authority.resolution");

  if (targetEntityId) {
    indicators.push({
      label: "selected entity",
      sourcePath: "step.summary.selectedEntityId",
      value: targetEntityType ? `${targetEntityType} · ${targetEntityId}` : targetEntityId,
    });
  } else if (targetEntityType) {
    indicators.push({
      label: "selected entity type",
      sourcePath: "step.summary.selectedEntityType",
      value: `${targetEntityType} · no entity id in snapshot`,
    });
  }

  if (matchType) {
    indicators.push({
      label: "match type",
      sourcePath: "step.matching.selectedMatch.matchType",
      value: matchConfidence ? `${matchType} · ${matchConfidence}` : matchType,
    });
  }

  if (requestEntityId) {
    indicators.push({
      label: "request entity",
      sourcePath: "step.governance.request.entity_ref",
      value: requestEntityType ? `${requestEntityType} · ${requestEntityId}` : requestEntityId,
    });
  }

  if (authorityDomainId) {
    indicators.push({
      label: "authority domain",
      sourcePath: "step.authority.resolution.domain.domain_id",
      value: authorityDomainId,
    });
  }

  if (corridorId) {
    indicators.push({
      label: "corridor",
      sourcePath: "step.matching.result.corridorId",
      value: corridorId,
    });
  }

  if (unmatchedCount && unmatchedCount !== "0") {
    indicators.push({
      label: "unmatched governance items",
      sourcePath: "step.matching.result.matchSummary.unmatchedGovernanceItemCount",
      value: unmatchedCount,
    });
  }

  if (sourceRefCount > 0) {
    indicators.push({
      label: "skin source refs",
      sourcePath: "step.skins.outputs.*.sourceRefs",
      value: String(sourceRefCount),
    });
  }

  return {
    edges,
    fallbackMessage:
      "Sparse snapshot: no concrete linked entity graph is present for this active step.",
    hasGraph: nodes.size > 1 && edges.length > 0,
    indicators,
    nodes: [...nodes.values()],
  };
}
