import type { ReactNode } from "react";
import type {
  AbsencePanelHighlight,
  DirectorPanelKey,
} from "../../director/absenceSignals.ts";

export interface AbsenceLensOverlayProps {
  active: boolean;
  children: ReactNode;
  highlights: readonly AbsencePanelHighlight[];
  panel: DirectorPanelKey;
}

export function AbsenceLensOverlay({
  active,
  children,
  highlights,
  panel,
}: AbsenceLensOverlayProps) {
  const panelHighlights = active
    ? highlights.filter((highlight) => highlight.panel === panel)
    : [];

  return (
    <div
      className={[
        "absence-overlay",
        panelHighlights.length > 0 ? "absence-overlay--active" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-absence-overlay={panel}
      data-absence-active={panelHighlights.length > 0 ? "true" : "false"}
    >
      {panelHighlights.length > 0 ? (
        <div className="absence-overlay__banner">
          <span>Absence lens</span>
          <strong>
            {panelHighlights
              .slice(0, 3)
              .map((highlight) => highlight.label)
              .join(" · ")}
          </strong>
        </div>
      ) : null}
      {children}
    </div>
  );
}
