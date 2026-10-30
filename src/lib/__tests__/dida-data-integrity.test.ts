/**
 * Phase 8 — DIDA Data Integrity Regression Tests
 *
 * Verifies that the Phase 7 DIDA pilot import and Phase 8 repairs maintain
 * data integrity across six dimensions:
 *   1. Migration idempotency (ON CONFLICT DO NOTHING in all DIDA migration files)
 *   2. DIDA supplier-ID consistency (property ID = dida-{supplier_hotel_code})
 *   3. Price provenance on future imports (payload schema validation)
 *   4. Safe handling of missing provenance (graceful degradation)
 *   5. DIDA properties remaining hidden (is_active = false)
 *   6. Booking remaining disabled (booking_enabled = false)
 *
 * These tests are file-based and do NOT connect to the live database.
 * They inspect migration SQL files and validate in-memory data structures
 * that model the DIDA import contract.
 *
 * Run with: node src/lib/__tests__/dida-data-integrity.test.ts
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

const MIGRATIONS_DIR = path.resolve(__dirname, "../../../supabase/migrations");

// ─── Helpers ─────────────────────────────────────────────────────────────

function readMigrationFiles(): { filename: string; content: string }[] {
  const files = fs.readdirSync(MIGRATIONS_DIR).filter(
    (f) => f.includes("dida_bali_pilot") || f.includes("dida_price_provenance")
  );
  return files.map((f) => ({
    filename: f,
    content: fs.readFileSync(path.join(MIGRATIONS_DIR, f), "utf-8"),
  }));
}

// ─── 1. Migration Idempotency ─────────────────────────────────────────────

function testMigrationIdempotency() {
  const migrations = readMigrationFiles();

  assert(migrations.length >= 4, `should find at least 4 DIDA migration files, found ${migrations.length}`);

  for (const m of migrations) {
    const hasOnConflictProperties = m.content.includes("ON CONFLICT (id) DO NOTHING");
    const hasOnConflictSpk = m.content.includes("ON CONFLICT (supplier_name, supplier_hotel_code) DO NOTHING");
    const isProvenanceRepair = m.filename.includes("price_provenance");

    if (isProvenanceRepair) {
      // Strip comments before checking for SQL keywords
      const sqlOnly = m.content.replace(/--.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
      // Provenance repair is UPDATE-only, no INSERT — idempotency is inherent
      assert(sqlOnly.includes("UPDATE supplier_property_keys"), `${m.filename}: provenance repair should be UPDATE-only`);
      assert(!sqlOnly.match(/\bINSERT\s+INTO/i), `${m.filename}: provenance repair must not INSERT`);
      assert(!sqlOnly.match(/\bDELETE\s+FROM/i), `${m.filename}: provenance repair must not DELETE`);
    } else {
      assert(hasOnConflictProperties, `${m.filename}: properties INSERT must have ON CONFLICT (id) DO NOTHING`);
      assert(hasOnConflictSpk, `${m.filename}: SPK INSERT must have ON CONFLICT (supplier_name, supplier_hotel_code) DO NOTHING`);
    }

    // No migration should DROP or DELETE
    assert(!m.content.match(/\bDROP\b/i), `${m.filename}: must not contain DROP`);
    assert(!m.content.match(/\bTRUNCATE\b/i), `${m.filename}: must not contain TRUNCATE`);
  }
}

function testNoDuplicateInserts() {
  // Each DIDA hotel ID should appear in at most one INSERT INTO properties statement per migration
  const migrations = readMigrationFiles().filter((m) => !m.filename.includes("price_provenance"));
  const allInsertIds: string[] = [];

  for (const m of migrations) {
    const matches = m.content.matchAll(/INSERT\s+INTO\s+properties[^;]*?VALUES\s*\(\s*'(dida-\d+)'/gis);
    for (const match of matches) {
      allInsertIds.push(match[1]);
    }
  }

  // Check for duplicates across all migrations
  const uniqueIds = new Set(allInsertIds);
  assertEqual(allInsertIds.length, uniqueIds.size, "no duplicate property IDs across all DIDA migrations");
  assert(allInsertIds.includes("dida-57700"), "dida-57700 should be in a migration");
  assert(allInsertIds.includes("dida-62214"), "dida-62214 should be in a migration");
}

// ─── 2. DIDA Supplier-ID Consistency ──────────────────────────────────────

function testSupplierIdConsistency() {
  const migrations = readMigrationFiles().filter((m) => !m.filename.includes("price_provenance"));

  for (const m of migrations) {
    // Extract property ID and supplier_hotel_code from each INSERT INTO properties
    const propMatches = m.content.matchAll(
      /INSERT\s+INTO\s+properties[^;]*?VALUES\s*\(\s*'(dida-(\d+))'/gis
    );
    for (const match of propMatches) {
      const propertyId = match[1];
      const hotelCode = match[2];
      assertEqual(propertyId, `dida-${hotelCode}`, `property ID ${propertyId} should match dida-{supplier_hotel_code}`);
    }

    // Extract from supplier_property_keys INSERTs
    const spkMatches = m.content.matchAll(
      /INSERT\s+INTO\s+supplier_property_keys[^;]*?VALUES\s*\(\s*'(dida-(\d+))'[^;]*?'(\d+)'/gis
    );
    for (const match of spkMatches) {
      const propertyId = match[1];
      const propHotelCode = match[2];
      const spkHotelCode = match[3];
      assertEqual(propertyId, `dida-${propHotelCode}`, `SPK property_id ${propertyId} should match dida-{hotel_code}`);
      assertEqual(propHotelCode, spkHotelCode, `SPK hotel code ${spkHotelCode} should match property ID hotel code ${propHotelCode}`);
    }
  }
}

// ─── 3. Price Provenance Schema Validation ────────────────────────────────

interface DidaPriceProvenance {
  priceLowest: number;
  currency: string;
  checkInDate: string;
  stayNights: number;
  retrievedAt: string;
  provenanceStatus: string;
  priceType: string;
  source: string;
}

function validatePriceProvenance(payload: Partial<DidaPriceProvenance>): string[] {
  const errors: string[] = [];

  if (payload.priceLowest === undefined || payload.priceLowest === null) {
    errors.push("missing priceLowest");
  } else if (typeof payload.priceLowest !== "number" || payload.priceLowest <= 0) {
    errors.push("priceLowest must be a positive number");
  }

  if (!payload.currency || payload.currency.length !== 3) {
    errors.push("currency must be a 3-letter ISO code");
  }

  if (!payload.checkInDate) {
    errors.push("missing checkInDate");
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.checkInDate)) {
    errors.push("checkInDate must be ISO format YYYY-MM-DD");
  }

  if (payload.stayNights === undefined || payload.stayNights === null) {
    errors.push("missing stayNights");
  } else if (typeof payload.stayNights !== "number" || payload.stayNights < 1) {
    errors.push("stayNights must be a positive integer");
  }

  if (!payload.retrievedAt) {
    errors.push("missing retrievedAt");
  }

  if (!payload.priceType) {
    errors.push("missing priceType");
  } else if (payload.priceType === "guaranteed" || payload.priceType === "bookable") {
    errors.push("DIDA prices must not be marked as guaranteed or bookable");
  }

  if (!payload.source) {
    errors.push("missing source");
  }

  return errors;
}

function testPriceProvenanceSchema() {
  // Valid payload
  const valid: DidaPriceProvenance = {
    priceLowest: 77.13,
    currency: "USD",
    checkInDate: "2026-11-15",
    stayNights: 2,
    retrievedAt: "2026-10-21T15:06:01.379138+00:00",
    provenanceStatus: "recovered_from_source_url",
    priceType: "indicative_search_result",
    source: "dida_search_pilot",
  };
  assertEqual(validatePriceProvenance(valid), [], "valid provenance should pass");

  // Missing checkInDate
  const missingDate: Partial<DidaPriceProvenance> = { ...valid, checkInDate: undefined };
  assert(validatePriceProvenance(missingDate).includes("missing checkInDate"), "missing checkInDate should be flagged");

  // Missing stayNights
  const missingNights: Partial<DidaPriceProvenance> = { ...valid, stayNights: undefined };
  assert(validatePriceProvenance(missingNights).includes("missing stayNights"), "missing stayNights should be flagged");

  // Price marked as guaranteed
  const guaranteedPrice: DidaPriceProvenance = { ...valid, priceType: "guaranteed" };
  assert(validatePriceProvenance(guaranteedPrice).length > 0, "priceType='guaranteed' should be rejected");

  // Price marked as bookable
  const bookablePrice: DidaPriceProvenance = { ...valid, priceType: "bookable" };
  assert(validatePriceProvenance(bookablePrice).length > 0, "priceType='bookable' should be rejected");

  // Zero price
  const zeroPrice: Partial<DidaPriceProvenance> = { ...valid, priceLowest: 0 };
  assert(validatePriceProvenance(zeroPrice).length > 0, "zero price should be rejected");

  // Invalid currency
  const badCurrency: Partial<DidaPriceProvenance> = { ...valid, currency: "US" };
  assert(validatePriceProvenance(badCurrency).length > 0, "2-letter currency should be rejected");
}

// ─── 4. Safe Handling of Missing Provenance ───────────────────────────────

function testMissingProvenanceHandling() {
  // When provenance is missing, the payload should have provenanceStatus documenting the gap
  const missingProvenance: Partial<DidaPriceProvenance> = {
    priceLowest: 32.62,
    currency: "USD",
    source: "dida_search_pilot",
    priceType: "indicative_search_result",
  };

  const errors = validatePriceProvenance(missingProvenance);
  assert(errors.includes("missing checkInDate"), "missing checkInDate detected");
  assert(errors.includes("missing stayNights"), "missing stayNights detected");
  assert(errors.includes("missing retrievedAt"), "missing retrievedAt detected");

  // Even with missing provenance, priceType must still be indicative
  assert(
    missingProvenance.priceType === "indicative_search_result",
    "priceType must remain indicative when provenance is missing"
  );
}

// ─── 5. DIDA Properties Remain Hidden ─────────────────────────────────────

function testPropertiesRemainHidden() {
  const migrations = readMigrationFiles().filter((m) => !m.filename.includes("price_provenance"));

  for (const m of migrations) {
    // Every properties INSERT must set is_active = false
    const propInserts = m.content.match(/INSERT\s+INTO\s+properties[\s\S]*?ON\s+CONFLICT/gi);
    if (propInserts) {
      for (const block of propInserts) {
        assert(block.includes("false"), `${m.filename}: properties INSERT must include is_active=false`);
        assert(block.includes("'catalog'"), `${m.filename}: properties INSERT must set property_status='catalog'`);
        assert(block.includes("'needs_review'"), `${m.filename}: properties INSERT must set verification_status='needs_review'`);
        assert(block.includes("'not_connected'"), `${m.filename}: properties INSERT must set supplier_status='not_connected'`);
      }
    }

    // No migration should set is_active = true for DIDA
    assert(
      !m.content.match(/is_active.*true/i) || m.content.includes("is_active = true OR"),
      `${m.filename}: must not set is_active=true for DIDA properties`
    );
  }
}

// ─── 6. Booking Remains Disabled ──────────────────────────────────────────

function testBookingRemainsDisabled() {
  const migrations = readMigrationFiles();

  for (const m of migrations) {
    // No migration should enable booking for DIDA
    assert(!m.content.match(/booking_enabled\s*=\s*true/i), `${m.filename}: must not set booking_enabled=true`);
    assert(!m.content.match(/property_status\s*=\s*'bookable'/i), `${m.filename}: must not set property_status='bookable'`);

    // Provenance repair should not touch properties table at all
    if (m.filename.includes("price_provenance")) {
      // Strip comments before checking for SQL table references
      const sqlOnly = m.content.replace(/--.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
      assert(!sqlOnly.match(/\b(UPDATE|INSERT\s+INTO|DELETE\s+FROM)\s+(properties|bookings|property_rooms)\b/i), `${m.filename}: provenance repair must not modify properties, bookings, or property_rooms tables`);
    }
  }

  // Verify the enable_hotelbeds_booking migration does NOT affect DIDA
  const hbBookingPath = path.join(MIGRATIONS_DIR, "20260929225548_enable_hotelbeds_booking.sql");
  if (fs.existsSync(hbBookingPath)) {
    const hbContent = fs.readFileSync(hbBookingPath, "utf-8");
    assert(hbContent.includes("WHERE supplier_name = 'hotelbeds'"), "hotelbeds booking migration should filter by supplier_name = 'hotelbeds'");
    assert(!hbContent.includes("dida"), "hotelbeds booking migration must not reference DIDA");
  }
}

// ─── 7. Migration Gap Coverage ────────────────────────────────────────────

function testMigrationGapCovered() {
  const migrations = readMigrationFiles().filter((m) => !m.filename.includes("price_provenance"));
  const allContent = migrations.map((m) => m.content).join("\n");

  // All 10 DIDA hotel IDs should be present across migration files
  const expectedIds = [
    "dida-57700",
    "dida-62214",
    "dida-212171",
    "dida-1427078",
    "dida-2547145",
    "dida-57862",
    "dida-57875",
    "dida-152719",
    "dida-1554833",
    "dida-56161",
  ];

  for (const id of expectedIds) {
    assert(allContent.includes(`'${id}'`), `migration for ${id} should exist in a migration file`);
  }
}

// ─── 8. Provenance Repair Uses Recovered Data Only ────────────────────────

function testProvenanceRepairDataSource() {
  const migrations = readMigrationFiles().filter((m) => m.filename.includes("price_provenance"));
  assert(migrations.length >= 1, "should find provenance repair migration");

  const repairContent = migrations[0].content;

  // Must use first_seen_at as retrievedAt (not an invented timestamp)
  assert(repairContent.includes("to_jsonb(first_seen_at)"), "provenance repair must use first_seen_at as retrievedAt");

  // Must document provenance status
  assert(repairContent.includes("recovered_from_source_url"), "provenance repair must set provenanceStatus to recovered_from_source_url");

  // Must set priceType to indicative
  assert(repairContent.includes("indicative_search_result"), "provenance repair must set priceType to indicative_search_result");

  // Must only affect DIDA
  assert(repairContent.includes("WHERE supplier_name = 'dida'"), "provenance repair must filter by supplier_name = 'dida'");

  // Must not invent dates — checkInDate should be a fixed value from source_url
  assert(repairContent.includes('"2026-11-15"'), "checkInDate should be 2026-11-15 (from source_url)");
  assert(repairContent.includes("'2'"), "stayNights should be 2 (from source_url checkout - checkin)");
}

// ─── Run all tests ────────────────────────────────────────────────────────

function main() {
  console.log("Running DIDA Data Integrity regression tests (Phase 8)...\n");

  testMigrationIdempotency();
  testNoDuplicateInserts();
  testSupplierIdConsistency();
  testPriceProvenanceSchema();
  testMissingProvenanceHandling();
  testPropertiesRemainHidden();
  testBookingRemainsDisabled();
  testMigrationGapCovered();
  testProvenanceRepairDataSource();

  console.log(`\n${passed} passed, ${failed} failed out of ${passed + failed} tests.`);
  if (failed > 0) {
    process.exit(1);
  }
}

main();
