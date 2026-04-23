import type { DashboardForensicEntry } from "../adapters/forensicAdapter.ts";
import type { ScenarioObject } from "../types/scenario.ts";

export interface ForensicEntryProps {
  entry: DashboardForensicEntry;
}

function asDisplayValue(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function isRecord(value: unknown): value is ScenarioObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function getEntryDecision(entry: DashboardForensicEntry): string | null {
  const governanceResult = isRecord(entry.payload?.governance_result)
    ? entry.payload.governance_result
    : null;
  const authorityResolution = isRecord(entry.payload?.authority_resolution)
    ? entry.payload.authority_resolution
    : null;
  const revocation = isRecord(entry.payload?.revocation)
    ? entry.payload.revocation
    : null;

  return (
    asDisplayValue(governanceResult?.decision) ??
    asDisplayValue(authorityResolution?.decision) ??
    asDisplayValue(revocation?.decision)
  );
}

function getEntryReason(entry: DashboardForensicEntry): string | null {
  const governanceResult = isRecord(entry.payload?.governance_result)
    ? entry.payload.governance_result
    : null;
  const authorityResolution = isRecord(entry.payload?.authority_resolution)
    ? entry.payload.authority_resolution
    : null;
  const revocation = isRecord(entry.payload?.revocation)
    ? entry.payload.revocation
    : null;

  return (
    asDisplayValue(governanceResult?.reason) ??
    asDisplayValue(authorityResolution?.reason) ??
    asDisplayValue(revocation?.reason) ??
    asDisplayValue(entry.refs?.domain_id)
  );
}

function getRefChips(entry: DashboardForensicEntry): string[] {
  const refs = entry.refs ?? {};
  const keys = [
    "entity_id",
    "entity_type",
    "request_id",
    "domain_id",
    "governance_entry_id",
    "raw_subject",
  ];

  return keys
    .map((key) => {
      const value = refs[key];
      return typeof value === "string" && value.trim().length > 0
        ? `${key}:${value}`
        : null;
    })
    .filter((value): value is string => value !== null);
}

export function ForensicEntry({ entry }: ForensicEntryProps) {
  const decision = getEntryDecision(entry);
  const reason = getEntryReason(entry);
  const refChips = getRefChips(entry).slice(0, 5);

  return (
    <article
      className={[
        "forensic-entry",
        entry.isCurrentStep ? "forensic-entry--current" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-current-step-entry={entry.isCurrentStep ? "true" : "false"}
      data-entry-id={entry.entryId}
      data-entry-type={entry.entryType}
    >
      <div className="forensic-entry__header">
        <div>
          <p className="forensic-entry__type">{entry.entryType}</p>
          <h3>{entry.entryId}</h3>
        </div>
        {entry.isCurrentStep ? (
          <span className="forensic-entry__current">Current step</span>
        ) : null}
      </div>

      <dl className="forensic-entry__facts">
        <div>
          <dt>first seen</dt>
          <dd>{entry.firstSeenStepId}</dd>
        </div>
        <div>
          <dt>occurred at</dt>
          <dd>{entry.occurredAt ?? "Not present"}</dd>
        </div>
        <div>
          <dt>decision</dt>
          <dd>{decision ?? "Not present"}</dd>
        </div>
        <div>
          <dt>reason</dt>
          <dd>{reason ?? "Not present"}</dd>
        </div>
      </dl>

      {entry.linkedEntryIds.length > 0 ? (
        <p className="forensic-entry__links">
          linked entries: {entry.linkedEntryIds.join(", ")}
        </p>
      ) : null}

      {refChips.length > 0 ? (
        <div className="forensic-entry__refs" aria-label="Forensic source refs">
          {refChips.map((chip) => (
            <span key={chip}>{chip}</span>
          ))}
        </div>
      ) : (
        <p className="forensic-entry__empty">No refs object was present for this entry.</p>
      )}

      <p className="forensic-entry__source">{entry.sourcePath}</p>
    </article>
  );
}
