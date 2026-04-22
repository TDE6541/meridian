const test = require("node:test");
const assert = require("node:assert/strict");
const {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  RUNNER_MODE,
  TOP_LEVEL_STATUS,
  validatePipelineBridgeOutputV1,
} = require("../../src/integration/contracts.js");
const {
  createPipelineBridge,
  runPipelineBridge,
} = require("../../src/integration/pipelineBridge.js");

const SCENARIOS = [
  {
    label: "routine",
    scenarioId: "routine-lancaster-avenue-corridor-reconstruction",
    corridorId: "corridor-fw-lancaster-avenue",
    root: path.join(
      __dirname,
      "..",
      "fixtures",
      "scenarios",
      "routine",
      "lancaster-avenue-corridor-reconstruction"
    ),
  },
  {
    label: "contested",
    scenarioId: "contested-hemphill-street-mixed-use-contested-authority",
    corridorId: "corridor-fw-hemphill-street",
    root: path.join(
      __dirname,
      "..",
      "fixtures",
      "scenarios",
      "contested",
      "hemphill-street-mixed-use-contested-authority"
    ),
  },
  {
    label: "emergency",
    scenarioId: "emergency-camp-bowie-water-main-break",
    corridorId: "corridor-fw-camp-bowie",
    root: path.join(
      __dirname,
      "..",
      "fixtures",
      "scenarios",
      "emergency",
      "camp-bowie-water-main-break"
    ),
  },
];

function buildReplayInput(entry) {
  return {
    scenarioId: entry.scenarioId,
    corridorId: entry.corridorId,
    transcriptPath: path.join(entry.root, "transcript.txt"),
    mode: RUNNER_MODE.REPLAY,
    replayArtifactPath: path.join(entry.root, "pipelineReplayOutput.json"),
  };
}

function buildLiveInput(entry, extra = {}) {
  return {
    scenarioId: entry.scenarioId,
    corridorId: entry.corridorId,
    transcriptPath: path.join(entry.root, "transcript.txt"),
    mode: RUNNER_MODE.LIVE,
    ...extra,
  };
}

function validateOutput(output) {
  const validation = validatePipelineBridgeOutputV1(output);
  assert.equal(validation.valid, true, validation.issues.join("\n"));
}

for (const entry of SCENARIOS) {
  test(`REPLAY ${entry.label} happy path returns a valid bridge contract`, () => {
    const output = runPipelineBridge(buildReplayInput(entry));

    assert.equal(output.mode, RUNNER_MODE.REPLAY);
    assert.equal(output.status, TOP_LEVEL_STATUS.PASS);
    assert.equal(output.scenarioId, entry.scenarioId);
    assert.equal(output.corridorId, entry.corridorId);
    assert.equal(output.extractionOutput.scenario_id, entry.scenarioId);
    validateOutput(output);
  });

  test(`REPLAY ${entry.label} preserves transcript and replay artifact refs`, () => {
    const input = buildReplayInput(entry);
    const output = runPipelineBridge(input);

    assert.equal(output.artifactRefs.transcriptPath, input.transcriptPath);
    assert.equal(output.artifactRefs.replayArtifactPath, input.replayArtifactPath);
    assert.deepEqual(output.envInfo.requiredEnvPresence, {});
  });

  test(`REPLAY ${entry.label} is deterministic on repeated reads`, () => {
    const input = buildReplayInput(entry);
    const first = runPipelineBridge(input);
    const second = runPipelineBridge(input);

    assert.deepEqual(second, first);
  });
}

test("REPLAY never spawns Python even when a bridge factory exposes spawnSync", () => {
  let spawnCalls = 0;
  const bridge = createPipelineBridge({
    spawnSync() {
      spawnCalls += 1;
      throw new Error("REPLAY should not spawn");
    },
  });

  const output = bridge.runPipelineBridge(buildReplayInput(SCENARIOS[0]));

  assert.equal(output.status, TOP_LEVEL_STATUS.PASS);
  assert.equal(spawnCalls, 0);
});

test("REPLAY missing artifact returns FAIL without fabricating extraction output", () => {
  const output = runPipelineBridge({
    ...buildReplayInput(SCENARIOS[0]),
    replayArtifactPath: path.join(
      SCENARIOS[0].root,
      "missing-pipelineReplayOutput.json"
    ),
  });

  assert.equal(output.status, TOP_LEVEL_STATUS.FAIL);
  assert.deepEqual(output.extractionOutput, {});
  assert.equal(output.errors[0].code, "replay_artifact_read_failed");
  validateOutput(output);
});

test("LIVE missing env returns a structured HOLD", () => {
  const bridge = createPipelineBridge({
    env: {},
  });
  const output = bridge.runPipelineBridge(buildLiveInput(SCENARIOS[0]));

  assert.equal(output.mode, RUNNER_MODE.LIVE);
  assert.equal(output.status, TOP_LEVEL_STATUS.HOLD);
  assert.equal(output.holds[0].code, "live_env_missing");
  validateOutput(output);
});

