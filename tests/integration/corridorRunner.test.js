const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { main } = require("../../scripts/run-corridor-scenario.js");

const REPO_ROOT = process.cwd();
const REPLAY_SCENARIO_CASES = [
  {
    label: "routine replay non-cascade",
    args: ["--scenario=routine", "--mode=replay"],
    scenarioName: "Lancaster Avenue corridor reconstruction",
  },
  {
    label: "contested replay cascade",
    args: ["--scenario=contested", "--mode=replay", "--cascade"],
    scenarioName: "Hemphill Street mixed-use / contested authority",
  },
  {
    label: "emergency replay cascade",
    args: ["--scenario=emergency", "--mode=replay", "--cascade"],
    scenarioName: "Camp Bowie water main break",
  },
];

const PACKET_1_TO_4_FILES = [
  path.join(REPO_ROOT, "src", "integration", "contracts.js"),
  path.join(REPO_ROOT, "src", "integration", "pipelineBridge.js"),
  path.join(REPO_ROOT, "src", "integration", "matchingEngine.js"),
  path.join(REPO_ROOT, "src", "integration", "corridorScenario.js"),
  path.join(REPO_ROOT, "src", "integration", "resolutionCascade.js"),
  path.join(REPO_ROOT, "tests", "integration", "scenarioFixtures.test.js"),
  path.join(REPO_ROOT, "tests", "integration", "pipelineBridge.test.js"),
  path.join(REPO_ROOT, "tests", "integration", "matchingEngine.test.js"),
  path.join(REPO_ROOT, "tests", "integration", "corridorScenario.test.js"),
  path.join(REPO_ROOT, "tests", "integration", "corridorCascade.test.js"),
];

const WAVE_1_TO_7_SURFACES = [
  path.join(REPO_ROOT, "src", "bridge"),
  path.join(REPO_ROOT, "src", "entities"),
  path.join(REPO_ROOT, "src", "governance", "runtime"),
  path.join(REPO_ROOT, "src", "governance", "forensic"),
  path.join(REPO_ROOT, "src", "governance", "shadows.js"),
  path.join(REPO_ROOT, "src", "pipeline"),
  path.join(REPO_ROOT, "src", "skins"),
  path.join(REPO_ROOT, "tests", "pipeline"),
];

function runCli(args, extra = {}) {
  const stdout = [];
  const stderr = [];
  const envOverrides = extra.env || {};
  const originalStdoutWrite = process.stdout.write;
  const originalStderrWrite = process.stderr.write;
  const originalEnv = new Map();

  for (const [key, value] of Object.entries(envOverrides)) {
    originalEnv.set(key, process.env[key]);
    if (value === undefined) {
      delete process.env[key];
      continue;
    }

    process.env[key] = String(value);
  }

  process.stdout.write = function patchedStdout(chunk, encoding, callback) {
    stdout.push(typeof chunk === "string" ? chunk : String(chunk));
    if (typeof callback === "function") {
      callback();
    }
    return true;
  };

  process.stderr.write = function patchedStderr(chunk, encoding, callback) {
    stderr.push(typeof chunk === "string" ? chunk : String(chunk));
    if (typeof callback === "function") {
      callback();
    }
    return true;
  };

  try {
    return {
      status: main(args),
      stdout: stdout.join(""),
      stderr: stderr.join(""),
    };
  } finally {
    process.stdout.write = originalStdoutWrite;
    process.stderr.write = originalStderrWrite;

    for (const [key, value] of originalEnv.entries()) {
      if (value === undefined) {
        delete process.env[key];
        continue;
      }

      process.env[key] = value;
    }
  }
}

function buildMissingLiveEnv() {
  return {
    OPENAI_API_KEY: "",
    MERIDIAN_PIPELINE_MODEL: "",
  };
}

function parseJsonOutput(result) {
  assert.equal(result.stderr, "");
  return JSON.parse(result.stdout);
}

function hashFile(filePath) {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(filePath))
    .digest("hex");
}

