import type { DirectorBookmark } from "../../director/directorBookmarks.ts";

export interface DirectorModeToggleProps {
  bookmarks: readonly DirectorBookmark[];
  enabled: boolean;
  onSelectBookmark: (bookmark: DirectorBookmark) => void;
  onToggle: () => void;
  selectedBookmarkId: string | null;
}

export function DirectorModeToggle({
  bookmarks,
  enabled,
  onSelectBookmark,
  onToggle,
  selectedBookmarkId,
}: DirectorModeToggleProps) {
  return (
    <section className="panel director-toggle" aria-labelledby="director-toggle-title">
      <div className="panel-heading">
        <p className="panel-eyebrow">Director mode</p>
        <h2 id="director-toggle-title">Absence Lens</h2>
      </div>

      <div className="director-toggle__row">
        <p className="director-toggle__copy">
          Director Mode stays view-only. It surfaces governed non-events, withheld detail,
          and source-bounded bookmarks without changing scenario, step, playback, or skin truth.
        </p>

        <button
          type="button"
          className={[
            "control-button",
            "director-toggle__button",
            enabled ? "director-toggle__button--enabled" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-pressed={enabled}
          onClick={onToggle}
        >
          {enabled ? "Director mode on" : "Director mode off"}
        </button>
      </div>

      {bookmarks.length > 0 ? (
        <div className="director-toggle__bookmarks">
          <p className="status-label">Scene bookmarks</p>
          <div className="director-toggle__bookmark-list">
            {bookmarks.map((bookmark) => (
              <button
                type="button"
                key={bookmark.id}
                className={[
                  "director-bookmark",
                  bookmark.id === selectedBookmarkId ? "director-bookmark--active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                data-director-bookmark={bookmark.id}
                onClick={() => onSelectBookmark(bookmark)}
              >
                <span className="director-bookmark__step">{bookmark.stepId}</span>
                <strong>{bookmark.title}</strong>
                <span>{bookmark.summary}</span>
                <small>{bookmark.citationPath}</small>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="director-toggle__empty">
          No source-bounded bookmark is available for the active scenario.
        </p>
      )}
    </section>
  );
}
