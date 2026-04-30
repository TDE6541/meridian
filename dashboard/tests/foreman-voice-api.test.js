import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import handler from "../api/foreman-voice.js";
import { runTests } from "./scenarioTestUtils.ts";

const ORIGINAL_FETCH = globalThis.fetch;
const ORIGINAL_ENV = {
  ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
  ELEVENLABS_VOICE_ID: process.env.ELEVENLABS_VOICE_ID,
};

function createResponse() {
  const headers = {};

  return {
    body: null,
    ended: false,
    headers,
    statusCode: 200,
    end(payload) {
      this.body = payload ?? null;
      this.ended = true;
      return this;
    },
    json(payload) {
      this.body = payload;
      this.ended = true;
      return this;
    },
    send(payload) {
      this.body = payload;
      this.ended = true;
      return this;
    },
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
  };
}

async function invoke(method, body, includeBody = true) {
  const req = includeBody ? { body, method } : { method };
  const res = createResponse();

  await handler(req, res);

  return res;
}

function setVoiceEnv({
  apiKey = "server-side-test-key",
  voiceId = "voice-test-id",
} = {}) {
  process.env.ELEVENLABS_API_KEY = apiKey;
  process.env.ELEVENLABS_VOICE_ID = voiceId;
}

function clearVoiceEnv() {
  delete process.env.ELEVENLABS_API_KEY;
  delete process.env.ELEVENLABS_VOICE_ID;
}

function restoreEnv() {
  for (const [name, value] of Object.entries(ORIGINAL_ENV)) {
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }
}

const tests = [
  {
    name: "foreman voice endpoint rejects non-POST",
    run: async () => {
      const response = await invoke("GET", undefined, false);

      assert.equal(response.statusCode, 405);
      assert.equal(response.headers.allow, "POST");
      assert.equal(response.body.error, "method_not_allowed");
    },
  },
  {
    name: "foreman voice endpoint rejects empty and malformed text",
    run: async () => {
      const empty = await invoke("POST", { text: "   " });
      const missing = await invoke("POST", {});
      const malformed = await invoke("POST", "{not-json");

      assert.equal(empty.statusCode, 400);
      assert.equal(empty.body.error, "invalid_text");
      assert.equal(missing.statusCode, 400);
      assert.equal(missing.body.error, "invalid_text");
      assert.equal(malformed.statusCode, 400);
      assert.equal(malformed.body.error, "malformed_or_missing_body");
    },
  },
  {
    name: "foreman voice endpoint returns voice-unavailable when env is missing",
    run: async () => {
      clearVoiceEnv();
      let fetchCalled = false;
      globalThis.fetch = (() => {
        fetchCalled = true;
        throw new Error("should not call external voice service");
      });

      try {
        const response = await invoke("POST", { text: "Speak this." });

        assert.equal(response.statusCode, 503);
        assert.equal(response.body.error, "voice_unavailable");
        assert.equal(response.body.ok, false);
        assert.equal(fetchCalled, false);
      } finally {
        globalThis.fetch = ORIGINAL_FETCH;
        restoreEnv();
      }
    },
  },
  {
    name: "foreman voice endpoint calls external voice server only server-side",
    run: async () => {
      setVoiceEnv();
      const calls = [];
      globalThis.fetch = async (url, init) => {
        calls.push({ init, url });
        return new Response(new Uint8Array([1, 2, 3]), {
          headers: { "content-type": "audio/mpeg" },
          status: 200,
        });
      };

      try {
        const response = await invoke("POST", { text: "Existing answer." });

        assert.equal(response.statusCode, 200);
        assert.equal(Buffer.isBuffer(response.body), true);
        assert.equal(calls.length, 1);
        assert.equal(
          String(calls[0].url).startsWith(
            "https://api.elevenlabs.io/v1/text-to-speech/voice-test-id"
          ),
          true
        );
        assert.equal(calls[0].init.headers["xi-api-key"], "server-side-test-key");
        assert.equal(JSON.parse(calls[0].init.body).text, "Existing answer.");
      } finally {
        globalThis.fetch = ORIGINAL_FETCH;
        restoreEnv();
      }
    },
  },
  {
    name: "foreman voice endpoint returns audio response on mocked success",
    run: async () => {
      setVoiceEnv();
      globalThis.fetch = async () =>
        new Response(new Uint8Array([9, 8, 7]), {
          headers: { "content-type": "audio/mpeg" },
          status: 200,
        });

      try {
        const response = await invoke("POST", { text: "Mission act line." });

        assert.equal(response.statusCode, 200);
        assert.equal(response.headers["content-type"], "audio/mpeg");
        assert.deepEqual([...response.body], [9, 8, 7]);
      } finally {
        globalThis.fetch = ORIGINAL_FETCH;
        restoreEnv();
      }
    },
  },
  {
    name: "foreman voice endpoint handles ElevenLabs error with fallback-safe response",
    run: async () => {
      setVoiceEnv();
      globalThis.fetch = async () =>
        new Response(JSON.stringify({ error: "upstream" }), { status: 500 });

      try {
        const response = await invoke("POST", { text: "Existing answer." });

        assert.equal(response.statusCode, 502);
        assert.equal(response.body.error, "voice_unavailable");
        assert.equal(response.body.ok, false);
      } finally {
        globalThis.fetch = ORIGINAL_FETCH;
        restoreEnv();
      }
    },
  },
  {
    name: "foreman voice endpoint does not expose API key",
    run: async () => {
      setVoiceEnv({ apiKey: "super-secret-key", voiceId: "voice-test-id" });
      globalThis.fetch = async () =>
        new Response(JSON.stringify({ error: "upstream" }), { status: 500 });

      try {
        const response = await invoke("POST", { text: "Existing answer." });
        const serialized = JSON.stringify(response.body);

        assert.equal(serialized.includes("super-secret-key"), false);
        assert.equal(
          JSON.stringify(response.headers).includes("super-secret-key"),
          false
        );
      } finally {
        globalThis.fetch = ORIGINAL_FETCH;
        restoreEnv();
      }
    },
  },
  {
    name: "foreman voice endpoint clamps submitted text before server-side call",
    run: async () => {
      setVoiceEnv();
      let submittedText = "";
      globalThis.fetch = async (_, init) => {
        submittedText = JSON.parse(init.body).text;
        return new Response(new Uint8Array([1]), { status: 200 });
      };

      try {
        const response = await invoke("POST", { text: "x".repeat(1300) });

        assert.equal(response.statusCode, 200);
        assert.equal(submittedText.length, 1200);
      } finally {
        globalThis.fetch = ORIGINAL_FETCH;
        restoreEnv();
      }
    },
  },
  {
    name: "foreman voice endpoint source has no persistence or client key path",
    run: async () => {
      const source = await readFile(
        new URL("../api/foreman-voice.js", import.meta.url),
        "utf8"
      );

      assert.equal(/writeFile|appendFile|localStorage|indexedDB/i.test(source), false);
      assert.equal(/VITE_ELEVENLABS|PUBLIC_ELEVENLABS/i.test(source), false);
      assert.equal(/MediaRecorder|getUserMedia|Whisper/i.test(source), false);
    },
  },
];

await runTests(tests);
