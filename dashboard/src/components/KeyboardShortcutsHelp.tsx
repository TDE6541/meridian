import { demoShortcutGroups } from "../demo/demoShortcuts.ts";

export function KeyboardShortcutsHelp() {
  return (
    <section
      className="panel keyboard-shortcuts-help"
      data-shortcuts-help="visible"
      aria-labelledby="keyboard-shortcuts-title"
    >
      <div className="panel-heading">
        <p className="panel-eyebrow">Keyboard shortcuts</p>
        <h2 id="keyboard-shortcuts-title">Demo driving keys</h2>
      </div>

      <div className="keyboard-shortcuts-help__groups">
        {demoShortcutGroups.map((group) => (
          <section key={group.title} className="keyboard-shortcuts-help__group">
            <p className="status-label">{group.title}</p>
            <ul className="keyboard-shortcuts-help__list">
              {group.items.map((item) => (
                <li key={`${group.title}-${item.label}`} className="shortcut-item">
                  <div className="shortcut-item__keys" aria-hidden="true">
                    {item.keys.map((key) => (
                      <kbd key={`${group.title}-${item.label}-${key}`}>{key}</kbd>
                    ))}
                  </div>
                  <span>{item.label}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <p className="shortcut-note">
        Shortcuts pause automatically when focus is inside a text input.
      </p>
    </section>
  );
}
