const OUTCOME_CLASS_BY_DECISION: Record<string, string> = {
  ALLOW: "outcome-badge--allow",
  BLOCK: "outcome-badge--block",
  HOLD: "outcome-badge--hold",
  REVOKE: "outcome-badge--revoke",
  SUPERVISE: "outcome-badge--supervise",
};

export interface OutcomeBadgeProps {
  decision: string | null | undefined;
}

export function OutcomeBadge({ decision }: OutcomeBadgeProps) {
  const label = typeof decision === "string" && decision.length > 0
    ? decision.toUpperCase()
    : "UNKNOWN";
  const outcomeClassName =
    OUTCOME_CLASS_BY_DECISION[label] ?? "outcome-badge--unknown";

  return (
    <span className={`outcome-badge ${outcomeClassName}`} data-decision={label}>
      {label}
    </span>
  );
}
