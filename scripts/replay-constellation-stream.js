#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const {
  buildLiveBrokerHold,
  replayConstellationMessages,
} = require("../src/live/adapters/constellationReplayAdapter");
const { LiveSessionStore } = require("../src/live/liveSessionStore");

const EXIT_CODES = Object.freeze({
  OK: 0,
  HOLD: 2,
});
const DEFAULT_MODE = "replay";
const DEFAULT_LIVE_SESSION_ROOT = ".meridian/live-sessions";

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseArgs(argv) {
  const options = {
    fixture: null,
    mode: DEFAULT_MODE,
    session_id: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--fixture") {
      index += 1;
      options.fixture = argv[index] || null;
      continue;
    }

    if (token.startsWith("--fixture=")) {
      options.fixture = token.slice("--fixture=".length);
      continue;
    }

    if (token === "--session-id") {
      index += 1;
      options.session_id = argv[index] || null;
      continue;
    }

    if (token.startsWith("--session-id=")) {
      options.session_id = token.slice("--session-id=".length);
      continue;
    }

    if (token === "--mode") {
      index += 1;
      options.mode = argv[index] || null;
      continue;
    }

    if (token.startsWith("--mode=")) {
      options.mode = token.slice("--mode=".length);
      continue;
    }

    throw new Error(`Unknown argument: ${token}`);
  }

  if (options.mode !== "replay" && options.mode !== "live") {
    throw new Error("Invalid --mode value. Use replay or live.");
  }

  return options;
}

function sortJsonValue(value) {
  if (Array.isArray(value)) {
    return value.map(sortJsonValue);
  }

  if (isPlainObject(value)) {
    const sorted = {};
    for (const key of Object.keys(value).sort()) {
      if (value[key] !== undefined) {
        sorted[key] = sortJsonValue(value[key]);
      }
    }
    return sorted;
  }

  return value;
}

function writeJson(stdout, value) {
  stdout.write(`${JSON.stringify(sortJsonValue(value), null, 2)}\n`);
}

function createStore(cwd) {
  return new LiveSessionStore({
    cwd,
    rootDirectory: DEFAULT_LIVE_SESSION_ROOT,
  });
}

function ensureSession(store, sessionId) {
  const loaded = store.loadSession(sessionId);
  if (loaded.ok) {
    return loaded;
  }

  if (
    Array.isArray(loaded.issues) &&
    loaded.issues.some((issue) => /session not found/.test(issue))
  ) {
    return store.createSession({ session_id: sessionId });
  }

  return loaded;
}

function buildHold(reason, issues, extra = {}) {
  return {
    ok: false,
    status: "HOLD",
    reason,
    issues: Array.isArray(issues) ? issues : [String(issues)],
    ...extra,
  };
}

function resolveFixturePath(cwd, fixture) {
  return path.isAbsolute(fixture) ? fixture : path.resolve(cwd, fixture);
}

function runReplay(options, dependencies) {
  const cwd = dependencies.cwd || process.cwd();

  if (!options.fixture) {
    return buildHold("fixture_missing", ["--fixture is required in replay mode."]);
  }

  if (!options.session_id) {
    return buildHold("session_id_missing", ["--session-id is required in replay mode."]);
  }

  const fixturePath = resolveFixturePath(cwd, options.fixture);
  let jsonl;
  try {
    jsonl = fs.readFileSync(fixturePath, "utf8");
  } catch (error) {
    return buildHold("fixture_read_failed", [
      `fixture read failed closed: ${error.message}`,
    ]);
  }

  const store = dependencies.store || createStore(cwd);
  const session = ensureSession(store, options.session_id);
  if (!session.ok) {
    return buildHold("live_session_unavailable", session.issues || []);
  }

  const replay = replayConstellationMessages({
    jsonl,
    session_id: options.session_id,
    store,
  });

  if (!replay.ok) {
    return {
      ok: false,
      status: "HOLD",
      reason: replay.reason,
      issues: [...replay.issues],
      appended_count: replay.appended_count,
    };
  }

  return {
    ok: true,
    status: "PASS",
    reason: replay.reason,
    appended_count: replay.appended_count,
    event_kinds: replay.events.map((event) => event.kind),
    fixture: path.relative(cwd, fixturePath).replace(/\\/g, "/"),
    session_id: options.session_id,
    session_path: store.resolveSessionFilePath(options.session_id),
    limitations: replay.limitations,
  };
}

function main(argv = process.argv.slice(2), dependencies = {}) {
  const stdout = dependencies.stdout || process.stdout;
  const env = dependencies.env || process.env;
  let output;

  try {
    const options = parseArgs(argv);

    if (options.mode === "live") {
      output = buildLiveBrokerHold(env);
      writeJson(stdout, output);
      return EXIT_CODES.HOLD;
    }

    output = runReplay(options, dependencies);
  } catch (error) {
    output = buildHold("replay_cli_argument_error", [error.message]);
  }

  writeJson(stdout, output);
  return output.ok ? EXIT_CODES.OK : EXIT_CODES.HOLD;
}

if (require.main === module) {
  process.exitCode = main();
}

module.exports = {
  DEFAULT_LIVE_SESSION_ROOT,
  EXIT_CODES,
  buildHold,
  main,
  parseArgs,
  runReplay,
};
