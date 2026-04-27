import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { runTests } from "./scenarioTestUtils.ts";

type VercelRewrite = {
  destination?: unknown;
  source?: unknown;
};

type VercelConfig = {
  buildCommand?: unknown;
  installCommand?: unknown;
  outputDirectory?: unknown;
  rewrites?: unknown;
};

const vercelConfigUrl = new URL("../vercel.json", import.meta.url);
const apiFunctionUrl = new URL("../api/authority-requests.js", import.meta.url);

async function readVercelConfig(): Promise<VercelConfig> {
  const rawConfig = await readFile(vercelConfigUrl, "utf8");

  return JSON.parse(rawConfig) as VercelConfig;
}

function readRewrites(config: VercelConfig): VercelRewrite[] {
  assert.equal(Array.isArray(config.rewrites), true);

  return config.rewrites as VercelRewrite[];
}

function isApiPreservingRewrite(rewrite: VercelRewrite): boolean {
  return (
    typeof rewrite.source === "string" &&
    typeof rewrite.destination === "string" &&
    rewrite.source.startsWith("/api/") &&
    rewrite.destination.startsWith("/api/")
  );
}

function isSpaFallbackRewrite(rewrite: VercelRewrite): boolean {
  return rewrite.source === "/:path*" && rewrite.destination === "/index.html";
}

const tests = [
  {
    name: "dashboard vercel config exists and is valid JSON",
    run: async () => {
      const config = await readVercelConfig();

      assert.equal(typeof config, "object");
      assert.notEqual(config, null);
      assert.equal(config.buildCommand, undefined);
      assert.equal(config.installCommand, undefined);
      assert.equal(config.outputDirectory, undefined);
    },
  },
  {
    name: "api rewrite is preserved before SPA fallback",
    run: async () => {
      const rewrites = readRewrites(await readVercelConfig());
      const apiRewriteIndex = rewrites.findIndex(isApiPreservingRewrite);
      const spaFallbackIndex = rewrites.findIndex(isSpaFallbackRewrite);

      assert.notEqual(apiRewriteIndex, -1);
      assert.notEqual(spaFallbackIndex, -1);
      assert.equal(apiRewriteIndex < spaFallbackIndex, true);
    },
  },
  {
    name: "dashboard routes rewrite to index without changing API function path",
    run: async () => {
      const rewrites = readRewrites(await readVercelConfig());
      const spaFallback = rewrites.find(isSpaFallbackRewrite);

      assert.deepEqual(spaFallback, {
        destination: "/index.html",
        source: "/:path*",
      });
      await access(apiFunctionUrl);
    },
  },
];

await runTests(tests);
