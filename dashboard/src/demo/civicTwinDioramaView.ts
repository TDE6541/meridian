import type {
  CivicTwinDioramaData,
  CivicTwinDioramaEdge,
  CivicTwinDioramaNode,
  CivicTwinDioramaSourceLabel,
} from "./civicTwinDiorama.ts";
import {
  getMissionStageDefinition,
  type MissionStageId,
} from "./missionPlaybackPlan.ts";
import type { MissionPhysicalProjectionV1 } from "./missionPhysicalProjection.ts";

export const CIVIC_TWIN_DIORAMA_VIEW_VERSION =
  "meridian.v2d.civicTwinDioramaView.v1" as const;

export type CivicTwinDioramaDisplayKind =
  | "civic_node"
  | "corridor"
  | "department"
  | "permit"
  | "proof"
  | "public_boundary"
  | "utility";

export type CivicTwinDioramaDisplayVisibility =
  | "internal"
  | "public_safe"
  | "restricted";

export type CivicTwinDioramaDisplayState =
  | "active"
  | "complete"
  | "dimmed"
  | "holding"
  | "idle";

export type CivicTwinDioramaEdgeState = "active" | "dimmed" | "inactive";

export type CivicTwinDioramaSourceMode =
  | "d4_projection_diorama"
  | "projection_unavailable";

export interface CivicTwinDioramaNodeView {
  active: boolean;
  display_kind: CivicTwinDioramaDisplayKind;
  kind_label: string;
  label: string;
  node_id: string;
  source_kind: string;
  source_label: string;
  state: CivicTwinDioramaDisplayState;
  state_label: string;
  summary: string;
  visibility: CivicTwinDioramaDisplayVisibility;
  visibility_label: string;
}

export interface CivicTwinDioramaEdgeView {
  active: boolean;
  edge_id: string;
  edge_kind: CivicTwinDioramaEdge["edge_kind"];
  edge_kind_label: string;
  from_label: string;
  from_node_id: string;
  label: string;
  posture_label: string;
  source_label: string;
  state: CivicTwinDioramaEdgeState;
  to_label: string;
  to_node_id: string;
  visibility: CivicTwinDioramaDisplayVisibility;
  visibility_label: string;
}

export interface CivicTwinDioramaView {
  active_stage_id: MissionStageId | null;
  active_stage_label: string;
  boundary_copy: string;
  edge_count: number;
  edges: readonly CivicTwinDioramaEdgeView[];
  fallback_copy: string;
  motion_label: string;
  node_count: number;
  nodes: readonly CivicTwinDioramaNodeView[];
  permit_id: string;
  public_boundary_active: boolean;
  scenario_label: string;
  source_label: string;
  source_mode: CivicTwinDioramaSourceMode;
  source_posture_label: string;
  source_ref: string;
  status: "ready" | "unavailable";
  status_label: string;
  version: typeof CIVIC_TWIN_DIORAMA_VIEW_VERSION;
}

export const CIVIC_TWIN_DIORAMA_BOUNDARY_COPY =
  "Diorama shows the fictional Permit #4471 state model from committed demo data. It is not live GIS, Accela, or an official city record. It does not prove legal sufficiency and does not create governance, authority, absence, or forensic truth." as const;

const SOURCE_LABELS: Record<CivicTwinDioramaSourceLabel, string> = {
  committed_demo_scenario: "committed demo scenario",
  snapshot_payload: "snapshot payload",
};

const KIND_LABELS: Record<CivicTwinDioramaDisplayKind, string> = {
  civic_node: "civic node",
  corridor: "corridor",
  department: "department",
  permit: "permit",
  proof: "proof",
  public_boundary: "public boundary",
  utility: "utility",
};

const VISIBILITY_LABELS: Record<CivicTwinDioramaDisplayVisibility, string> = {
  internal: "internal",
  public_safe: "public-safe",
  restricted: "restricted",
};

const STATE_LABELS: Record<CivicTwinDioramaDisplayState, string> = {
  active: "active",
  complete: "complete",
  dimmed: "dimmed",
  holding: "holding",
  idle: "idle",
};

function sourceLabel(value: CivicTwinDioramaSourceLabel): string {
  return SOURCE_LABELS[value] ?? value;
}

