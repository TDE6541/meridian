const test = require("node:test");
const assert = require("node:assert/strict");
const { readdirSync, readFileSync } = require("node:fs");
const path = require("node:path");
const refusalFixture = require("./fixtures/governance/refusal.commandRequest.json");
const { evaluateGovernanceRequest } = require("../src/governance/runtime");
const {
  buildCivicSkinInput,
  buildTruthFingerprint,
  renderDefaultSkin,
  renderSkin,
} = require("../src/skins");
const { permittingSkinDescriptor } = require("../src/skins/civic/permitting");

function clone(value) {
  return structuredClone(value);
}

function collectSkinSourceFiles(root) {
  const entries = readdirSync(root, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSkinSourceFiles(absolutePath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".js")) {
      files.push(absolutePath);
    }
  }

  return files;
}

test("civic skin framework rejects non-object input with deterministic error", () => {
  assert.throws(
    () => renderSkin(null, permittingSkinDescriptor),
    /buildCivicSkinInput source must be a plain object/
  );
});

test("civic skin framework fingerprints are deterministic for equivalent runtime input", () => {
  const evaluation = evaluateGovernanceRequest(refusalFixture);
  const input = buildCivicSkinInput(evaluation, {
    viewType: "governance-decision",
    sourceKind: "runtime-evaluation",
    sourceId: "fixture-refusal",
    metadata: {
      fixtureName: "refusal.commandRequest.json",
      generatedAt: "2026-04-20T00:00:00.000Z",
    },
  });

  const first = renderDefaultSkin(input);
  const second = renderDefaultSkin(input);

  assert.deepEqual(first.truthFingerprint, second.truthFingerprint);
});

test("civic skin framework fingerprints change when canonical decision truth changes", () => {
  const evaluation = evaluateGovernanceRequest(refusalFixture);
  const input = buildCivicSkinInput(evaluation, {
    viewType: "governance-decision",
    sourceKind: "runtime-evaluation",
    sourceId: "fixture-refusal",
  });
  const mutated = clone(input);
  mutated.civic.decision = "ALLOW";
  mutated.civic.reason = "authority_and_evidence_resolved";

  const baseFingerprint = buildTruthFingerprint(input);
  const changedFingerprint = buildTruthFingerprint(mutated);

  assert.notEqual(baseFingerprint.digest, changedFingerprint.digest);
});

test("civic skin framework does not mutate the passed evaluation object", () => {
  const evaluation = evaluateGovernanceRequest(refusalFixture);
  const before = clone(evaluation);

  renderDefaultSkin(evaluation, "civic.permitting", {
    viewType: "governance-decision",
    sourceKind: "runtime-evaluation",
    sourceId: "fixture-refusal",
  });

  assert.deepEqual(evaluation, before);
});

test("civic skin framework source stays free of scheduler, write, and publisher side channels", () => {
  const sourceRoot = path.join(__dirname, "../src/skins");
  const source = collectSkinSourceFiles(sourceRoot)
    .map((entry) => readFileSync(entry, "utf8"))
    .join("\n");

  assert.equal(source.includes("setInterval"), false);
  assert.equal(source.includes("setTimeout"), false);
  assert.equal(/cron|daemon|worker/i.test(source), false);
  assert.equal(/writeFile|appendFile|createWriteStream/.test(source), false);
  assert.equal(source.includes("governancePublisher"), false);
  assert.equal(source.includes("publishOutcome"), false);
});
