const { spawnSync } = require("node:child_process");
const {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} = require("node:fs");
const path = require("node:path");

const {
  PIPELINE_BRIDGE_OUTPUT_CONTRACT_VERSION,
  REQUIRED_LIVE_ENV_KEYS,
  RUNNER_MODE,
  TOP_LEVEL_STATUS,
  assertPipelineBridgeOutputV1,
} = require("./contracts");

const DEFAULT_PYTHON_COMMAND = "python";
const REPLAY_PROVENANCE_SOURCE = "scenario_fixture_replay_artifact";
const LIVE_PROVENANCE_SOURCE = "live_python_pipeline_invocation";
const PYTHON_BRIDGE_SCRIPT = [
  "import json",
  "import pathlib",
  "import sys",
  "",
  "repo_root = pathlib.Path(sys.argv[4])",
  "if str(repo_root) not in sys.path:",
  "    sys.path.insert(0, str(repo_root))",
  "",
  "from src.pipeline.models import MeetingMetadata",
  "from src.pipeline.pipeline import MeridianPipeline",
  "",
  "transcript_path = pathlib.Path(sys.argv[1])",
  "scenario_id = sys.argv[2]",
  "corridor_id = sys.argv[3]",
  "transcript_text = transcript_path.read_text(encoding='utf-8')",
  "meeting = MeetingMetadata(",
  "    org_id=corridor_id,",
  "    meeting_id=scenario_id,",
  "    capture_source='wave8_live_pipeline_bridge',",
  "    title=scenario_id,",
  ")",
  "result = MeridianPipeline().run(meeting=meeting, transcript_text=transcript_text)",
  "payload = {",
  "    'capture_artifact': result.capture_artifact,",
  "    'governance_handoff': result.governance_handoff,",
  "    'fallback_used': result.captured.fallback_used,",
  "    'notes': list(result.captured.notes),",
  "    'transcript_sha256': result.captured.transcript_sha256,",
  "}",
  "print(json.dumps(payload))",
].join("\n");

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}

function cloneJsonValue(value) {
  return JSON.parse(JSON.stringify(value));
}

function requireNonEmptyString(value, fieldName) {
  if (!isNonEmptyString(value)) {
    throw new TypeError(`${fieldName} must be a non-empty string`);
  }

  return value;
}

function normalizeInput(input) {
  if (!isPlainObject(input)) {
    throw new TypeError("runPipelineBridge input must be a plain object");
  }

  const mode = requireNonEmptyString(input.mode, "mode");
  if (!Object.values(RUNNER_MODE).includes(mode)) {
    throw new TypeError("mode must be REPLAY or LIVE");
  }

  return {
    scenarioId: requireNonEmptyString(input.scenarioId, "scenarioId"),
    corridorId: requireNonEmptyString(input.corridorId, "corridorId"),
    transcriptPath: requireNonEmptyString(input.transcriptPath, "transcriptPath"),
    mode,
    replayArtifactPath:
      input.replayArtifactPath === undefined || input.replayArtifactPath === null
        ? undefined
        : requireNonEmptyString(input.replayArtifactPath, "replayArtifactPath"),
    outputDirectory:
      input.outputDirectory === undefined || input.outputDirectory === null
        ? undefined
        : requireNonEmptyString(input.outputDirectory, "outputDirectory"),
  };
}

function collectEnvPresence(env) {
  const presence = {};

  for (const envKey of REQUIRED_LIVE_ENV_KEYS) {
    presence[envKey] =
      typeof env[envKey] === "string" && env[envKey].trim() !== "";
  }

  return presence;
}

function buildBaseOutput({
  scenarioId,
  corridorId,
  mode,
  status,
  extractionOutput,
  artifactRefs,
  commandInfo,
  envInfo,
  holds = [],
  errors = [],
  provenance,
}) {
  return assertPipelineBridgeOutputV1({
    contractVersion: PIPELINE_BRIDGE_OUTPUT_CONTRACT_VERSION,
    scenarioId,
    corridorId,
    mode,
    status,
    extractionOutput,
    artifactRefs,
    commandInfo,
    envInfo,
    holds,
    errors,
    provenance,
  });
}

