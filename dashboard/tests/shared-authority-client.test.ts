import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  AUTHORITY_RESOLUTION_REQUEST_CONTRACT,
  SHARED_AUTHORITY_REQUESTS_ENDPOINT,
  createSharedAuthorityClient,
  type SharedAuthorityRequest,
} from "../src/authority/sharedAuthorityClient.ts";
import { runTests } from "./scenarioTestUtils.ts";

function createAuthorityRequest(
  overrides: Partial<SharedAuthorityRequest> = {}
): SharedAuthorityRequest {
  return {
    binding_context: {
      source_refs: ["dashboard.authority.shared_endpoint"],
    },
    contract: AUTHORITY_RESOLUTION_REQUEST_CONTRACT,
    request_id: "ARR-SHARED-1",
    required_authority_department: "public_works",
    required_authority_role: "public_works_director",
    resolution_type: "approval",
    source_absence_id: "absence-shared-1",
    source_governance_evaluation: "governance-shared-1",
    status: "pending",
    ...overrides,
  };
}

function createEvent(
  type: "AUTHORITY_RESOLUTION_REQUESTED" | "AUTHORITY_APPROVED" | "AUTHORITY_DENIED",
  request: SharedAuthorityRequest
) {
  return {
    event_payload_only: true,
    request,
    request_id: request.request_id,
    side_effects: {
      ciba: false,
      forensic_chain_write: false,
      notification_delivery: false,
      openfga: false,
    },
    type,
  };
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    headers: {
      "content-type": "application/json",
    },
    status,
    statusText: status >= 200 && status < 300 ? "OK" : "Rejected",
  });
}

function createMockFetcher(
  handler: (input: RequestInfo | URL, init?: RequestInit) => Response | Promise<Response>
) {
  const calls: { init?: RequestInit; input: string }[] = [];
  const fetcher = (async (input, init) => {
    calls.push({
      init,
      input: String(input),
    });

    return handler(input, init);
  }) as typeof fetch;

  return { calls, fetcher };
}