test("LIVE missing env reports required env presence without exposing values", () => {
  const secretEnv = {
    OPENAI_API_KEY: "top-secret-key",
  };
  const bridge = createPipelineBridge({
    env: secretEnv,
  });
  const output = bridge.runPipelineBridge(buildLiveInput(SCENARIOS[0]));
  const serialized = JSON.stringify(output);

  assert.deepEqual(output.envInfo.requiredEnvPresence, {
    OPENAI_API_KEY: true,
    MERIDIAN_PIPELINE_MODEL: false,
  });
  assert.equal(output.envInfo.secretsExposed, false);
  assert.equal(serialized.includes("top-secret-key"), false);
});

test("LIVE missing env does not spawn Python", () => {
  let spawnCalls = 0;
  const bridge = createPipelineBridge({
    env: {},
    spawnSync() {
      spawnCalls += 1;
      throw new Error("missing env should block before spawn");
    },
  });

  const output = bridge.runPipelineBridge(buildLiveInput(SCENARIOS[1]));

  assert.equal(output.status, TOP_LEVEL_STATUS.HOLD);
  assert.equal(spawnCalls, 0);
});

test("LIVE success wraps spawned Python output into the bridge contract", () => {
  let nowCall = 0;
  const bridge = createPipelineBridge({
    env: {
      OPENAI_API_KEY: "present",
      MERIDIAN_PIPELINE_MODEL: "gpt-5.4",
    },
    now() {
      nowCall += 1;
      return nowCall === 1 ? 100 : 160;
    },
    spawnSync(command, args, options) {
      assert.equal(command, "python");
      assert.equal(args[0], "-c");
      assert.equal(args[2], buildLiveInput(SCENARIOS[0]).transcriptPath);
      assert.equal(options.encoding, "utf8");
      return {
        status: 0,
        stdout: JSON.stringify({
          capture_artifact: {
            artifact_id: "live-artifact-1",
          },
          governance_handoff: {
            selected_item_count: 1,
          },
          fallback_used: false,
          notes: [],
          transcript_sha256: "synthetic-live-hash",
        }),
        stderr: "",
      };
    },
  });

  const output = bridge.runPipelineBridge(buildLiveInput(SCENARIOS[0]));

  assert.equal(output.status, TOP_LEVEL_STATUS.PASS);
  assert.equal(output.commandInfo.command, "python");
  assert.equal(output.commandInfo.exitCode, 0);
  assert.equal(output.commandInfo.durationMs, 60);
  assert.equal(output.extractionOutput.capture_artifact.artifact_id, "live-artifact-1");
  validateOutput(output);
});

test("LIVE success can persist sanitized output when outputDirectory is supplied", () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "meridian-wave8-p1-"));

  try {
    const bridge = createPipelineBridge({
      env: {
        OPENAI_API_KEY: "present",
        MERIDIAN_PIPELINE_MODEL: "gpt-5.4",
      },
      now() {
        return 10;
      },
      spawnSync() {
        return {
          status: 0,
          stdout: JSON.stringify({
            capture_artifact: {
              artifact_id: "live-artifact-persisted",
            },
            governance_handoff: {
              selected_item_count: 1,
            },
            fallback_used: true,
            notes: ["fallback used"],
            transcript_sha256: "persisted-live-hash",
          }),
          stderr: "",
        };
      },
    });

    const output = bridge.runPipelineBridge(
      buildLiveInput(SCENARIOS[2], {
        outputDirectory: tempRoot,
      })
    );

    assert.equal(isNonEmptyPath(output.artifactRefs.liveOutputPath), true);
    assert.equal(existsSync(output.artifactRefs.liveOutputPath), true);
    assert.equal(
      JSON.parse(readFileSync(output.artifactRefs.liveOutputPath, "utf8"))
        .capture_artifact.artifact_id,
      "live-artifact-persisted"
    );
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("LIVE invalid stdout returns FAIL instead of consuming raw stdout", () => {
  const bridge = createPipelineBridge({
    env: {
      OPENAI_API_KEY: "present",
      MERIDIAN_PIPELINE_MODEL: "gpt-5.4",
    },
    spawnSync() {
      return {
        status: 0,
        stdout: "not-json",
        stderr: "",
      };
    },
  });

  const output = bridge.runPipelineBridge(buildLiveInput(SCENARIOS[1]));

  assert.equal(output.status, TOP_LEVEL_STATUS.FAIL);
  assert.equal(output.errors[0].code, "live_pipeline_stdout_invalid");
  assert.deepEqual(output.extractionOutput, {});
  validateOutput(output);
});

test("LIVE missing transcript returns FAIL before Python execution", () => {
  let spawnCalls = 0;
  const bridge = createPipelineBridge({
    env: {
      OPENAI_API_KEY: "present",
      MERIDIAN_PIPELINE_MODEL: "gpt-5.4",
    },
    spawnSync() {
      spawnCalls += 1;
      return {
        status: 0,
        stdout: "{}",
        stderr: "",
      };
    },
  });

  const output = bridge.runPipelineBridge({
    ...buildLiveInput(SCENARIOS[2]),
    transcriptPath: path.join(SCENARIOS[2].root, "missing-transcript.txt"),
  });

  assert.equal(output.status, TOP_LEVEL_STATUS.FAIL);
  assert.equal(output.errors[0].code, "live_transcript_missing");
  assert.equal(spawnCalls, 0);
  validateOutput(output);
});

function isNonEmptyPath(value) {
  return typeof value === "string" && value.length > 0;
}
