import type {
  ScenarioSkinAbsence,
  ScenarioSkinClaim,
  ScenarioSkinFallback,
  ScenarioSkinOutputKey,
  ScenarioSkinPayload,
  ScenarioSkinRedaction,
  ScenarioSkinSection,
  ScenarioSkinTruthFingerprint,
  ScenarioSourceRef,
  ScenarioStep,
} from "../types/scenario.ts";

export const DASHBOARD_SKIN_ORDER = [
  "permitting",
  "council",
  "operations",
  "dispatch",
  "public",
] as const satisfies readonly ScenarioSkinOutputKey[];

export type DashboardSkinKey = (typeof DASHBOARD_SKIN_ORDER)[number];

type DashboardSkinMeta = {
  description: string;
  expectedSkinId: `civic.${DashboardSkinKey}`;
  label: string;
};

const DASHBOARD_SKIN_META: Record<DashboardSkinKey, DashboardSkinMeta> = {
  permitting: {
    description: "Permit posture and approval path",
    expectedSkinId: "civic.permitting",
    label: "Permitting",
  },
  council: {
    description: "Oversight and resolution framing",
    expectedSkinId: "civic.council",
    label: "Council",
  },
  operations: {
    description: "Execution and corridor operations posture",
    expectedSkinId: "civic.operations",
    label: "Operations",
  },
  dispatch: {
    description: "Routing and coordination posture",
    expectedSkinId: "civic.dispatch",
    label: "Dispatch",
  },
  public: {
    description: "Disclosure-safe public narrative",
    expectedSkinId: "civic.public",
    label: "Public",
  },
};

export interface DashboardSkinView extends DashboardSkinMeta {
  absences: readonly ScenarioSkinAbsence[];
  audience: string | null;
  claims: readonly ScenarioSkinClaim[];
  fallback: ScenarioSkinFallback | null;
  hasPayload: boolean;
  isFallbackActive: boolean;
  isMissing: boolean;
  key: DashboardSkinKey;
  payload: ScenarioSkinPayload | null;
  payloadSkinId: string | null;
  redactions: readonly ScenarioSkinRedaction[];
  sections: readonly ScenarioSkinSection[];
  sourceRefs: readonly ScenarioSourceRef[];
  stepFallbackListed: boolean;
  stepRendered: boolean;
  truthFingerprint: ScenarioSkinTruthFingerprint | null;
  viewType: string | null;
}

export interface DashboardResolvedSkinView extends DashboardSkinView {
  payload: ScenarioSkinPayload;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function asArray<T>(value: unknown): readonly T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function asFallback(value: unknown): ScenarioSkinFallback | null {
  return isRecord(value) ? (value as ScenarioSkinFallback) : null;
}

function asTruthFingerprint(value: unknown): ScenarioSkinTruthFingerprint | null {
  return isRecord(value) ? (value as ScenarioSkinTruthFingerprint) : null;
}

function adaptSkinView(
  key: DashboardSkinKey,
  payload: ScenarioSkinPayload | null,
  renderedSkinIds: Set<string>,
  fallbackSkinIds: Set<string>
): DashboardSkinView {
  const meta = DASHBOARD_SKIN_META[key];

  return {
    ...meta,
    absences: asArray<ScenarioSkinAbsence>(payload?.absences),
    audience: asNullableString(payload?.audience),
    claims: asArray<ScenarioSkinClaim>(payload?.claims),
    fallback: asFallback(payload?.fallback),
    hasPayload: payload !== null,
    isFallbackActive: payload?.fallback?.active === true,
    isMissing: payload === null,
    key,
    payload,
    payloadSkinId: asNullableString(payload?.skinId),
    redactions: asArray<ScenarioSkinRedaction>(payload?.redactions),
    sections: asArray<ScenarioSkinSection>(payload?.sections),
    sourceRefs: asArray<ScenarioSourceRef>(payload?.sourceRefs),
    stepFallbackListed: fallbackSkinIds.has(key),
    stepRendered: renderedSkinIds.has(key),
    truthFingerprint: asTruthFingerprint(payload?.truthFingerprint),
    viewType: asNullableString(payload?.viewType),
  };
}

export function adaptStepSkinPayloads(step: ScenarioStep): DashboardSkinView[] {
  const outputs = isRecord(step.skins?.outputs)
    ? (step.skins.outputs as Partial<Record<DashboardSkinKey, ScenarioSkinPayload>>)
    : {};
  const renderedSkinIds = new Set(
    Array.isArray(step.skins?.renderedSkinIds) ? step.skins.renderedSkinIds : []
  );
  const fallbackSkinIds = new Set(
    Array.isArray(step.skins?.fallbackSkinIds) ? step.skins.fallbackSkinIds : []
  );

  return DASHBOARD_SKIN_ORDER.map((key) =>
    adaptSkinView(key, isRecord(outputs[key]) ? outputs[key] ?? null : null, renderedSkinIds, fallbackSkinIds)
  );
}

export function getDashboardSkinView(
  views: readonly DashboardSkinView[],
  key: DashboardSkinKey
): DashboardSkinView | undefined {
  return views.find((view) => view.key === key);
}

export function requireDashboardSkinView(
  views: readonly DashboardSkinView[],
  key: DashboardSkinKey
): DashboardResolvedSkinView | null {
  const view = getDashboardSkinView(views, key);

  return view?.payload ? (view as DashboardResolvedSkinView) : null;
}

export function getSkinFingerprintDigest(view: DashboardSkinView): string | null {
  return asNullableString(view.truthFingerprint?.digest);
}

export function getSkinSectionLines(section: ScenarioSkinSection): string[] {
  if (Array.isArray(section.body)) {
    return section.body.filter(
      (entry): entry is string => typeof entry === "string" && entry.trim().length > 0
    );
  }

  return typeof section.body === "string" && section.body.trim().length > 0
    ? [section.body]
    : [];
}

export function getSkinClaimText(claim: ScenarioSkinClaim): string | null {
  return asNullableString(claim.text);
}

export function getSkinAbsenceText(absence: ScenarioSkinAbsence): string | null {
  return asNullableString(absence.displayText);
}

export function getSkinRedactionText(redaction: ScenarioSkinRedaction): string | null {
  return asNullableString(redaction.text);
}
