export const FOREMAN_PANEL_REGISTRY = {
  "absence-lens": {
    id: "absence-lens",
    label: "Absence Lens",
  },
  "authority-resolution": {
    id: "authority-resolution",
    label: "Authority Resolution",
  },
  "authority-timeline": {
    id: "authority-timeline",
    label: "Authority Timeline",
  },
  "control-room": {
    id: "control-room",
    label: "Control Room",
  },
  "director-mode": {
    id: "director-mode",
    label: "Director Mode",
  },
  "disclosure-preview": {
    id: "disclosure-preview",
    label: "Disclosure Preview",
  },
  "foreman-guide": {
    id: "foreman-guide",
    label: "Foreman Guide",
  },
  "garp-status": {
    id: "garp-status",
    label: "GARP Status",
  },
  "live-event-rail": {
    id: "live-event-rail",
    label: "Live Event Rail",
  },
  "skin-view": {
    id: "skin-view",
    label: "Skin View",
  },
} as const;

export type ForemanPanelId = keyof typeof FOREMAN_PANEL_REGISTRY;

export interface ForemanPanelRegistration {
  id: ForemanPanelId;
  label: string;
}

export function isForemanPanelId(value: unknown): value is ForemanPanelId {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(FOREMAN_PANEL_REGISTRY, value)
  );
}

export function getForemanPanel(
  panelId: string | null | undefined
): ForemanPanelRegistration | null {
  return isForemanPanelId(panelId)
    ? FOREMAN_PANEL_REGISTRY[panelId]
    : null;
}

export function getForemanPanelLabel(
  panelId: string | null | undefined
): string | null {
  return getForemanPanel(panelId)?.label ?? null;
}

export function getForemanPanelReference(
  panelId: string | null | undefined
): string | null {
  const panel = getForemanPanel(panelId);

  return panel ? `Look at the ${panel.label} panel.` : null;
}
