import {
  getMissionStageDefinition,
  type MissionStageId,
} from "./missionPlaybackPlan.ts";
import type {
  MissionReceiptTicket,
  MissionRunReceipt,
} from "./missionRunRecorder.ts";

export interface MissionReceiptRibbonTicketView {
  kind_label: string;
  legal_audit_claim_label: "legal_audit_claim: false";
  sequence_label: string;
  source_ref: string;
  stage_label: string;
  summary: string;
  ticket: MissionReceiptTicket;
}

export interface MissionReceiptRibbonView {
  boundary_copy: string;
  latest_ticket: MissionReceiptRibbonTicketView | null;
  ready: boolean;
  run_id: string;
  ticket_count: number;
  tickets: readonly MissionReceiptRibbonTicketView[];
}

function stageLabel(stageId: MissionStageId | null): string {
  return stageId ? getMissionStageDefinition(stageId).label : "Mission";
}

function kindLabel(ticket: MissionReceiptTicket): string {
  return ticket.kind.replace(/\./g, " ");
}

function ticketView(ticket: MissionReceiptTicket): MissionReceiptRibbonTicketView {
  return {
    kind_label: kindLabel(ticket),
    legal_audit_claim_label: "legal_audit_claim: false",
    sequence_label: `#${ticket.sequence}`,
    source_ref: ticket.source_ref,
    stage_label: stageLabel(ticket.stage_id),
    summary: ticket.summary,
    ticket,
  };
}

export function buildMissionReceiptRibbonView(
  receipt: MissionRunReceipt | null | undefined
): MissionReceiptRibbonView {
  const tickets = (receipt?.events ?? [])
    .slice()
    .sort((left, right) => left.sequence - right.sequence)
    .map(ticketView);

  return {
    boundary_copy:
      "Receipt Ribbon records what this demo showed. It is not a legal audit trail and does not write the root ForensicChain.",
    latest_ticket: tickets.at(-1) ?? null,
    ready: tickets.length === 0,
    run_id: receipt?.run_id ?? "mission receipt run pending",
    ticket_count: tickets.length,
    tickets,
  };
}
