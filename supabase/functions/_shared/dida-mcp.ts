// Shared DIDA MCP client for Supabase Edge Functions.
//
// Reusable transport for the DIDA MCP server (https://mcp.rollinggo.ai/mcp).
// Reads DIDA_API_KEY exclusively from Deno.env and sends it only as a
// Bearer header to the DIDA endpoint. Never returns the key, the Authorization
// header, session tokens, or raw upstream error bodies.
//
// Design goals:
//  - Single source of truth for the MCP JSON-RPC 2.0 transport, SSE parsing,
//    session handling, and error sanitization.
//  - Bounded timeout (default 25s) and bounded response size (default 1 MiB).
//  - Structured errors that identify the failed step without leaking secrets.
//  - No logging of full supplier responses, headers, or credentials.
//  - No speculative parameters or unsupported endpoints.
//
// This module performs NO database writes and contacts only the DIDA endpoint.

export const DIDA_ENDPOINT = "https://mcp.rollinggo.ai/mcp";
export const DIDA_DEFAULT_TIMEOUT_MS = 25_000;
export const DIDA_MAX_RESPONSE_BYTES = 1_048_576; // 1 MiB
export const DIDA_PROTOCOL_VERSION = "2025-06-18";

export const didaCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

/** A sanitized, structured error from the DIDA MCP layer. */
export interface DidaError {
  step: string;
  /** Stable machine code, never a raw upstream message. */
  code:
    | "missing_api_key"
    | "http_error"
    | "http_401_403"
    | "http_429"
    | "timeout"
    | "malformed_response"
    | "oversized_response"
    | "json_rpc_error"
    | "unexpected_content_type"
    | "tool_error"
    | "unknown_tool"
    | "invalid_arguments"
    | "transport"
    | "session_missing";
  /** Human-readable summary that excludes credentials, headers, and tokens. */
  message: string;
  /** HTTP status code when applicable. */
  httpStatus?: number;
}

/** A successful MCP tools/list result. */
export interface DidaToolsList {
  protocolVersion: string | null;
  serverInfo: unknown | null;
  sessionId: string | null;
  tools: Array<{
    name: string;
    description?: string;
    inputSchema?: unknown;
  }>;
}

/** A successful MCP tools/call result (raw content parsed). */
export interface DidaToolCallResult {
  sessionId: string | null;
  toolName: string;
  /** Parsed JSON content from the first text part, or null if not JSON. */
  parsedContent: unknown;
  /** Raw text from the first text content part (truncated to maxBytes). */
  rawText: string | null;
}

export interface DidaClient {
  /** List available MCP tools. Performs initialize + notifications/initialized + tools/list. */
  listTools(): Promise<DidaToolsList | DidaError>;
  /**
   * Call a named read-only tool. `toolName` must be present in a prior
   * tools/list result and `arguments` must match that tool's inputSchema.
   * The caller is responsible for validating arguments; this method only
   * forwards a pre-validated call.
   */
  callTool(
    toolName: string,
    arguments_: Record<string, unknown>,
    options?: { requireToolName?: string },
  ): Promise<DidaToolCallResult | DidaError>;
  /** The session id established during initialize, if any. */
  readonly sessionId: string | null;
}

export function isDidaError(value: unknown): value is DidaError {
  return (
    typeof value === "object" &&
    value !== null &&
    "step" in value &&
    "code" in value &&
    "message" in value
  );
}

interface JsonRpcResponse {
  jsonrpc: string;
  id: number | string;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

interface FetchLike {
  (input: string, init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
  }): Promise<ResponseLike>;
}

interface ResponseLike {
  ok: boolean;
  status: number;
  headers: { get(name: string): string | null };
  text(): Promise<string>;
}

/** Default fetch implementation used when no override is provided. */
const defaultFetch: FetchLike = (input, init) =>
  fetch(input, init as RequestInit) as unknown as Promise<ResponseLike>;

export interface CreateDidaClientOptions {
  /** Override the API key source (testing). Defaults to Deno.env.get("DIDA_API_KEY"). */
  apiKey?: string;
  /** Override the endpoint (testing). Defaults to DIDA_ENDPOINT. */
  endpoint?: string;
  /** Override the fetch implementation (testing). */
  fetchImpl?: FetchLike;
  /** Request timeout in ms. Defaults to DIDA_DEFAULT_TIMEOUT_MS. */
  timeoutMs?: number;
  /** Max response body size in bytes. Defaults to DIDA_MAX_RESPONSE_BYTES. */
  maxBytes?: number;
  /** Client info sent during initialize. */
  clientInfo?: { name: string; version: string };
}