function hashFiles(filePaths) {
  return new Map(filePaths.map((filePath) => [filePath, hashFile(filePath)]));
}

function listFilesRecursively(root) {
  if (!fs.existsSync(root)) {
    return [];
  }

  const stat = fs.statSync(root);
  if (stat.isFile()) {
    return [root];
  }

  const files = [];
  const entries = fs.readdirSync(root, { withFileTypes: true });
  for (const entry of entries) {
    const absolutePath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursively(absolutePath));
      continue;
    }

    if (entry.isFile()) {
      files.push(absolutePath);
    }
  }

  return files.sort();
}

for (const entry of REPLAY_SCENARIO_CASES) {
  test(`${entry.label} exits 0`, () => {
    const result = runCli(entry.args);

    assert.equal(result.status, 0);
    assert.equal(result.stderr, "");
  });

  test(`${entry.label} default output is human-readable and includes summary fields`, () => {
    const result = runCli(entry.args);

    assert.match(result.stdout, new RegExp(`Scenario: ${entry.scenarioName}`));
    assert.match(result.stdout, /Mode: REPLAY/);
    assert.match(result.stdout, /Top-level status: PASS/);
    assert.match(result.stdout, /Stage statuses:/);
    assert.match(result.stdout, /Expected vs actual:/);
    assert.match(result.stdout, /Key summary:/);
    assert.match(result.stdout, /Exit classification: 0 MATCHED_EXPECTATIONS/);
  });

  test(`${entry.label} --json emits valid structured output with exit 0`, () => {
    const result = runCli([...entry.args, "--json"]);
    const parsed = parseJsonOutput(result);

    assert.equal(result.status, 0);
    assert.equal(parsed.summary.exitClassification.code, 0);
    assert.equal(parsed.summary.exitClassification.label, "MATCHED_EXPECTATIONS");
    assert.equal(parsed.scenarios.length, 1);
    assert.equal(parsed.scenarios[0].exitClassification.code, 0);
    assert.equal(parsed.scenarios[0].comparison.matched, true);
  });
}

test("all-scenarios replay cascade exits 0", () => {
  const result = runCli(["--scenario=all", "--mode=replay", "--cascade"]);

  assert.equal(result.status, 0);
  assert.equal(result.stderr, "");
  assert.match(result.stdout, /Overall exit classification: 0 MATCHED_EXPECTATIONS/);
});

test("all-scenarios replay cascade human output includes all three scenario names", () => {
  const result = runCli(["--scenario=all", "--mode=replay", "--cascade"]);

  assert.match(result.stdout, /Lancaster Avenue corridor reconstruction/);
  assert.match(result.stdout, /Hemphill Street mixed-use \/ contested authority/);
  assert.match(result.stdout, /Camp Bowie water main break/);
});

test("all-scenarios replay cascade JSON summary counts all three matched scenarios", () => {
  const result = runCli([
    "--scenario=all",
    "--mode=replay",
    "--cascade",
    "--json",
  ]);
  const parsed = parseJsonOutput(result);

  assert.equal(result.status, 0);
  assert.equal(parsed.summary.scenarioCount, 3);
  assert.equal(parsed.summary.matchedExpectationCount, 3);
  assert.equal(parsed.summary.unexpectedHoldCount, 0);
  assert.equal(parsed.summary.technicalFailureCount, 0);
});

test("--json output is deterministic across repeated replay cascade runs", () => {
  const args = ["--scenario=contested", "--mode=replay", "--cascade", "--json"];
  const first = runCli(args);
  const second = runCli(args);

  assert.equal(first.status, 0);
  assert.equal(second.status, 0);
  assert.equal(first.stderr, "");
  assert.equal(second.stderr, "");
  assert.equal(second.stdout, first.stdout);
});

test("--json output is JSON-only with no human-readable wrapper lines", () => {
  const result = runCli([
    "--scenario=emergency",
    "--mode=replay",
    "--cascade",
    "--json",
  ]);
  const parsed = parseJsonOutput(result);

  assert.equal(result.stdout.trim().startsWith("{"), true);
  assert.equal(result.stdout.includes("Scenario: "), false);
  assert.equal(result.stdout.includes("Overall exit classification"), false);
  assert.equal(parsed.contractVersion, "wave8.packet5.runnerReport.v1");
});

