import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import handler from "../api/authority-requests.js";
import { runTests } from "./scenarioTestUtils.ts";

const AUTHORITY_RESOLUTION_REQUEST_CONTRACT =
  "meridian.v2.authorityResolutionRequest.v1";

function createAuthorityRequest(overrides = {}) {
  return {
    binding_context: {
      entity_refs: ["entity-auth2"],
      source_refs: ["authority_context.required_approvals"],
    },
    contract: AUTHORITY_RESOLUTION_REQUEST_CONTRACT,
    expiry: "2026-04-27T18:00:00.000Z",
    forensic_receipt_id: null,
    request_id: "ARR-AUTH2-1",
    required_authority_department: "public_works",
    required_authority_role: "public_works_director",
    resolution_type: "approval",
    source_absence_id: "absence-auth2",
    source_governance_evaluation: "governance-auth2",
    status: "pending",
    ...overrides,
  };
}

function createResponse() {
  const headers = {};

  return {
    body: null,
    ended: false,
    headers,
    statusCode: 200,
    end(payload) {
      this.body = payload ? JSON.parse(payload) : null;
      this.ended = true;
      return this;
    },
    json(payload) {
      this.body = payload;
      this.ended = true;
      return this;
    },
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
  };
}

async function invoke(method, body, includeBody = true) {
  const req = includeBody ? { body, method } : { method };
  const res = createResponse();

  await handler(req, res);

  return res;
}

async function resetStore() {
  return invoke("POST", { action: "reset" });
}

async function createStoredRequest(request = createAuthorityRequest()) {
  return invoke("POST", {
    action: "create",
    request,
  });
}

