import type {
  AbsenceSignalFamilyState,
  AbsenceSignalView,
} from "../../director/absenceSignals.ts";

export interface AbsenceSignalRailProps {
  familyStates: readonly AbsenceSignalFamilyState[];
  signals: readonly AbsenceSignalView[];
}

export function AbsenceSignalRail({
  familyStates,
  signals,
}: AbsenceSignalRailProps) {
  const absentFamilies = familyStates.filter((family) => family.status === "absent");

  return (
    <section className="panel absence-rail" aria-labelledby="absence-rail-title">
      <div className="panel-heading">
        <p className="panel-eyebrow">Absence rail</p>
        <h2 id="absence-rail-title">Active absence signals</h2>
      </div>

      {signals.length > 0 ? (
        <div className="absence-rail__list">
          {signals.map((signal) => (
            <article key={signal.id} className="absence-chip" data-absence-signal={signal.family}>
              <p>{signal.title}</p>
              <strong>{signal.summary}</strong>
              <span>{signal.detail}</span>
              <small>{signal.citations[0]?.sourcePath ?? "source unavailable"}</small>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p>No supported absence signal is active on this step.</p>
        </div>
      )}

      <p className="absence-rail__footer">
        Absent on this step:{" "}
        {absentFamilies.length > 0
          ? absentFamilies.map((family) => family.label).join(", ")
          : "none"}
      </p>
    </section>
  );
}