test("expected held steps and revoke path still exit 0 in contested replay cascade", () => {
  const result = runCli([
    "--scenario=contested",
    "--mode=replay",
    "--cascade",
    "--json",
  ]);
  const parsed = parseJsonOutput(result);

  assert.equal(result.status, 0);
  assert.equal(
    parsed.scenarios[0].result.steps.some(
      (step) => step.governance.result.decision === "REVOKE"
    ),
    true
  );
  assert.equal(
    parsed.scenarios[0].result.holds.every((hold) => hold.expected === true),
    true
  );
});

test("expected HOLD and BLOCK outcomes still exit 0 in emergency replay cascade", () => {
  const result = runCli([
    "--scenario=emergency",
    "--mode=replay",
    "--cascade",
    "--json",
  ]);
  const parsed = parseJsonOutput(result);
  const decisions = parsed.scenarios[0].result.steps.map(
    (step) => step.governance.result.decision
  );

  assert.equal(result.status, 0);
  assert.deepEqual(decisions, ["HOLD", "ALLOW", "BLOCK", "ALLOW", "HOLD"]);
  assert.equal(parsed.scenarios[0].exitClassification.code, 0);
});

test("invalid scenario exits 1", () => {
  const result = runCli(["--scenario=unknown", "--mode=replay"]);

  assert.equal(result.status, 1);
  assert.match(result.stdout, /Invalid --scenario value/);
});

test("invalid mode exits 1", () => {
  const result = runCli(["--scenario=routine", "--mode=broken"]);

  assert.equal(result.status, 1);
  assert.match(result.stdout, /Invalid --mode value/);
});

test("missing scenario exits 1", () => {
  const result = runCli(["--mode=replay"]);

  assert.equal(result.status, 1);
  assert.match(result.stdout, /Missing required --scenario flag/);
});

test("missing mode exits 1", () => {
  const result = runCli(["--scenario=routine"]);

  assert.equal(result.status, 1);
  assert.match(result.stdout, /Missing required --mode flag/);
});

test("unknown flag exits 1", () => {
  const result = runCli([
    "--scenario=routine",
    "--mode=replay",
    "--unsupported",
  ]);

  assert.equal(result.status, 1);
  assert.match(result.stdout, /Unknown argument: --unsupported/);
});

test("unexpected unresolved HOLD exits 2 for all-scenarios live cascade when env is absent", () => {
  const result = runCli(
    ["--scenario=all", "--mode=live", "--cascade", "--json"],
    {
      env: buildMissingLiveEnv(),
    }
  );
  const parsed = parseJsonOutput(result);

  assert.equal(result.status, 2);
  assert.equal(parsed.summary.exitClassification.code, 2);
  assert.equal(parsed.summary.exitClassification.label, "UNEXPECTED_HOLD");
  assert.equal(parsed.summary.unexpectedHoldCount, 3);
});

test("live mode missing-env single-scenario path exits 2 with structured HOLD posture", () => {
  const result = runCli(["--scenario=emergency", "--mode=live", "--json"], {
    env: buildMissingLiveEnv(),
  });
  const parsed = parseJsonOutput(result);
  const scenario = parsed.scenarios[0];

  assert.equal(result.status, 2);
  assert.equal(scenario.exitClassification.code, 2);
  assert.equal(scenario.result.status, "HOLD");
  assert.equal(scenario.result.pipeline.bridgeStatus, "HOLD");
  assert.equal(scenario.result.pipeline.holds[0].code, "live_env_missing");
  assert.deepEqual(scenario.result.pipeline.holds[0].missingEnvKeys, [
    "OPENAI_API_KEY",
    "MERIDIAN_PIPELINE_MODEL",
  ]);
});

