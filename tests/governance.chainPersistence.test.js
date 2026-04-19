const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {
  ChainPersistence,
  CivicForensicChain,
  DEFAULT_CHAIN_DIRECTORY,
  DEFAULT_CHAIN_FILE_NAME,
} = require("../src/governance/forensic");

const INHERITED_BASE_ENTRY_TYPES = Object.freeze([
  "PLUGIN_BASE_ALPHA",
  "PLUGIN_BASE_BETA",
  "PLUGIN_BASE_GAMMA",
  "PLUGIN_BASE_DELTA",
  "PLUGIN_BASE_EPSILON",
]);

function createChain() {
  return new CivicForensicChain({
    baseEntryTypes: [...INHERITED_BASE_ENTRY_TYPES],
    entries: [
      {
        entry_id: "gov-persist-1",
        entry_type: "GOVERNANCE_DECISION",
        occurred_at: "2026-04-18T18:11:00.000Z",
        payload: {
          decision: "ALLOW",
        },
      },
      {
        entry_id: "authority-persist-1",
        entry_type: "AUTHORITY_EVALUATION",
        occurred_at: "2026-04-18T18:11:01.000Z",
        linked_entry_ids: ["gov-persist-1"],
        payload: {
          decision: "ALLOW",
        },
      },
    ],
  });
}

test("chain persistence: resolves default paths under .meridian/forensic-chain", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "meridian-chain-path-"));

  try {
    const persistence = new ChainPersistence({
      cwd: tempDir,
      baseEntryTypes: [...INHERITED_BASE_ENTRY_TYPES],
    });
    const expectedPath = path.resolve(
      tempDir,
      DEFAULT_CHAIN_DIRECTORY,
      DEFAULT_CHAIN_FILE_NAME
    );

    assert.equal(persistence.resolveFilePath(), expectedPath);
  } finally {
    fs.rmSync(tempDir, {
      recursive: true,
      force: true,
    });
  }
});

test("chain persistence: saves and loads a round-tripped chain", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "meridian-chain-roundtrip-"));

  try {
    const persistence = new ChainPersistence({
      cwd: tempDir,
      baseEntryTypes: [...INHERITED_BASE_ENTRY_TYPES],
    });
    const chain = createChain();

    const filePath = persistence.saveChain(chain);
    const loadedChain = persistence.loadChain();

    assert.equal(fs.existsSync(filePath), true);
    assert.deepEqual(loadedChain.baseEntryTypes, INHERITED_BASE_ENTRY_TYPES);
    assert.deepEqual(
      loadedChain.getSnapshot().entries,
      chain.getSnapshot().entries
    );
  } finally {
    fs.rmSync(tempDir, {
      recursive: true,
      force: true,
    });
  }
});

test("chain persistence: returns a new empty chain when no file exists", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "meridian-chain-empty-"));

  try {
    const persistence = new ChainPersistence({
      cwd: tempDir,
      baseEntryTypes: [...INHERITED_BASE_ENTRY_TYPES],
    });
    const chain = persistence.loadChain();

    assert.deepEqual(chain.baseEntryTypes, INHERITED_BASE_ENTRY_TYPES);
    assert.equal(chain.getEntries().length, 0);
  } finally {
    fs.rmSync(tempDir, {
      recursive: true,
      force: true,
    });
  }
});

test("chain persistence: validates unknown entry types on load", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "meridian-chain-invalid-type-"));

  try {
    const filePath = path.resolve(
      tempDir,
      DEFAULT_CHAIN_DIRECTORY,
      DEFAULT_CHAIN_FILE_NAME
    );
    fs.mkdirSync(path.dirname(filePath), {
      recursive: true,
    });
    fs.writeFileSync(
      filePath,
      JSON.stringify(
        {
          version: "wave6-packet1-civic-forensic-chain-v1",
          base_entry_types: [...INHERITED_BASE_ENTRY_TYPES],
          entries: [
            {
              entry_id: "bad-entry-1",
              entry_type: "UNKNOWN_TYPE",
              occurred_at: "2026-04-18T18:12:00.000Z",
              payload: {},
            },
          ],
        },
        null,
        2
      ),
      "utf8"
    );

    const persistence = new ChainPersistence({
      cwd: tempDir,
      baseEntryTypes: [...INHERITED_BASE_ENTRY_TYPES],
    });

    assert.throws(() => persistence.loadChain(), /unknown_forensic_chain_entry_type:UNKNOWN_TYPE/);
  } finally {
    fs.rmSync(tempDir, {
      recursive: true,
      force: true,
    });
  }
});

test("chain persistence: validates dangling link refs on load", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "meridian-chain-dangling-"));

  try {
    const filePath = path.resolve(
      tempDir,
      DEFAULT_CHAIN_DIRECTORY,
      DEFAULT_CHAIN_FILE_NAME
    );
    fs.mkdirSync(path.dirname(filePath), {
      recursive: true,
    });
    fs.writeFileSync(
      filePath,
      JSON.stringify(
        {
          version: "wave6-packet1-civic-forensic-chain-v1",
          base_entry_types: [...INHERITED_BASE_ENTRY_TYPES],
          entries: [
            {
              entry_id: "authority-bad-link-1",
              entry_type: "AUTHORITY_EVALUATION",
              occurred_at: "2026-04-18T18:13:00.000Z",
              linked_entry_ids: ["missing-governance-entry"],
              payload: {},
            },
          ],
        },
        null,
        2
      ),
      "utf8"
    );

    const persistence = new ChainPersistence({
      cwd: tempDir,
      baseEntryTypes: [...INHERITED_BASE_ENTRY_TYPES],
    });

    assert.throws(
      () => persistence.loadChain(),
      /forensic_chain_dangling_link:missing-governance-entry/
    );
  } finally {
    fs.rmSync(tempDir, {
      recursive: true,
      force: true,
    });
  }
});

test("chain persistence: creates the target directory recursively when saving", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "meridian-chain-mkdir-"));

  try {
    const persistence = new ChainPersistence({
      cwd: tempDir,
      chainDirectory: ".meridian/forensic-chain/nested/demo",
      baseEntryTypes: [...INHERITED_BASE_ENTRY_TYPES],
    });

    const filePath = persistence.saveChain(createChain());
    assert.equal(fs.existsSync(filePath), true);
  } finally {
    fs.rmSync(tempDir, {
      recursive: true,
      force: true,
    });
  }
});

test("chain persistence: writes versioned pretty JSON snapshots", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "meridian-chain-json-"));

  try {
    const persistence = new ChainPersistence({
      cwd: tempDir,
      baseEntryTypes: [...INHERITED_BASE_ENTRY_TYPES],
    });
    const filePath = persistence.saveChain(createChain());
    const contents = fs.readFileSync(filePath, "utf8");

    assert.match(contents, /"version": "wave6-packet1-civic-forensic-chain-v1"/);
    assert.match(contents, /"base_entry_types": \[/);
    assert.match(contents, /\n  "entries": \[/);
  } finally {
    fs.rmSync(tempDir, {
      recursive: true,
      force: true,
    });
  }
});
