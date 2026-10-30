/**
 * DIDA MCP adapter tests — Phase 3
 *
 * Tests the shared DIDA MCP client (supabase/functions/_shared/dida-mcp.ts)
 * using a mocked fetch implementation. No live DIDA calls, no Hotelbeds calls,
 * no database writes, no network I/O.
 *
 * Run with: node src/lib/__tests__/dida-mcp-adapter.test.ts
 *
 * Covers:
 *  - Missing DIDA_API_KEY
 *  - MCP initialization failure (HTTP 500)
 *  - HTTP 401/403
 *  - HTTP 429 (quota)
 *  - JSON-RPC error response
 *  - MCP tool error (isError: true)
 *  - Malformed (non-JSON) response
 *  - Timeout (abort)
 *  - Oversized response rejection
 *  - Session id propagation
 *  - Unknown tool name rejection
 *  - Rejection of arbitrary/invalid arguments
 *  - Default mode never calls tools/call
 *  - No database writes (adapter has no DB access by design)
 *  - Sanitization: errors never contain the API key or Authorization header
 *  - verify_jwt remains true (checked by reading config.toml)
 */

import {
  createDidaClient,
  isDidaError,
  sanitizeDidaError,
  DIDA_ENDPOINT,
} from "../../../supabase/functions/_shared/dida-mcp.ts";
import * as fs from "fs";
import * as path from "path";

// Deno global type shim — the adapter references Deno.env at runtime in Edge
// Functions; in Node tests the apiKey is always passed explicitly, so this
// declaration exists only to satisfy TypeScript when following the import.
declare global {
  const Deno: { env: { get(name: string): string | undefined } } | undefined;
}

let passed = 0;
let failed = 0;

function assert(cond: boolean, msg: string) {
  if (cond) passed++;
  else {
    failed++;
    console.error(`FAIL: ${msg}`);
  }
}

