import {
  buildMissionReceiptRibbonView,
  type MissionReceiptRibbonTicketView,
} from "../demo/missionReceiptRibbon.ts";
import type { MissionRunReceipt } from "../demo/missionRunRecorder.ts";

export interface ForensicReceiptRibbonProps {
  receipt?: MissionRunReceipt | null;
}

function TicketChip({ view }: { view: MissionReceiptRibbonTicketView }) {
  return (
    <li
      className="forensic-receipt-ribbon__ticket"
      data-mission-receipt-ticket={view.ticket.kind}
      data-mission-receipt-ticket-stage={view.ticket.stage_id ?? "mission"}
    >
      <span>{view.sequence_label}</span>
      <strong>{view.kind_label}</strong>
      <em>{view.stage_label}</em>
      <p>{view.summary}</p>
      <small>{view.source_ref}</small>
      <small>{view.legal_audit_claim_label}</small>
    </li>
  );
}

export function ForensicReceiptRibbon({
  receipt = null,
}: ForensicReceiptRibbonProps) {
  const view = buildMissionReceiptRibbonView(receipt);

  return (
    <section
      aria-labelledby="forensic-receipt-ribbon-title"
      className="forensic-receipt-ribbon"
      data-demo-mission-receipt="true"
      data-forensic-receipt-ribbon="true"
      data-mission-receipt-count={view.ticket_count}
    >
      <div className="forensic-receipt-ribbon__header">
        <div>
          <p className="forensic-receipt-ribbon__eyebrow">
            Forensic Receipt Ribbon
          </p>
          <h2 id="forensic-receipt-ribbon-title">Demo mission receipt</h2>
          <p>{view.boundary_copy}</p>
        </div>
        <div className="forensic-receipt-ribbon__run">
          <span>Current run id</span>
          <strong>{view.run_id}</strong>
          <em>{view.ticket_count} ticket(s)</em>
        </div>
      </div>

      {view.latest_ticket ? (
        <article
          className="forensic-receipt-ribbon__latest"
          data-latest-mission-receipt-ticket="true"
        >
          <span>Latest ticket</span>
          <strong>{view.latest_ticket.kind_label}</strong>
          <em>{view.latest_ticket.stage_label}</em>
          <p>{view.latest_ticket.summary}</p>
          <small>{view.latest_ticket.source_ref}</small>
        </article>
      ) : (
        <article
          className="forensic-receipt-ribbon__latest forensic-receipt-ribbon__latest--ready"
          data-latest-mission-receipt-ticket="ready"
        >
          <span>Ready</span>
          <strong>No receipt tickets yet</strong>
          <p>
            The ribbon is waiting for mission playback. It remains a demo mission
            receipt, not a legal audit trail.
          </p>
          <small>no root ForensicChain write</small>
        </article>
      )}

      <ol className="forensic-receipt-ribbon__ticker">
        {view.tickets.length > 0 ? (
          view.tickets.map((ticket) => (
            <TicketChip key={ticket.ticket.ticket_id} view={ticket} />
          ))
        ) : (
          <li className="forensic-receipt-ribbon__ticket forensic-receipt-ribbon__ticket--empty">
            <span>#0</span>
            <strong>ready</strong>
            <em>Mission</em>
            <p>Empty receipt trail.</p>
            <small>demo mission receipt / not a legal audit trail</small>
          </li>
        )}
      </ol>
    </section>
  );
}
