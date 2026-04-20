const test = require("node:test");
const assert = require("node:assert/strict");
const { readdirSync, readFileSync } = require("node:fs");
const path = require("node:path");
const refusalFixture = require("./fixtures/governance/refusal.commandRequest.json");
const safePassFixture = require("./fixtures/governance/safe-pass.commandRequest.json");
const hardStopFixture = require("./fixtures/governance/hard-stop.commandRequest.json");
const { runGovernanceSweep } = require("../src/governance/runtime");
const {
  buildCivicSkinInput,
  buildTruthFingerprint,
  renderDefaultSkin,
} = require("../src/skins");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
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

test("sweep-to-skin seam renders one civic skin output per sweep scenario", () => {
  const scenarios = [
    {
      scenarioId: "governed-non-event-refusal",
      request: refusalFixture,
      expectedDecision: "HOLD",
      governedNonEventProof: true,
    },
    {
      scenarioId: "safe-pass-control",
      request: safePassFixture,
      expectedDecision: "ALLOW",
    },
    {
      scenarioId: "hard-stop-control",
      request: hardStopFixture,
      expectedDecision: "BLOCK",
    },
  ];
  const beforeRequests = clone(scenarios.map((scenario) => scenario.request));
  const sweepResult = runGovernanceSweep({
    evaluatedAt: "2026-04-20T00:00:00.000Z",
    scenarios,
  });

  const outputs = sweepResult.scenarios.map((summary, index) => {
    const civicInput = buildCivicSkinInput(
      {
        ...summary,
        request: scenarios[index].request,
      },
      {
        viewType: "sweep-result",
        sourceKind: "governance-sweep",
        sourceId: summary.scenarioId,
        metadata: {
          generatedAt: sweepResult.evaluatedAt,
          fixtureName: `${summary.scenarioId}.fixture`,
        },
      }
    );

    return {
      civicInput,
      render: renderDefaultSkin(civicInput),
    };
  });

  assert.equal(outputs.length, 3);
  assert.deepEqual(
    scenarios.map((scenario) => scenario.request),
    beforeRequests
  );

  for (const output of outputs) {
    assert.equal(output.render.skinId, "civic.permitting");
    assert.equal(output.render.viewType, "sweep-result");
    assert.deepEqual(
      output.render.truthFingerprint,
      buildTruthFingerprint(output.civicInput)
    );
  }
});

test("skin sources remain read-only with no scheduler, publish, or write side channels", () => {
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