function displayKindFor(node: CivicTwinDioramaNode): CivicTwinDioramaDisplayKind {
  if (node.node_kind === "proof_evidence") {
    return "proof";
  }

  if (
    node.node_kind === "corridor" ||
    node.node_kind === "department" ||
    node.node_kind === "permit" ||
    node.node_kind === "public_boundary"
  ) {
    return node.node_kind;
  }

  return "civic_node";
}

function displayVisibilityFor(
  value: CivicTwinDioramaNode["visibility"] | CivicTwinDioramaEdge["visibility"]
): CivicTwinDioramaDisplayVisibility {
  return value === "restricted" ? "restricted" : "public_safe";
}

function edgeKindLabel(edgeKind: CivicTwinDioramaEdge["edge_kind"]): string {
  return edgeKind.replace(/_/g, " ");
}

function stageLabel(stageId: MissionStageId | null): string {
  if (!stageId) {
    return "Lobby / no active stage";
  }

  return `${getMissionStageDefinition(stageId).label} (${stageId})`;
}

function stageAffinityFor(node: CivicTwinDioramaNode): readonly MissionStageId[] {
  if (node.node_kind === "permit") {
    return ["capture", "public"];
  }

  if (node.node_kind === "corridor") {
    return ["capture", "public"];
  }

  if (node.node_kind === "department" || node.node_kind === "authority") {
    return ["authority", "governance"];
  }

  if (node.node_kind === "public_boundary") {
    return ["public"];
  }

  if (node.node_kind === "proof_evidence") {
    return ["capture", "governance", "chain"];
  }

  if (node.node_kind === "absence_hold") {
    return ["absence"];
  }

  return [];
}

function stageCompleted(
  projection: MissionPhysicalProjectionV1,
  affinities: readonly MissionStageId[]
): boolean {
  return projection.stages.some(
    (stage) =>
      affinities.includes(stage.stage_id) && stage.playback_state === "complete"
  );
}

function isActiveNode(
  node: CivicTwinDioramaNode,
  activeStageId: MissionStageId | null
): boolean {
  return activeStageId ? stageAffinityFor(node).includes(activeStageId) : false;
}

function nodeStateFor(
  node: CivicTwinDioramaNode,
  projection: MissionPhysicalProjectionV1,
  publicBoundaryActive: boolean
): CivicTwinDioramaDisplayState {
  const visibility = displayVisibilityFor(node.visibility);
  const affinities = stageAffinityFor(node);

  if (publicBoundaryActive && visibility === "restricted") {
    return "dimmed";
  }

  if (node.node_kind === "absence_hold" && projection.holds.length > 0) {
    return "holding";
  }

  if (isActiveNode(node, projection.active_stage_id)) {
    return "active";
  }

  if (stageCompleted(projection, affinities)) {
    return "complete";
  }

  return "idle";
}

function toNodeView(
  node: CivicTwinDioramaNode,
  projection: MissionPhysicalProjectionV1,
  publicBoundaryActive: boolean
): CivicTwinDioramaNodeView {
  const displayKind = displayKindFor(node);
  const visibility = displayVisibilityFor(node.visibility);
  const state = nodeStateFor(node, projection, publicBoundaryActive);

  return {
    active: isActiveNode(node, projection.active_stage_id),
    display_kind: displayKind,
    kind_label: KIND_LABELS[displayKind],
    label: node.label,
    node_id: node.node_id,
    source_kind: node.node_kind,
    source_label: sourceLabel(node.source_label),
    state,
    state_label: STATE_LABELS[state],
    summary: node.summary,
    visibility,
    visibility_label: VISIBILITY_LABELS[visibility],
  };
}

function edgeStateFor(
  edge: CivicTwinDioramaEdge,
  nodesById: ReadonlyMap<string, CivicTwinDioramaNodeView>,
  publicBoundaryActive: boolean
): CivicTwinDioramaEdgeState {
  const visibility = displayVisibilityFor(edge.visibility);

  if (publicBoundaryActive && visibility === "restricted") {
    return "dimmed";
  }

  const fromNode = nodesById.get(edge.from_node_id);
  const toNode = nodesById.get(edge.to_node_id);

  return fromNode?.active || toNode?.active ? "active" : "inactive";
}

