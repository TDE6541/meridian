import type { MeridianAuthState } from "../auth/MeridianAuthProvider.tsx";
import type { DashboardRoleSessionProofV1 } from "../roleSession/roleSessionTypes.ts";

export interface RoleSessionPanelProps {
  auth: MeridianAuthState;
  roleSession: DashboardRoleSessionProofV1;
}

function formatSkinList(roleSession: DashboardRoleSessionProofV1): string {
  return roleSession.allowed_skins.join(", ");
}

export function RoleSessionPanel({
  auth,
  roleSession,
}: RoleSessionPanelProps) {
  const isAuthenticated = roleSession.auth_status === "authenticated";
  const authCopy = auth.isConfigured
    ? "Auth0 login configured"
    : "Auth0 login unavailable; public mode active";

  return (
    <section
      className="panel"
      data-role-session-panel="true"
      aria-labelledby="role-session-title"
    >
      <div className="panel-heading">
        <p className="panel-eyebrow">Local dashboard role boundary</p>
        <h2 id="role-session-title">Role session proof</h2>
      </div>

      <div className="skin-panel__header">
        <div>
          <p className="skin-panel__step">{authCopy}</p>
          <p className="skin-panel__identity">
            {roleSession.role} · {roleSession.active_skin}
          </p>
        </div>

        <dl className="skin-panel__facts">
          <div>
            <dt>contract</dt>
            <dd>{roleSession.contract}</dd>
          </div>
          <div>
            <dt>auth</dt>
            <dd>{roleSession.auth_status}</dd>
          </div>
          <div>
            <dt>department</dt>
            <dd>{roleSession.department ?? "Unavailable"}</dd>
          </div>
          <div>
            <dt>allowed skins</dt>
            <dd>{formatSkinList(roleSession)}</dd>
          </div>
        </dl>
      </div>

      <div className="playback-controls__buttons">
        {isAuthenticated ? (
          <button
            className="control-button"
            type="button"
            aria-label="Log out of the dashboard role session"
            onClick={auth.logout}
          >
            Logout
          </button>
        ) : (
          <button
            className="control-button control-button--primary"
            type="button"
            aria-label={
              auth.isConfigured
                ? "Open Auth0 login for dashboard role proof"
                : "Auth0 login unavailable; public mode remains active"
            }
            disabled={!auth.isConfigured}
            onClick={auth.login}
          >
            Login
          </button>
        )}
      </div>

      {roleSession.holds.length > 0 ? (
        <div className="empty-state" data-role-session-holds="true">
          {roleSession.holds.map((hold) => (
            <p key={`${hold.code}-${hold.source_ref}`}>{hold.message}</p>
          ))}
        </div>
      ) : null}
    </section>
  );
}
