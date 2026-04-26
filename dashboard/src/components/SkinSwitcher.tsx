import type {
  DashboardSkinKey,
  DashboardSkinView,
} from "../adapters/skinPayloadAdapter.ts";
import type { ControlRoomScenarioRecord } from "../state/controlRoomState.ts";

export interface SkinSwitcherProps {
  activeSkinTab: DashboardSkinKey;
  allowedSkins?: readonly DashboardSkinKey[];
  message?: string;
  onSelect: (key: DashboardSkinKey) => void;
  status: ControlRoomScenarioRecord["status"];
  views: readonly DashboardSkinView[];
}

export function SkinSwitcher({
  activeSkinTab,
  allowedSkins,
  message,
  onSelect,
  status,
  views,
}: SkinSwitcherProps) {
  return (
    <section className="panel skin-switcher" aria-labelledby="skin-switcher-title">
      <div className="panel-heading">
        <p className="panel-eyebrow">Audience switcher</p>
        <h2 id="skin-switcher-title">Actual frozen skin outputs</h2>
      </div>

      {status !== "ready" || views.length === 0 ? (
        <div className="empty-state">
          <p>{message ?? "Skin payloads are unavailable for the selected step."}</p>
        </div>
      ) : (
        <div
          className="skin-switcher__tablist"
          role="tablist"
          aria-label="Audience views"
        >
          {views.map((view) => {
            const isAllowed = allowedSkins ? allowedSkins.includes(view.key) : true;

            return (
              <button
                type="button"
                key={view.key}
                id={`skin-tab-${view.key}`}
                role="tab"
                aria-selected={view.key === activeSkinTab}
                aria-controls={`skin-panel-${view.key}`}
                aria-disabled={!isAllowed}
                className={[
                  "skin-tab",
                  view.key === activeSkinTab ? "skin-tab--active" : "",
                  view.isMissing ? "skin-tab--missing" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                data-skin-tab={view.key}
                disabled={!isAllowed}
                onClick={() => {
                  if (isAllowed) {
                    onSelect(view.key);
                  }
                }}
              >
                <span className="skin-tab__eyebrow">{view.key}</span>
                <strong>{view.label}</strong>
                <span className="skin-tab__description">{view.description}</span>
                {!isAllowed ? (
                  <span className="skin-tab__status">
                    Local dashboard role boundary
                  </span>
                ) : null}
                {view.isMissing ? (
                  <span className="skin-tab__status">Payload unavailable</span>
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