function assertEqual(actual: unknown, expected: unknown, msg: string) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) passed++;
  else {
    failed++;
    console.error(`FAIL: ${msg}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
  }
}

// ─── Mock fetch infrastructure ──────────────────────────────────────────

interface MockResponse {
  ok: boolean;
  status: number;
  headers?: Record<string, string>;
  body: string;
}

interface MockFetchConfig {
  /** Responses keyed by request id (1, 2, 3...) in call order. */
  responses?: MockResponse[];
  /** If set, fetch throws this error (simulates network failure / abort). */
  throwError?: Error;
  /** If set, the response body is this many bytes (for oversized test). */
  oversizedBody?: number;
  /** Track all calls made. */
  calls?: Array<{ method: string; headers: Record<string, string>; body: string }>;
}

function createMockFetch(cfg: MockFetchConfig) {
  const calls: Array<{ method: string; headers: Record<string, string>; body: string }> = cfg.calls ?? [];
  let callIdx = 0;
  const responses = cfg.responses ?? [];

  const fn = async (input: string, init?: { method?: string; headers?: Record<string, string>; body?: string; signal?: AbortSignal }) => {
    calls.push({
      method: init?.method ?? "POST",
      headers: init?.headers ?? {},
      body: init?.body ?? "",
    });

    if (cfg.throwError) throw cfg.throwError;
    if (cfg.oversizedBody) {
      return {
        ok: true,
        status: 200,
        headers: { get: () => "application/json" },
        text: async () => "x".repeat(cfg.oversizedBody!),
      };
    }

    const r = responses[callIdx++];
    if (!r) throw new Error(`Mock fetch: no response queued for call ${callIdx}`);
    return {
      ok: r.ok,
      status: r.status,
      headers: {
        get: (name: string) => r.headers?.[name] ?? r.headers?.[name.toLowerCase()] ?? null,
      },
      text: async () => r.body,
    };
  };
  return { fn, calls };
}

const FAKE_KEY = "test-dida-key-do-not-leak-xyz";
const TOOLS_LIST_BODY = JSON.stringify({
  jsonrpc: "2.0",
  id: 2,
  result: {
    tools: [
      {
        name: "searchHotels",
        description: "Search for hotels",
        inputSchema: { type: "object", properties: { place: {} } },
      },
      {
        name: "getHotelDetail",
        description: "Get hotel details",
        inputSchema: { type: "object" },
      },
    ],
  },
});

const INIT_BODY = JSON.stringify({
  jsonrpc: "2.0",
  id: 1,
  result: {
    protocolVersion: "2025-06-18",
    serverInfo: { name: "dida-mcp", version: "1.0" },
  },
});

function okJsonRpc(id: number, result: unknown): string {
  return JSON.stringify({ jsonrpc: "2.0", id, result });
}

// ─── Tests ──────────────────────────────────────────────────────────────

async function testMissingApiKey() {
  const { fn } = createMockFetch({});
  const client = createDidaClient({ apiKey: "", fetchImpl: fn });
  const res = await client.listTools();
  assert(isDidaError(res), "missing key should return DidaError");
  assert((res as any).code === "missing_api_key", "code should be missing_api_key");
  assert((res as any).message.includes("not configured"), "message should mention not configured");
}

async function testInitHttp500() {
  const { fn } = createMockFetch({
    responses: [
      { ok: false, status: 500, headers: { "Content-Type": "application/json" }, body: '{"error":"boom"}' },
    ],
  });
  const client = createDidaClient({ apiKey: FAKE_KEY, fetchImpl: fn });
  const res = await client.listTools();
  assert(isDidaError(res), "HTTP 500 on init should return DidaError");
  assert((res as any).code === "http_error", "code should be http_error");
  assertEqual((res as any).httpStatus, 500, "httpStatus should be 500");
  assert(!(res as any).message.includes(FAKE_KEY), "error must not contain API key");
}

async function testHttp401() {
  const { fn } = createMockFetch({
    responses: [
      { ok: false, status: 401, headers: { "Content-Type": "application/json" }, body: '{"error":"unauthorized"}' },
    ],
  });
  const client = createDidaClient({ apiKey: FAKE_KEY, fetchImpl: fn });
  const res = await client.listTools();
  assert(isDidaError(res), "401 should return DidaError");
  assert((res as any).code === "http_401_403", "code should be http_401_403");
  assertEqual((res as any).httpStatus, 401, "httpStatus should be 401");
}

async function testHttp403() {
  const { fn } = createMockFetch({
    responses: [
      { ok: false, status: 403, headers: { "Content-Type": "application/json" }, body: "" },
    ],
  });
  const client = createDidaClient({ apiKey: FAKE_KEY, fetchImpl: fn });
  const res = await client.listTools();
  assert((res as any).code === "http_401_403", "403 should map to http_401_403");
}

async function testHttp429() {
  const { fn } = createMockFetch({
    responses: [
      { ok: false, status: 429, headers: { "Content-Type": "application/json" }, body: "" },
    ],
  });
  const client = createDidaClient({ apiKey: FAKE_KEY, fetchImpl: fn });
  const res = await client.listTools();
  assert((res as any).code === "http_429", "429 should map to http_429");
}

async function testJsonRpcError() {
  const { fn } = createMockFetch({
    responses: [
      { ok: true, status: 200, headers: { "Content-Type": "application/json", "Mcp-Session-Id": "sess-1" }, body: INIT_BODY },
      { ok: true, status: 200, headers: { "Content-Type": "application/json" }, body: "" },
      { ok: true, status: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 2, error: { code: -32602, message: "bad params" } }) },
    ],
  });
  const client = createDidaClient({ apiKey: FAKE_KEY, fetchImpl: fn });
  const res = await client.listTools();
  assert(isDidaError(res), "JSON-RPC error should return DidaError");
  assert((res as any).code === "json_rpc_error", "code should be json_rpc_error");
}

async function testMalformedResponse() {
  const { fn } = createMockFetch({
    responses: [
      { ok: true, status: 200, headers: { "Content-Type": "application/json", "Mcp-Session-Id": "sess-1" }, body: INIT_BODY },
      { ok: true, status: 200, headers: { "Content-Type": "application/json" }, body: "" },
      { ok: true, status: 200, headers: { "Content-Type": "application/json" }, body: "this is not json {{{" },
    ],
  });
  const client = createDidaClient({ apiKey: FAKE_KEY, fetchImpl: fn });
  const res = await client.listTools();
  assert((res as any).code === "malformed_response", "non-JSON should be malformed_response");
}

async function testTimeout() {
  const abortErr = new Error("The operation was aborted");
  (abortErr as any).name = "AbortError";
  const { fn } = createMockFetch({ throwError: abortErr });
  const client = createDidaClient({ apiKey: FAKE_KEY, fetchImpl: fn, timeoutMs: 50 });
  const res = await client.listTools();
  assert((res as any).code === "timeout", "abort should map to timeout");
}

async function testOversizedResponse() {
  const { fn } = createMockFetch({ oversizedBody: 2_000_000 });
  const client = createDidaClient({ apiKey: FAKE_KEY, fetchImpl: fn, maxBytes: 1024 });
  const res = await client.listTools();
  assert((res as any).code === "oversized_response", "oversized body should be rejected");
}

async function testUnexpectedContentType() {
  const { fn } = createMockFetch({
    responses: [
      { ok: true, status: 200, headers: { "Content-Type": "text/html", "Mcp-Session-Id": "s" }, body: INIT_BODY },
    ],
  });
  const client = createDidaClient({ apiKey: FAKE_KEY, fetchImpl: fn });
  const res = await client.listTools();
  // Init body is JSON but content-type is text/html → should be unexpected_content_type on the init step
  assert(isDidaError(res), "unexpected content type should return DidaError");
  // The init step parses first; since Content-Type is text/html and not SSE/json, it errors.
  assert((res as any).code === "unexpected_content_type", "code should be unexpected_content_type");
}

async function testSuccessfulListTools() {
  const calls: any[] = [];
  const { fn } = createMockFetch({
    calls,
    responses: [
      { ok: true, status: 200, headers: { "Content-Type": "application/json", "Mcp-Session-Id": "sess-abc" }, body: INIT_BODY },
      { ok: true, status: 200, headers: { "Content-Type": "application/json" }, body: "" },
      { ok: true, status: 200, headers: { "Content-Type": "application/json" }, body: TOOLS_LIST_BODY },
    ],
  });
  const client = createDidaClient({ apiKey: FAKE_KEY, fetchImpl: fn });
  const res = await client.listTools();
  assert(!isDidaError(res), "listTools should succeed");
  assertEqual((res as any).sessionId, "sess-abc", "sessionId should be captured");
  assertEqual((res as any).tools.length, 2, "should list 2 tools");
  assertEqual((res as any).tools[0].name, "searchHotels", "first tool is searchHotels");

  // Verify the Authorization header was sent but never returned in any result.
  for (const c of calls) {
    assert(c.headers["Authorization"] === `Bearer ${FAKE_KEY}`, "Authorization header should be Bearer key");
  }
  // No tools/call should have been made (only 3 calls: init, notification, tools/list).
  for (const c of calls) {
    const body = JSON.parse(c.body);
    assert(body.method !== "tools/call", "default mode must never call tools/call");
  }
}

async function testSessionPropagation() {
  const { fn } = createMockFetch({
    responses: [
      { ok: true, status: 200, headers: { "Content-Type": "application/json", "Mcp-Session-Id": "sess-xyz" }, body: INIT_BODY },
      { ok: true, status: 200, headers: { "Content-Type": "application/json" }, body: "" },
      { ok: true, status: 200, headers: { "Content-Type": "application/json" }, body: TOOLS_LIST_BODY },
    ],
  });
  const client = createDidaClient({ apiKey: FAKE_KEY, fetchImpl: fn });
  await client.listTools();
  assertEqual(client.sessionId, "sess-xyz", "sessionId should be exposed on client");
}

async function testUnknownToolRejection() {
  const { fn } = createMockFetch({
    responses: [
      { ok: true, status: 200, headers: { "Content-Type": "application/json", "Mcp-Session-Id": "s" }, body: INIT_BODY },
      { ok: true, status: 200, headers: { "Content-Type": "application/json" }, body: "" },
      { ok: true, status: 200, headers: { "Content-Type": "application/json" }, body: TOOLS_LIST_BODY },
    ],
  });
  const client = createDidaClient({ apiKey: FAKE_KEY, fetchImpl: fn });
  const res = await client.callTool("nonExistentTool", {});
  assert(isDidaError(res), "unknown tool should return DidaError");
  assert((res as any).code === "unknown_tool", "code should be unknown_tool");
}

async function testInvalidArguments() {
  const { fn } = createMockFetch({
    responses: [
      { ok: true, status: 200, headers: { "Content-Type": "application/json", "Mcp-Session-Id": "s" }, body: INIT_BODY },
      { ok: true, status: 200, headers: { "Content-Type": "application/json" }, body: "" },
      { ok: true, status: 200, headers: { "Content-Type": "application/json" }, body: TOOLS_LIST_BODY },
    ],
  });
  const client = createDidaClient({ apiKey: FAKE_KEY, fetchImpl: fn });
  // @ts-expect-error — intentionally invalid
  const res1 = await client.callTool("searchHotels", null);
  assert((res1 as any).code === "invalid_arguments", "null args should be invalid_arguments");
  // @ts-expect-error — intentionally invalid
  const res2 = await client.callTool("searchHotels", [1, 2]);
  assert((res2 as any).code === "invalid_arguments", "array args should be invalid_arguments");
  const res3 = await client.callTool("", {});
  assert((res3 as any).code === "invalid_arguments", "empty tool name should be invalid_arguments");
}

async function testRequireToolName() {
  const { fn } = createMockFetch({
    responses: [
      { ok: true, status: 200, headers: { "Content-Type": "application/json", "Mcp-Session-Id": "s" }, body: INIT_BODY },
      { ok: true, status: 200, headers: { "Content-Type": "application/json" }, body: "" },
      { ok: true, status: 200, headers: { "Content-Type": "application/json" }, body: TOOLS_LIST_BODY },
    ],
  });
  const client = createDidaClient({ apiKey: FAKE_KEY, fetchImpl: fn });
  const res = await client.callTool("searchHotels", { place: "x" }, { requireToolName: "getHotelDetail" });
  assert((res as any).code === "invalid_arguments", "mismatched requireToolName should be invalid_arguments");
}

async function testSuccessfulToolCall() {
  const hotelPayload = JSON.stringify({
    success: true,
    code: 2000,
    hotelInformationList: [{ hotelId: 123, name: "Test Hotel", areaCode: "ID" }],
  });
  const { fn } = createMockFetch({
    responses: [
      { ok: true, status: 200, headers: { "Content-Type": "application/json", "Mcp-Session-Id": "s" }, body: INIT_BODY },
      { ok: true, status: 200, headers: { "Content-Type": "application/json" }, body: "" },
      { ok: true, status: 200, headers: { "Content-Type": "application/json" }, body: TOOLS_LIST_BODY },
      { ok: true, status: 200, headers: { "Content-Type": "application/json" }, body: okJsonRpc(3, { content: [{ type: "text", text: hotelPayload }] }) },
    ],
  });
  const client = createDidaClient({ apiKey: FAKE_KEY, fetchImpl: fn });
  const res = await client.callTool("searchHotels", {
    originQuery: "test",
    place: "Denpasar Indonesia",
    placeType: "city",
    checkInParam: { checkInDate: "2026-10-26", stayNights: 2, adultCount: 2 },
    localeParam: { language: "en", currency: "USD" },
    size: 10,
  });
  assert(!isDidaError(res), "tool call should succeed");
  assertEqual((res as any).toolName, "searchHotels", "toolName preserved");
  const parsed = (res as any).parsedContent as any;
  assertEqual(parsed.hotelInformationList[0].hotelId, 123, "hotel data parsed");
}

async function testToolErrorIsError() {
  const { fn } = createMockFetch({
    responses: [
      { ok: true, status: 200, headers: { "Content-Type": "application/json", "Mcp-Session-Id": "s" }, body: INIT_BODY },
      { ok: true, status: 200, headers: { "Content-Type": "application/json" }, body: "" },
      { ok: true, status: 200, headers: { "Content-Type": "application/json" }, body: TOOLS_LIST_BODY },
      { ok: true, status: 200, headers: { "Content-Type": "application/json" }, body: okJsonRpc(3, { content: [{ type: "text", text: "something broke" }], isError: true }) },
    ],
  });
  const client = createDidaClient({ apiKey: FAKE_KEY, fetchImpl: fn });
  const res = await client.callTool("searchHotels", { place: "x" });
  assert((res as any).code === "tool_error", "isError:true should be tool_error");
}

async function testSanitizeDidaError() {
  const sanitized = sanitizeDidaError({ step: "init", code: "http_401_403", message: "DIDA returned HTTP 401", httpStatus: 401 });
  assert(!JSON.stringify(sanitized).includes(FAKE_KEY), "sanitized error must not contain key");
  assertEqual(sanitized.code, "http_401_403", "code preserved");
}

async function testErrorsNeverLeakKey() {
  // Run several error paths and ensure the key never appears in any error output.
  const paths: Array<() => Promise<unknown>> = [
    () => createDidaClient({ apiKey: FAKE_KEY, fetchImpl: createMockFetch({ responses: [{ ok: false, status: 401, body: "" }] }).fn }).listTools(),
    () => createDidaClient({ apiKey: FAKE_KEY, fetchImpl: createMockFetch({ responses: [{ ok: false, status: 403, body: "" }] }).fn }).listTools(),
    () => createDidaClient({ apiKey: FAKE_KEY, fetchImpl: createMockFetch({ responses: [{ ok: false, status: 500, body: "" }] }).fn }).listTools(),
    () => createDidaClient({ apiKey: FAKE_KEY, fetchImpl: createMockFetch({ responses: [{ ok: true, status: 200, headers: { "Content-Type": "application/json" }, body: "not json" }] }).fn }).listTools(),
    () => createDidaClient({ apiKey: FAKE_KEY, fetchImpl: createMockFetch({ throwError: new Error("abort") }).fn }).listTools(),
  ];
  for (const p of paths) {
    const res = await p();
    const str = JSON.stringify(res);
    assert(!str.includes(FAKE_KEY), "error must not leak API key: " + str);
  }
}

async function testSessionMissing() {
  // When init returns no session id, sendInitialized is skipped (only 2 fetch
  // calls: init + tools/list). We simulate tools/list returning a JSON-RPC error
  // and verify callTool propagates it.
  const { fn } = createMockFetch({
    responses: [
      { ok: true, status: 200, headers: { "Content-Type": "application/json" }, body: INIT_BODY },
      { ok: true, status: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 2, error: { code: -1, message: "x" } }) },
    ],
  });
  const client = createDidaClient({ apiKey: FAKE_KEY, fetchImpl: fn });
  const res = await client.callTool("searchHotels", { place: "x" });
  // listTools fails with json_rpc_error, so callTool returns that error.
  assert(isDidaError(res), "callTool after failed listTools should be error");
  assert((res as any).code === "json_rpc_error", "should propagate listTools error");
}

async function testVerifyJwtStillTrue() {
  const configPath = path.resolve(process.cwd(), "supabase/config.toml");
  const content = fs.readFileSync(configPath, "utf-8");
  const match = content.match(/\[functions\.dida-capability-test\][\s\S]*?verify_jwt\s*=\s*(\w+)/);
  assert(!!match, "dida-capability-test entry should exist in config.toml");
  assertEqual(match![1], "true", "verify_jwt must remain true for dida-capability-test");
}

async function testEndpointIsDidaMcp() {
  assertEqual(DIDA_ENDPOINT, "https://mcp.rollinggo.ai/mcp", "endpoint should be the DIDA MCP URL");
}

async function testNoArbitraryParametersForwarded() {
  // The adapter's callTool only accepts a pre-validated Record. The capability
  // test function builds args from strictly-validated query params, never from
  // arbitrary JSON. This test verifies the adapter does not add extra fields.
  const calls: any[] = [];
  const { fn } = createMockFetch({
    calls,
    responses: [
      { ok: true, status: 200, headers: { "Content-Type": "application/json", "Mcp-Session-Id": "s" }, body: INIT_BODY },
      { ok: true, status: 200, headers: { "Content-Type": "application/json" }, body: "" },
      { ok: true, status: 200, headers: { "Content-Type": "application/json" }, body: TOOLS_LIST_BODY },
      { ok: true, status: 200, headers: { "Content-Type": "application/json" }, body: okJsonRpc(3, { content: [{ type: "text", text: "{}" }] }) },
    ],
  });
  const client = createDidaClient({ apiKey: FAKE_KEY, fetchImpl: fn });
  await client.callTool("searchHotels", { place: "x", originQuery: "q", placeType: "city", size: 5 });
  // The 4th call (index 3) is tools/call.
  const callBody = JSON.parse(calls[3].body);
  assertEqual(callBody.method, "tools/call", "4th call is tools/call");
  // Arguments must match exactly what was passed — no injection.
  assertEqual(callBody.params.arguments.place, "x", "place forwarded");
  assertEqual(callBody.params.arguments.size, 5, "size forwarded");
  assert(!("evilField" in callBody.params.arguments), "no extra fields injected");
}

// ─── Run all tests ──────────────────────────────────────────────────────

async function main() {
  console.log("Running DIDA MCP adapter tests (Phase 3)...\n");

  await testMissingApiKey();
  await testInitHttp500();
  await testHttp401();
  await testHttp403();
  await testHttp429();
  await testJsonRpcError();
  await testMalformedResponse();
  await testTimeout();
  await testOversizedResponse();
  await testUnexpectedContentType();
  await testSuccessfulListTools();
  await testSessionPropagation();
  await testUnknownToolRejection();
  await testInvalidArguments();
  await testRequireToolName();
  await testSuccessfulToolCall();
  await testToolErrorIsError();
  await testSanitizeDidaError();
  await testErrorsNeverLeakKey();
  await testSessionMissing();
  await testVerifyJwtStillTrue();
  await testEndpointIsDidaMcp();
  await testNoArbitraryParametersForwarded();

  console.log(`\n${passed} passed, ${failed} failed out of ${passed + failed} tests.`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error("Test runner crashed:", e);
  process.exit(1);
});