const tests = [
  {
    name: "OPTIONS returns CORS preflight headers",
    run: async () => {
      const response = await invoke("OPTIONS", undefined, false);

      assert.equal(response.statusCode, 200);
      assert.equal(response.headers["access-control-allow-origin"], "*");
      assert.equal(
        response.headers["access-control-allow-methods"],
        "GET, POST, OPTIONS"
      );
      assert.equal(response.body.ok, true);
    },
  },
  {
    name: "GET returns empty list after reset",
    run: async () => {
      await resetStore();

      const response = await invoke("GET", undefined, false);

      assert.equal(response.statusCode, 200);
      assert.deepEqual(response.body.requests, []);
      assert.equal(response.body.store.persistence, "module_memory_only");
    },
  },
  {
    name: "POST create stores a request",
    run: async () => {
      await resetStore();

      const response = await createStoredRequest();

      assert.equal(response.statusCode, 201);
      assert.equal(response.body.request.request_id, "ARR-AUTH2-1");
      assert.equal(response.body.request.contract, AUTHORITY_RESOLUTION_REQUEST_CONTRACT);
    },
  },
  {
    name: "GET lists created requests in deterministic order",
    run: async () => {
      await resetStore();
      await createStoredRequest(
        createAuthorityRequest({
          request_id: "ARR-AUTH2-1",
          source_absence_id: "absence-auth2-1",
        })
      );
      await createStoredRequest(
        createAuthorityRequest({
          request_id: "ARR-AUTH2-2",
          source_absence_id: "absence-auth2-2",
        })
      );

      const response = await invoke("GET", undefined, false);

      assert.deepEqual(
        response.body.requests.map((request) => request.request_id),
        ["ARR-AUTH2-1", "ARR-AUTH2-2"]
      );
    },
  },
  {
    name: "POST resolve approves a request",
    run: async () => {
      await resetStore();
      await createStoredRequest();

      const response = await invoke("POST", {
        action: "resolve",
        reason: "Demo authority approved.",
        request_id: "ARR-AUTH2-1",
        resolution: "approved",
        resolved_by: "public_works_director",
      });

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.request.status, "approved");
      assert.equal(response.body.event.type, "AUTHORITY_APPROVED");
      assert.equal(response.body.resolution.resolved_by, "public_works_director");
    },
  },
  {
    name: "POST resolve denies a request",
    run: async () => {
      await resetStore();
      await createStoredRequest(
        createAuthorityRequest({
          request_id: "ARR-AUTH2-DENY",
          source_absence_id: "absence-auth2-deny",
        })
      );

      const response = await invoke("POST", {
        action: "resolve",
        reason: "Demo authority denied.",
        request_id: "ARR-AUTH2-DENY",
        resolution: "denied",
        resolved_by: "public_works_director",
      });

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.request.status, "denied");
      assert.equal(response.body.event.type, "AUTHORITY_DENIED");
    },
  },
  {
    name: "resolve missing request returns 404",
    run: async () => {
      await resetStore();

      const response = await invoke("POST", {
        action: "resolve",
        request_id: "ARR-MISSING",
        resolution: "approved",
      });

      assert.equal(response.statusCode, 404);
      assert.equal(response.body.error, "request_not_found");
    },
  },
  {
    name: "invalid action returns 400",
    run: async () => {
      const response = await invoke("POST", {
        action: "notify",
      });

      assert.equal(response.statusCode, 400);
      assert.equal(response.body.error, "invalid_action");
    },
  },
  {
    name: "invalid resolution returns 400",
    run: async () => {
      await resetStore();
      await createStoredRequest();

      const response = await invoke("POST", {
        action: "resolve",
        request_id: "ARR-AUTH2-1",
        resolution: "maybe",
      });

      assert.equal(response.statusCode, 400);
      assert.equal(response.body.error, "invalid_resolution");
    },
  },
  {
    name: "malformed and missing body return 400",
    run: async () => {
      const malformed = await invoke("POST", "{not-json");
      const missing = await invoke("POST", undefined, false);

      assert.equal(malformed.statusCode, 400);
      assert.equal(malformed.body.error, "malformed_or_missing_body");
      assert.equal(missing.statusCode, 400);
      assert.equal(missing.body.error, "malformed_or_missing_body");
    },
  },
  {
    name: "reset clears store",
    run: async () => {
      await resetStore();
      await createStoredRequest();

      const reset = await resetStore();
      const listed = await invoke("GET", undefined, false);

      assert.equal(reset.body.reset, true);
      assert.equal(reset.body.cleared_count, 1);
      assert.deepEqual(listed.body.requests, []);
    },
  },
  {
    name: "create and resolve return event-compatible payloads",
    run: async () => {
      await resetStore();

      const created = await createStoredRequest();
      const resolved = await invoke("POST", {
        action: "resolve",
        request_id: "ARR-AUTH2-1",
        resolution: "approved",
      });

      assert.equal(created.body.event.type, "AUTHORITY_RESOLUTION_REQUESTED");
      assert.equal(created.body.event.event_payload_only, true);
      assert.equal(resolved.body.event.type, "AUTHORITY_APPROVED");
      assert.equal(resolved.body.event.request_id, "ARR-AUTH2-1");
    },
  },
  {
    name: "no delivery persistence websocket or forensic side effect is claimed",
    run: async () => {
      await resetStore();

      const created = await createStoredRequest();
      const source = await readFile(
        new URL("../api/authority-requests.js", import.meta.url),
        "utf8"
      );

      assert.equal(created.body.event.side_effects.notification_delivery, false);
      assert.equal(created.body.event.side_effects.forensic_chain_write, false);
      assert.equal(created.body.event.side_effects.openfga, false);
      assert.equal(created.body.event.side_effects.ciba, false);
      assert.equal(/fetch\s*\(|WebSocket|localStorage|indexedDB/i.test(source), false);
      assert.equal(/sendgrid|smtp|serviceworker|appendRecord/i.test(source), false);
      assert.equal(/Auth0|OpenFGA|CIBA|ForensicChain/.test(source), false);
    },
  },
  {
    name: "unsupported method returns 405",
    run: async () => {
      const response = await invoke("PUT", undefined, false);

      assert.equal(response.statusCode, 405);
      assert.equal(response.headers.allow, "GET, POST, OPTIONS");
      assert.equal(response.body.error, "method_not_allowed");
    },
  },
];

await runTests(tests);
