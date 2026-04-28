import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import React from "react";
import { ForemanGuidePanel } from "../src/components/ForemanGuidePanel.tsx";
import {
  DEFAULT_FOREMAN_AUDIO_VOLUME,
  FOREMAN_AUDIO_CUE_IDENTITIES,
  MAX_FOREMAN_AUDIO_VOLUME,
  foremanAudioCueIdentitiesAreStateBound,
  getForemanAudioCueForPresenceState,
  getForemanAudioCueSources,
  isLocalForemanAudioSource,
  normalizeForemanAudioVolume,
  shouldAttemptForemanAudioPlayback,
} from "../src/foremanGuide/audioIdentity.ts";
import { FOREMAN_AVATAR_STATES } from "../src/foremanGuide/avatarState.ts";
import { buildForemanGuideContext } from "../src/foremanGuide/buildForemanGuideContext.ts";
import {
  createTestLiveProjection,
  renderMarkup,
  runTests,
} from "./scenarioTestUtils.ts";

const tests = [
  {
    name: "audio cue identity vocabulary is pinned to six local cues",
    run: () => {
      assert.deepEqual(FOREMAN_AUDIO_CUE_IDENTITIES, [
        "idle",
        "explaining",
        "holding",
        "warning",
        "blocked",
        "public-boundary",
      ]);
      assert.equal(
        FOREMAN_AUDIO_CUE_IDENTITIES.includes("live" as never),
        false
      );
      assert.equal(foremanAudioCueIdentitiesAreStateBound(), true);
    },
  },
  {
    name: "audio cue assets exist as small local WAV files",
    run: async () => {
      for (const identity of FOREMAN_AUDIO_CUE_IDENTITIES) {
        const cuePath = path.resolve(
          process.cwd(),
          "public",
          "audio",
          "foreman",
          `${identity}.wav`
        );
        const result = await stat(cuePath);

        assert.equal(result.isFile(), true, cuePath);
        assert.equal(result.size > 44, true, cuePath);
        assert.equal(result.size < 16000, true, cuePath);
      }
    },
  },
  {
    name: "existing state values map to local files or safe fallback",
    run: () => {
      for (const state of FOREMAN_AVATAR_STATES) {
        const cue = getForemanAudioCueForPresenceState(state);

        assert.equal(isLocalForemanAudioSource(cue.source), true, state);
        assert.equal(FOREMAN_AUDIO_CUE_IDENTITIES.includes(cue.identity), true);
      }

      assert.equal(
        getForemanAudioCueForPresenceState("live").identity,
        "idle"
      );
    },
  },
  {
    name: "audio source paths are local static assets only",
    run: () => {
      for (const source of getForemanAudioCueSources()) {
        assert.equal(source.startsWith("/audio/foreman/"), true, source);
        assert.equal(source.endsWith(".wav"), true, source);
        assert.equal(source.includes("://"), false, source);
        assert.equal(source.startsWith("//"), false, source);
      }

      assert.equal(
        isLocalForemanAudioSource("https://example.invalid/cue.wav"),
        false
      );
      assert.equal(isLocalForemanAudioSource("//example.invalid/cue.wav"), false);
    },
  },
  {
    name: "mute state prevents playback attempt",
    run: () => {
      const source = getForemanAudioCueForPresenceState("warning").source;

      assert.equal(
        shouldAttemptForemanAudioPlayback({
          muted: true,
          previousSource: null,
          source,
        }),
        false
      );
      assert.equal(
        shouldAttemptForemanAudioPlayback({
          muted: false,
          previousSource: null,
          source,
        }),
        true
      );
      assert.equal(
        shouldAttemptForemanAudioPlayback({
          muted: false,
          previousSource: source,
          source,
        }),
        false
      );
    },
  },
  {
    name: "volume control stays restrained",
    run: () => {
      assert.equal(
        normalizeForemanAudioVolume(Number.NaN),
        DEFAULT_FOREMAN_AUDIO_VOLUME
      );
      assert.equal(normalizeForemanAudioVolume(-1), 0);
      assert.equal(normalizeForemanAudioVolume(0.22), 0.22);
      assert.equal(normalizeForemanAudioVolume(1), MAX_FOREMAN_AUDIO_VOLUME);
    },
  },
  {
    name: "panel renders audio controls safely with default muted posture",
    run: () => {
      const markup = renderMarkup(
        <ForemanGuidePanel
          context={buildForemanGuideContext({
            liveProjection: createTestLiveProjection(),
          })}
        />
      );

      assert.equal(markup.includes("Foreman state audio cues"), true);
      assert.equal(markup.includes("State cues"), true);
      assert.equal(markup.includes("Cue volume"), true);
      assert.equal(markup.includes("muted"), true);
      assert.equal(markup.includes("autoplay"), false);
      assert.equal(
        markup.includes('data-foreman-audio-source="/audio/foreman/'),
        true
      );
    },
  },
  {
    name: "audio provenance note documents local synthetic source",
    run: async () => {
      const content = await readFile(
        path.resolve(process.cwd(), "public", "audio", "foreman", "README.md"),
        "utf8"
      );

      assert.equal(content.includes("locally generated synthetic tones"), true);
      assert.equal(content.includes("No third-party samples"), true);
      assert.equal(content.includes("not voice recordings"), true);
    },
  },
];

await runTests(tests);
