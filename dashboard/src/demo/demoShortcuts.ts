import type { DashboardSkinKey } from "../adapters/skinPayloadAdapter.ts";
import type { ScenarioKey } from "../types/scenario.ts";

export interface DemoShortcutItem {
  keys: readonly string[];
  label: string;
}

export interface DemoShortcutGroup {
  items: readonly DemoShortcutItem[];
  title: string;
}

const SCENARIO_SHORTCUTS: Record<string, ScenarioKey> = {
  "1": "routine",
  "2": "contested",
  "3": "emergency",
};

const SKIN_SHORTCUTS: Record<string, DashboardSkinKey> = {
  p: "permitting",
  c: "council",
  o: "operations",
  d: "dispatch",
  u: "public",
};

export const demoShortcutGroups = [
  {
    title: "Navigation",
    items: [
      { keys: ["Left"], label: "Previous step" },
      { keys: ["Right"], label: "Next step" },
      { keys: ["Space"], label: "Play or pause" },
      { keys: ["R"], label: "Reset to step one" },
    ],
  },
  {
    title: "Scenarios",
    items: [
      { keys: ["1"], label: "Routine" },
      { keys: ["2"], label: "Contested" },
      { keys: ["3"], label: "Emergency" },
    ],
  },
  {
    title: "Skins",
    items: [
      { keys: ["P"], label: "Permitting" },
      { keys: ["C"], label: "Council" },
      { keys: ["O"], label: "Operations" },
      { keys: ["D"], label: "Dispatch" },
      { keys: ["U"], label: "Public" },
    ],
  },
] as const satisfies readonly DemoShortcutGroup[];

function normalizeShortcutKey(key: string): string {
  return key.trim().toLowerCase();
}

export function resolveScenarioShortcutKey(key: string): ScenarioKey | null {
  return SCENARIO_SHORTCUTS[normalizeShortcutKey(key)] ?? null;
}

export function resolveSkinShortcutKey(key: string): DashboardSkinKey | null {
  return SKIN_SHORTCUTS[normalizeShortcutKey(key)] ?? null;
}

export function shouldIgnoreDemoShortcutTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName;
  return (
    target.isContentEditable ||
    tagName === "INPUT" ||
    tagName === "TEXTAREA" ||
    tagName === "SELECT"
  );
}