function buildHold(code, message, extra = {}) {
  return {
    code,
    message,
    ...extra,
  };
}

function buildError(code, message, extra = {}) {
  return {
    code,
    message,
    ...extra,
  };
}

function buildReplayProvenance(input) {
  return {
    source: REPLAY_PROVENANCE_SOURCE,
    replayDeterministic: true,
    transcriptDependency: "fixture_text_only",
    replayArtifactConsumed: Boolean(input.replayArtifactPath),
  };
}

function buildLiveProvenance(extra = {}) {
  return {
    source: LIVE_PROVENANCE_SOURCE,
    replayDeterministic: false,
    pipelineSurface: "src/pipeline/pipeline.py:MeridianPipeline.run",
    ...extra,
  };
}

function maybeWriteLiveOutput({
  outputDirectory,
  scenarioId,
  extractionOutput,
  mkdirSyncImpl,
  writeFileSyncImpl,
  cwd,
}) {
  if (!outputDirectory) {
    return {};
  }

  const resolvedDirectory = path.resolve(cwd, outputDirectory);
  mkdirSyncImpl(resolvedDirectory, { recursive: true });
  const liveOutputPath = path.join(
    resolvedDirectory,
    `${scenarioId}.live-output.json`
  );
  writeFileSyncImpl(
    liveOutputPath,
    JSON.stringify(extractionOutput, null, 2),
    "utf8"
  );

  return {
    liveOutputPath,
  };
}

