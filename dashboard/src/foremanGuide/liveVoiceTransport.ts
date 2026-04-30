export const FOREMAN_LIVE_VOICE_TRANSPORT_VERSION =
  "meridian.v2g.foremanLiveVoiceTransport.v1" as const;

export const FOREMAN_LIVE_VOICE_ENDPOINT = "/api/foreman-voice" as const;

export type ForemanLiveVoiceState =
  | "failed"
  | "idle"
  | "playing"
  | "requesting"
  | "unavailable";

export interface ForemanLiveVoiceResult {
  issue: string | null;
  ok: boolean;
  state: ForemanLiveVoiceState;
}

export interface ForemanLiveVoicePlayback {
  cancel: () => void;
  finished: Promise<ForemanLiveVoiceResult>;
}

export interface ForemanLiveVoiceTransport {
  speak: (input: ForemanLiveVoiceSpeakInput) => ForemanLiveVoicePlayback;
  stop: () => void;
}

export interface ForemanLiveVoiceSpeakInput {
  onState?: (state: ForemanLiveVoiceState) => void;
  text: string;
}

export interface ForemanLiveVoiceAudioElement {
  addEventListener?: (
    type: string,
    listener: (event: unknown) => void,
    options?: { once?: boolean }
  ) => void;
  load?: () => void;
  onended: ((event: unknown) => void) | null;
  onerror: ((event: unknown) => void) | null;
  pause: () => void;
  play: () => Promise<void> | void;
  preload?: string;
  readyState?: number;
  removeEventListener?: (
    type: string,
    listener: (event: unknown) => void
  ) => void;
}

export interface ForemanLiveVoiceBrowserTarget {
  Audio?: new (src?: string) => ForemanLiveVoiceAudioElement;
  URL?: {
    createObjectURL: (object: Blob) => string;
    revokeObjectURL: (url: string) => void;
  };
}

export interface CreateForemanLiveVoiceTransportInput {
  endpoint?: string;
  fetcher?: typeof fetch | null;
  target?: ForemanLiveVoiceBrowserTarget | null;
}

const VOICE_UNAVAILABLE_COPY = "Voice unavailable - showing typed answer.";
const AUDIO_CAN_PLAY_THROUGH_READY_STATE = 4;
const AUDIO_LOAD_TIMEOUT_MS = 5000;

function getBrowserTarget(): ForemanLiveVoiceBrowserTarget | null {
  return typeof window === "undefined"
    ? null
    : (window as unknown as ForemanLiveVoiceBrowserTarget);
}

function getFetch(fetcher?: typeof fetch | null): typeof fetch | null {
  if (fetcher !== undefined) {
    return fetcher;
  }

  return typeof fetch === "function" ? fetch.bind(globalThis) : null;
}

function resolveTarget(
  target?: ForemanLiveVoiceBrowserTarget | null
): ForemanLiveVoiceBrowserTarget | null {
  return target === undefined ? getBrowserTarget() : target;
}

function result(
  ok: boolean,
  state: ForemanLiveVoiceState,
  issue: string | null = null
): ForemanLiveVoiceResult {
  return {
    issue,
    ok,
    state,
  };
}

async function readJsonIssue(response: Response): Promise<string | null> {
  try {
    const payload = await response.clone().json();

    return typeof payload?.issue === "string" ? payload.issue : null;
  } catch {
    return null;
  }
}

function playAudio({
  audio,
  cleanup,
  onState,
  signal,
}: {
  audio: ForemanLiveVoiceAudioElement;
  cleanup: () => void;
  onState?: (state: ForemanLiveVoiceState) => void;
  signal: AbortSignal;
}): Promise<ForemanLiveVoiceResult> {
  return new Promise((resolve) => {
    let settled = false;

    const finish = (playbackResult: ForemanLiveVoiceResult) => {
      if (settled) {
        return;
      }

      settled = true;
      audio.onended = null;
      audio.onerror = null;
      signal.removeEventListener("abort", abort);
      cleanup();
      onState?.(playbackResult.state);
      resolve(playbackResult);
    };

    const abort = () => {
      try {
        audio.pause();
      } catch {
        // Playback cancellation is best-effort; typed text remains primary.
      }

      finish(result(false, "idle", "Voice playback cancelled."));
    };

    audio.onended = () => finish(result(true, "idle"));
    audio.onerror = () => finish(result(false, "failed", VOICE_UNAVAILABLE_COPY));
    signal.addEventListener("abort", abort, { once: true });

    try {
      onState?.("playing");
      const playResult = audio.play();

      if (typeof playResult?.catch === "function") {
        void playResult.catch(() =>
          finish(result(false, "failed", VOICE_UNAVAILABLE_COPY))
        );
      }
    } catch {
      finish(result(false, "failed", VOICE_UNAVAILABLE_COPY));
    }
  });
}

