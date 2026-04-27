import { useCallback, useMemo, useState } from "react";
import type { ForemanGuideContextV1 } from "./foremanGuideTypes.ts";
import {
  answerForemanGuideMode,
  resolveForemanGuideModes,
  type ForemanGuideModeId,
  type ForemanGuideModeV1,
} from "./foremanModes.ts";

export type { ForemanGuideModeId, ForemanGuideModeV1 };

export interface UseForemanModesResult {
  activeMode: ForemanGuideModeV1;
  activeModeId: ForemanGuideModeId;
  createModeResponse: (modeId?: ForemanGuideModeId) => ReturnType<typeof answerForemanGuideMode>;
  modes: readonly ForemanGuideModeV1[];
  selectMode: (modeId: ForemanGuideModeId) => void;
}

export function useForemanModes(
  context: ForemanGuideContextV1 | null
): UseForemanModesResult {
  const [activeModeId, setActiveModeId] =
    useState<ForemanGuideModeId>("walk");
  const modes = useMemo(() => resolveForemanGuideModes(context), [context]);
  const activeMode =
    modes.find((mode) => mode.mode_id === activeModeId) ?? modes[0];
  const createModeResponse = useCallback(
    (modeId: ForemanGuideModeId = activeModeId) =>
      answerForemanGuideMode(modeId, context),
    [activeModeId, context]
  );

  return {
    activeMode,
    activeModeId,
    createModeResponse,
    modes,
    selectMode: setActiveModeId,
  };
}