test("live mode missing-env default output stays human-readable while classifying exit 2", () => {
  const result = runCli(["--scenario=contested", "--mode=live"], {
    env: buildMissingLiveEnv(),
  });

  assert.equal(result.status, 2);
  assert.equal(result.stderr, "");
  assert.match(result.stdout, /Mode: LIVE/);
  assert.match(result.stdout, /Top-level status: HOLD/);
  assert.match(result.stdout, /Exit classification: 2 UNEXPECTED_HOLD/);
});

test("routine replay JSON output carries stable fixture comparison references", () => {
  const result = runCli(["--scenario=routine", "--mode=replay", "--json"]);
  const parsed = parseJsonOutput(result);
  const scenario = parsed.scenarios[0];

  assert.equal(scenario.comparison.expected.bridgeStatus, "PASS");
  assert.equal(scenario.comparison.expected.finalDisposition, "APPROVED_AND_ISSUED");
  assert.equal(scenario.comparison.actual.governanceDecision, "ALLOW");
  assert.equal(scenario.comparison.matched, true);
});

test("contested replay cascade JSON output carries the frozen step count", () => {
  const result = runCli([
    "--scenario=contested",
    "--mode=replay",
    "--cascade",
    "--json",
  ]);
  const parsed = parseJsonOutput(result);
  const scenario = parsed.scenarios[0];

  assert.equal(scenario.comparison.expected.stepCount, 5);
  assert.equal(scenario.comparison.actual.stepCount, 5);
  assert.equal(
    scenario.comparison.checks.find((check) => check.label === "final state fingerprint")
      .pass,
    true
  );
});

test("emergency replay cascade human output includes aggregate stage summaries", () => {
  const result = runCli(["--scenario=emergency", "--mode=replay", "--cascade"]);

  assert.match(result.stdout, /pipeline=PASS x5/);
  assert.match(result.stdout, /governance=HOLD x3, PASS x2|governance=PASS x2, HOLD x3/);
  assert.match(result.stdout, /skins=HOLD x1, PASS x4|skins=PASS x4, HOLD x1/);
});

test("routine replay leaves Packet 1-4 files untouched", () => {
  const before = hashFiles(PACKET_1_TO_4_FILES);
  const result = runCli(["--scenario=routine", "--mode=replay"]);
  const after = hashFiles(PACKET_1_TO_4_FILES);

  assert.equal(result.status, 0);
  assert.deepEqual(after, before);
});

test("all-scenarios replay cascade leaves frozen scenario fixtures untouched", () => {
  const fixtureFiles = listFilesRecursively(
    path.join(REPO_ROOT, "tests", "fixtures", "scenarios")
  );
  const before = hashFiles(fixtureFiles);
  const result = runCli(["--scenario=all", "--mode=replay", "--cascade"]);
  const after = hashFiles(fixtureFiles);

  assert.equal(result.status, 0);
  assert.deepEqual(after, before);
});

test("all-scenarios replay cascade leaves frozen Wave 1-7 surfaces untouched", () => {
  const blockedFiles = WAVE_1_TO_7_SURFACES.flatMap(listFilesRecursively);
  const before = hashFiles(blockedFiles);
  const result = runCli(["--scenario=all", "--mode=replay", "--cascade"]);
  const after = hashFiles(blockedFiles);

  assert.equal(result.status, 0);
  assert.deepEqual(after, before);
});

test("replay human mode keeps stderr empty", () => {
  const result = runCli(["--scenario=all", "--mode=replay", "--cascade"]);

  assert.equal(result.status, 0);
  assert.equal(result.stderr, "");
});

test("replay JSON mode keeps stderr empty", () => {
  const result = runCli([
    "--scenario=all",
    "--mode=replay",
    "--cascade",
    "--json",
  ]);

  assert.equal(result.status, 0);
  assert.equal(result.stderr, "");
});

test("help exits 0 and prints the supported invocations", () => {
  const result = runCli(["--help"]);

  assert.equal(result.status, 0);
  assert.match(result.stdout, /--scenario=routine\|contested\|emergency\|all/);
  assert.match(result.stdout, /--mode=replay\|live/);
});