function createPipelineBridge(options = {}) {
  const readFileSyncImpl = options.readFileSync || readFileSync;
  const writeFileSyncImpl = options.writeFileSync || writeFileSync;
  const mkdirSyncImpl = options.mkdirSync || mkdirSync;
  const existsSyncImpl = options.existsSync || existsSync;
  const spawnSyncImpl = options.spawnSync || spawnSync;
  const env = options.env || process.env;
  const now = options.now || (() => Date.now());
  const cwd = options.cwd || path.resolve(__dirname, "..", "..");
  const pythonCommand = options.pythonCommand || DEFAULT_PYTHON_COMMAND;

  function runReplay(input) {
    if (!input.replayArtifactPath) {
      return buildBaseOutput({
        scenarioId: input.scenarioId,
        corridorId: input.corridorId,
        mode: RUNNER_MODE.REPLAY,
        status: TOP_LEVEL_STATUS.FAIL,
        extractionOutput: {},
        artifactRefs: {
          transcriptPath: input.transcriptPath,
        },
        commandInfo: {
          cwd,
          exitCode: null,
          durationMs: null,
        },
        envInfo: {
          requiredEnvPresence: {},
          secretsExposed: false,
        },
        holds: [],
        errors: [
          buildError(
            "replay_artifact_path_required",
            "REPLAY mode requires replayArtifactPath."
          ),
        ],
        provenance: buildReplayProvenance(input),
      });
    }

    try {
      const replayArtifact = JSON.parse(
        readFileSyncImpl(input.replayArtifactPath, "utf8")
      );

      return buildBaseOutput({
        scenarioId: input.scenarioId,
        corridorId: input.corridorId,
        mode: RUNNER_MODE.REPLAY,
        status: TOP_LEVEL_STATUS.PASS,
        extractionOutput: cloneJsonValue(replayArtifact),
        artifactRefs: {
          transcriptPath: input.transcriptPath,
          replayArtifactPath: input.replayArtifactPath,
        },
        commandInfo: {
          cwd,
          exitCode: null,
          durationMs: null,
        },
        envInfo: {
          requiredEnvPresence: {},
          secretsExposed: false,
        },
        holds: [],
        errors: [],
        provenance: buildReplayProvenance(input),
      });
    } catch (error) {
      return buildBaseOutput({
        scenarioId: input.scenarioId,
        corridorId: input.corridorId,
        mode: RUNNER_MODE.REPLAY,
        status: TOP_LEVEL_STATUS.FAIL,
        extractionOutput: {},
        artifactRefs: {
          transcriptPath: input.transcriptPath,
          replayArtifactPath: input.replayArtifactPath,
        },
        commandInfo: {
          cwd,
          exitCode: null,
          durationMs: null,
        },
        envInfo: {
          requiredEnvPresence: {},
          secretsExposed: false,
        },
        holds: [],
        errors: [
          buildError(
            "replay_artifact_read_failed",
            `Unable to read replay artifact: ${error.message}`,
            {
              stage: "read_replay_artifact",
            }
          ),
        ],
        provenance: buildReplayProvenance(input),
      });
    }
  }

  function runLive(input) {
    const envPresence = collectEnvPresence(env);
    const missingEnvKeys = Object.entries(envPresence)
      .filter(([, present]) => !present)
      .map(([envKey]) => envKey);

    if (missingEnvKeys.length > 0) {
      return buildBaseOutput({
        scenarioId: input.scenarioId,
        corridorId: input.corridorId,
        mode: RUNNER_MODE.LIVE,
        status: TOP_LEVEL_STATUS.HOLD,
        extractionOutput: {},
        artifactRefs: {
          transcriptPath: input.transcriptPath,
        },
        commandInfo: {
          cwd,
          exitCode: null,
          durationMs: null,
        },
        envInfo: {
          requiredEnvPresence: envPresence,
          secretsExposed: false,
        },
        holds: [
          buildHold(
            "live_env_missing",
            "LIVE mode requires approved pipeline env before execution.",
            {
              stage: "resolve_openai_config",
              missingEnvKeys,
            }
          ),
        ],
        errors: [],
        provenance: buildLiveProvenance({
          executionAttempted: false,
          missingEnvKeys,
        }),
      });
    }

    if (!existsSyncImpl(input.transcriptPath)) {
      return buildBaseOutput({
        scenarioId: input.scenarioId,
        corridorId: input.corridorId,
        mode: RUNNER_MODE.LIVE,
        status: TOP_LEVEL_STATUS.FAIL,
        extractionOutput: {},
        artifactRefs: {
          transcriptPath: input.transcriptPath,
        },
        commandInfo: {
          command: pythonCommand,
          args: [
            "-c",
            "[inline_meridian_pipeline_bridge]",
            input.transcriptPath,
            input.scenarioId,
            input.corridorId,
          ],
          cwd,
          exitCode: null,
          durationMs: null,
        },
        envInfo: {
          requiredEnvPresence: envPresence,
          secretsExposed: false,
        },
        holds: [],
        errors: [
          buildError(
            "live_transcript_missing",
            "LIVE mode transcriptPath does not exist.",
            {
              stage: "prepare_live_input",
            }
          ),
        ],
        provenance: buildLiveProvenance({
          executionAttempted: false,
        }),
      });
    }

    const startedAt = now();
    const spawnResult = spawnSyncImpl(
      pythonCommand,
      [
        "-c",
        PYTHON_BRIDGE_SCRIPT,
        input.transcriptPath,
        input.scenarioId,
        input.corridorId,
        cwd,
      ],
      {
        cwd,
        encoding: "utf8",
        env,
      }
    );
    const durationMs = Math.max(0, now() - startedAt);
    const commandInfo = {
      command: pythonCommand,
      args: [
        "-c",
        "[inline_meridian_pipeline_bridge]",
        input.transcriptPath,
        input.scenarioId,
        input.corridorId,
      ],
      cwd,
      exitCode:
        typeof spawnResult.status === "number" ? spawnResult.status : null,
      durationMs,
    };

    if (spawnResult.error) {
      return buildBaseOutput({
        scenarioId: input.scenarioId,
        corridorId: input.corridorId,
        mode: RUNNER_MODE.LIVE,
        status: TOP_LEVEL_STATUS.FAIL,
        extractionOutput: {},
        artifactRefs: {
          transcriptPath: input.transcriptPath,
        },
        commandInfo,
        envInfo: {
          requiredEnvPresence: envPresence,
          secretsExposed: false,
        },
        holds: [],
        errors: [
          buildError(
            "live_pipeline_spawn_failed",
            `LIVE pipeline execution could not start: ${spawnResult.error.message}`,
            {
              stage: "execute_live_pipeline",
            }
          ),
        ],
        provenance: buildLiveProvenance({
          executionAttempted: true,
        }),
      });
    }

    if (spawnResult.status !== 0) {
      const stderrText =
        typeof spawnResult.stderr === "string" ? spawnResult.stderr.trim() : "";
      return buildBaseOutput({
        scenarioId: input.scenarioId,
        corridorId: input.corridorId,
        mode: RUNNER_MODE.LIVE,
        status: TOP_LEVEL_STATUS.FAIL,
        extractionOutput: {},
        artifactRefs: {
          transcriptPath: input.transcriptPath,
        },
        commandInfo,
        envInfo: {
          requiredEnvPresence: envPresence,
          secretsExposed: false,
        },
        holds: [],
        errors: [
          buildError(
            "live_pipeline_nonzero_exit",
            "LIVE pipeline execution returned a non-zero exit code.",
            {
              stage: "execute_live_pipeline",
              stderrPreview: stderrText || null,
            }
          ),
        ],
        provenance: buildLiveProvenance({
          executionAttempted: true,
        }),
      });
    }

    try {
      const stdoutText =
        typeof spawnResult.stdout === "string" ? spawnResult.stdout : "";
      const parsedOutput = JSON.parse(stdoutText);

      if (!isPlainObject(parsedOutput)) {
        throw new TypeError("stdout JSON must be an object");
      }

      const artifactRefs = {
        transcriptPath: input.transcriptPath,
        ...maybeWriteLiveOutput({
          outputDirectory: input.outputDirectory,
          scenarioId: input.scenarioId,
          extractionOutput: parsedOutput,
          mkdirSyncImpl,
          writeFileSyncImpl,
          cwd,
        }),
      };

      return buildBaseOutput({
        scenarioId: input.scenarioId,
        corridorId: input.corridorId,
        mode: RUNNER_MODE.LIVE,
        status: TOP_LEVEL_STATUS.PASS,
        extractionOutput: cloneJsonValue(parsedOutput),
        artifactRefs,
        commandInfo,
        envInfo: {
          requiredEnvPresence: envPresence,
          secretsExposed: false,
        },
        holds: [],
        errors: [],
        provenance: buildLiveProvenance({
          executionAttempted: true,
          fallbackUsed: Boolean(parsedOutput.fallback_used),
        }),
      });
    } catch (error) {
      return buildBaseOutput({
        scenarioId: input.scenarioId,
        corridorId: input.corridorId,
        mode: RUNNER_MODE.LIVE,
        status: TOP_LEVEL_STATUS.FAIL,
        extractionOutput: {},
        artifactRefs: {
          transcriptPath: input.transcriptPath,
        },
        commandInfo,
        envInfo: {
          requiredEnvPresence: envPresence,
          secretsExposed: false,
        },
        holds: [],
        errors: [
          buildError(
            "live_pipeline_stdout_invalid",
            `LIVE pipeline stdout could not be consumed safely: ${error.message}`,
            {
              stage: "consume_live_pipeline_stdout",
            }
          ),
        ],
        provenance: buildLiveProvenance({
          executionAttempted: true,
        }),
      });
    }
  }

  function runPipelineBridge(input) {
    const normalizedInput = normalizeInput(input);

    if (normalizedInput.mode === RUNNER_MODE.REPLAY) {
      return runReplay(normalizedInput);
    }

    return runLive(normalizedInput);
  }

  return {
    runPipelineBridge,
  };
}

const defaultBridge = createPipelineBridge();

module.exports = {
  createPipelineBridge,
  runPipelineBridge: defaultBridge.runPipelineBridge,
};
