import type { ForemanContextSeedV1 } from "../live/liveTypes.ts";
import { ForemanGuidePanel } from "../components/ForemanGuidePanel.tsx";
import type { ForemanGuideContextV1 } from "./foremanGuideTypes.ts";

export interface ForemanMountPointProps {
  foremanContextSeed?: ForemanContextSeedV1 | null;
  guideContext?: ForemanGuideContextV1 | null;
}

export function ForemanMountPoint({
  foremanContextSeed = null,
  guideContext = null,
}: ForemanMountPointProps) {
  if (guideContext) {
    return <ForemanGuidePanel context={guideContext} />;
  }

  return (
    <section
      className="panel foreman-mount-point"
      data-foreman-mount="inert"
      aria-labelledby="foreman-mount-title"
    >
      <div className="panel-heading">
        <p className="panel-eyebrow">Reserved seam</p>
        <h2 id="foreman-mount-title">Foreman mount point disabled</h2>
      </div>
      <dl className="foreman-mount-point__facts">
        <div>
          <dt>session</dt>
          <dd>{foremanContextSeed?.active_session_id ?? "Unavailable"}</dd>
        </div>
        <div>
          <dt>active event</dt>
          <dd>{foremanContextSeed?.active_event_id ?? "Unavailable"}</dd>
        </div>
        <div>
          <dt>visible entities</dt>
          <dd>{foremanContextSeed?.visible_entity_ids.join(", ") || "None"}</dd>
        </div>
      </dl>
      <p className="foreman-mount-point__copy">
        Context seam only. No guide behavior is mounted in Packet A5.
      </p>
    </section>
  );
}
