const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const CLAUDE_PATH = path.join(__dirname, "..", "CLAUDE.md");
const LOCKED_PATTERNS = [
  "Edit(/**/*authentication*.*)",
  "Edit(/**/*oauth*.*)",
  "Edit(/**/*security*.*)",
  "Edit(/**/*credential*.*)",
  "Edit(/**/*token*.*)",
  "Edit(/**/*secret*.*)",
  "Edit(/**/config.*)",
  "Edit(/**/config-*.*)",
  "Edit(/**/config_*.*)",
  "Edit(/**/*-config.*)",
  "Edit(/**/*_config.*)",
  "Edit(/**/*.config.*)",
];

function readDenyMatrixPatterns() {
  const claudeText = fs.readFileSync(CLAUDE_PATH, "utf8");
  const matrixMatch = claudeText.match(
    /## Block 0 Deny Matrix\s+```text\s+([\s\S]*?)```/
  );

  assert.ok(matrixMatch, "CLAUDE.md must contain the Block 0 deny matrix");

  return matrixMatch[1]
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function denyPatternToRegex(pattern) {
  const body = pattern.replace(/^Edit\(/, "").replace(/\)$/, "");
  const placeholder = "__MERIDIAN_GLOBSTAR_DIR__";
  const escaped = body
    .replaceAll("/**/", placeholder)
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, "[^/]*")
    .replaceAll(placeholder, "(?:.*/)?");

  return new RegExp(`^${escaped}$`);
}

function isDenied(filePath, patterns) {
  return patterns.some((pattern) => denyPatternToRegex(pattern).test(filePath));
}

test("CLAUDE.md deny matrix matches the locked Block 0 patterns", () => {
  const patterns = readDenyMatrixPatterns();

  assert.deepEqual(patterns, LOCKED_PATTERNS);
});

test("deny matrix does not match the approved non-sensitive filenames", () => {
  const patterns = readDenyMatrixPatterns();

  assert.equal(isDenied("authority_grant.js", patterns), false);
  assert.equal(isDenied("authority_chain.js", patterns), false);
  assert.equal(isDenied("obligation.js", patterns), false);
  assert.equal(isDenied("organization.js", patterns), false);
});

test("deny matrix matches the approved sensitive filename set", () => {
  const patterns = readDenyMatrixPatterns();

  assert.equal(isDenied("authentication.js", patterns), true);
  assert.equal(isDenied("security.js", patterns), true);
  assert.equal(isDenied("credentials.js", patterns), true);
  assert.equal(isDenied("token_store.js", patterns), true);
});
