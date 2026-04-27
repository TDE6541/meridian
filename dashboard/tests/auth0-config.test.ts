import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolveAuth0DashboardConfig } from "../src/auth/authConfig.ts";
import { runTests } from "./scenarioTestUtils.ts";

const authConfigUrl = new URL("../src/auth/authConfig.ts", import.meta.url);
const readmeUrl = new URL("../README.md", import.meta.url);
const vercelConfigUrl = new URL("../vercel.json", import.meta.url);

async function readDashboardDocsAndConfig(): Promise<string> {
  const [authConfig, readme, vercelConfig] = await Promise.all([
    readFile(authConfigUrl, "utf8"),
    readFile(readmeUrl, "utf8"),
    readFile(vercelConfigUrl, "utf8"),
  ]);

  return [authConfig, readme, vercelConfig].join("\n");
}

function forbiddenBrowserModelKey(): string {
  return ["VITE", "ANTHROPIC", "API", "KEY"].join("_");
}

const tests = [
  {
    name: "auth config expects required Vite Auth0 env vars",
    run: async () => {
      const source = await readFile(authConfigUrl, "utf8");

      assert.equal(source.includes("VITE_AUTH0_DOMAIN"), true);
      assert.equal(source.includes("VITE_AUTH0_CLIENT_ID"), true);
      assert.equal(source.includes("VITE_AUTH0_CALLBACK_URL"), true);
    },
  },
  {
    name: "missing Auth0 env remains safe and public-mode only",
    run: () => {
      const config = resolveAuth0DashboardConfig({});

      assert.equal(config.domain, null);
      assert.equal(config.clientId, null);
      assert.equal(config.callbackUrl, null);
      assert.equal(config.isConfigured, false);
      assert.equal(config.holds[0]?.includes("public mode active"), true);
    },
  },
  {
    name: "callback URL is configured through env",
    run: () => {
      const config = resolveAuth0DashboardConfig({
        VITE_AUTH0_CALLBACK_URL: "https://demo.example.test/callback",
        VITE_AUTH0_CLIENT_ID: "client-demo",
        VITE_AUTH0_DOMAIN: "tenant.example.auth0.com",
      });

      assert.equal(config.domain, "tenant.example.auth0.com");
      assert.equal(config.clientId, "client-demo");
      assert.equal(config.callbackUrl, "https://demo.example.test/callback");
      assert.equal(config.isConfigured, true);
    },
  },
  {
    name: "dashboard runbook documents Vercel and Auth0 manual setup",
    run: async () => {
      const readme = await readFile(readmeUrl, "utf8");

      assert.equal(readme.includes("set the project root to `dashboard`"), true);
      assert.equal(readme.includes("set the build command to `npm run build`"), true);
      assert.equal(readme.includes("set the output directory to `dist`"), true);
      assert.equal(readme.includes("VITE_AUTH0_DOMAIN"), true);
      assert.equal(readme.includes("VITE_AUTH0_CLIENT_ID"), true);
      assert.equal(readme.includes("VITE_AUTH0_CALLBACK_URL"), true);
      assert.equal(readme.includes("http://localhost:5173/callback"), true);
      assert.equal(readme.includes("https://<vercel-url>/callback"), true);
    },
  },
  {
    name: "dashboard docs and config do not approve browser model key usage",
    run: async () => {
      const content = await readDashboardDocsAndConfig();
      const lowerContent = content.toLowerCase();

      assert.equal(content.includes(forbiddenBrowserModelKey()), false);
      assert.equal(/VITE_[A-Z0-9_]*(ANTHROPIC|OPENAI)[A-Z0-9_]*KEY/i.test(content), false);
      assert.equal(lowerContent.includes("client-side model api key"), false);
      assert.equal(lowerContent.includes("browser-side model api key"), false);
    },
  },
];

await runTests(tests);
