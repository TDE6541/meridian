#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const { LiveSessionStore } = require("../src/live/liveSessionStore");
const {
  createLiveGovernanceGateway,
} = require("../src/live/liveGovernanceGateway");
const {
  createEntityDeltaV1,
} = require("../src/live/liveEntityDelta");
const { createInspection } = require("../src/entities/inspection");

const EXIT_CODES = Object.freeze({
  SUCCESS: 0,
  TECHNICAL_FAILURE: 1,
  STRUCTURED_HOLD: 2,
});

function stableStringify(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function parseArgs(argv) {
  const args = {
    demo: false,
    inputPath: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--demo") {
      args.demo = true;
      continue;
    }

    if (token === "--input") {
      index += 1;
      args.inputPath = argv[index] || null;
      continue;
    }

    if (token.startsWith("--input=")) {
      args.inputPath = token.slice("--input=".length);
      continue;
    }

    if (!token.startsWith("--") && !args.inputPath) {
      args.inputPath = token;
      continue;
    }

    throw new Error(`Unknown argument: ${token}`);
  }

  if (!args.demo && !args.inputPath) {
    throw new Error("Pass --demo or a JSON input file path.");
  }

  if (args.demo && args.inputPath) {
    throw new Error("Use either --demo or a JSON input file path, not both.");
  }

  return args;
}

function createDemoDelta(sessionId) {
  const entity = createInspection({
    entity_id: "inspection-live-demo-1",
    org_id: "fortworth-dev",
    name: "Live demo inspection",
    status: "passed",
    signal_tree: {
      governance: {
        decision_state: null,
        authority_chain: {
          requested_by_role: "fire_inspector",
          required_approvals: ["fire_department"],
          resolved_approvals: ["fire_department"],
          missing_approvals: [],
        },
        evidence: {
          required_count: 1,
          present_count: 1,
          missing_types: [],
        },
        absence: {
          inspection_missing: false,
          notice_missing: false,
          supersession_missing: false,
        },
      },
      civic: {
        promise_status: {
          conditions_total: 0,
          conditions_satisfied: 0,
          oldest_open_condition_at: null,
        },
        related_zone_ids: [],
        related_asset_ids: [],
      },
      lineage: {
        decision_record_ids: [],
        evidence_ids: [],
      },
    },
  });

  return {
    version: "meridian.v2.entityDelta.v1",
    delta_id: "delta-live-demo-1",
    session_id: sessionId,
    timestamp: "2026-04-24T10:00:00.000Z",
    operation: "state_transition",
    entity_type: "inspection",
    entity_id: entity.entity_id,
    entity,
    source: {
      type: "live_gateway",
      ref: "scripts/run-live-governance.js:demo",
    },
    governance_context: {
      request: {
        kind: "command_request",
        org_id: "fortworth-dev",
        entity_ref: {
          entity_id: entity.entity_id,
          entity_type: "inspection",
        },
        authority_context: {
          resolved: true,
          requested_by_role: "fire_inspector",
          required_approvals: ["fire_department"],
          resolved_approvals: ["fire_department"],
          missing_approvals: [],
        },
        evidence_context: {
          required_count: 1,
          present_count: 1,
          missing_types: [],
        },
        confidence_context: null,
        candidate_signal_patch: null,
        raw_subject:
          "constellation.commands.fortworth-dev.inspection-live-demo-1",
      },
    },
    authority_context: {},
  };
}

function readJsonInput(inputPath, cwd) {
  const resolvedPath = path.isAbsolute(inputPath)
    ? inputPath
    : path.resolve(cwd, inputPath);
  const parsed = JSON.parse(fs.readFileSync(resolvedPath, "utf8"));

  if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && parsed.delta) {
    return parsed.delta;
  }

  return parsed;
}

function createOrLoadSession(store, sessionId) {
  const loaded = store.loadSession(sessionId);
  if (loaded.ok) {
    return loaded;
  }

  return store.createSession({ session_id: sessionId });
}

function normalizeSessionId(delta, demo) {
  if (
    delta &&
    typeof delta === "object" &&
    typeof delta.session_id === "string" &&
    delta.session_id.trim() !== ""
  ) {
    return delta.session_id;
  }

  return demo ? "live-demo-session" : "live-input-session";
}

function run(argv = process.argv.slice(2), options = {}) {
  const cwd = options.cwd || process.cwd();
  const stdout = options.stdout || process.stdout;
  const stderr = options.stderr || process.stderr;
  const rootDirectory =
    options.rootDirectory || path.join(".meridian", "live-sessions");
  const now = options.now || (() => new Date().toISOString());
  const idGenerator =
    options.idGenerator || ((prefix) => `${prefix}-${Date.now()}`);

  try {
    const args = parseArgs(argv);
    let delta = args.demo
      ? createDemoDelta("live-demo-session")
      : readJsonInput(args.inputPath, cwd);
    const sessionId = normalizeSessionId(delta, args.demo);
    const store = new LiveSessionStore({
      cwd,
      rootDirectory,
      now,
      idGenerator,
    });
    const session = createOrLoadSession(store, sessionId);

    if (!session.ok) {
      const result = {
        ok: false,
        status: "HOLD",
        reason: "live_session_unavailable",
        issues: session.issues,
      };
      stdout.write(stableStringify(result));
      return EXIT_CODES.STRUCTURED_HOLD;
    }

    if (args.demo) {
      delta = createDemoDelta(session.session.session_id);
    }

    const gateway = createLiveGovernanceGateway({
      store,
      now,
      idGenerator(prefix, id) {
        return id ? `${prefix}-${id}` : idGenerator(prefix);
      },
    });
    const result = gateway.evaluate(delta, {
      session_id: session.session.session_id,
    });

    stdout.write(stableStringify(result));
    return result.ok ? EXIT_CODES.SUCCESS : EXIT_CODES.STRUCTURED_HOLD;
  } catch (error) {
    stderr.write(`${error.message}\n`);
    return EXIT_CODES.TECHNICAL_FAILURE;
  }
}

if (require.main === module) {
  process.exitCode = run();
}

module.exports = {
  EXIT_CODES,
  createDemoDelta,
  parseArgs,
  run,
};
