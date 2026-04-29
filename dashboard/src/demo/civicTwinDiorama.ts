export const CIVIC_TWIN_DIORAMA_VERSION =
  "meridian.v2d.civicTwinDiorama.v1" as const;

export type CivicTwinDioramaSourceLabel =
  | "committed_demo_scenario"
  | "snapshot_payload";

export type CivicTwinDioramaVisibility = "public" | "restricted";

export type CivicTwinDioramaNodeKind =
  | "absence_hold"
  | "authority"
  | "corridor"
  | "department"
  | "permit"
  | "proof_evidence"
  | "public_boundary";

export type CivicTwinDioramaEdgeKind =
  | "authority"
  | "dependency"
  | "evidence"
  | "public_boundary";

export interface CivicTwinDioramaNode {
  label: string;
  node_id: string;
  node_kind: CivicTwinDioramaNodeKind;
  source_label: CivicTwinDioramaSourceLabel;
  summary: string;
  visibility: CivicTwinDioramaVisibility;
}

export interface CivicTwinDioramaEdge {
  edge_id: string;
  edge_kind: CivicTwinDioramaEdgeKind;
  from_node_id: string;
  label: string;
  source_label: CivicTwinDioramaSourceLabel;
  to_node_id: string;
  visibility: CivicTwinDioramaVisibility;
}

export interface CivicTwinDioramaData {
  boundary_notes: readonly string[];
  edges: readonly CivicTwinDioramaEdge[];
  nodes: readonly CivicTwinDioramaNode[];
  permit_id: "Permit #4471";
  source_label: CivicTwinDioramaSourceLabel;
  version: typeof CIVIC_TWIN_DIORAMA_VERSION;
}

export const CIVIC_TWIN_DIORAMA: CivicTwinDioramaData = {
  boundary_notes: [
    "fictional_demo_permit_only",
    "no_gis_dependency",
    "no_accela_dependency",
    "no_external_map_provider",
    "no_live_municipal_data",
  ],
  edges: [
    {
      edge_id: "diorama-edge-permit-evidence",
      edge_kind: "evidence",
      from_node_id: "diorama-node-proof-evidence",
      label: "Evidence anchors the permit display.",
      source_label: "committed_demo_scenario",
      to_node_id: "diorama-node-permit-4471",
      visibility: "public",
    },
    {
      edge_id: "diorama-edge-permit-authority",
      edge_kind: "authority",
      from_node_id: "diorama-node-permit-4471",
      label: "Permit posture depends on bounded authority review.",
      source_label: "snapshot_payload",
      to_node_id: "diorama-node-authority",
      visibility: "restricted",
    },
    {
      edge_id: "diorama-edge-authority-departments",
      edge_kind: "dependency",
      from_node_id: "diorama-node-authority",
      label: "Authority handoff spans permitting and operations roles.",
      source_label: "snapshot_payload",
      to_node_id: "diorama-node-operations-department",
      visibility: "restricted",
    },
    {
      edge_id: "diorama-edge-absence-boundary",
      edge_kind: "public_boundary",
      from_node_id: "diorama-node-absence-hold",
      label: "Missing proof remains visible behind the public boundary.",
      source_label: "committed_demo_scenario",
      to_node_id: "diorama-node-public-boundary",
      visibility: "public",
    },
    {
      edge_id: "diorama-edge-corridor-permit",
      edge_kind: "dependency",
      from_node_id: "diorama-node-corridor",
      label: "Corridor view is a static demo context for the permit.",
      source_label: "committed_demo_scenario",
      to_node_id: "diorama-node-permit-4471",
      visibility: "public",
    },
  ],
  nodes: [
    {
      label: "Permit #4471",
      node_id: "diorama-node-permit-4471",
      node_kind: "permit",
      source_label: "committed_demo_scenario",
      summary: "Fictional permit anchor used by the demo presentation lane.",
      visibility: "public",
    },
    {
      label: "Corridor context",
      node_id: "diorama-node-corridor",
      node_kind: "corridor",
      source_label: "committed_demo_scenario",
      summary: "Static corridor context from committed demo data.",
      visibility: "public",
    },
    {
      label: "Permitting department",
      node_id: "diorama-node-permitting-department",
      node_kind: "department",
      source_label: "snapshot_payload",
      summary: "Local demo role frame for permit posture.",
      visibility: "restricted",
    },
    {
      label: "Operations department",
      node_id: "diorama-node-operations-department",
      node_kind: "department",
      source_label: "snapshot_payload",
      summary: "Local demo role frame for operational dependency.",
      visibility: "restricted",
    },
    {
      label: "Public boundary",
      node_id: "diorama-node-public-boundary",
      node_kind: "public_boundary",
      source_label: "committed_demo_scenario",
      summary: "Disclosure-aware boundary for public-facing projection.",
      visibility: "public",
    },
    {
      label: "Proof evidence",
      node_id: "diorama-node-proof-evidence",
      node_kind: "proof_evidence",
      source_label: "committed_demo_scenario",
      summary: "Committed proof posture that anchors the physical projection.",
      visibility: "public",
    },
    {
      label: "Authority handoff",
      node_id: "diorama-node-authority",
      node_kind: "authority",
      source_label: "snapshot_payload",
      summary: "Bounded local authority handoff state for the demo.",
      visibility: "restricted",
    },
    {
      label: "Absence or HOLD",
      node_id: "diorama-node-absence-hold",
      node_kind: "absence_hold",
      source_label: "committed_demo_scenario",
      summary: "Visible missing-proof posture carried from existing demo truth.",
      visibility: "public",
    },
  ],
  permit_id: "Permit #4471",
  source_label: "committed_demo_scenario",
  version: CIVIC_TWIN_DIORAMA_VERSION,
} as const;
