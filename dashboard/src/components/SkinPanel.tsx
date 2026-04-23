import {
  getSkinFingerprintDigest,
  type DashboardResolvedSkinView,
  type DashboardSkinView,
} from "../adapters/skinPayloadAdapter.ts";
import { CouncilView } from "./skins/CouncilView.tsx";
import { DispatchView } from "./skins/DispatchView.tsx";
import { OperationsView } from "./skins/OperationsView.tsx";
import { PermittingView } from "./skins/PermittingView.tsx";
import { PublicView } from "./skins/PublicView.tsx";
import type { ControlRoomScenarioRecord } from "../state/controlRoomState.ts";

export interface SkinPanelProps {
  activeStepLabel: string;
  message?: string;
  skinView: DashboardSkinView | null | undefined;
  status: ControlRoomScenarioRecord["status"];
}

function formatViewType(viewType: string | null): string {
  return viewType ?? "Unavailable";
}

function formatSourceRef(sourceRef: { path?: string; sourceKind?: string }): string {
  const sourceKind =
    typeof sourceRef.sourceKind === "string" && sourceRef.sourceKind.length > 0
      ? sourceRef.sourceKind
      : "source";
  const path =
    typeof sourceRef.path === "string" && sourceRef.path.length > 0
      ? sourceRef.path
      : "path-unavailable";

  return `${sourceKind}:${path}`;
}

function renderSkinView(view: DashboardResolvedSkinView) {
  switch (view.key) {
    case "permitting":
      return <PermittingView skin={view} />;
    case "council":
      return <CouncilView skin={view} />;
    case "operations":
      return <OperationsView skin={view} />;
    case "dispatch":
      return <DispatchView skin={view} />;
    case "public":
      return <PublicView skin={view} />;
    default:
      return null;
  }
}

export function SkinPanel({
  activeStepLabel,
  message,
  skinView,
  status,
}: SkinPanelProps) {
  if (status !== "ready" || !skinView) {
    return (
      <section className="panel skin-panel" aria-labelledby="skin-panel-title">
        <div className="panel-heading">
          <p className="panel-eyebrow">Audience panel</p>
          <h2 id="skin-panel-title">Selected skin truth</h2>
        </div>

        <div className="empty-state">
          <p>{message ?? "Skin payloads are unavailable for the selected step."}</p>
        </div>
      </section>
    );
  }

  if (!skinView.payload) {
    return (
      <section
        className="panel skin-panel"
        id={`skin-panel-${skinView.key}`}
        role="tabpanel"
        aria-labelledby={`skin-tab-${skinView.key}`}
      >
        <div className="panel-heading">
          <p className="panel-eyebrow">Audience panel</p>
          <h2 id="skin-panel-title">{skinView.label} snapshot</h2>
        </div>

        <div className="empty-state">
          <p>
            No frozen payload was present for `{skinView.expectedSkinId}` on this
            step.
          </p>
        </div>
      </section>
    );
  }

  const resolvedSkinView = skinView as DashboardResolvedSkinView;
  const digest = getSkinFingerprintDigest(skinView);
  const sourceRefs = resolvedSkinView.sourceRefs.slice(0, 8);

  return (
    <section
      className="panel skin-panel"
      id={`skin-panel-${skinView.key}`}
      role="tabpanel"
      aria-labelledby={`skin-tab-${skinView.key}`}
    >
      <div className="panel-heading">
        <p className="panel-eyebrow">Audience panel</p>
        <h2 id="skin-panel-title">{skinView.label} snapshot</h2>
      </div>

      <div className="skin-panel__header">
        <div>
          <p className="skin-panel__step">Active step {activeStepLabel}</p>
          <p className="skin-panel__identity">
            {(skinView.payloadSkinId ?? skinView.expectedSkinId)} ·{" "}
            {formatViewType(skinView.viewType)}
          </p>
        </div>

        <dl className="skin-panel__facts">
          <div>
            <dt>audience</dt>
            <dd>{skinView.audience ?? "Unavailable"}</dd>
          </div>
          <div>
            <dt>sections</dt>
            <dd>{skinView.sections.length}</dd>
          </div>
          <div>
            <dt>claims</dt>
            <dd>{skinView.claims.length}</dd>
          </div>
          <div>
            <dt>fingerprint</dt>
            <dd>{digest ?? "Unavailable"}</dd>
          </div>
        </dl>
      </div>

      {skinView.isFallbackActive ? (
        <div
          className="skin-panel__fallback"
          data-skin-fallback={skinView.fallback?.code ?? "active"}
        >
          <strong>Fallback visible.</strong>{" "}
          {skinView.fallback?.message ?? "The payload marked this view as fallback."}
        </div>
      ) : null}

      {renderSkinView(resolvedSkinView)}

      <div className="skin-panel__footer">
        <div className="skin-panel__counts">
          <span>Absences {skinView.absences.length}</span>
          <span>Redactions {skinView.redactions.length}</span>
          <span>Rendered {skinView.stepRendered ? "yes" : "no"}</span>
          <span>Fallback listed {skinView.stepFallbackListed ? "yes" : "no"}</span>
        </div>

        <div className="skin-panel__sources">
          <p className="status-label">Source refs</p>
          {sourceRefs.length > 0 ? (
            <div className="skin-panel__source-list">
              {sourceRefs.map((sourceRef, index) => (
                <span key={`${formatSourceRef(sourceRef)}-${index}`} className="skin-source-ref">
                  {formatSourceRef(sourceRef)}
                </span>
              ))}
              {skinView.sourceRefs.length > sourceRefs.length ? (
                <span className="skin-source-ref skin-source-ref--more">
                  +{skinView.sourceRefs.length - sourceRefs.length} more
                </span>
              ) : null}
            </div>
          ) : (
            <p className="skin-panel__source-empty">
              No payload-level source refs were present on this step.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