function waitForAudioBlobLoad({
  audio,
  signal,
}: {
  audio: ForemanLiveVoiceAudioElement;
  signal: AbortSignal;
}): Promise<ForemanLiveVoiceResult | null> {
  if (signal.aborted) {
    return Promise.resolve(
      result(false, "idle", "Voice playback cancelled.")
    );
  }

  const addEventListener = audio.addEventListener?.bind(audio);
  const removeEventListener = audio.removeEventListener?.bind(audio);
  const load = audio.load?.bind(audio);

  if (
    typeof addEventListener !== "function" ||
    typeof removeEventListener !== "function" ||
    typeof load !== "function"
  ) {
    return Promise.resolve(null);
  }

  if (
    typeof audio.readyState === "number" &&
    audio.readyState >= AUDIO_CAN_PLAY_THROUGH_READY_STATE
  ) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    let settled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const isReadyToPlayThrough = () =>
      typeof audio.readyState !== "number" ||
      audio.readyState >= AUDIO_CAN_PLAY_THROUGH_READY_STATE;

    const finish = (playbackResult: ForemanLiveVoiceResult | null) => {
      if (settled) {
        return;
      }

      settled = true;
      removeEventListener("canplaythrough", ready);
      removeEventListener("loadeddata", ready);
      removeEventListener("error", fail);
      signal.removeEventListener("abort", abort);

      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }

      resolve(playbackResult);
    };

    const ready = () => {
      if (isReadyToPlayThrough()) {
        finish(null);
      }
    };
    const fail = () => finish(result(false, "failed", VOICE_UNAVAILABLE_COPY));
    const abort = () => {
      try {
        audio.pause();
      } catch {
        // Playback cancellation is best-effort; typed text remains primary.
      }

      finish(result(false, "idle", "Voice playback cancelled."));
    };

    addEventListener("canplaythrough", ready, { once: true });
    addEventListener("loadeddata", ready, { once: true });
    addEventListener("error", fail, { once: true });
    signal.addEventListener("abort", abort, { once: true });
    timeoutId = setTimeout(() => {
      finish(result(false, "failed", VOICE_UNAVAILABLE_COPY));
    }, AUDIO_LOAD_TIMEOUT_MS);

    try {
      audio.preload = "auto";
      load();
    } catch {
      finish(result(false, "failed", VOICE_UNAVAILABLE_COPY));
    }
  });
}

export async function speakForemanLiveText({
  endpoint = FOREMAN_LIVE_VOICE_ENDPOINT,
  fetcher,
  onState,
  signal,
  target,
  text,
}: ForemanLiveVoiceSpeakInput &
  CreateForemanLiveVoiceTransportInput & {
    signal?: AbortSignal;
  }): Promise<ForemanLiveVoiceResult> {
  const trimmedText = text.trim();
  const resolvedFetch = getFetch(fetcher);
  const resolvedTarget = resolveTarget(target);

  if (!trimmedText) {
    return result(false, "failed", "HOLD: no Foreman text is available.");
  }

  if (!resolvedFetch) {
    onState?.("unavailable");
    return result(false, "unavailable", VOICE_UNAVAILABLE_COPY);
  }

  try {
    onState?.("requesting");
    const response = await resolvedFetch(endpoint, {
      body: JSON.stringify({ text: trimmedText }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
      signal,
    });

    if (signal?.aborted) {
      return result(false, "idle", "Voice playback cancelled.");
    }

    if (!response.ok) {
      const issue = await readJsonIssue(response);
      const state = response.status === 503 ? "unavailable" : "failed";

      onState?.(state);
      return result(false, state, issue ?? VOICE_UNAVAILABLE_COPY);
    }

    if (
      !resolvedTarget?.Audio ||
      !resolvedTarget.URL ||
      typeof Blob === "undefined"
    ) {
      onState?.("unavailable");
      return result(false, "unavailable", VOICE_UNAVAILABLE_COPY);
    }

    const audioBuffer = await response.arrayBuffer();

    if (signal?.aborted) {
      return result(false, "idle", "Voice playback cancelled.");
    }

    if (audioBuffer.byteLength === 0) {
      onState?.("failed");
      return result(false, "failed", VOICE_UNAVAILABLE_COPY);
    }

    const contentType = response.headers.get("content-type") ?? "audio/mpeg";
    const objectUrl = resolvedTarget.URL.createObjectURL(
      new Blob([audioBuffer], { type: contentType })
    );
    const audio = new resolvedTarget.Audio(objectUrl);
    const cleanup = () => resolvedTarget.URL?.revokeObjectURL(objectUrl);
    const playbackSignal = signal ?? new AbortController().signal;
    const loadResult = await waitForAudioBlobLoad({
      audio,
      signal: playbackSignal,
    });

    if (loadResult) {
      cleanup();
      onState?.(loadResult.state);
      return loadResult;
    }

    return playAudio({
      audio,
      cleanup,
      onState,
      signal: playbackSignal,
    });
  } catch {
    if (signal?.aborted) {
      return result(false, "idle", "Voice playback cancelled.");
    }

    onState?.("failed");
    return result(false, "failed", VOICE_UNAVAILABLE_COPY);
  }
}

export function createForemanLiveVoiceTransport({
  endpoint,
  fetcher,
  target,
}: CreateForemanLiveVoiceTransportInput = {}): ForemanLiveVoiceTransport {
  let currentAbortController: AbortController | null = null;

  const stop = () => {
    currentAbortController?.abort();
    currentAbortController = null;
  };

  return {
    speak: (input) => {
      stop();
      const abortController = new AbortController();
      currentAbortController = abortController;
      const finished = speakForemanLiveText({
        endpoint,
        fetcher,
        onState: input.onState,
        signal: abortController.signal,
        target,
        text: input.text,
      }).finally(() => {
        if (currentAbortController === abortController) {
          currentAbortController = null;
        }
      });

      return {
        cancel: () => {
          if (currentAbortController === abortController) {
            stop();
          } else {
            abortController.abort();
          }
        },
        finished,
      };
    },
    stop,
  };
}