const tests = [
  {
    name: "shared authority client lists requests",
    run: async () => {
      const request = createAuthorityRequest();
      const mock = createMockFetcher(() =>
        jsonResponse({
          count: 1,
          ok: true,
          requests: [request],
          store: {
            persistence: "module_memory_only",
          },
        })
      );
      const client = createSharedAuthorityClient({ fetcher: mock.fetcher });
      const result = await client.listRequests();

      assert.equal(result.ok, true);
      assert.equal(result.data?.requests[0]?.request_id, "ARR-SHARED-1");
      assert.equal(mock.calls[0]?.input, SHARED_AUTHORITY_REQUESTS_ENDPOINT);
      assert.equal(mock.calls[0]?.init?.method, "GET");
    },
  },
  {
    name: "shared authority client creates request",
    run: async () => {
      const request = createAuthorityRequest();
      const mock = createMockFetcher((_, init) => {
        assert.equal(init?.method, "POST");
        const body = JSON.parse(String(init?.body));

        assert.equal(body.action, "create");
        assert.equal(body.request.request_id, "ARR-SHARED-1");
        assert.equal(JSON.stringify(body).includes("access_token"), false);

        return jsonResponse(
          {
            event: createEvent("AUTHORITY_RESOLUTION_REQUESTED", request),
            ok: true,
            request,
          },
          201
        );
      });
      const client = createSharedAuthorityClient({ fetcher: mock.fetcher });
      const result = await client.createRequest(request);

      assert.equal(result.ok, true);
      assert.equal(result.data?.event.type, "AUTHORITY_RESOLUTION_REQUESTED");
      assert.equal(result.data?.request.status, "pending");
    },
  },
  {
    name: "shared authority client resolves approved request",
    run: async () => {
      const request = createAuthorityRequest({ status: "approved" });
      const mock = createMockFetcher((_, init) => {
        const body = JSON.parse(String(init?.body));

        assert.equal(body.action, "resolve");
        assert.equal(body.resolution, "approved");

        return jsonResponse({
          event: createEvent("AUTHORITY_APPROVED", request),
          ok: true,
          request,
          resolution: {
            reason: "Approved for demo.",
            resolution: "approved",
            resolved_by: "public_works_director",
          },
        });
      });
      const client = createSharedAuthorityClient({ fetcher: mock.fetcher });
      const result = await client.resolveRequest({
        reason: "Approved for demo.",
        request_id: "ARR-SHARED-1",
        resolution: "approved",
        resolved_by: "public_works_director",
      });

      assert.equal(result.ok, true);
      assert.equal(result.data?.event.type, "AUTHORITY_APPROVED");
      assert.equal(result.data?.request.status, "approved");
    },
  },
  {
    name: "shared authority client resolves denied request",
    run: async () => {
      const request = createAuthorityRequest({ status: "denied" });
      const mock = createMockFetcher(() =>
        jsonResponse({
          event: createEvent("AUTHORITY_DENIED", request),
          ok: true,
          request,
          resolution: {
            reason: "Denied for demo.",
            resolution: "denied",
            resolved_by: "public_works_director",
          },
        })
      );
      const client = createSharedAuthorityClient({ fetcher: mock.fetcher });
      const result = await client.resolveRequest({
        reason: "Denied for demo.",
        request_id: "ARR-SHARED-1",
        resolution: "denied",
        resolved_by: "public_works_director",
      });

      assert.equal(result.ok, true);
      assert.equal(result.data?.event.type, "AUTHORITY_DENIED");
      assert.equal(result.data?.request.status, "denied");
    },
  },
  {
    name: "shared authority client reset helper is structured",
    run: async () => {
      const mock = createMockFetcher((_, init) => {
        const body = JSON.parse(String(init?.body));

        assert.equal(body.action, "reset");

        return jsonResponse({
          cleared_count: 2,
          ok: true,
          requests: [],
          reset: true,
          store: {
            persistence: "module_memory_only",
          },
        });
      });
      const client = createSharedAuthorityClient({ fetcher: mock.fetcher });
      const result = await client.resetRequests();

      assert.equal(result.ok, true);
      assert.equal(result.data?.cleared_count, 2);
      assert.deepEqual(result.data?.requests, []);
    },
  },
  {
    name: "shared authority client network failure returns HOLD-style result",
    run: async () => {
      const client = createSharedAuthorityClient({
        fetcher: (async () => {
          throw new Error("network closed");
        }) as typeof fetch,
      });
      const result = await client.listRequests();

      assert.equal(result.ok, false);
      assert.equal(result.endpointStatus, "unavailable");
      assert.equal(result.hold?.severity, "HOLD");
      assert.equal(result.hold?.message.includes("failed closed"), true);
    },
  },
  {
    name: "shared authority client endpoint rejection returns HOLD-style result",
    run: async () => {
      const client = createSharedAuthorityClient({
        fetcher: (async () =>
          jsonResponse(
            {
              error: "request_not_found",
              issue: "request_id not found",
              ok: false,
            },
            404
          )) as typeof fetch,
      });
      const result = await client.resolveRequest({
        request_id: "ARR-MISSING",
        resolution: "approved",
      });

      assert.equal(result.ok, false);
      assert.equal(result.endpointStatus, "holding");
      assert.equal(result.httpStatus, 404);
      assert.equal(result.hold?.message.includes("request_id not found"), true);
    },
  },
  {
    name: "shared authority client rejects malformed endpoint payloads",
    run: async () => {
      const client = createSharedAuthorityClient({
        fetcher: (async () =>
          jsonResponse({
            ok: true,
            requests: [
              {
                status: "pending",
              },
            ],
          })) as typeof fetch,
      });
      const result = await client.listRequests();

      assert.equal(result.ok, false);
      assert.equal(result.endpointStatus, "holding");
      assert.equal(result.hold?.code, "shared_authority_contract_mismatch");
    },
  },
  {
    name: "shared authority client has no realtime auth or delivery integrations",
    run: async () => {
      const source = (
        await Promise.all([
          readFile("src/authority/sharedAuthorityClient.ts", "utf8"),
          readFile("src/authority/useSharedAuthorityRequests.ts", "utf8"),
          readFile("src/authority/sharedAuthorityEvents.ts", "utf8"),
        ])
      ).join("\n");
      const forbiddenRuntime = [
        "new WebSocket",
        "EventSource",
        "Notification.requestPermission",
        "navigator.serviceWorker",
        "PushManager",
        "sendgrid",
        "smtp",
        "Auth0Provider",
        "createOpenFga",
        "OpenFgaClient",
        "ForemanMount",
        "anthropic",
        "openai",
        "localStorage",
        "indexedDB",
      ];

      for (const fragment of forbiddenRuntime) {
        assert.equal(source.includes(fragment), false, fragment);
      }
    },
  },
];

await runTests(tests);