function toEdgeView(
  edge: CivicTwinDioramaEdge,
  nodesById: ReadonlyMap<string, CivicTwinDioramaNodeView>,
  publicBoundaryActive: boolean
): CivicTwinDioramaEdgeView {
  const visibility = displayVisibilityFor(edge.visibility);
  const state = edgeStateFor(edge, nodesById, publicBoundaryActive);

  return {
    active: state === "active",
    edge_id: edge.edge_id,
    edge_kind: edge.edge_kind,
    edge_kind_label: edgeKindLabel(edge.edge_kind),
    from_label: nodesById.get(edge.from_node_id)?.label ?? edge.from_node_id,
    from_node_id: edge.from_node_id,
    label: edge.label,
    posture_label: state === "active" ? "active edge" : "inactive edge",
    source_label: sourceLabel(edge.source_label),
    state,
    to_label: nodesById.get(edge.to_node_id)?.label ?? edge.to_node_id,
    to_node_id: edge.to_node_id,
    visibility,
    visibility_label: VISIBILITY_LABELS[visibility],
  };
}

function sourcePostureFor(diorama: CivicTwinDioramaData): string {
  const nodeSources = new Set(diorama.nodes.map((node) => node.source_label));
  const edgeSources = new Set(diorama.edges.map((edge) => edge.source_label));
  const labels = [...new Set([...nodeSources, ...edgeSources])]
    .map(sourceLabel)
    .sort();

  return labels.length > 0 ? labels.join(" / ") : sourceLabel(diorama.source_label);
}

export function deriveCivicTwinDioramaView(
  projection?: MissionPhysicalProjectionV1 | null
): CivicTwinDioramaView {
  if (!projection) {
    return {
      active_stage_id: null,
      active_stage_label: stageLabel(null),
      boundary_copy: CIVIC_TWIN_DIORAMA_BOUNDARY_COPY,
      edge_count: 0,
      edges: [],
      fallback_copy:
        "HOLD: D4 mission physical projection is unavailable, so no civic twin nodes or edges are invented.",
      motion_label:
        "Reduced motion safe: labels, states, visibility, edge kinds, and source notes remain text-visible.",
      node_count: 0,
      nodes: [],
      permit_id: "Permit #4471",
      public_boundary_active: false,
      scenario_label: "Fictional Permit #4471 civic state model",
      source_label: "projection unavailable",
      source_mode: "projection_unavailable",
      source_posture_label: "HOLD: source projection unavailable",
      source_ref: "projection unavailable",
      status: "unavailable",
      status_label: "HOLD: projection unavailable",
      version: CIVIC_TWIN_DIORAMA_VIEW_VERSION,
    };
  }

  const diorama = projection.diorama;
  const publicBoundaryActive = projection.active_stage_id === "public";
  const nodes = diorama.nodes.map((node) =>
    toNodeView(node, projection, publicBoundaryActive)
  );
  const nodesById = new Map(nodes.map((node) => [node.node_id, node]));
  const edges = diorama.edges.map((edge) =>
    toEdgeView(edge, nodesById, publicBoundaryActive)
  );

  return {
    active_stage_id: projection.active_stage_id,
    active_stage_label: stageLabel(projection.active_stage_id),
    boundary_copy: CIVIC_TWIN_DIORAMA_BOUNDARY_COPY,
    edge_count: edges.length,
    edges,
    fallback_copy:
      "Every node and edge is mapped from projection.diorama; D10 does not compute city truth.",
    motion_label:
      projection.motion.reduced_motion_safe
        ? "Reduced motion safe: labels, states, visibility, edge kinds, and source notes remain text-visible."
        : "Motion state unavailable; labels, states, visibility, edge kinds, and source notes remain text-visible.",
    node_count: nodes.length,
    nodes,
    permit_id: diorama.permit_id,
    public_boundary_active: publicBoundaryActive,
    scenario_label: `${diorama.permit_id} fictional civic state model`,
    source_label: sourceLabel(diorama.source_label),
    source_mode: "d4_projection_diorama",
    source_posture_label: sourcePostureFor(diorama),
    source_ref: "projection.diorama",
    status: "ready",
    status_label: "D4 civic twin diorama mapped",
    version: CIVIC_TWIN_DIORAMA_VIEW_VERSION,
  };
}
