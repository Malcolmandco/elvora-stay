import {
  createDidaClient,
  isDidaError,
  sanitizeDidaError,
  didaCorsHeaders,
  type DidaError,
} from "../_shared/dida-mcp.ts";

const corsHeaders = didaCorsHeaders;

// SearchHotels argument schema derived from the authoritative inputSchema
// retrieved from the DIDA MCP tools/list result. Only these fields are
// permitted in search mode; arbitrary client JSON is never forwarded.
const ALLOWED_SEARCH_FIELDS = new Set([
  "originQuery",
  "place",
  "placeType",
  "checkInParam",
  "localeParam",
  "size",
  "filterOptions",
  "hotelTags",
]);

interface SearchArgs {
  originQuery: string;
  place: string;
  placeType: string;
  checkInParam: { checkInDate: string; stayNights: number; adultCount: number };
  localeParam: { language: string; currency: string };
  size: number;
}

function isDateString(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

/** Validate and coerce search params from the query string. Never trusts arbitrary JSON. */
function buildSearchArgs(
  params: URLSearchParams,
): { args: SearchArgs } | { error: string } {
  const place = params.get("place");
  const placeType = params.get("placeType");
  const originQuery = params.get("originQuery");
  const checkInDate = params.get("checkInDate");
  const sizeRaw = params.get("size");

  if (!place || !placeType || !originQuery) {
    return { error: "place, placeType, and originQuery are required for search mode" };
  }

  let checkIn: string;
  if (checkInDate) {
    if (!isDateString(checkInDate)) {
      return { error: "checkInDate must be YYYY-MM-DD" };
    }
    checkIn = checkInDate;
  } else {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    checkIn = d.toISOString().split("T")[0];
  }

  let size = 10;
  if (sizeRaw) {
    const n = Number(sizeRaw);
    if (!Number.isInteger(n) || n < 1 || n > 20) {
      return { error: "size must be an integer between 1 and 20" };
    }
    size = n;
  }

  return {
    args: {
      originQuery,
      place,
      placeType,
      checkInParam: { checkInDate: checkIn, stayNights: 2, adultCount: 2 },
      localeParam: { language: "en", currency: "USD" },
      size,
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  // Defense-in-depth: even though verify_jwt = true is set in config.toml,
  // refuse to run if no Authorization header is present. This keeps the
  // function safe if the platform JWT gate is ever bypassed or misconfigured.
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return new Response(
      JSON.stringify({ error: "Unauthorized: a valid Supabase JWT is required" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const url = new URL(req.url);
  const mode = url.searchParams.get("mode");

  const client = createDidaClient();

  // ─── Default + ?mode=schema: read-only tools/list, never tools/call ──────
  if (mode === "schema" || mode === null) {
    const tools = await client.listTools();
    if (isDidaError(tools)) {
      return new Response(
        JSON.stringify(
          {
            step: (tools as DidaError).step,
            error: sanitizeDidaError(tools as DidaError),
            authSucceeded:
              (tools as DidaError).code === "http_401_403" ? false : null,
            mcpEndpoint: "mcp.rollinggo.ai",
            toolsCallMade: false,
            databaseWriteOccurred: false,
            hotelbedsRequestMade: false,
          },
          null,
          2,
        ),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const report = {
      step: "tools_list_only",
      authSucceeded: true,
      mcpEndpoint: "mcp.rollinggo.ai",
      initializationSucceeded: true,
      toolsListSucceeded: true,
      toolsAvailable: tools.tools.map((t) => t.name),
      toolsListed: tools.tools.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
      })),
      mcpProtocolVersion: tools.protocolVersion,
      mcpServerInfo: tools.serverInfo,
      sessionIdPresent: !!tools.sessionId,
      toolsCallMade: false,
      toolCalled: null,
      databaseWriteOccurred: false,
      hotelbedsRequestMade: false,
      status: "ok",
    };
    return new Response(
      JSON.stringify(report, null, 2),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // ─── ?mode=search: explicit opt-in, strictly validated tools/call ────────
  if (mode === "search" || mode === "search-bali") {
    const built = buildSearchArgs(url.searchParams);
    if ("error" in built) {
      return new Response(
        JSON.stringify({
          step: "search_validation",
          error: built.error,
          toolsCallMade: false,
          databaseWriteOccurred: false,
          hotelbedsRequestMade: false,
          status: "rejected",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const searchArguments = built.args;

    // Ensure the tool exists before calling (listTools initializes the session).
    const tools = await client.listTools();
    if (isDidaError(tools)) {
      return new Response(
        JSON.stringify(
          {
            step: "initialize",
            error: sanitizeDidaError(tools as DidaError),
            toolsCallMade: false,
            databaseWriteOccurred: false,
            hotelbedsRequestMade: false,
            status: "error",
          },
          null,
          2,
        ),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const toolExists = tools.tools.some((t) => t.name === "searchHotels");
    if (!toolExists) {
      return new Response(
        JSON.stringify({
          step: "search_validation",
          error: "searchHotels is not offered by the DIDA MCP server",
          toolsCallMade: false,
          databaseWriteOccurred: false,
          hotelbedsRequestMade: false,
          status: "rejected",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const result = await client.callTool("searchHotels", searchArguments as unknown as Record<string, unknown>, {
      requireToolName: "searchHotels",
    });
    if (isDidaError(result)) {
      return new Response(
        JSON.stringify(
          {
            step: "searchHotels",
            authSucceeded:
              (result as DidaError).code === "http_401_403" ? false : null,
            error: sanitizeDidaError(result as DidaError),
            searchParamsSent: searchArguments,
            toolsCallMade: true,
            toolCalled: "searchHotels",
            databaseWriteOccurred: false,
            hotelbedsRequestMade: false,
            status: "error",
          },
          null,
          2,
        ),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const parsed = result.parsedContent as Record<string, unknown> | null;
    const hotels = parsed && typeof parsed === "object"
      ? (parsed.hotelInformationList as unknown[] | undefined) ?? null
      : null;

    const searchReport = {
      step: "searchHotels_complete",
      authSucceeded: true,
      mcpEndpoint: "mcp.rollinggo.ai",
      initializationSucceeded: true,
      toolsListSucceeded: true,
      toolsCallMade: true,
      toolCalled: "searchHotels",
      searchParamsSent: searchArguments,
      searchCallSucceeded: true,
      hotelCount: Array.isArray(hotels) ? hotels.length : 0,
      parsedContentKeys:
        parsed && typeof parsed === "object"
          ? Object.keys(parsed)
          : Array.isArray(parsed)
          ? ["<array>"]
          : [],
      parsedContent: parsed,
      mcpProtocolVersion: tools.protocolVersion,
      mcpServerInfo: tools.serverInfo,
      sessionIdPresent: !!result.sessionId,
      databaseWriteOccurred: false,
      hotelbedsRequestMade: false,
      status: "ok",
    };
    return new Response(
      JSON.stringify(searchReport, null, 2),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // ─── ?mode=detail: call getHotelDetail for a single hotel ─────────────────
  if (mode === "detail") {
    const hotelIdRaw = url.searchParams.get("hotelId");
    const checkInDate = url.searchParams.get("checkInDate");
    const checkOutDate = url.searchParams.get("checkOutDate");

    if (!hotelIdRaw) {
      return new Response(
        JSON.stringify({
          step: "detail_validation",
          error: "hotelId is required for detail mode",
          toolsCallMade: false,
          databaseWriteOccurred: false,
          hotelbedsRequestMade: false,
          status: "rejected",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const hotelId = Number(hotelIdRaw);
    if (!Number.isInteger(hotelId) || hotelId < 1) {
      return new Response(
        JSON.stringify({
          step: "detail_validation",
          error: "hotelId must be a positive integer",
          toolsCallMade: false,
          databaseWriteOccurred: false,
          hotelbedsRequestMade: false,
          status: "rejected",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let checkIn: string;
    let checkOut: string;
    if (checkInDate && isDateString(checkInDate)) {
      checkIn = checkInDate;
    } else {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      checkIn = d.toISOString().split("T")[0];
    }
    if (checkOutDate && isDateString(checkOutDate)) {
      checkOut = checkOutDate;
    } else {
      checkIn = "2026-11-15";
      checkOut = "2026-11-17";
    }

    const detailArgs = {
      hotelId,
      dateParam: { checkInDate: checkIn, checkOutDate: checkOut },
      localeParam: { language: "en", currency: "USD" },
      occupancyParam: { roomCount: 1, adultCount: 2, childCount: 0 },
    };

    const tools = await client.listTools();
    if (isDidaError(tools)) {
      return new Response(
        JSON.stringify(
          {
            step: "initialize",
            error: sanitizeDidaError(tools as DidaError),
            toolsCallMade: false,
            databaseWriteOccurred: false,
            hotelbedsRequestMade: false,
            status: "error",
          },
          null,
          2,
        ),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const toolExists = tools.tools.some((t) => t.name === "getHotelDetail");
    if (!toolExists) {
      return new Response(
        JSON.stringify({
          step: "detail_validation",
          error: "getHotelDetail is not offered by the DIDA MCP server",
          toolsCallMade: false,
          databaseWriteOccurred: false,
          hotelbedsRequestMade: false,
          status: "rejected",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const result = await client.callTool(
      "getHotelDetail",
      detailArgs as unknown as Record<string, unknown>,
      { requireToolName: "getHotelDetail" },
    );
    if (isDidaError(result)) {
      return new Response(
        JSON.stringify(
          {
            step: "getHotelDetail",
            authSucceeded:
              (result as DidaError).code === "http_401_403" ? false : null,
            error: sanitizeDidaError(result as DidaError),
            hotelId,
            toolsCallMade: true,
            toolCalled: "getHotelDetail",
            databaseWriteOccurred: false,
            hotelbedsRequestMade: false,
            status: "error",
          },
          null,
          2,
        ),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const parsed = result.parsedContent as Record<string, unknown> | null;
    const detailReport = {
      step: "getHotelDetail_complete",
      authSucceeded: true,
      mcpEndpoint: "mcp.rollinggo.ai",
      initializationSucceeded: true,
      toolsListSucceeded: true,
      toolsCallMade: true,
      toolCalled: "getHotelDetail",
      hotelId,
      detailCallSucceeded: true,
      parsedContentKeys:
        parsed && typeof parsed === "object"
          ? Object.keys(parsed)
          : Array.isArray(parsed)
          ? ["<array>"]
          : [],
      parsedContent: parsed,
      rawText: result.rawText,
      mcpProtocolVersion: tools.protocolVersion,
      mcpServerInfo: tools.serverInfo,
      sessionIdPresent: !!result.sessionId,
      databaseWriteOccurred: false,
      hotelbedsRequestMade: false,
      status: "ok",
    };
    return new Response(
      JSON.stringify(detailReport, null, 2),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Unknown mode: reject.
  return new Response(
    JSON.stringify({
      error: "Unknown mode. Supported: schema (default), search, detail.",
      toolsCallMade: false,
      databaseWriteOccurred: false,
      hotelbedsRequestMade: false,
      status: "rejected",
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});

