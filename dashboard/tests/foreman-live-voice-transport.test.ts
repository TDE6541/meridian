import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  createForemanLiveVoiceTransport,
  FOREMAN_LIVE_VOICE_ENDPOINT,
  FOREMAN_LIVE_VOICE_MISSION_SOURCE,
  speakForemanLiveText,
  type ForemanLiveVoiceAudioElement,
  type ForemanLiveVoiceBrowserTarget,
} from "../src/foremanGuide/liveVoiceTransport.ts";
import { speakLatestForemanAnswer } from "../src/foremanGuide/foremanAnswerVoice.ts";
import { appendForemanGuideExchange } from "../src/foremanGuide/useForemanGuide.ts";
import { buildForemanGuideContext } from "../src/foremanGuide/buildForemanGuideContext.ts";
import { buildTimelineSteps } from "../src/state/controlRoomState.ts";
import {
  createTestLiveProjection,
  loadScenarioRecord,
  runTests,
} from "./scenarioTestUtils.ts";

class MockAudio implements ForemanLiveVoiceAudioElement {
  static instances: MockAudio[] = [];
  onended: ((event: unknown) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  paused = false;
  playCount = 0;

  constructor(public src = "") {
    MockAudio.instances.push(this);
  }

  pause() {
    this.paused = true;
  }

  play() {
    this.playCount += 1;
    return Promise.resolve();
  }
}

function createAudioTarget(): ForemanLiveVoiceBrowserTarget & {
  revoked: string[];
  urls: string[];
} {
  const revoked: string[] = [];
  const urls: string[] = [];

  MockAudio.instances = [];

  return {
    Audio: MockAudio,
    URL: {
      createObjectURL: () => {
        const url = `blob:foreman-${urls.length + 1}`;
        urls.push(url);
        return url;
      },
      revokeObjectURL: (url) => {
        revoked.push(url);
      },
    },
    revoked,
    urls,
  };
}

async function waitFor(check: () => boolean, label: string) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (check()) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  assert.fail(`timed out waiting for ${label}`);
}

async function createPanelContext() {
  const record = await loadScenarioRecord("routine");
  const currentStep = buildTimelineSteps(record.scenario)[0];

  assert.ok(currentStep);

  return buildForemanGuideContext({
    liveProjection: createTestLiveProjection(),
    snapshot: {
      activePanel: "foreman-guide",
      activeSkin: "public",
      currentStep,
      scenarioId: record.scenario.scenarioId,
      sessionId: "snapshot:routine",
      sourceRefs: [
        {
          evidence_id: record.scenario.scenarioId,
          label: "committed scenario snapshot",
          path: "dashboard/public/scenarios/routine.json",
          source_kind: "snapshot.file",
          source_ref: "snapshot.file:dashboard/public/scenarios/routine.json",
        },
      ],
    },
  });
}

