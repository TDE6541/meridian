import type {
  MissionRehearsalBoundary,
  MissionRehearsalCertificationV1,
} from "../demo/missionRehearsalCertification.ts";

export interface MissionRehearsalPanelProps {
  certification: MissionRehearsalCertificationV1;
}

function formatBoundary(key: keyof MissionRehearsalBoundary): string {
  const labels: Record<keyof MissionRehearsalBoundary, string> = {
    demo_only: "demo-only",
    no_delivered_notification_claim: "no delivered notification claim",
    no_legal_sufficiency_claim: "no legal sufficiency claim",
    no_live_fort_worth_claim: "no live Fort Worth claim",
    no_mobile_judge_device_proof_claim: "no mobile/judge-device proof claim",
    no_model_api_foreman_claim: "no model/API Foreman claim",
    no_openfga_ciba_claim: "no OpenFGA/CIBA claim",
    no_production_city_claim: "no production city claim",
    no_root_forensic_chain_write_claim: "no root ForensicChain write claim",
  };

  return labels[key];
}

export function MissionRehearsalPanel({
  certification,
}: MissionRehearsalPanelProps) {
  const blockingHolds = certification.checks.filter(
    (check) => check.blocking && check.status === "HOLD"
  ).length;
  const nonblockingWarnings = certification.checks.filter(
    (check) => !check.blocking && check.status === "HOLD"
  ).length;
  const boundaryEntries = Object.entries(certification.boundary).filter(
    ([, enabled]) => enabled
  ) as [keyof MissionRehearsalBoundary, true][];

  return (
    <section
      className="mission-rehearsal-panel"
      data-mission-rehearsal-panel="operator-proof"
      data-rehearsal-certification-status={certification.status}
    >
      <div className="mission-rehearsal-panel__header">
        <div>
          <p className="mission-rehearsal-panel__eyebrow">
            Rehearsal / operator proof
          </p>
          <h2>Rehearsal Certification</h2>
          <p>
            Rehearsal Certification checks whether the demo theater is ready. It
            does not prove mobile/judge-device smoke, legal sufficiency, or
            production city deployment.
          </p>
        </div>
        <div className="mission-rehearsal-panel__status">
          <span>Status</span>
          <strong>{certification.status}</strong>
          <em>{certification.certification_id}</em>
          <small>created: {certification.created_at}</small>
        </div>
      </div>

      <div className="mission-rehearsal-panel__summary">
        <span>Blocking HOLDs: {blockingHolds}</span>
        <span>Nonblocking warnings: {nonblockingWarnings}</span>
        <span>Failures injected: {certification.injected_failures.length}</span>
        <span>Manual HOLDs carried: {certification.remaining_manual_holds.length}</span>
      </div>

      <div className="mission-rehearsal-panel__modes">
        {certification.modes_tested.map((mode) => (
          <article data-rehearsal-mode={mode.mode_id} key={mode.mode_id}>
            <span>{mode.label}</span>
            <strong>{mode.status}</strong>
            <em>{mode.evidence[0]}</em>
          </article>
        ))}
      </div>

      <div className="mission-rehearsal-panel__sections">
        <section>
          <h3>Checks</h3>
          <div className="mission-rehearsal-panel__list">
            {certification.checks.map((check) => (
              <article
                data-rehearsal-check={check.check_id}
                data-rehearsal-check-blocking={check.blocking ? "true" : "false"}
                data-rehearsal-check-status={check.status}
                key={check.check_id}
              >
                <span>{check.blocking ? "blocking" : "nonblocking"}</span>
                <strong>{check.label}</strong>
                <em>{check.status}</em>
                <small>{check.evidence.join(" | ")}</small>
              </article>
            ))}
          </div>
        </section>

        <section>
          <h3>Injected Failures</h3>
          <div className="mission-rehearsal-panel__list">
            {certification.injected_failures.map((failure) => (
              <article
                data-rehearsal-failure={failure.failure_id}
                data-rehearsal-failure-status={failure.status}
                key={failure.failure_id}
              >
                <span>{failure.expected_behavior}</span>
                <strong>{failure.failure_id.replace(/_/g, " ")}</strong>
                <em>{failure.status}</em>
                <small>{failure.observed_behavior}</small>
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="mission-rehearsal-panel__manual-holds">
        <h3>Remaining Manual HOLDs</h3>
        <div>
          {certification.remaining_manual_holds.map((hold) => (
            <span data-rehearsal-manual-hold={hold.hold_id} key={hold.hold_id}>
              {hold.display_label}
            </span>
          ))}
        </div>
      </section>

      <section className="mission-rehearsal-panel__boundary">
        <h3>Boundary</h3>
        <div>
          {boundaryEntries.map(([key]) => (
            <span data-rehearsal-boundary={key} key={key}>
              {formatBoundary(key)}
            </span>
          ))}
        </div>
      </section>
    </section>
  );
}
