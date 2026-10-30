// Hotelbeds Room Sync v2.2
// Fetches REAL room types from Hotelbeds Content API and reference pricing from Booking API.
// Only updates property_rooms table — never touches properties, elvora_amenities, etc.
// Supports single-property sync and batch mode for admin bulk operations.
import { createClient } from "npm:@supabase/supabase-js@2.58.0";
import {
  getHotelbedsCatalogConfig,
  getHotelbedsConfig,
  getHotelbedsCredentialById,
  buildHotelbedsHeaders,
  corsHeaders,
  type HotelbedsCredentials,
} from "../_shared/hotelbeds-config.ts";

interface HotelbedsContentRoom {
  roomCode: string;
  isParentRoom?: boolean;
  minPax?: number;
  maxPax?: number;
  maxAdults?: number;
  maxChildren?: number;
  minAdults?: number;
  roomType: string;
  characteristicCode?: string;
  roomTypeDescription?: { content: string };
  characteristicDescription?: { content: string };
  description?: { content: string };
  facilities?: Array<{ code: number; description?: { content: string } }>;
  images?: Array<{ path: string }>;
}

interface HotelbedsAvailabilityRoom {
  code: number | string;
  rates?: Array<{
    rateKey?: string;
    boardName?: string;
    net?: number;
    sellingRate?: number;
    currency?: string;
  }>;
}

interface RoomSyncResult {
  propertyId: string;
  supplierHotelCode: string;
  status: string;
  roomsFound: number;
  roomsCreated: number;
  roomsUpdated: number;
  pricesUpdated: number;
  errors: string[];
  rooms: Array<{
    supplierRoomCode: string;
    roomName: string;
    roomType: string;
    maxAdults: number;
    maxOccupancy: number;
    elvoraPricePerNight: number;
    currency: string;
  }>;
}