const tests = [
  {
    name: "live voice client posts existing text to serverless endpoint",
    run: async () => {
      const target = createAudioTarget();
      const states: string[] = [];
      const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
      const fetcher: typeof fetch = async (input, init) => {
        calls.push({ input, init });
        return new Response(new Uint8Array([1, 2, 3]), {
          headers: { "content-type": "audio/mpeg" },
          status: 200,
        });
      };

      const promise = speakForemanLiveText({
        fetcher,
        onState: (state) => states.push(state),
        source: FOREMAN_LIVE_VOICE_MISSION_SOURCE,
        target,
        text: "Existing Foreman text.",
      });

      await Promise.resolve();
      assert.equal(calls.length, 1);
      assert.equal(calls[0]?.input, FOREMAN_LIVE_VOICE_ENDPOINT);
      assert.equal(calls[0]?.init?.method, "POST");
      assert.equal(
        JSON.parse(String(calls[0]?.init?.body)).text,
        "Existing Foreman text."
      );
      await waitFor(() => MockAudio.instances.length === 1, "audio instance");
      assert.equal(MockAudio.instances.length, 1);
      assert.equal(MockAudio.instances[0]?.playCount, 1);
      MockAudio.instances[0]?.onended?.({});

      const result = await promise;

      assert.equal(result.ok, true);
      assert.deepEqual(states, ["requesting", "playing", "idle"]);
      assert.deepEqual(target.revoked, ["blob:foreman-1"]);
    },
  },
  {
    name: "live voice client gates non-mission text before fetch",
    run: async () => {
      const target = createAudioTarget();
      const states: string[] = [];
      let fetchCount = 0;
      const fetcher: typeof fetch = async () => {
        fetchCount += 1;
        return new Response(new Uint8Array([1, 2, 3]), { status: 200 });
      };

      const result = await speakForemanLiveText({
        fetcher,
        onState: (state) => states.push(state),
        target,
        text: "Role/session/status chatter.",
      });

      assert.equal(result.ok, false);
      assert.equal(result.state, "idle");
      assert.equal(result.issue, "Voice transport is gated to scripted mission narration.");
      assert.equal(fetchCount, 0);
      assert.deepEqual(states, ["idle"]);
      assert.equal(MockAudio.instances.length, 0);
    },
  },
  {
    name: "live voice client reports unavailable without blocking typed text",
    run: async () => {
      const target = createAudioTarget();
      const states: string[] = [];
      const fetcher: typeof fetch = async () =>
        new Response(
          JSON.stringify({
            error: "voice_unavailable",
            issue: "Voice unavailable - showing typed answer.",
            ok: false,
          }),
          {
            headers: { "content-type": "application/json" },
            status: 503,
          }
        );

      const result = await speakForemanLiveText({
        fetcher,
        onState: (state) => states.push(state),
        source: FOREMAN_LIVE_VOICE_MISSION_SOURCE,
        target,
        text: "Typed answer stays visible.",
      });

      assert.equal(result.ok, false);
      assert.equal(result.state, "unavailable");
      assert.equal(result.issue, "Voice unavailable - showing typed answer.");
      assert.deepEqual(states, ["requesting", "unavailable"]);
      assert.equal(MockAudio.instances.length, 0);
    },
  },
  {
    name: "live voice client can cancel active audio",
    run: async () => {
      const target = createAudioTarget();
      const transport = createForemanLiveVoiceTransport({
        fetcher: async () =>
          new Response(new Uint8Array([1, 2, 3]), { status: 200 }),
        target,
      });

      const playback = transport.speak({
        source: FOREMAN_LIVE_VOICE_MISSION_SOURCE,
        text: "Cancel this voice.",
      });

      await waitFor(() => MockAudio.instances.length === 1, "audio instance");
      assert.equal(MockAudio.instances.length, 1);
      playback.cancel();

      const result = await playback.finished;

      assert.equal(result.ok, false);
      assert.equal(result.state, "idle");
      assert.equal(MockAudio.instances[0]?.paused, true);
    },
  },
  {
    name: "non-mission transport call does not cancel active mission audio",
    run: async () => {
      const target = createAudioTarget();
      const transport = createForemanLiveVoiceTransport({
        fetcher: async () =>
          new Response(new Uint8Array([1, 2, 3]), { status: 200 }),
        target,
      });

      const missionPlayback = transport.speak({
        source: FOREMAN_LIVE_VOICE_MISSION_SOURCE,
        text: "This is Permit 4471. A field inspector flagged a concern during a routine corridor walk.",
      });

      await waitFor(() => MockAudio.instances.length === 1, "audio instance");

      const blockedPlayback = transport.speak({
        text: "Role/session/status chatter.",
      });
      const blockedResult = await blockedPlayback.finished;

      assert.equal(blockedResult.ok, false);
      assert.equal(blockedResult.state, "idle");
      assert.equal(MockAudio.instances.length, 1);
      assert.equal(MockAudio.instances[0]?.paused, false);

      MockAudio.instances[0]?.onended?.({});

      const missionResult = await missionPlayback.finished;

      assert.equal(missionResult.ok, true);
    },
  },
  {
    name: "existing Ask Foreman answer text is consumed without live voice",
    run: async () => {
      const context = await createPanelContext();
      const messages = appendForemanGuideExchange([], "Walk the proof", context);
      const spokenMessageIds = new Set<string>();
      let speakCount = 0;
      const transport: ReturnType<typeof createForemanLiveVoiceTransport> = {
        speak: () => {
          speakCount += 1;
          throw new Error("non-mission answer voice must not speak");
        },
        stop: () => undefined,
      };

      const routed = speakLatestForemanAnswer({
        messages,
        spokenMessageIds,
        transport,
      });

      assert.ok(routed);
      assert.equal(routed.skipped, "mission_narration_only");
      assert.equal(routed.text, messages[1]?.content);
      assert.equal(spokenMessageIds.has(String(messages[1]?.id)), true);
      assert.equal(speakCount, 0);
      assert.equal(messages[1]?.content.length > 0, true);
    },
  },
  {
    name: "existing Challenge Foreman answer text is consumed without live voice",
    run: async () => {
      const context = await createPanelContext();
      const messages = appendForemanGuideExchange([], "Challenge this", context);
      const spokenMessageIds = new Set<string>();
      let speakCount = 0;
      const transport: ReturnType<typeof createForemanLiveVoiceTransport> = {
        speak: () => {
          speakCount += 1;
          throw new Error("non-mission answer voice must not speak");
        },
        stop: () => undefined,
      };

      const routed = speakLatestForemanAnswer({
        messages,
        spokenMessageIds,
        transport,
      });

      assert.ok(routed);
      assert.equal(routed.skipped, "mission_narration_only");
      assert.equal(routed.text, messages[1]?.content);
      assert.equal(spokenMessageIds.has(String(messages[1]?.id)), true);
      assert.equal(speakCount, 0);
      assert.equal(messages[1]?.response?.response_kind, "authority_challenge");
    },
  },
  {
    name: "typed Foreman answer remains visible when answer voice is gated",
    run: async () => {
      const context = await createPanelContext();
      const messages = appendForemanGuideExchange([], "Challenge this", context);
      const typedAnswer = messages[1]?.content;
      const routed = speakLatestForemanAnswer({
        messages,
        spokenMessageIds: new Set(),
      });

      assert.ok(routed);
      assert.equal(routed.skipped, "mission_narration_only");
      assert.equal(messages[1]?.content, typedAnswer);
      assert.equal(messages[1]?.speaker, "foreman");
    },
  },
  {
    name: "same Foreman answer is consumed once on stable rerender key",
    run: async () => {
      const context = await createPanelContext();
      const messages = appendForemanGuideExchange([], "Walk the proof", context);
      const spokenMessageIds = new Set<string>();
      let speakCount = 0;
      const transport: ReturnType<typeof createForemanLiveVoiceTransport> = {
        speak: () => {
          speakCount += 1;
          return {
            cancel: () => undefined,
            finished: Promise.resolve({
              issue: null,
              ok: true,
              state: "idle",
            }),
          };
        },
        stop: () => undefined,
      };

      const first = speakLatestForemanAnswer({
        messages,
        spokenMessageIds,
        transport,
      });
      const second = speakLatestForemanAnswer({
        messages,
        spokenMessageIds,
        transport,
      });

      assert.ok(first);
      assert.equal(second, null);
      assert.equal(first.skipped, "mission_narration_only");
      assert.equal(speakCount, 0);
    },
  },
  {
    name: "consumed proactive Foreman answer is not replayed after mission ends",
    run: async () => {
      const context = await createPanelContext();
      const messages = appendForemanGuideExchange([], "What can my role do?", context);
      const spokenMessageIds = new Set<string>();
      let speakCount = 0;
      const transport: ReturnType<typeof createForemanLiveVoiceTransport> = {
        speak: () => {
          speakCount += 1;
          throw new Error("consumed non-mission answer must not replay");
        },
        stop: () => undefined,
      };

      const beforeMission = speakLatestForemanAnswer({
        messages,
        spokenMessageIds,
        transport,
      });
      const afterMission = speakLatestForemanAnswer({
        messages,
        spokenMessageIds,
        transport,
      });

      assert.ok(beforeMission);
      assert.equal(beforeMission.skipped, "mission_narration_only");
      assert.equal(afterMission, null);
      assert.equal(spokenMessageIds.has(String(messages[1]?.id)), true);
      assert.equal(speakCount, 0);
    },
  },
  {
    name: "browser-side live voice source avoids exposed keys mic STT and direct provider calls",
    run: async () => {
      const files = [
        "src/foremanGuide/liveVoiceTransport.ts",
        "src/foremanGuide/foremanAnswerVoice.ts",
        "src/foremanGuide/missionNarration.ts",
        "src/components/ForemanGuidePanel.tsx",
      ];
      const forbidden = [
        "ELEVENLABS_API_KEY",
        "xi-api-key",
        "api.elevenlabs.io",
        "MediaRecorder",
        "getUserMedia",
        "navigator.mediaDevices",
        "Whisper",
      ];

      for (const file of files) {
        const source = await readFile(path.resolve(process.cwd(), file), "utf8");

        for (const token of forbidden) {
          assert.equal(
            source.includes(token),
            false,
            `${file} contains ${token}`
          );
        }
      }
    },
  },
];

await runTests(tests);
