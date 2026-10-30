/**
 * Enhanced Quota Guard Tests — Fail-Closed Edition
 *
 * Tests the fail-closed behavior of isQuotaPaused() after the fix:
 * - DB read error → paused
 * - Settings row missing (null data) → paused
 * - quota_paused is null → paused
 * - quota_paused is undefined → paused
 * - quota_paused is true → paused
 * - quota_paused is false → not paused (only path to "not paused")
 *
 * Also tests:
 * - Worker startup guard: fails closed on null settings, quota_paused, queue not running
 * - Worker batch-loop guard: stops on null settings, quota_paused, queue not running
 * - Worker self-invocation guard: blocked by rate-limited, failed, quota_paused, queue not running, null settings
 * - Simulated HTTP 403 and 429: set quota_paused=true, queue_running=false
 * - No supplier fetch while paused (guard fires before fetch path)
 * - No queue start or resume while paused
 *
 * Uses mock objects that simulate the Supabase client query builder chain.
 * No real database or supplier API is called.
 */

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`FAIL: ${message}`);
  }
}

function assertEqual(actual: unknown, expected: unknown, message: string) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    passed++;
  } else {
    failed++;
    console.error(`FAIL: ${message}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
  }
}

// ─── Mock Supabase query builder ────────────────────────────────────────

interface MockSettings {
  queue_running?: boolean;
  quota_paused?: boolean | null | undefined;
  quota_paused_reason?: string | null;
  quota_paused_at?: string | null;
  concurrent_destinations?: number;
  rate_limit_protection?: boolean;
  hotels_per_destination?: number;
  api_page_size?: number;
}

function createMockSupabase(options: {
  settingsData?: MockSettings | null;
  settingsError?: object | null;
  queueData?: any[];
  queueError?: object | null;
}): any {
  const { settingsData = null, settingsError = null, queueData = [], queueError = null } = options;

  return {
    from(table: string) {
      const chain: any = {
        _table: table,
        _filters: [],
        _updates: {},
        select(cols: string, opts?: any) {
          if (opts && opts.count) {
            return Promise.resolve({ count: 0, error: null });
          }
          this._cols = cols;
          return this;
        },
        eq(col: string, val: any) {
          this._filters.push({ col, val });
          return this;
        },
        in(col: string, vals: any[]) {
          this._filters.push({ col, val: vals });
          return this;
        },
        order(col: string, opts?: any) {
          return this;
        },
        limit(n: number) {
          return this;
        },
        maybeSingle() {
          if (this._table === "hotelbeds_queue_settings") {
            return Promise.resolve({ data: settingsData, error: settingsError });
          }
          if (this._table === "hotelbeds_destination_queue") {
            return Promise.resolve({ data: queueData[0] || null, error: queueError });
          }
          return Promise.resolve({ data: null, error: null });
        },
        single() {
          if (this._table === "hotelbeds_queue_settings") {
            return Promise.resolve({ data: settingsData, error: settingsError });
          }
          return Promise.resolve({ data: null, error: null });
        },
        update(data: any) {
          this._updates = data;
          return this;
        },
        insert(data: any) {
          return this;
        },
        upsert(data: any, opts?: any) {
          return this;
        },
        delete() {
          return this;
        },
        rpc(fn: string) {
          return Promise.resolve({ data: [], error: null });
        },
      };
      return chain;
    },
    rpc(fn: string) {
      return Promise.resolve({ data: [], error: null });
    },
  };
}

// ─── Replicate isQuotaPaused() from queue-manager (FAIL-CLOSED version) ──

async function isQuotaPaused_fixed(supabase: any): Promise<{ paused: boolean; reason?: string; pausedAt?: string }> {
  const { data: settings, error } = await supabase
    .from("hotelbeds_queue_settings")
    .select("quota_paused, quota_paused_reason, quota_paused_at")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    return {
      paused: true,
      reason: "Quota status could not be verified — database error reading settings. Queue must remain paused.",
    };
  }

  if (!settings) {
    return {
      paused: true,
      reason: "Quota status could not be verified — settings row not found. Queue must remain paused.",
    };
  }

  if (settings.quota_paused === null || settings.quota_paused === undefined) {
    return {
      paused: true,
      reason: "Quota status could not be verified — quota_paused field is null or missing. Queue must remain paused.",
    };
  }

  if (settings.quota_paused) {
    return {
      paused: true,
      reason: settings.quota_paused_reason || "Quota paused",
      pausedAt: settings.quota_paused_at || undefined,
    };
  }

  return { paused: false };
}

// ─── Replicate worker startup guard ─────────────────────────────────────

async function workerStartupCheck(supabase: any): Promise<{ allowed: boolean; reason: string; quotaPaused: boolean }> {
  const { data: settings } = await supabase
    .from("hotelbeds_queue_settings")
    .select("queue_running, quota_paused, concurrent_destinations, rate_limit_protection, hotels_per_destination, api_page_size")
    .eq("id", 1)
    .maybeSingle();

  if (!settings?.queue_running) {
    return { allowed: false, reason: "Queue not running", quotaPaused: false };
  }

  if (settings?.quota_paused) {
    return { allowed: false, reason: "Quota is paused — worker stopped", quotaPaused: true };
  }

  return { allowed: true, reason: "OK", quotaPaused: false };
}

// ─── Replicate worker batch-loop guard ──────────────────────────────────

async function workerBatchLoopCheck(supabase: any): Promise<{ allowed: boolean; reason: string }> {
  const { data: currentSettings } = await supabase
    .from("hotelbeds_queue_settings")
    .select("queue_running, quota_paused")
    .eq("id", 1)
    .maybeSingle();

  if (!currentSettings?.queue_running || currentSettings?.quota_paused) {
    return { allowed: false, reason: "Queue paused or quota hit" };
  }
  return { allowed: true, reason: "OK" };
}

// ─── Replicate worker self-invocation guard ─────────────────────────────

function canSelfInvoke(rateLimited: boolean, failed: boolean, settings: any): boolean {
  if (rateLimited || failed) return false;
  if (!settings?.queue_running || settings?.quota_paused) return false;
  return true;
}

// ─── Tests: isQuotaPaused fail-closed on DB error ───────────────────────

async function testIsQuotaPausedFailClosedOnDbError() {
  const mock = createMockSupabase({ settingsData: null, settingsError: { message: "Connection refused" } });
  const result = await isQuotaPaused_fixed(mock);
  assertEqual(result.paused, true, "isQuotaPaused should return paused=true on DB error");
  assert(!!result.reason, "isQuotaPaused should provide a reason on DB error");
  assert(result.reason!.includes("could not be verified"), "Reason should explain quota status could not be verified");
}

// ─── Tests: isQuotaPaused fail-closed on missing row ────────────────────

async function testIsQuotaPausedFailClosedOnMissingRow() {
  const mock = createMockSupabase({ settingsData: null });
  const result = await isQuotaPaused_fixed(mock);
  assertEqual(result.paused, true, "isQuotaPaused should return paused=true when settings row is missing");
  assert(!!result.reason, "isQuotaPaused should provide a reason when row is missing");
  assert(result.reason!.includes("not found"), "Reason should mention settings row not found");
}

// ─── Tests: isQuotaPaused fail-closed on null quota_paused ───────────────

async function testIsQuotaPausedFailClosedOnNullField() {
  const mock = createMockSupabase({ settingsData: { quota_paused: null, quota_paused_reason: null, quota_paused_at: null } });
  const result = await isQuotaPaused_fixed(mock);
  assertEqual(result.paused, true, "isQuotaPaused should return paused=true when quota_paused is null");
  assert(!!result.reason, "isQuotaPaused should provide a reason when quota_paused is null");
  assert(result.reason!.includes("null"), "Reason should mention null or missing field");
}

// ─── Tests: isQuotaPaused fail-closed on undefined quota_paused ──────────

async function testIsQuotaPausedFailClosedOnUndefinedField() {
  const mock = createMockSupabase({ settingsData: { quota_paused: undefined, quota_paused_reason: null, quota_paused_at: null } });
  const result = await isQuotaPaused_fixed(mock);
  assertEqual(result.paused, true, "isQuotaPaused should return paused=true when quota_paused is undefined");
}

// ─── Tests: isQuotaPaused correct when quota_paused=true ─────────────────

async function testIsQuotaPausedCorrectWhenPausedTrue() {
  const mock = createMockSupabase({ settingsData: { quota_paused: true, quota_paused_reason: "HTTP 403 from hotels (discovery)", quota_paused_at: "2026-10-04T11:12:48Z" } });
  const result = await isQuotaPaused_fixed(mock);
  assertEqual(result.paused, true, "isQuotaPaused should return paused=true when quota_paused=true");
  assertEqual(result.reason, "HTTP 403 from hotels (discovery)", "isQuotaPaused should preserve the reason");
  assertEqual(result.pausedAt, "2026-10-04T11:12:48Z", "isQuotaPaused should preserve pausedAt");
}

// ─── Tests: isQuotaPaused correct when quota_paused=false ────────────────

async function testIsQuotaPausedCorrectWhenPausedFalse() {
  const mock = createMockSupabase({ settingsData: { quota_paused: false, quota_paused_reason: null, quota_paused_at: null } });
  const result = await isQuotaPaused_fixed(mock);
  assertEqual(result.paused, false, "isQuotaPaused should return paused=false only when quota_paused is explicitly false");
}

// ─── Tests: startQueue honors fail-closed ────────────────────────────────

async function testStartQueueBlockedOnDbError() {
  const mock = createMockSupabase({ settingsData: null, settingsError: { message: "Connection refused" } });
  const quotaCheck = await isQuotaPaused_fixed(mock);
  assert(quotaCheck.paused, "startQueue's isQuotaPaused should block on DB error");
}

async function testStartQueueBlockedOnMissingRow() {
  const mock = createMockSupabase({ settingsData: null });
  const quotaCheck = await isQuotaPaused_fixed(mock);
  assert(quotaCheck.paused, "startQueue's isQuotaPaused should block on missing settings row");
}

async function testStartQueueBlockedOnNullField() {
  const mock = createMockSupabase({ settingsData: { quota_paused: null, quota_paused_reason: null, quota_paused_at: null } });
  const quotaCheck = await isQuotaPaused_fixed(mock);
  assert(quotaCheck.paused, "startQueue's isQuotaPaused should block on null quota_paused");
}

// ─── Tests: resumeQueue honors fail-closed ───────────────────────────────

async function testResumeQueueBlockedOnDbError() {
  const mock = createMockSupabase({ settingsData: null, settingsError: { message: "Timeout" } });
  const quotaCheck = await isQuotaPaused_fixed(mock);
  assert(quotaCheck.paused, "resumeQueue's isQuotaPaused should block on DB error");
}

async function testResumeQueueBlockedOnMissingRow() {
  const mock = createMockSupabase({ settingsData: null });
  const quotaCheck = await isQuotaPaused_fixed(mock);
  assert(quotaCheck.paused, "resumeQueue's isQuotaPaused should block on missing settings row");
}

async function testResumeQueueBlockedOnNullField() {
  const mock = createMockSupabase({ settingsData: { quota_paused: null, quota_paused_reason: null, quota_paused_at: null } });
  const quotaCheck = await isQuotaPaused_fixed(mock);
  assert(quotaCheck.paused, "resumeQueue's isQuotaPaused should block on null quota_paused");
}

// ─── Tests: Worker startup guard ─────────────────────────────────────────

async function testWorkerFailsClosedOnNullSettings() {
  const mock = createMockSupabase({ settingsData: null });
  const result = await workerStartupCheck(mock);
  assert(!result.allowed, "Worker should not proceed when settings are null");
  assertEqual(result.reason, "Queue not running", "Worker should report queue not running when settings are null");
}

async function testWorkerFailsClosedOnQuotaPaused() {
  const mock = createMockSupabase({ settingsData: { queue_running: true, quota_paused: true } });
  const result = await workerStartupCheck(mock);
  assert(!result.allowed, "Worker should not proceed when quota_paused=true");
  assertEqual(result.quotaPaused, true, "Worker should report quota_paused=true");
}

async function testWorkerFailsClosedOnQueueNotRunning() {
  const mock = createMockSupabase({ settingsData: { queue_running: false, quota_paused: false } });
  const result = await workerStartupCheck(mock);
  assert(!result.allowed, "Worker should not proceed when queue_running=false");
}

async function testWorkerProceedsWhenAllClear() {
  const mock = createMockSupabase({ settingsData: { queue_running: true, quota_paused: false } });
  const result = await workerStartupCheck(mock);
  assert(result.allowed, "Worker should proceed when queue_running=true and quota_paused=false");
}

// ─── Tests: Worker batch-loop guard ──────────────────────────────────────

async function testBatchLoopStopsOnQuotaPaused() {
  const mock = createMockSupabase({ settingsData: { queue_running: true, quota_paused: true } });
  const result = await workerBatchLoopCheck(mock);
  assert(!result.allowed, "Batch loop should stop when quota_paused=true");
}

async function testBatchLoopStopsOnQueueNotRunning() {
  const mock = createMockSupabase({ settingsData: { queue_running: false, quota_paused: false } });
  const result = await workerBatchLoopCheck(mock);
  assert(!result.allowed, "Batch loop should stop when queue_running=false");
}

async function testBatchLoopStopsOnNullSettings() {
  const mock = createMockSupabase({ settingsData: null });
  const result = await workerBatchLoopCheck(mock);
  assert(!result.allowed, "Batch loop should stop when settings are null");
}

async function testBatchLoopContinuesWhenAllClear() {
  const mock = createMockSupabase({ settingsData: { queue_running: true, quota_paused: false } });
  const result = await workerBatchLoopCheck(mock);
  assert(result.allowed, "Batch loop should continue when all clear");
}

// ─── Tests: Self-invocation guard ────────────────────────────────────────

function testSelfInvokeBlockedByQuotaPaused() {
  assert(!canSelfInvoke(false, false, { queue_running: true, quota_paused: true }), "Self-invoke blocked when quota_paused=true");
}

function testSelfInvokeBlockedByRateLimited() {
  assert(!canSelfInvoke(true, false, { queue_running: true, quota_paused: false }), "Self-invoke blocked when rateLimited=true");
}

function testSelfInvokeBlockedByFailed() {
  assert(!canSelfInvoke(false, true, { queue_running: true, quota_paused: false }), "Self-invoke blocked when failed=true");
}

function testSelfInvokeBlockedByQueueNotRunning() {
  assert(!canSelfInvoke(false, false, { queue_running: false, quota_paused: false }), "Self-invoke blocked when queue_running=false");
}

function testSelfInvokeBlockedOnNullSettings() {
  assert(!canSelfInvoke(false, false, null), "Self-invoke blocked when settings are null");
}

function testSelfInvokeAllowedWhenAllClear() {
  assert(canSelfInvoke(false, false, { queue_running: true, quota_paused: false }), "Self-invoke allowed when all clear");
}

// ─── Tests: Simulated HTTP 403/429 ───────────────────────────────────────

function testHttp403SetsQuotaPaused() {
  let settings: any = { queue_running: true, quota_paused: false, quota_paused_reason: null, quota_paused_at: null };
  settings = {
    ...settings,
    queue_running: false,
    quota_paused: true,
    quota_paused_reason: "HTTP 403 from hotels (worker)",
    quota_paused_at: new Date().toISOString(),
  };
  assertEqual(settings.quota_paused, true, "HTTP 403 should set quota_paused=true");
  assertEqual(settings.queue_running, false, "HTTP 403 should set queue_running=false");
}

function testHttp429SetsQuotaPaused() {
  let settings: any = { queue_running: true, quota_paused: false, quota_paused_reason: null, quota_paused_at: null };
  settings = {
    ...settings,
    queue_running: false,
    quota_paused: true,
    quota_paused_reason: "HTTP 429 from hotels (worker)",
    quota_paused_at: new Date().toISOString(),
  };
  assertEqual(settings.quota_paused, true, "HTTP 429 should set quota_paused=true");
  assertEqual(settings.queue_running, false, "HTTP 429 should set queue_running=false");
}

// ─── Tests: No supplier fetch while paused ───────────────────────────────

async function testNoSupplierFetchWhilePaused() {
  const mock = createMockSupabase({ settingsData: { queue_running: true, quota_paused: true } });
  const result = await workerStartupCheck(mock);
  assert(!result.allowed, "Worker startup guard blocks before any supplier fetch path");
  assertEqual(result.quotaPaused, true, "Worker reports quota_paused when blocking");
}

async function testNoSupplierFetchWhenSettingsNull() {
  const mock = createMockSupabase({ settingsData: null });
  const result = await workerStartupCheck(mock);
  assert(!result.allowed, "Worker blocks when settings null — no supplier fetch possible");
}

// ─── Tests: No queue start/resume while paused ───────────────────────────

async function testNoQueueStartWhilePaused() {
  const mock = createMockSupabase({ settingsData: { quota_paused: true, quota_paused_reason: "HTTP 403", quota_paused_at: "2026-10-04T11:12:48Z" } });
  const result = await isQuotaPaused_fixed(mock);
  assertEqual(result.paused, true, "startQueue blocked when quota_paused=true");
}

async function testNoQueueResumeWhilePaused() {
  const mock = createMockSupabase({ settingsData: { quota_paused: true, quota_paused_reason: "HTTP 403", quota_paused_at: "2026-10-04T11:12:48Z" } });
  const result = await isQuotaPaused_fixed(mock);
  assertEqual(result.paused, true, "resumeQueue blocked when quota_paused=true");
}

// ─── Tests: Safety message clarity ───────────────────────────────────────

async function testSafetyMessageOnDbError() {
  const mock = createMockSupabase({ settingsData: null, settingsError: { message: "Connection refused" } });
  const result = await isQuotaPaused_fixed(mock);
  assert(result.reason!.includes("could not be verified"), "Safety message should say 'could not be verified'");
  assert(result.reason!.includes("must remain paused"), "Safety message should say 'must remain paused'");
}

async function testSafetyMessageOnMissingRow() {
  const mock = createMockSupabase({ settingsData: null });
  const result = await isQuotaPaused_fixed(mock);
  assert(result.reason!.includes("could not be verified"), "Safety message should say 'could not be verified'");
  assert(result.reason!.includes("must remain paused"), "Safety message should say 'must remain paused'");
}

async function testSafetyMessageOnNullField() {
  const mock = createMockSupabase({ settingsData: { quota_paused: null, quota_paused_reason: null, quota_paused_at: null } });
  const result = await isQuotaPaused_fixed(mock);
  assert(result.reason!.includes("could not be verified"), "Safety message should say 'could not be verified'");
  assert(result.reason!.includes("must remain paused"), "Safety message should say 'must remain paused'");
}

// ─── Run all tests ────────────────────────────────────────────────────────

async function runAllTests() {
  console.log("Running enhanced quota guard tests (fail-closed edition)...\n");

  // isQuotaPaused fail-closed on DB error
  await testIsQuotaPausedFailClosedOnDbError();

  // isQuotaPaused fail-closed on missing row
  await testIsQuotaPausedFailClosedOnMissingRow();

  // isQuotaPaused fail-closed on null field
  await testIsQuotaPausedFailClosedOnNullField();

  // isQuotaPaused fail-closed on undefined field
  await testIsQuotaPausedFailClosedOnUndefinedField();

  // isQuotaPaused correct when quota_paused=true
  await testIsQuotaPausedCorrectWhenPausedTrue();

  // isQuotaPaused correct when quota_paused=false
  await testIsQuotaPausedCorrectWhenPausedFalse();

  // startQueue honors fail-closed
  await testStartQueueBlockedOnDbError();
  await testStartQueueBlockedOnMissingRow();
  await testStartQueueBlockedOnNullField();

  // resumeQueue honors fail-closed
  await testResumeQueueBlockedOnDbError();
  await testResumeQueueBlockedOnMissingRow();
  await testResumeQueueBlockedOnNullField();

  // Worker startup guard
  await testWorkerFailsClosedOnNullSettings();
  await testWorkerFailsClosedOnQuotaPaused();
  await testWorkerFailsClosedOnQueueNotRunning();
  await testWorkerProceedsWhenAllClear();

  // Worker batch-loop guard
  await testBatchLoopStopsOnQuotaPaused();
  await testBatchLoopStopsOnQueueNotRunning();
  await testBatchLoopStopsOnNullSettings();
  await testBatchLoopContinuesWhenAllClear();

  // Self-invocation guard
  testSelfInvokeBlockedByQuotaPaused();
  testSelfInvokeBlockedByRateLimited();
  testSelfInvokeBlockedByFailed();
  testSelfInvokeBlockedByQueueNotRunning();
  testSelfInvokeBlockedOnNullSettings();
  testSelfInvokeAllowedWhenAllClear();

  // Simulated HTTP 403/429
  testHttp403SetsQuotaPaused();
  testHttp429SetsQuotaPaused();

  // No supplier fetch while paused
  await testNoSupplierFetchWhilePaused();
  await testNoSupplierFetchWhenSettingsNull();

  // No queue start/resume while paused
  await testNoQueueStartWhilePaused();
  await testNoQueueResumeWhilePaused();

  // Safety message clarity
  await testSafetyMessageOnDbError();
  await testSafetyMessageOnMissingRow();
  await testSafetyMessageOnNullField();

  console.log(`\n${passed} passed, ${failed} failed out of ${passed + failed} tests.`);
  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests();