interface BatchResponse {
  status: string;
  processed: number;
  totalRoomsFound: number;
  totalRoomsCreated: number;
  totalRoomsUpdated: number;
  totalPricesUpdated: number;
  errors: string[];
  results: RoomSyncResult[];
  rateLimited: boolean;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const {
      propertyId,
      supplierHotelCode,
      maxCount,
      destinationId,
      referenceCheckIn,
      referenceCheckOut,
      referenceAdults,
      referenceRooms,
      debug,
      credentialId,
    } = body as {
      propertyId?: string;
      supplierHotelCode?: string;
      batchSize?: number;
      maxCount?: number;
      destinationId?: string;
      referenceCheckIn?: string;
      referenceCheckOut?: string;
      referenceAdults?: number;
      referenceRooms?: number;
      debug?: boolean;
      credentialId?: string;
    };

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ─── Batch mode: sync rooms for multiple properties ──────────────
    if (!propertyId && !supplierHotelCode) {
      const limit = Math.min(maxCount || 5, 20);
      let query = supabase
        .from("properties")
        .select("id, supplier_hotel_code, name")
        .eq("supplier_name", "hotelbeds")
        .not("supplier_hotel_code", "is", null)
        .order("updated_at", { ascending: true })
        .limit(limit);

      if (destinationId) {
        query = query.eq("destination_id", destinationId);
      }

      const { data: properties, error: propError } = await query;
      if (propError || !properties || properties.length === 0) {
        return new Response(
          JSON.stringify({
            status: "no_properties",
            processed: 0,
            totalRoomsFound: 0,
            totalRoomsCreated: 0,
            totalRoomsUpdated: 0,
            totalPricesUpdated: 0,
            errors: ["No Hotelbeds properties found to sync"],
            results: [],
            rateLimited: false,
          } as BatchResponse),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const batchResult: BatchResponse = {
        status: "in_progress",
        processed: 0,
        totalRoomsFound: 0,
        totalRoomsCreated: 0,
        totalRoomsUpdated: 0,
        totalPricesUpdated: 0,
        errors: [],
        results: [],
        rateLimited: false,
      };

      for (const prop of properties) {
        const result = await syncSingleProperty(
          supabase,
          prop.id,
          prop.supplier_hotel_code!,
          referenceCheckIn,
          referenceCheckOut,
          referenceAdults,
          referenceRooms,
          false,
          credentialId,
        );

        batchResult.results.push(result);
        batchResult.processed++;
        batchResult.totalRoomsFound += result.roomsFound;
        batchResult.totalRoomsCreated += result.roomsCreated;
        batchResult.totalRoomsUpdated += result.roomsUpdated;
        batchResult.totalPricesUpdated += result.pricesUpdated;
        if (result.errors.length > 0) {
          batchResult.errors.push(`${prop.name}: ${result.errors.join("; ")}`);
        }
        if (result.status === "quota_paused") {
          batchResult.rateLimited = true;
          batchResult.status = "quota_paused";
          break;
        }
      }

      batchResult.status = batchResult.rateLimited ? "quota_paused" : "completed";
      return new Response(
        JSON.stringify(batchResult),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ─── Single property mode ────────────────────────────────────────
    let propId = propertyId;
    let hotelCode = supplierHotelCode;

    if (!propId && hotelCode) {
      const { data: prop } = await supabase
        .from("properties")
        .select("id, supplier_hotel_code")
        .eq("supplier_name", "hotelbeds")
        .eq("supplier_hotel_code", hotelCode)
        .maybeSingle();
      if (!prop) {
        return new Response(
          JSON.stringify({ error: "Property not found for supplier_hotel_code" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      propId = prop.id;
    }

    if (!hotelCode) {
      const { data: prop } = await supabase
        .from("properties")
        .select("supplier_hotel_code")
        .eq("id", propId)
        .maybeSingle();
      hotelCode = prop?.supplier_hotel_code;
    }

    if (!propId || !hotelCode) {
      return new Response(
        JSON.stringify({ error: "Could not resolve property and supplier hotel code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const result = await syncSingleProperty(
      supabase,
      propId,
      hotelCode,
      referenceCheckIn,
      referenceCheckOut,
      referenceAdults,
      referenceRooms,
      debug === true,
      credentialId,
    );

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Room sync failed";
    return new Response(
      JSON.stringify({ error: msg, status: "failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

// ─── Static fallback mappings for Hotelbeds room type/characteristic codes ──
// Used when the Content API types endpoint doesn't return results for specific codes.

const ROOM_TYPE_NAMES: Record<string, string> = {
  SUI: "Suite",
  JSU: "Junior Suite",
  STD: "Standard",
  SUP: "Superior",
  DLX: "Deluxe",
  DBL: "Double",
  DBT: "Double",
  DUS: "Double for Single Use",
  SGL: "Single",
  TPL: "Triple",
  QUD: "Quadruple",
  FAM: "Family",
  APT: "Apartment",
  STU: "Studio",
  HSE: "House",
  VIL: "Villa",
  BUN: "Bungalow",
  COT: "Cottage",
  ROO: "Room",
};

const CHARACTERISTIC_NAMES: Record<string, string> = {
  "ST": "Standard",
  "SU": "Superior",
  "DX": "Deluxe",
  "LX": "Luxury",
  "PR": "Premier",
  "EX": "Executive",
  "2Q": "Two Queen Beds",
  "1K": "One King Bed",
  "2D": "Two Double Beds",
  "1D": "One Double Bed",
  "2S": "Two Single Beds",
  "1S": "One Single Bed",
  "3B": "Three Beds",
  "4B": "Four Beds",
  "OM-1": "One King Bed",
  "OM-2": "Two Queen Beds",
  "OV": "Ocean View",
  "CV": "City View",
  "MV": "Mountain View",
  "GV": "Garden View",
  "PV": "Pool View",
  "SV": "Sea View",
  "BV": "Bay View",
  "RV": "River View",
  "LV": "Lake View",
  "BW": "Ocean Front",
  "RW": "Run of House",
  "FR": "Sea Front",
};

function buildRoomName(roomCode: string, roomTypeCode: string, characteristicCode: string): string {
  const typeDesc = ROOM_TYPE_NAMES[roomTypeCode] || "";
  const charDesc = CHARACTERISTIC_NAMES[characteristicCode] || "";
  if (typeDesc && charDesc) {
    return `${typeDesc} ${charDesc}`;
  }
  if (typeDesc) {
    return typeDesc;
  }
  if (charDesc) {
    return charDesc;
  }
  return `Room ${roomCode}`;
}

// ─── Fetch room type descriptions from Content API types endpoint ────────

async function fetchRoomTypeDescriptions(
  catalogCreds: HotelbedsCredentials,
  roomCodes: string[],
  language = "ENG",
): Promise<Map<string, string>> {
  const typeMap = new Map<string, string>();
  const headers = await buildHotelbedsHeaders(catalogCreds.apiKey, catalogCreds.secret);
  const codesParam = roomCodes.join(",");
  const url = `${catalogCreds.baseUrl}/hotel-content-api/1.0/types/rooms?codes=${codesParam}&language=${language}`;

  try {
    const response = await fetch(url, { method: "GET", headers });
    if (response.ok) {
      const data = await response.json();
      const types = data?.rooms || data?.types || data?.roomTypes || [];
      for (const t of types) {
        const code = String(t.code || "");
        const desc = t.description?.content || t.description || "";
        if (code && desc) {
          typeMap.set(code, String(desc));
        }
      }
      // Store debug info on the map object via a custom property
      (typeMap as Record<string, unknown>)._rawKeys = Object.keys(data || {});
      (typeMap as Record<string, unknown>)._responseStatus = response.status;
    } else {
      (typeMap as Record<string, unknown>)._responseStatus = response.status;
    }
  } catch {
    // Non-fatal — room names will fall back to code
  }

  return typeMap;
}

// ─── Fetch room characteristic descriptions from Content API ─────────────

async function fetchCharacteristicDescriptions(
  catalogCreds: HotelbedsCredentials,
  charCodes: string[] = [],
  language = "ENG",
): Promise<Map<string, string>> {
  const charMap = new Map<string, string>();
  const headers = await buildHotelbedsHeaders(catalogCreds.apiKey, catalogCreds.secret);
  const codesParam = charCodes.length > 0 ? `&codes=${charCodes.join(",")}` : "";
  const url = `${catalogCreds.baseUrl}/hotel-content-api/1.0/types/roomcharacteristics?language=${language}${codesParam}`;

  try {
    const response = await fetch(url, { method: "GET", headers });
    if (response.ok) {
      const data = await response.json();
      const types = data?.roomCharacteristics || data?.types || [];
      for (const t of types) {
        const code = String(t.code || "");
        const desc = t.description?.content || t.description || "";
        if (code && desc) {
          charMap.set(code, String(desc));
        }
      }
    }
  } catch {
    // Non-fatal
  }

  return charMap;
}

// ─── Core sync logic for a single property ───────────────────────────────

async function syncSingleProperty(
  supabase: ReturnType<typeof createClient>,
  propId: string,
  hotelCode: string,
  referenceCheckIn?: string,
  referenceCheckOut?: string,
  referenceAdults?: number,
  referenceRooms?: number,
  debug = false,
  credentialId?: string,
): Promise<RoomSyncResult> {
  const refCheckIn = referenceCheckIn || new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];
  const refCheckOut = referenceCheckOut || new Date(Date.now() + 37 * 86400000).toISOString().split("T")[0];
  const refAdults = referenceAdults || 2;
  const refRooms = referenceRooms || 1;
  const now = new Date().toISOString();

  const result: RoomSyncResult = {
    propertyId: propId,
    supplierHotelCode: hotelCode,
    status: "in_progress",
    roomsFound: 0,
    roomsCreated: 0,
    roomsUpdated: 0,
    pricesUpdated: 0,
    errors: [],
    rooms: [],
  };

  // Step 1: Fetch room types from Hotelbeds Content API
  // Use selected credential if provided, otherwise fall back to env-var catalog creds
  let catalogCreds: HotelbedsCredentials;
  if (credentialId) {
    const creds = await getHotelbedsCredentialById(credentialId);
    if (!creds) {
      result.errors.push("Selected Hotelbeds API account not found or inactive");
      result.status = "failed";
      return result;
    }
    catalogCreds = creds;
  } else {
    catalogCreds = getHotelbedsCatalogConfig();
  }
  if (!catalogCreds.apiKey || !catalogCreds.secret) {
    result.errors.push("Catalog credentials not configured");
    result.status = "failed";
    return result;
  }

  const contentHeaders = await buildHotelbedsHeaders(catalogCreds.apiKey, catalogCreds.secret);
  const contentUrl = `${catalogCreds.baseUrl}/hotel-content-api/1.0/hotels?fields=all&codes=${hotelCode}&language=ENG`;

  let contentResponse: Response;
  try {
    contentResponse = await fetch(contentUrl, { method: "GET", headers: contentHeaders });
  } catch {
    result.errors.push("Network error fetching hotel content");
    result.status = "failed";
    return result;
  }

  if (contentResponse.status === 403 || contentResponse.status === 429) {
    result.errors.push(`Rate limited on Content API (HTTP ${contentResponse.status})`);
    result.status = "quota_paused";
    return result;
  }

  if (!contentResponse.ok) {
    const errText = await contentResponse.text().catch(() => "");
    result.errors.push(`Content API error: ${contentResponse.status} ${errText.substring(0, 200)}`);
    result.status = "failed";
    return result;
  }

  const contentData = await contentResponse.json();
  const hotels = contentData?.hotels;

  if (!hotels || !Array.isArray(hotels) || hotels.length === 0) {
    result.status = "no_rooms_found";
    result.errors.push("Hotel not found in Content API");
    return result;
  }

  const hotel = hotels[0];
  const contentRooms: HotelbedsContentRoom[] = hotel.rooms || [];

  if (contentRooms.length === 0) {
    result.status = "no_rooms_found";
    result.errors.push("No rooms returned by Content API for this hotel");
    return result;
  }

  result.roomsFound = contentRooms.length;

  // Step 1b: Fetch room type and characteristic descriptions for human-readable names
  const roomCodes = contentRooms.map((r) => String(r.roomCode || "")).filter(Boolean);
  const charCodes = contentRooms.map((r) => String(r.characteristicCode || "")).filter(Boolean);
  const roomTypeMap = await fetchRoomTypeDescriptions(catalogCreds, roomCodes);
  const charMap = await fetchCharacteristicDescriptions(catalogCreds, charCodes);

  // Step 2: Fetch reference pricing from Hotelbeds Booking API
  // Use the same selected credential for booking API as well
  let bookingCreds: HotelbedsCredentials;
  if (credentialId) {
    bookingCreds = catalogCreds;
  } else {
    bookingCreds = getHotelbedsConfig();
  }
  const roomPriceMap = new Map<string, { price: number; currency: string; boardName: string }>();

  if (bookingCreds.apiKey && bookingCreds.secret) {
    const bookingHeaders = await buildHotelbedsHeaders(bookingCreds.apiKey, bookingCreds.secret);
    const availRequestBody = {
      stay: { checkIn: refCheckIn, checkOut: refCheckOut },
      occupancies: [{ rooms: refRooms, adults: refAdults, children: 0 }],
      hotels: { hotel: [parseInt(hotelCode, 10)] },
    };

    try {
      const availResponse = await fetch(`${bookingCreds.baseUrl}/hotel-api/1.0/hotels`, {
        method: "POST",
        headers: bookingHeaders,
        body: JSON.stringify(availRequestBody),
      });

      if (availResponse.status === 403 || availResponse.status === 429) {
        result.errors.push(`Rate limited on Booking API (HTTP ${availResponse.status}) — rooms imported without pricing`);
        result.status = "quota_paused";
      } else if (availResponse.ok) {
        const availData = await availResponse.json();
        const availHotels = availData?.hotel?.hotels || [];
        if (availHotels.length > 0) {
          const availHotel = availHotels[0];
          const availRooms: HotelbedsAvailabilityRoom[] = availHotel.rooms || [];
          const availCurrency = availHotel.currency || availData?.hotel?.currency || "USD";

          for (const room of availRooms) {
            const roomCode = String(room.code || "");
            const rates = room.rates || [];
            if (rates.length > 0) {
              const rate = rates[0];
              const price = rate.sellingRate || rate.net || 0;
              const nights = Math.max(1, Math.round(
                (new Date(refCheckOut).getTime() - new Date(refCheckIn).getTime()) / 86400000
              ));
              const pricePerNight = price / nights;
              roomPriceMap.set(roomCode, {
                price: Math.round(pricePerNight * 100) / 100,
                currency: rate.currency || availCurrency,
                boardName: rate.boardName || "Room only",
              });
            }
          }
        }
      } else {
        result.errors.push("Booking API returned non-OK status — rooms imported without pricing");
      }
    } catch {
      result.errors.push("Network error fetching availability pricing — rooms imported without pricing");
    }
  } else {
    result.errors.push("Booking API credentials not configured — rooms imported without pricing");
  }

  // Step 3: Fetch existing rooms for this property
  const { data: existingRooms } = await supabase
    .from("property_rooms")
    .select("id, supplier_room_code, price_override, elvora_price_per_night")
    .eq("property_id", propId);

  const existingMap = new Map<string, { id: string; priceOverride: boolean; currentPrice: number }>();
  for (const row of (existingRooms || [])) {
    if (row.supplier_room_code) {
      existingMap.set(row.supplier_room_code, {
        id: row.id,
        priceOverride: row.price_override === true,
        currentPrice: Number(row.elvora_price_per_night) || 0,
      });
    }
  }

  // Step 4: Build upsert rows
  const rowsToUpsert: Record<string, unknown>[] = [];

  for (let idx = 0; idx < contentRooms.length; idx++) {
    const room = contentRooms[idx];
    const roomCode = String(room.roomCode || "");
    if (!roomCode) continue;

    const roomTypeCode = room.roomType || "";
    const characteristicCode = room.characteristicCode || "";

    // Build human-readable room name: try API-fetched descriptions, then static fallback
    const fullRoomDesc = roomTypeMap.get(roomCode) || "";
    const typeDesc = fullRoomDesc || roomTypeMap.get(roomTypeCode) || "";
    const charDesc = charMap.get(characteristicCode) || "";
    let roomName: string;
    if (typeDesc && charDesc && !typeDesc.includes(charDesc)) {
      roomName = `${typeDesc} ${charDesc}`;
    } else if (typeDesc) {
      roomName = typeDesc;
    } else if (charDesc) {
      roomName = charDesc;
    } else {
      roomName = buildRoomName(roomCode, roomTypeCode, characteristicCode);
    }

    const description = room.description?.content || "";
    const maxAdults = room.maxAdults ?? null;
    const maxChildren = room.maxChildren ?? null;
    const maxOccupancy = room.maxPax ?? null;

    const facilities = (room.facilities || [])
      .map((f) => f?.description?.content || "")
      .filter((s) => s.length > 0)
      .slice(0, 30);

    const roomImage = room.images?.[0]?.path
      ? (room.images[0].path.startsWith("http")
        ? room.images[0].path
        : `https://photos.hotelbeds.com/giata/${room.images[0].path.replace(/^\/+/, "")}`)
      : null;

    // Match pricing: try exact roomCode match, then try roomCode without characteristic
    const priceInfo = roomPriceMap.get(roomCode) ||
      roomPriceMap.get(roomTypeCode) ||
      roomPriceMap.get(roomCode.split(".")[0]);
    const existing = existingMap.get(roomCode);

    let elvoraPrice = 0;
    let priceSource = "hotelbeds_sync";
    let priceSyncedAt: string | null = now;
    let currency = "USD";

    if (existing && existing.priceOverride) {
      elvoraPrice = existing.currentPrice;
      priceSource = "manual_override";
      priceSyncedAt = null;
    } else if (priceInfo) {
      elvoraPrice = priceInfo.price;
      currency = priceInfo.currency;
    }

    const row: Record<string, unknown> = {
      property_id: propId,
      supplier_name: "hotelbeds",
      supplier_hotel_code: hotelCode,
      supplier_room_code: roomCode,
      supplier_room_name: roomName,
      supplier_room_type: roomTypeCode,
      supplier_room_characteristic: characteristicCode,
      supplier_description: description,
      supplier_max_adults: maxAdults,
      supplier_max_children: maxChildren,
      supplier_max_occupancy: maxOccupancy,
      supplier_facilities: facilities,
      supplier_last_synced_at: now,
      elvora_price_per_night: elvoraPrice,
      currency,
      price_source: priceSource,
      price_synced_at: priceSyncedAt,
      price_reference_check_in: refCheckIn,
      price_reference_check_out: refCheckOut,
      price_reference_adults: refAdults,
      price_reference_rooms: refRooms,
      is_active: true,
      display_order: idx,
      room_image: roomImage,
      updated_at: now,
    };

    if (existing) {
      row.id = existing.id;
      result.roomsUpdated++;
      if (priceInfo && !existing.priceOverride) result.pricesUpdated++;
    } else {
      result.roomsCreated++;
      if (priceInfo) result.pricesUpdated++;
    }

    rowsToUpsert.push(row);

    result.rooms.push({
      supplierRoomCode: roomCode,
      roomName,
      roomType: roomTypeCode,
      maxAdults: maxAdults || 0,
      maxOccupancy: maxOccupancy || 0,
      elvoraPricePerNight: elvoraPrice,
      currency,
    });
  }

  // Step 5: Upsert to database
  if (rowsToUpsert.length > 0) {
    const { error: upsertError } = await supabase
      .from("property_rooms")
      .upsert(rowsToUpsert, { onConflict: "property_id,supplier_room_code" });

    if (upsertError) {
      result.errors.push(`Upsert failed: ${upsertError.message}`);
      result.status = "failed";
      return result;
    }
  }

  // Step 6: Mark rooms not returned by Content API as inactive
  const returnedCodes = contentRooms.map((r) => String(r.roomCode || "")).filter(Boolean);
  if (returnedCodes.length > 0 && existingRooms && existingRooms.length > 0) {
    const existingCodes = existingRooms.map((r) => r.supplier_room_code).filter(Boolean);
    const missingCodes = existingCodes.filter((c) => !returnedCodes.includes(c));
    if (missingCodes.length > 0) {
      await supabase
        .from("property_rooms")
        .update({ is_active: false, updated_at: now })
        .eq("property_id", propId)
        .in("supplier_room_code", missingCodes);
    }
  }

  if (debug) {
    (result as Record<string, unknown>)._debug = {
      contentUrl,
      roomTypeMapSize: roomTypeMap.size,
      charMapSize: charMap.size,
      roomTypeRawKeys: (roomTypeMap as Record<string, unknown>)._rawKeys,
      roomTypeResponseStatus: (roomTypeMap as Record<string, unknown>)._responseStatus,
      roomTypeEntries: Array.from(roomTypeMap.entries()).slice(0, 10),
      charEntries: Array.from(charMap.entries()).slice(0, 10),
      priceMapKeys: Array.from(roomPriceMap.keys()),
    };
  }

  result.status = result.status === "quota_paused" ? "quota_paused" : "completed";
  return result;
}