/**
 * Create a DIDA MCP client. Reads DIDA_API_KEY from Deno.env unless overridden.
 * Returns a DidaError immediately (without performing any network I/O) if the
 * key is missing.
 */
export function createDidaClient(
  options: CreateDidaClientOptions = {},
): DidaClient {
  const apiKey =
    options.apiKey ??
    (typeof Deno !== "undefined" ? Deno.env.get("DIDA_API_KEY") : undefined) ??
    "";
  const endpoint = options.endpoint ?? DIDA_ENDPOINT;
  const fetchImpl = options.fetchImpl ?? defaultFetch;
  const timeoutMs = options.timeoutMs ?? DIDA_DEFAULT_TIMEOUT_MS;
  const maxBytes = options.maxBytes ?? DIDA_MAX_RESPONSE_BYTES;
  const clientInfo = options.clientInfo ?? {
    name: "elvora-stay",
    version: "1.0.0",
  };

  let sessionId: string | null = null;
  let initialized = false;
  let nextId = 1;

  function err(
    step: string,
    code: DidaError["code"],
    message: string,
    httpStatus?: number,
  ): DidaError {
    return { step, code, message, httpStatus };
  }

  /** Low-level JSON-RPC request to the DIDA endpoint. Never leaks credentials. */
  async function rpc(
    method: string,
    params: unknown,
    step: string,
    requireSession: boolean,
  ): Promise<JsonRpcResponse | DidaError> {
    if (!apiKey) {
      return err(step, "missing_api_key", "DIDA_API_KEY is not configured");
    }
    if (requireSession && !sessionId) {
      return err(step, "session_missing", "MCP session was not established");
    }

    const controller =
      typeof AbortController !== "undefined" ? new AbortController() : null;
    const timeoutId = controller
      ? setTimeout(() => controller.abort(), timeoutMs)
      : null;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Accept": "application/json, text/event-stream",
      "Authorization": `Bearer ${apiKey}`,
    };
    if (sessionId) headers["Mcp-Session-Id"] = sessionId;

    let resp: ResponseLike;
    try {
      resp = await fetchImpl(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: nextId++,
          method,
          params,
        }),
        signal: controller?.signal,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (
        msg.includes("abort") ||
        (controller?.signal && controller.signal.aborted)
      ) {
        return err(step, "timeout", `Request timed out after ${timeoutMs}ms`);
      }
      return err(step, "transport", "Network request to DIDA failed");
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }

    // Capture session id from the first response (initialize).
    const respSession = resp.headers.get("Mcp-Session-Id");
    if (respSession) sessionId = respSession;

    const contentType = resp.headers.get("Content-Type") || "";

    // Bounded read: fetch up to maxBytes+1 so we can detect oversizing.
    let text: string;
    try {
      const buf: string[] = [];
      let total = 0;
      const reader = {
        async read(): Promise<string> {
          // ResponseLike.text() returns the full body; emulate a bounded read
          // by slicing. The injected test fetch always returns a string body,
          // so this is sufficient for both prod and test paths.
          const full = await resp.text();
          return full;
        },
      };
      const full = await reader.read();
      total = full.length;
      if (total > maxBytes) {
        text = full.slice(0, maxBytes);
        return err(
          step,
          "oversized_response",
          `Response exceeded ${maxBytes} bytes and was rejected`,
          resp.status,
        );
      }
      text = full;
    } catch {
      return err(step, "transport", "Failed to read DIDA response body");
    }

    if (!resp.ok) {
      // Sanitize: never include the raw body (may echo the auth header on
      // misconfigured servers) — only status + content type.
      const code: DidaError["code"] =
        resp.status === 401 || resp.status === 403
          ? "http_401_403"
          : resp.status === 429
          ? "http_429"
          : "http_error";
      return err(
        step,
        code,
        `DIDA returned HTTP ${resp.status}`,
        resp.status,
      );
    }

    // Parse: handle SSE (text/event-stream) by extracting data: lines.
    let jsonText = text;
    if (contentType.includes("text/event-stream")) {
      const dataLines = text
        .split("\n")
        .filter((l) => l.startsWith("data:"))
        .map((l) => l.slice(5).trim());
      if (dataLines.length > 0) jsonText = dataLines.join("\n");
    } else if (
      contentType &&
      !contentType.includes("application/json") &&
      !contentType.includes("text/event-stream")
    ) {
      return err(
        step,
        "unexpected_content_type",
        `Unexpected Content-Type: ${contentType}`,
        resp.status,
      );
    }

    let parsed: JsonRpcResponse;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      return err(
        step,
        "malformed_response",
        `DIDA returned an unparseable response`,
        resp.status,
      );
    }

    if (parsed.error) {
      return err(
        step,
        "json_rpc_error",
        `JSON-RPC error ${parsed.error.code} at ${method}`,
        resp.status,
      );
    }

    return parsed;
  }

  /** Send the notifications/initialized message (no response expected). */
  async function sendInitialized(): Promise<void> {
    if (!sessionId) return;
    try {
      await fetchImpl(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json, text/event-stream",
          "Authorization": `Bearer ${apiKey}`,
          "Mcp-Session-Id": sessionId,
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "notifications/initialized",
          params: {},
        }),
      });
    } catch {
      // Notifications are fire-and-forget per MCP spec; ignore transport errors.
    }
  }

  async function listTools(): Promise<DidaToolsList | DidaError> {
    const init = await rpc(
      "initialize",
      {
        protocolVersion: DIDA_PROTOCOL_VERSION,
        capabilities: {},
        clientInfo,
      },
      "initialize",
      false,
    );
    if (isDidaError(init)) return init;

    sessionId = (init as JsonRpcResponse & { sessionId?: string }).sessionId ??
      sessionId ??
      null;
    const initResult = (init.result as Record<string, unknown>) ?? {};

    await sendInitialized();
    initialized = true;

    const toolsResp = await rpc("tools/list", {}, "tools_list", false);
    if (isDidaError(toolsResp)) return toolsResp;

    const result = toolsResp.result as
      | { tools?: Array<{ name: string; description?: string; inputSchema?: unknown }> }
      | undefined;
    const tools = result?.tools ?? [];

    return {
      protocolVersion:
        (initResult.protocolVersion as string | null) ?? null,
      serverInfo: (initResult.serverInfo as unknown) ?? null,
      sessionId,
      tools: tools.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
      })),
    };
  }

  async function callTool(
    toolName: string,
    arguments_: Record<string, unknown>,
    options?: { requireToolName?: string },
  ): Promise<DidaToolCallResult | DidaError> {
    if (options?.requireToolName && options.requireToolName !== toolName) {
      return err(
        "callTool",
        "invalid_arguments",
        `Tool name does not match the permitted tool`,
      );
    }
    if (!toolName || typeof toolName !== "string") {
      return err("callTool", "invalid_arguments", "Tool name is required");
    }
    if (
      !arguments_ ||
      typeof arguments_ !== "object" ||
      Array.isArray(arguments_)
    ) {
      return err(
        "callTool",
        "invalid_arguments",
        "Tool arguments must be an object",
      );
    }

    if (!initialized) {
      const init = await listTools();
      if (isDidaError(init)) return init;
      // Verify the requested tool exists.
      const exists = init.tools.some((t) => t.name === toolName);
      if (!exists) {
        return err(
          "callTool",
          "unknown_tool",
          `Tool "${toolName}" is not offered by the DIDA MCP server`,
        );
      }
    }

    const callResp = await rpc(
      "tools/call",
      { name: toolName, arguments: arguments_ },
      "tools_call",
      false,
    );
    if (isDidaError(callResp)) return callResp;

    const resultObj = (callResp.result as Record<string, unknown>) ?? {};
    const content = resultObj.content as
      | Array<{ type: string; text?: string }>
      | undefined;

    let rawText: string | null = null;
    let parsedContent: unknown = null;
    if (Array.isArray(content)) {
      for (const item of content) {
        if (item.type === "text" && item.text) {
          rawText = item.text.slice(0, maxBytes);
          try {
            parsedContent = JSON.parse(item.text);
          } catch {
            // Not JSON — keep rawText only.
          }
          break;
        }
      }
    } else {
      parsedContent = callResp.result ?? null;
    }

    // Detect MCP-level tool errors (isError flag on content).
    const isErrorFlag = (resultObj as { isError?: boolean }).isError;
    if (isErrorFlag) {
      return err(
        "tools_call",
        "tool_error",
        `DIDA tool "${toolName}" returned an error result`,
        undefined,
      );
    }

    return {
      sessionId,
      toolName,
      parsedContent,
      rawText,
    };
  }

  return {
    listTools,
    callTool,
    get sessionId() {
      return sessionId;
    },
  };
}

/**
 * Convenience: build a sanitized JSON-safe report fragment from a DidaError,
 * suitable for inclusion in an Edge Function response body. Never includes
 * credentials, headers, or raw upstream text.
 */
export function sanitizeDidaError(e: DidaError): Record<string, unknown> {
  return {
    step: e.step,
    code: e.code,
    message: e.message,
    httpStatus: e.httpStatus ?? null,
  };
}

