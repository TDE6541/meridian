const test = require("node:test");
const assert = require("node:assert/strict");
const {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  EXIT_CODES,
  createDemoDelta,
  run,
} = require("../../scripts/run-live-governance");

function createWriter() {
  let output = "";
  return {
    write(chunk) {
      output += chunk;
    },
    read() {
      return output;
    },
  };
}

function createIdGenerator() {
  let tick = 0;
  return (prefix) => {
    tick += 1;
    return `${prefix}-${tick}`;
  };
}

test("run-live-governance CLI: demo runs locally, exits 0, and emits JSON", () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "meridian-a2-cli-"));
  const stdout = createWriter();
  const stderr = createWriter();

  try {
    const exitCode = run(["--demo"], {
      cwd: tempRoot,
      stdout,
      stderr,
      now: () => "2026-04-24T10:00:00.000Z",
      idGenerator: createIdGenerator(),
    });
    const parsed = JSON.parse(stdout.read());

    assert.equal(exitCode, EXIT_CODES.SUCCESS);
    assert.equal(stderr.read(), "");
    assert.equal(parsed.ok, true, parsed.issues.join("\n"));
    assert.equal(parsed.governance_evaluation.governance_result.decision, "ALLOW");
    assert.equal(
      existsSync(path.join(tempRoot, ".meridian", "live-sessions")),
      true
    );
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("run-live-governance CLI: temp-file input runs locally", () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "meridian-a2-cli-"));
  const stdout = createWriter();
  const stderr = createWriter();

  try {
    const delta = createDemoDelta("file-input-session");
    const inputPath = path.join(tempRoot, "input.json");
    writeFileSync(inputPath, JSON.stringify(delta, null, 2), "utf8");

    const exitCode = run([inputPath], {
      cwd: tempRoot,
      stdout,
      stderr,
      now: () => "2026-04-24T10:00:00.000Z",
      idGenerator: createIdGenerator(),
    });
    const parsed = JSON.parse(stdout.read());

    assert.equal(exitCode, EXIT_CODES.SUCCESS);
    assert.equal(stderr.read(), "");
    assert.equal(parsed.ok, true, parsed.issues.join("\n"));
    assert.equal(parsed.governance_evaluation.session_id, "file-input-session");
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("run-live-governance CLI: malformed input exits 2 with structured HOLD/BLOCK", () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "meridian-a2-cli-"));
  const stdout = createWriter();
  const stderr = createWriter();

  try {
    const inputPath = path.join(tempRoot, "bad-input.json");
    writeFileSync(
      inputPath,
      JSON.stringify(
        {
          version: "meridian.v2.entityDelta.v1",
          session_id: "bad-input-session",
        },
        null,
        2
      ),
      "utf8"
    );

    const exitCode = run([inputPath], {
      cwd: tempRoot,
      stdout,
      stderr,
      now: () => "2026-04-24T10:00:00.000Z",
      idGenerator: createIdGenerator(),
    });
    const parsed = JSON.parse(stdout.read());

    assert.equal(exitCode, EXIT_CODES.STRUCTURED_HOLD);
    assert.equal(stderr.read(), "");
    assert.equal(parsed.ok, false);
    assert.equal(parsed.decision, "BLOCK");
    assert.equal(parsed.reason, "entity_delta_invalid");
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("run-live-governance CLI: writes only under the test .meridian/live-sessions root", () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "meridian-a2-cli-"));
  const stdout = createWriter();
  const stderr = createWriter();

  try {
    const exitCode = run(["--demo"], {
      cwd: tempRoot,
      stdout,
      stderr,
      now: () => "2026-04-24T10:00:00.000Z",
      idGenerator: createIdGenerator(),
    });
    const entries = new Set(
      require("node:fs").readdirSync(tempRoot, { withFileTypes: true }).map(
        (entry) => entry.name
      )
    );

    assert.equal(exitCode, EXIT_CODES.SUCCESS);
    assert.deepEqual([...entries].sort(), [".meridian"]);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("run-live-governance CLI: source has no network or NATS behavior", () => {
  const source = readFileSync(
    path.join(__dirname, "../../scripts/run-live-governance.js"),
    "utf8"
  );

  assert.equal(/require\(["'][^"']*nats/.test(source), false);
  assert.equal(/fetch\s*\(|https?:\/\//i.test(source), false);
  assert.equal(/createServer|listen\s*\(|watch\s*\(/.test(source), false);
  assert.equal(/OpenAI|Auth0|OpenFGA|Whisper/i.test(source), false);
});
