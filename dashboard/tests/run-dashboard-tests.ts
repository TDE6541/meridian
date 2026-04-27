import { readdirSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const testsDir = dirname(fileURLToPath(import.meta.url));
const dashboardRoot = dirname(testsDir);
const testFilePattern = /\.test\.(js|ts|tsx)$/;

const testFiles = readdirSync(testsDir)
  .filter((fileName) => testFilePattern.test(fileName))
  .sort((left, right) => left.localeCompare(right));

if (testFiles.length === 0) {
  console.error("FAIL no dashboard test files discovered");
  process.exit(1);
}

for (const testFile of testFiles) {
  const testPath = join(testsDir, testFile);
  const displayPath = relative(dashboardRoot, testPath).replace(/\\/g, "/");
  const result = spawnSync(
    process.execPath,
    ["--import", "tsx", displayPath],
    {
      cwd: dashboardRoot,
      env: process.env,
      stdio: "inherit",
    },
  );

  if (result.error) {
    console.error(`FAIL ${basename(testFile)} could not run: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
