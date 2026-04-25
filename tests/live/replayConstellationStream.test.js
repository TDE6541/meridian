const test = require("node:test");
const assert = require("node:assert/strict");
const {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
} = require("node:fs");
const { spawnSync } = require("node:child_process");
const os = require("node:os");
const path = require("node:path");

const repoRoot = path.join(__dirname, "../..");
const scriptPath = path.join(repoRoot, "scripts/replay-constellation-stream.js");
const sampleFixturePath = path.join(
  repoRoot,
  "tests/fixtures/constellation-replay/constellation-replay.sample.jsonl"
);
const invalidFixturePath = path.join(
  repoRoot,
  "tests/fixtures/constellation-replay/constellation-replay.invalid.jsonl"
);

function createTempRoot() {
  return mkdtempSync(path.join(os.tmpdir(), "meridian-a7-cli-"));
}

function runCli(args, options = {}) {
  return spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: options.cwd || repoRoot,
    encoding: "utf8",
    env: options.env || process.env,
  });
}

function parseStdout(result) {
  assert.doesNotThrow(() => JSON.parse(result.stdout), result.stdout);
  return JSON.parse(result.stdout);
}

test("replay constellation stream CLI: replay fixture path exits 0 with JSON stdout", () => {
  const tempRoot = createTempRoot();
  try {
    const result = runCli(
      [
        "--fixture",
        sampleFixturePath,
        "--session-id",
        "session-a7-cli",
      ],
      { cwd: tempRoot }
    );
    const output = parseStdout(result);

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.equal(output.ok, true);
    assert.equal(output.status, "PASS");
    assert.equal(output.appended_count, 3);
    assert.deepEqual(output.event_kinds, [
      "constellation.replay.received",
      "constellation.replay.received",
      "constellation.replay.received",
    ]);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("replay constellation stream CLI: writes only to temp .meridian/live-sessions root", () => {
  const tempRoot = createTempRoot();
  try {
    const result = runCli(
      [
        "--fixture",
        sampleFixturePath,
        "--session-id",
        "session-a7-cli",
      ],
      { cwd: tempRoot }
    );
    const output = parseStdout(result);
    const sessionPath = path.join(
      tempRoot,
      ".meridian",
      "live-sessions",
      "session-a7-cli.json"
    );

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.equal(existsSync(sessionPath), true);
    assert.equal(output.session_path, sessionPath);
    assert.deepEqual(readdirSync(tempRoot), [".meridian"]);
    assert.equal(JSON.parse(readFileSync(sessionPath, "utf8")).records.length, 3);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("replay constellation stream CLI: malformed fixture exits 2 with structured HOLD", () => {
  const tempRoot = createTempRoot();
  try {
    const result = runCli(
      [
        "--fixture",
        invalidFixturePath,
        "--session-id",
        "session-a7-cli",
      ],
      { cwd: tempRoot }
    );
    const output = parseStdout(result);

    assert.equal(result.status, 2);
    assert.equal(output.ok, false);
    assert.equal(output.status, "HOLD");
    assert.equal(output.appended_count, 0);
    assert.match(output.issues.join("\n"), /malformed JSON/);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("--mode=live with missing env exits 2 with structured HOLD", () => {
  const tempRoot = createTempRoot();
  const env = { ...process.env };
  delete env.NATS_URL;
  delete env.MERIDIAN_CONSTELLATION_LIVE_BROKER_PROOF_REF;

  try {
    const result = runCli(["--mode=live"], {
      cwd: tempRoot,
      env,
    });
    const output = parseStdout(result);

    assert.equal(result.status, 2);
    assert.equal(output.ok, false);
    assert.equal(output.status, "HOLD");
    assert.equal(output.reason, "live_constellation_env_missing");
    assert.ok(output.missing_env.includes("NATS_URL"));
    assert.ok(
      output.missing_env.includes(
        "MERIDIAN_CONSTELLATION_LIVE_BROKER_PROOF_REF"
      )
    );
    assert.ok(
      output.missing_proof.includes(
        "MERIDIAN_CONSTELLATION_LIVE_BROKER_PROOF_REF"
      )
    );
    assert.match(output.statement, /does not claim live Constellation broker integration/);
    assert.equal(existsSync(path.join(tempRoot, ".meridian")), false);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("--mode=live with env present still holds without A7-approved broker proof", () => {
  const tempRoot = createTempRoot();
  const env = {
    ...process.env,
    MERIDIAN_CONSTELLATION_LIVE_BROKER_PROOF_REF: "local-proof-ref-not-approved-in-a7",
    NATS_URL: "nats://example.invalid:4222",
  };

  try {
    const result = runCli(["--mode=live"], {
      cwd: tempRoot,
      env,
    });
    const output = parseStdout(result);

    assert.equal(result.status, 2);
    assert.equal(output.ok, false);
    assert.equal(output.status, "HOLD");
    assert.equal(output.reason, "live_constellation_proof_not_approved_in_a7");
    assert.deepEqual(output.missing_env, []);
    assert.deepEqual(output.missing_proof, ["approved_a7_live_broker_proof"]);
    assert.equal(existsSync(path.join(tempRoot, ".meridian")), false);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("replay constellation stream CLI: no live broker connection path is attempted", () => {
  const source = readFileSync(scriptPath, "utf8");

  assert.equal(/require\(["']nats["']\)/.test(source), false);
  assert.equal(/createNatsTransport|nats\.connect|NatsConnection|StringCodec/.test(source), false);
  assert.equal(/\.subscribe\s*\(|\.publish\s*\(/.test(source), false);
});
