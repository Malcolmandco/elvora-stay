import React, { useState, useEffect, useCallback } from 'react';
import {
  Database, RefreshCw, Loader2, AlertTriangle, Check, X,
  Plug, Zap, ShieldCheck, Clock, Play, Pause, Square,
  BedDouble, Building2, Tag, ListChecks, ChevronDown, ChevronRight,
  Search as SearchIcon, MapPin, Activity,
  Plus, Edit3, Trash2, KeyRound, Power,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

// ─── Types ──────────────────────────────────────────────────────────────

interface EnvStatus {
  environment: string;
  host: string;
  primaryConfigured: boolean;
  catalogConfigured: boolean;
}

interface CredentialTest {
  configured: boolean;
  status: 'connected' | 'not_configured' | 'auth_failed' | 'permission_denied' | 'quota_rate_limit' | 'network_error' | 'configuration_error';
  environment: string;
  host: string;
  httpStatus?: number;
  message?: string;
}

type SyncType = 'content' | 'rooms' | 'prices' | 'content_and_rooms' | 'rate_check' | 'readiness_audit';
type SyncScope = 'one_property' | 'selected_properties' | 'one_destination' | 'selected_destinations' | 'all_eligible';
type SyncStatus = 'pending' | 'running' | 'paused' | 'completed' | 'partially_completed' | 'paused_quota' | 'stopped' | 'failed' | 'cancelled';

interface SyncHistoryEntry {
  id: string;
  admin_user_id: string;
  admin_user_email: string | null;
  sync_type: string;
  scope: string;
  scope_detail: Record<string, unknown>;
  batch_size: number;
  status: SyncStatus;
  properties_processed: number;
  properties_total: number;
  rooms_found: number;
  rooms_created: number;
  rooms_updated: number;
  rooms_skipped: number;
  rooms_deactivated: number;
  prices_found: number;
  hotels_processed: number;
  hotels_inserted: number;
  hotels_updated: number;
  duplicates_skipped: number;
  errors_count: number;
  error_messages: string[];
  quota_paused: boolean;
  quota_paused_reason: string | null;
  stop_reason: string | null;
  credential_id: string | null;
  credential_label: string | null;
  credential_environment: string | null;
  started_at: string;
  completed_at: string | null;
  last_updated_at: string;
}

interface PropertyOption {
  id: string;
  name: string;
  slug: string;
  supplier_hotel_code: string | null;
  destination_id: string | null;
  supplier_status: string | null;
  city: string | null;
  destination_name: string | null;
  last_synced_at: string | null;
  room_count: number;
}

interface DestinationOption {
  id: string;
  name: string;
  slug: string;
  country: string;
  hotel_count: number;
}

interface HotelbedsCredential {
  id: string;
  label: string;
  environment: string;
  purpose: string | null;
  is_active: boolean;
  last_tested_at: string | null;
  last_test_status: string | null;
  last_test_capabilities: Record<string, boolean> | null;
  is_legacy: boolean;
  legacy_role: string | null;
  created_at: string;
}

// ─── Helper ─────────────────────────────────────────────────────────────

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const { data: { session } } = await supabase.auth.getSession();
  if (session) headers['Authorization'] = `Bearer ${session.access_token}`;
  return headers;
}

async function fetchCredentials(): Promise<HotelbedsCredential[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hotelbeds-credentials`,
    { method: 'POST', headers, body: JSON.stringify({ action: 'list' }) },
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.credentials || []) as HotelbedsCredential[];
}

const STATUS_COLORS: Record<string, string> = {
  connected: 'bg-accent/10 text-accent',
  not_configured: 'bg-secondary text-muted-foreground',
  auth_failed: 'bg-error/10 text-error',
  permission_denied: 'bg-error/10 text-error',
  quota_rate_limit: 'bg-warning/10 text-warning',
  network_error: 'bg-error/10 text-error',
  configuration_error: 'bg-error/10 text-error',
};

const SYNC_STATUS_COLORS: Record<SyncStatus, string> = {
  pending: 'bg-secondary text-muted-foreground',
  running: 'bg-primary/10 text-primary',
  paused: 'bg-warning/10 text-warning',
  completed: 'bg-accent/10 text-accent',
  partially_completed: 'bg-warning/10 text-warning',
  paused_quota: 'bg-warning/10 text-warning',
  stopped: 'bg-secondary text-muted-foreground',
  failed: 'bg-error/10 text-error',
  cancelled: 'bg-secondary text-muted-foreground',
};

const SYNC_TYPE_LABELS: Record<string, string> = {
  content: 'Hotel Content',
  rooms: 'Room Types',
  prices: 'Reference Prices',
  content_and_rooms: 'Content + Rooms',
  rate_check: 'Live Rate Verification',
  readiness_audit: 'Booking Readiness Audit',
};

const SYNC_TYPE_ICONS: Record<string, typeof Building2> = {
  content: Building2,
  rooms: BedDouble,
  prices: Tag,
  content_and_rooms: ListChecks,
  rate_check: Zap,
  readiness_audit: ShieldCheck,
};

// ─── Main Component ─────────────────────────────────────────────────────

export function HotelbedsSyncCenter() {
  const [activeTab, setActiveTab] = useState<'settings' | 'sync' | 'history'>('settings');

  return (
    <div>
      <div className="flex items-center gap-3">
        <Database className="h-7 w-7 text-accent" strokeWidth={1.5} />
        <div>
          <h1 className="font-serif text-3xl font-light text-foreground">Hotelbeds Sync Center</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manually control Hotelbeds content and room synchronization.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-6 flex gap-2 border-b border-border">
        {([
          { id: 'settings', label: 'API Settings', icon: Plug },
          { id: 'sync', label: 'Stays Sync', icon: RefreshCw },
          { id: 'history', label: 'Sync History', icon: Clock },
        ] as const).map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-xs font-medium uppercase tracking-wider transition-colors',
                activeTab === tab.id
                  ? 'border-b-2 border-accent text-accent'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        {activeTab === 'settings' && <ApiSettingsTab />}
        {activeTab === 'sync' && <SyncTab />}
        {activeTab === 'history' && <HistoryTab />}
      </div>
    </div>
  );
}

// ─── API Settings Tab ───────────────────────────────────────────────────

function ApiSettingsTab() {
  const [credentials, setCredentials] = useState<HotelbedsCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [error, setError] = useState<string | null>(null);
  const [diagnostic, setDiagnostic] = useState<{
    primary: { configured: boolean; environment: string };
    catalog: { configured: boolean; environment: string; fallingBackToPrimary: boolean };
    separateCredentialValues: boolean;
    summary: string;
  } | null>(null);

  const loadCredentials = useCallback(async () => {
    setLoading(true);
    try {
      const creds = await fetchCredentials();
      setCredentials(creds);
    } catch {
      setError('Failed to load credentials');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCredentials(); }, [loadCredentials]);

  useEffect(() => {
    (async () => {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hotelbeds-credential-diagnostic`,
          { method: 'GET', headers },
        );
        if (res.ok) {
          const data = await res.json();
          setDiagnostic(data);
        }
      } catch { /* non-critical */ }
    })();
  }, []);

  const handleSave = async (data: CredentialFormData) => {
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const action = editingId ? 'update' : 'create';
      const body: Record<string, unknown> = { action, ...data };
      if (editingId) body.id = editingId;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hotelbeds-credentials`,
        { method: 'POST', headers, body: JSON.stringify(body) },
      );
      const result = await res.json();
      if (result.error) {
        setError(result.error);
        return;
      }
      setShowForm(false);
      setEditingId(null);
      await loadCredentials();
    } catch {
      setError('Failed to save credential');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this Hotelbeds API account? This cannot be undone.')) return;
    try {
      const headers = await getAuthHeaders();
      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hotelbeds-credentials`,
        { method: 'POST', headers, body: JSON.stringify({ action: 'delete', id }) },
      );
      await loadCredentials();
    } catch {
      setError('Failed to delete credential');
    }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      const headers = await getAuthHeaders();
      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hotelbeds-credentials`,
        { method: 'POST', headers, body: JSON.stringify({ action: 'toggle', id, isActive }) },
      );
      await loadCredentials();
    } catch {
      setError('Failed to toggle credential');
    }
  };

  const handleTest = async (id: string) => {
    const cred = credentials.find((c) => c.id === id);
    const credLabel = cred?.label || 'this account';
    const envLabel = cred?.environment || 'test';
    const confirmed = confirm(
      `Warning: This will make a LIVE API request to Hotelbeds (${envLabel} environment) using "${credLabel}".\n\n` +
      `This consumes API quota. If the quota is exhausted, the response may trigger a quota pause.\n\n` +
      `Click OK to proceed with the live connection test, or Cancel to abort.`
    );
    if (!confirmed) return;

    setTestingId(id);
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hotelbeds-credentials`,
        { method: 'POST', headers, body: JSON.stringify({ action: 'test', id }) },
      );
      const data = await res.json();
      if (data.error) {
        setTestResults((prev) => ({ ...prev, [id]: { status: 'error', message: data.error } }));
      } else {
        setTestResults((prev) => ({ ...prev, [id]: data }));
      }
      await loadCredentials();
    } catch {
      setTestResults((prev) => ({ ...prev, [id]: { status: 'network_error', message: 'Request failed' } }));
    } finally {
      setTestingId(null);
    }
  };

  if (loading) {
    return (
      <div className="border border-border bg-background p-12 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-xl font-medium text-foreground">Hotelbeds API Accounts</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage multiple Hotelbeds API credential sets. Secrets are encrypted and never exposed to the browser.
          </p>
        </div>
        <button
          onClick={() => { setEditingId(null); setShowForm(true); }}
          className="inline-flex items-center gap-2 bg-foreground px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-background transition-all hover:bg-foreground/85"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
          Add Hotelbeds API
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 border border-error bg-error/5 p-3 text-sm text-error">
          <AlertTriangle className="h-4 w-4 shrink-0" strokeWidth={1.5} />
          {error}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <CredentialForm
          editingId={editingId}
          existingLabel={credentials.find((c) => c.id === editingId)?.label || ''}
          existingEnvironment={credentials.find((c) => c.id === editingId)?.environment || 'test'}
          existingPurpose={credentials.find((c) => c.id === editingId)?.purpose || ''}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditingId(null); }}
        />
      )}

      {/* Empty state */}
      {credentials.length === 0 && !showForm && (
        <div className="border border-border bg-background p-12 text-center">
          <KeyRound className="mx-auto h-8 w-8 text-border" strokeWidth={1.5} />
          <p className="mt-4 text-sm text-muted-foreground">No Hotelbeds API accounts configured yet.</p>
          <p className="mt-1 text-xs text-muted-foreground">Click "Add Hotelbeds API" to create your first credential set.</p>
        </div>
      )}

      {/* Credential cards */}
      {credentials.length > 0 && (
        <div className="space-y-4">
          {credentials.map((cred) => (
            <CredentialCard
              key={cred.id}
              credential={cred}
              testResult={testResults[cred.id]}
              testing={testingId === cred.id}
              onTest={() => handleTest(cred.id)}
              onEdit={() => { setEditingId(cred.id); setShowForm(true); }}
              onToggle={() => handleToggle(cred.id, !cred.is_active)}
              onDelete={() => handleDelete(cred.id)}
            />
          ))}
        </div>
      )}

      {/* Credential configuration diagnostic */}
      {diagnostic && (
        <div className={cn(
          'border p-4',
          diagnostic.catalog.fallingBackToPrimary
            ? 'border-warning/40 bg-warning/5'
            : 'border-border bg-secondary'
        )}>
          <div className="flex items-start gap-2">
            <Activity className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" strokeWidth={1.5} />
            <div className="text-xs text-muted-foreground">
              <span className="font-medium uppercase tracking-wider text-foreground">Credential Configuration</span>
              <p className="mt-1">{diagnostic.summary}</p>
              {diagnostic.catalog.fallingBackToPrimary && (
                <p className="mt-1 text-warning">
                  Catalog credentials are falling back to primary. Both roles share the same Hotelbeds account and quota.
                </p>
              )}
              {!diagnostic.separateCredentialValues && diagnostic.primary.configured && diagnostic.catalog.configured && !diagnostic.catalog.fallingBackToPrimary && (
                <p className="mt-1 text-warning">
                  Primary and catalog credentials use the same values. They may share the same Hotelbeds account and quota.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Security note */}
      <div className="border border-border bg-secondary p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-accent" strokeWidth={1.5} />
          <span>API keys and secrets are encrypted at rest in the database using pgcrypto PGP encryption. They are only decrypted server-side inside Edge Functions and are never returned to the browser. The existing env-var credentials (HOTELBEDS_PRIMARY_*, HOTELBEDS_CATALOG_*) continue to work as a fallback.</span>
        </div>
      </div>
    </div>
  );
}

// ─── Credential Form ────────────────────────────────────────────────────

interface CredentialFormData {
  label: string;
  environment: string;
  apiKey: string;
  apiSecret: string;
  purpose: string;
}

function CredentialForm({
  editingId,
  existingLabel,
  existingEnvironment,
  existingPurpose,
  onSave,
  onCancel,
}: {
  editingId: string | null;
  existingLabel: string;
  existingEnvironment: string;
  existingPurpose: string;
  onSave: (data: CredentialFormData) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState(existingLabel);
  const [environment, setEnvironment] = useState(existingEnvironment);
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [purpose, setPurpose] = useState(existingPurpose);
  const [showSecret, setShowSecret] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;
    if (!editingId && (!apiKey.trim() || !apiSecret.trim())) return;
    onSave({ label: label.trim(), environment, apiKey: apiKey.trim(), apiSecret: apiSecret.trim(), purpose: purpose.trim() });
  };

  return (
    <form onSubmit={handleSubmit} className="border border-accent bg-background p-6">
      <h3 className="font-serif text-lg font-medium text-foreground">
        {editingId ? 'Edit Hotelbeds API Account' : 'Add Hotelbeds API Account'}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {editingId ? 'Leave the key/secret fields blank to keep the existing values.' : 'Enter your Hotelbeds API credentials. They will be encrypted and stored securely.'}
      </p>

      <div className="mt-4 space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Account Name / Label</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Hotelbeds Account 1"
            className="w-full border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-accent"
            required
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Environment</label>
          <div className="flex gap-2">
            {(['test', 'production'] as const).map((env) => (
              <button
                key={env}
                type="button"
                onClick={() => setEnvironment(env)}
                className={cn(
                  'px-4 py-2 text-xs font-medium uppercase tracking-wider transition-colors',
                  environment === env
                    ? 'bg-foreground text-background'
                    : 'border border-border text-muted-foreground hover:text-foreground'
                )}
              >
                {env}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">API Key</label>
            <input
              type={editingId ? 'password' : 'text'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={editingId ? '•••••••• (leave blank to keep)' : 'Enter API key'}
              className="w-full border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-accent"
              required={!editingId}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">API Secret</label>
            <div className="relative">
              <input
                type={showSecret ? 'text' : 'password'}
                value={apiSecret}
                onChange={(e) => setApiSecret(e.target.value)}
                placeholder={editingId ? '•••••••• (leave blank to keep)' : 'Enter API secret'}
                className="w-full border border-border bg-background px-3 py-2.5 pr-10 text-sm focus:outline-none focus:border-accent"
                required={!editingId}
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showSecret ? <X className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Purpose / Notes (optional)</label>
          <input
            type="text"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="e.g. Primary booking account, content sync only, etc."
            className="w-full border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-accent"
          />
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="border border-border px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="inline-flex items-center gap-2 bg-foreground px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-background transition-all hover:bg-foreground/85"
        >
          <Check className="h-3.5 w-3.5" strokeWidth={1.5} />
          {editingId ? 'Update Account' : 'Save Account'}
        </button>
      </div>
    </form>
  );
}

// ─── Credential Card ────────────────────────────────────────────────────

interface TestResult {
  status: string;
  message?: string;
  capabilities?: { contentApi: boolean; bookingApi: boolean; transfers: boolean };
}

function CredentialCard({
  credential,
  testResult,
  testing,
  onTest,
  onEdit,
  onToggle,
  onDelete,
}: {
  credential: HotelbedsCredential;
  testResult?: TestResult;
  testing: boolean;
  onTest: () => void;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const testStatus = testResult?.status || credential.last_test_status;
  const capabilities = testResult?.capabilities || credential.last_test_capabilities;

  return (
    <div className={cn(
      'border bg-background p-6 transition-colors',
      credential.is_active ? 'border-border' : 'border-border opacity-60'
    )}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 items-center justify-center bg-secondary">
            <KeyRound className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h3 className="font-serif text-lg font-medium text-foreground">{credential.label}</h3>
              <span className={cn(
                'px-2 py-0.5 text-[0.625rem] font-medium uppercase tracking-wider',
                credential.environment === 'production' ? 'bg-accent/10 text-accent' : 'bg-warning/10 text-warning'
              )}>
                {credential.environment}
              </span>
              {credential.is_legacy && (
                <span className="bg-secondary px-2 py-0.5 text-[0.625rem] font-medium uppercase tracking-wider text-muted-foreground">
                  Legacy {credential.legacy_role}
                </span>
              )}
            </div>
            {credential.purpose && (
              <p className="mt-1 text-sm text-muted-foreground">{credential.purpose}</p>
            )}
            <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
              <span className={cn(
                'inline-flex items-center gap-1 font-medium uppercase tracking-wider',
                credential.is_active ? 'text-accent' : 'text-muted-foreground'
              )}>
                <Power className="h-3 w-3" strokeWidth={1.5} />
                {credential.is_active ? 'Active' : 'Inactive'}
              </span>
              {credential.last_tested_at && (
                <span>Last tested: {new Date(credential.last_tested_at).toLocaleString()}</span>
              )}
            </div>
          </div>
        </div>

        <div className="text-right">
          {testStatus && (
            <span className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium uppercase tracking-wider',
              STATUS_COLORS[testStatus] || 'bg-secondary text-muted-foreground'
            )}>
              {testStatus === 'connected' ? <Check className="h-3 w-3" /> : testStatus === 'error' || testStatus === 'auth_failed' ? <X className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
              {testStatus.replace(/_/g, ' ')}
            </span>
          )}
        </div>
      </div>

      {/* Capabilities */}
      {capabilities && (
        <div className="mt-4 border-t border-border pt-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Detected Capabilities</p>
          <div className="mt-2 flex flex-wrap gap-3">
            <CapabilityBadge label="Content API" enabled={capabilities.contentApi} />
            <CapabilityBadge label="Booking API" enabled={capabilities.bookingApi} />
            <CapabilityBadge label="Transfers" enabled={capabilities.transfers} />
          </div>
        </div>
      )}

      {/* Test result message */}
      {testResult?.message && (
        <div className={cn(
          'mt-3 text-xs',
          testResult.status === 'connected' ? 'text-accent' : 'text-error'
        )}>
          {testResult.message}
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={onTest}
          disabled={testing}
          className="inline-flex items-center gap-2 border border-border px-4 py-2 text-xs font-medium uppercase tracking-wider text-foreground transition-colors hover:bg-secondary disabled:opacity-40"
        >
          {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} /> : <Plug className="h-3.5 w-3.5" strokeWidth={1.5} />}
          {testing ? 'Testing...' : 'Test Connection (Live)'}
        </button>
        <button
          onClick={onEdit}
          className="inline-flex items-center gap-2 border border-border px-4 py-2 text-xs font-medium uppercase tracking-wider text-foreground transition-colors hover:bg-secondary"
        >
          <Edit3 className="h-3.5 w-3.5" strokeWidth={1.5} />
          Edit
        </button>
        <button
          onClick={onToggle}
          className="inline-flex items-center gap-2 border border-border px-4 py-2 text-xs font-medium uppercase tracking-wider text-foreground transition-colors hover:bg-secondary"
        >
          <Power className="h-3.5 w-3.5" strokeWidth={1.5} />
          {credential.is_active ? 'Disable' : 'Enable'}
        </button>
        <button
          onClick={onDelete}
          className="inline-flex items-center gap-2 border border-error px-4 py-2 text-xs font-medium uppercase tracking-wider text-error transition-colors hover:bg-error/10"
        >
          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
          Delete
        </button>
      </div>
    </div>
  );
}

function CapabilityBadge({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 border px-3 py-1.5 text-xs font-medium',
      enabled ? 'border-accent/30 bg-accent/5 text-accent' : 'border-border text-muted-foreground'
    )}>
      {enabled ? <Check className="h-3 w-3" strokeWidth={1.5} /> : <X className="h-3 w-3" strokeWidth={1.5} />}
      {label}
    </span>
  );
}

// ─── Sync Tab ───────────────────────────────────────────────────────────

function SyncTab() {
  const [syncType, setSyncType] = useState<SyncType>('rooms');
  const [scope, setScope] = useState<SyncScope>('one_property');
  const [batchSize, setBatchSize] = useState(5);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([]);
  const [selectedDestinationId, setSelectedDestinationId] = useState('');
  const [selectedDestinationIds, setSelectedDestinationIds] = useState<string[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showAllWarning, setShowAllWarning] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncHistoryEntry | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [destinations, setDestinations] = useState<DestinationOption[]>([]);
  const [propertySearch, setPropertySearch] = useState('');
  const [loadingProps, setLoadingProps] = useState(true);
  const [showPropertyDropdown, setShowPropertyDropdown] = useState(false);
  const [credentials, setCredentials] = useState<HotelbedsCredential[]>([]);
  const [selectedCredentialId, setSelectedCredentialId] = useState('');

  useEffect(() => {
    (async () => {
      try {
        // Fetch Hotelbeds properties
        const { data: props } = await supabase
          .from('properties')
          .select(`
            id, name, slug, supplier_hotel_code, destination_id,
            supplier_status, city, last_synced_at,
            destination_name
          `)
          .eq('supplier_name', 'hotelbeds')
          .not('supplier_hotel_code', 'is', null)
          .order('name', { ascending: true })
          .limit(500);

        // Fetch room counts
        const { data: roomCounts } = await supabase
          .rpc('get_property_room_counts');

        const roomCountMap = new Map<string, number>();
        (roomCounts || []).forEach((r: { property_id: string; room_count: number }) => {
          roomCountMap.set(r.property_id, r.room_count);
        });

        const mapped: PropertyOption[] = (props || []).map((p: Record<string, unknown>) => ({
          id: p.id as string,
          name: p.name as string,
          slug: p.slug as string,
          supplier_hotel_code: p.supplier_hotel_code as string | null,
          destination_id: p.destination_id as string | null,
          supplier_status: p.supplier_status as string | null,
          city: p.city as string | null,
          destination_name: p.destination_name as string | null,
          last_synced_at: p.last_synced_at as string | null,
          room_count: roomCountMap.get(p.id as string) || 0,
        }));

        setProperties(mapped);

        // Fetch destinations with HB properties
        const { data: dests } = await supabase.rpc('get_destinations_with_hb_counts');
        if (dests) {
          setDestinations(dests as DestinationOption[]);
        }
      } catch { /* ignore */ } finally {
        setLoadingProps(false);
      }
    })();

    // Fetch credentials
    fetchCredentials().then(setCredentials).catch(() => {});
  }, []);

  const filteredProperties = properties.filter((p) =>
    p.name.toLowerCase().includes(propertySearch.toLowerCase()) ||
    (p.supplier_hotel_code || '').includes(propertySearch)
  );

  const eligibleCount = destinations.reduce((sum, d) => sum + d.hotel_count, 0);

  const startSync = async () => {
    setShowConfirm(false);
    setShowAllWarning(false);
    setSyncing(true);
    setSyncError(null);
    setSyncResult(null);

    try {
      const headers = await getAuthHeaders();
      const body: Record<string, unknown> = {
        action: 'start',
        syncType,
        scope,
        batchSize,
        credentialId: selectedCredentialId,
      };

      if (scope === 'one_property') {
        body.propertyIds = [selectedPropertyId];
      } else if (scope === 'selected_properties') {
        body.propertyIds = selectedPropertyIds;
      } else if (scope === 'one_destination') {
        body.destinationIds = [selectedDestinationId];
      } else if (scope === 'selected_destinations') {
        body.destinationIds = selectedDestinationIds;
      }

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hotelbeds-sync-control`,
        { method: 'POST', headers, body: JSON.stringify(body) },
      );

      const data = await res.json();

      if (data.error) {
        setSyncError(data.error);
      } else {
        // Fetch the full sync record
        const statusRes = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hotelbeds-sync-control`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({ action: 'status', syncId: data.syncId }),
          },
        );
        const statusData = await statusRes.json();
        if (statusData.sync) {
          setSyncResult(statusData.sync as SyncHistoryEntry);
        }
      }
    } catch {
      setSyncError('Sync request failed');
    } finally {
      setSyncing(false);
    }
  };

  const controlSync = async (syncId: string, action: 'pause' | 'resume' | 'stop') => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hotelbeds-sync-control`,
        { method: 'POST', headers, body: JSON.stringify({ action, syncId }) },
      );
      const data = await res.json();
      if (data.sync && syncResult?.id === syncId) {
        setSyncResult(data.sync as SyncHistoryEntry);
      } else if (syncResult?.id === syncId) {
        const newStatus: SyncStatus = action === 'pause' ? 'paused' : action === 'stop' ? 'stopped' : 'running';
        setSyncResult({ ...syncResult, status: newStatus });
      }
    } catch { /* ignore */ }
  };

  const scopePropertyCount =
    scope === 'one_property' ? (selectedPropertyId ? 1 : 0) :
    scope === 'selected_properties' ? selectedPropertyIds.length :
    scope === 'one_destination' ? destinations.find((d) => d.id === selectedDestinationId)?.hotel_count || 0 :
    scope === 'selected_destinations' ? selectedDestinationIds.reduce((sum, id) => sum + (destinations.find((d) => d.id === id)?.hotel_count || 0), 0) :
    eligibleCount;

  const canStart = () => {
    if (syncing) return false;
    if (!selectedCredentialId) return false;
    if (scope === 'one_property') return !!selectedPropertyId;
    if (scope === 'selected_properties') return selectedPropertyIds.length > 0;
    if (scope === 'one_destination') return !!selectedDestinationId;
    if (scope === 'selected_destinations') return selectedDestinationIds.length > 0;
    return true;
  };

  return (
    <div className="space-y-6">
      {/* Credential Selector */}
      <div className="border border-accent/30 bg-accent/5 p-6">
        <div className="flex items-center gap-3">
          <KeyRound className="h-5 w-5 text-accent" strokeWidth={1.5} />
          <div>
            <h2 className="font-serif text-xl font-medium text-foreground">Hotelbeds API Account</h2>
            <p className="mt-1 text-sm text-muted-foreground">Select which credential set to use for this sync. No automatic rotation.</p>
          </div>
        </div>
        <div className="mt-4">
          <select
            value={selectedCredentialId}
            onChange={(e) => setSelectedCredentialId(e.target.value)}
            className="w-full border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-accent"
          >
            <option value="">— Select API Account —</option>
            {credentials.filter((c) => c.is_active).map((c) => (
              <option key={c.id} value={c.id}>
                {c.label} ({c.environment}){c.last_test_status === 'connected' ? ' ✓' : ''}
              </option>
            ))}
          </select>
          {credentials.filter((c) => c.is_active).length === 0 && (
            <p className="mt-2 text-xs text-warning">
              No active API accounts configured. Add one in the API Settings tab first.
            </p>
          )}
        </div>
      </div>

      {/* Sync Type Selection */}
      <div className="border border-border bg-background p-6">
        <h2 className="font-serif text-xl font-medium text-foreground">Sync Actions</h2>
        <p className="mt-1 text-sm text-muted-foreground">Choose what type of synchronization to perform.</p>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {([
            { id: 'content', label: 'Sync Hotel Content', desc: 'Import/update static property information', icon: Building2 },
            { id: 'rooms', label: 'Sync Room Types', desc: 'Import Hotelbeds room catalog into property_rooms', icon: BedDouble },
            { id: 'prices', label: 'Sync Reference Prices', desc: 'Fetch supplier price snapshots (admin only)', icon: Tag },
            { id: 'content_and_rooms', label: 'Sync Content + Rooms', desc: 'Combined content and room sync in one operation', icon: ListChecks },
            { id: 'rate_check', label: 'Live Rate Verification', desc: 'Check if supplier returns live availability and rates', icon: Zap },
            { id: 'readiness_audit', label: 'Booking Readiness Audit', desc: 'Audit properties for content, rooms, pricing, and readiness', icon: ShieldCheck },
          ] as const).map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.id}
                onClick={() => setSyncType(opt.id as SyncType)}
                className={cn(
                  'flex items-start gap-3 border p-4 text-left transition-colors',
                  syncType === opt.id
                    ? 'border-accent bg-accent/5'
                    : 'border-border hover:bg-secondary'
                )}
              >
                <Icon className={cn('h-5 w-5 shrink-0', syncType === opt.id ? 'text-accent' : 'text-muted-foreground')} strokeWidth={1.5} />
                <div>
                  <p className={cn('text-sm font-medium', syncType === opt.id ? 'text-accent' : 'text-foreground')}>{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sync Scope */}
      <div className="border border-border bg-background p-6">
        <h2 className="font-serif text-xl font-medium text-foreground">Sync Scope</h2>
        <p className="mt-1 text-sm text-muted-foreground">Choose what to synchronize.</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {([
            { id: 'one_property', label: 'One Property' },
            { id: 'selected_properties', label: 'Selected Properties' },
            { id: 'one_destination', label: 'One Destination' },
            { id: 'selected_destinations', label: 'Selected Destinations' },
            { id: 'all_eligible', label: 'All Eligible Properties' },
          ] as const).map((opt) => (
            <button
              key={opt.id}
              onClick={() => setScope(opt.id as SyncScope)}
              className={cn(
                'px-4 py-2 text-xs font-medium uppercase tracking-wider transition-colors',
                scope === opt.id
                  ? 'bg-foreground text-background'
                  : 'border border-border text-muted-foreground hover:text-foreground'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* One Property selector */}
        {scope === 'one_property' && (
          <div className="mt-4">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Select Property</label>
            {loadingProps ? (
              <div className="border border-border p-4 text-center">
                <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="relative">
                <div className="flex items-center gap-2 border border-border bg-background px-3 py-2.5">
                  <SearchIcon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                  <input
                    type="text"
                    value={propertySearch}
                    onChange={(e) => { setPropertySearch(e.target.value); setShowPropertyDropdown(true); }}
                    onFocus={() => setShowPropertyDropdown(true)}
                    placeholder="Search by name or Hotelbeds code..."
                    className="flex-1 bg-background text-sm focus:outline-none"
                  />
                  {selectedPropertyId && (
                    <button
                      onClick={() => setSelectedPropertyId('')}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {showPropertyDropdown && (
                  <div className="absolute z-20 mt-1 max-h-80 w-full overflow-y-auto border border-border bg-background shadow-lg">
                    {filteredProperties.slice(0, 50).map((p) => (
                      <button
                        key={p.id}
                        onClick={() => { setSelectedPropertyId(p.id); setShowPropertyDropdown(false); setPropertySearch(''); }}
                        className={cn(
                          'flex w-full items-center justify-between border-b border-border px-4 py-3 text-left transition-colors hover:bg-secondary',
                          selectedPropertyId === p.id && 'bg-accent/5'
                        )}
                      >
                        <div>
                          <p className="text-sm font-medium text-foreground">{p.name}</p>
                          <p className="text-xs text-muted-foreground">
                            HB: {p.supplier_hotel_code} · {p.destination_name || p.city || '—'}
                            {p.room_count > 0 && ` · ${p.room_count} rooms`}
                          </p>
                        </div>
                        {selectedPropertyId === p.id && <Check className="h-4 w-4 text-accent" />}
                      </button>
                    ))}
                    {filteredProperties.length === 0 && (
                      <div className="p-4 text-center text-sm text-muted-foreground">No properties found</div>
                    )}
                  </div>
                )}

                {selectedPropertyId && !showPropertyDropdown && (
                  <div className="mt-2 border border-border bg-secondary p-3">
                    {(() => {
                      const p = properties.find((pr) => pr.id === selectedPropertyId);
                      if (!p) return null;
                      return (
                        <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                          <div><span className="text-muted-foreground">Name:</span> <span className="font-medium text-foreground">{p.name}</span></div>
                          <div><span className="text-muted-foreground">HB Code:</span> <span className="font-medium text-foreground">{p.supplier_hotel_code}</span></div>
                          <div><span className="text-muted-foreground">Destination:</span> <span className="font-medium text-foreground">{p.destination_name || '—'}</span></div>
                          <div><span className="text-muted-foreground">Status:</span> <span className="font-medium text-foreground">{p.supplier_status || '—'}</span></div>
                          <div><span className="text-muted-foreground">Last Sync:</span> <span className="font-medium text-foreground">{p.last_synced_at ? new Date(p.last_synced_at).toLocaleDateString() : '—'}</span></div>
                          <div><span className="text-muted-foreground">Rooms:</span> <span className="font-medium text-foreground">{p.room_count}</span></div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Selected Properties */}
        {scope === 'selected_properties' && (
          <div className="mt-4">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Select Properties ({selectedPropertyIds.length} selected)
            </label>
            <div className="max-h-60 overflow-y-auto border border-border bg-background">
              {properties.slice(0, 100).map((p) => (
                <label key={p.id} className="flex items-center gap-3 border-b border-border px-4 py-2.5 hover:bg-secondary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedPropertyIds.includes(p.id)}
                    onChange={() => {
                      setSelectedPropertyIds((prev) =>
                        prev.includes(p.id) ? prev.filter((id) => id !== p.id) : [...prev, p.id]
                      );
                    }}
                    className="h-4 w-4"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{p.name}</p>
                    <p className="text-xs text-muted-foreground">HB: {p.supplier_hotel_code} · {p.destination_name || p.city}</p>
                  </div>
                  {p.room_count > 0 && <span className="text-xs text-muted-foreground">{p.room_count} rooms</span>}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* One Destination */}
        {scope === 'one_destination' && (
          <div className="mt-4">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Select Destination</label>
            <select
              value={selectedDestinationId}
              onChange={(e) => setSelectedDestinationId(e.target.value)}
              className="w-full border border-border bg-background px-3 py-2.5 text-sm"
            >
              <option value="">— Select —</option>
              {destinations.filter((d) => d.hotel_count > 0).map((d) => (
                <option key={d.id} value={d.id}>{d.name}, {d.country} ({d.hotel_count} properties)</option>
              ))}
            </select>
            {selectedDestinationId && (
              <p className="mt-2 text-xs text-muted-foreground">
                {destinations.find((d) => d.id === selectedDestinationId)?.hotel_count || 0} eligible Hotelbeds properties
              </p>
            )}
          </div>
        )}

        {/* Selected Destinations */}
        {scope === 'selected_destinations' && (
          <div className="mt-4">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Select Destinations ({selectedDestinationIds.length} selected)
            </label>
            <div className="max-h-60 overflow-y-auto border border-border bg-background">
              {destinations.filter((d) => d.hotel_count > 0).map((d) => (
                <label key={d.id} className="flex items-center gap-3 border-b border-border px-4 py-2.5 hover:bg-secondary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedDestinationIds.includes(d.id)}
                    onChange={() => {
                      setSelectedDestinationIds((prev) =>
                        prev.includes(d.id) ? prev.filter((id) => id !== d.id) : [...prev, d.id]
                      );
                    }}
                    className="h-4 w-4"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{d.name}, {d.country}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{d.hotel_count} properties</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* All Eligible warning */}
        {scope === 'all_eligible' && (
          <div className="mt-4 border border-warning bg-warning/5 p-4">
            <div className="flex items-start gap-2 text-sm text-warning">
              <AlertTriangle className="h-5 w-5 shrink-0" strokeWidth={1.5} />
              <div>
                <p className="font-medium">This may consume significant Hotelbeds API quota.</p>
                <p className="mt-1 text-xs">Only start this if you intentionally want to synchronize the entire eligible inventory. {eligibleCount} properties are eligible.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Batch Size */}
      <div className="border border-border bg-background p-6">
        <h2 className="font-serif text-xl font-medium text-foreground">Batch Size</h2>
        <p className="mt-1 text-sm text-muted-foreground">Maximum number of properties to process in this sync.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {[5, 10, 25, 50, 100].map((size) => (
            <button
              key={size}
              onClick={() => setBatchSize(size)}
              className={cn(
                'px-4 py-2 text-sm font-medium transition-colors',
                batchSize === size
                  ? 'bg-foreground text-background'
                  : 'border border-border text-muted-foreground hover:text-foreground'
              )}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* Start / Confirm */}
      <div className="border border-border bg-background p-6">
        {syncError && (
          <div className="mb-4 flex items-center gap-2 border border-error bg-error/5 p-3 text-sm text-error">
            <AlertTriangle className="h-4 w-4 shrink-0" strokeWidth={1.5} />
            {syncError}
          </div>
        )}

        {showConfirm ? (
          <div className="space-y-4">
            <div className="border border-accent bg-accent/5 p-4">
              <h3 className="font-serif text-lg font-medium text-foreground">Confirm Sync</h3>
              <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                <div><span className="text-muted-foreground">Type:</span> <span className="font-medium text-foreground">{SYNC_TYPE_LABELS[syncType]}</span></div>
                <div><span className="text-muted-foreground">Scope:</span> <span className="font-medium text-foreground">{scope.replace(/_/g, ' ')}</span></div>
                <div><span className="text-muted-foreground">Properties:</span> <span className="font-medium text-foreground">{Math.min(scopePropertyCount, batchSize)}</span></div>
                <div><span className="text-muted-foreground">Batch Size:</span> <span className="font-medium text-foreground">{batchSize}</span></div>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                You are about to synchronize {Math.min(scopePropertyCount, batchSize)} properties using Hotelbeds.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="border border-border px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={startSync}
                disabled={syncing}
                className="inline-flex items-center gap-2 bg-foreground px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-background transition-all hover:bg-foreground/85 disabled:opacity-40"
              >
                {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} /> : <Play className="h-3.5 w-3.5" strokeWidth={1.5} />}
                {syncing ? 'Syncing...' : 'Start Sync'}
              </button>
            </div>
          </div>
        ) : showAllWarning && scope === 'all_eligible' ? (
          <div className="space-y-4">
            <div className="border border-warning bg-warning/5 p-4">
              <h3 className="font-serif text-lg font-medium text-warning">All Eligible Properties</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                This will synchronize up to {Math.min(eligibleCount, batchSize)} properties. This may consume significant Hotelbeds API quota. Only proceed if you intentionally want to synchronize the entire eligible inventory.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAllWarning(false)}
                className="border border-border px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={() => { setShowAllWarning(false); setShowConfirm(true); }}
                className="border border-warning px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-warning hover:bg-warning/10"
              >
                I understand — Continue
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => {
              if (scope === 'all_eligible') {
                setShowAllWarning(true);
              } else {
                setShowConfirm(true);
              }
            }}
            disabled={!canStart()}
            className="inline-flex items-center gap-2 bg-foreground px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-background transition-all hover:bg-foreground/85 disabled:opacity-40"
          >
            <Play className="h-3.5 w-3.5" strokeWidth={1.5} />
            Start Sync
          </button>
        )}
      </div>

      {/* Sync Status */}
      {syncing && (
        <div className="border border-border bg-background p-6">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" strokeWidth={1.5} />
            <h2 className="font-serif text-xl font-medium text-foreground">Sync Running...</h2>
          </div>
        </div>
      )}

      {syncResult && !syncing && (
        <div className="border border-border bg-background p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl font-medium text-foreground">Sync Result</h2>
            <span className={cn('px-3 py-1.5 text-xs font-medium uppercase tracking-wider', SYNC_STATUS_COLORS[syncResult.status])}>
              {syncResult.status.replace(/_/g, ' ')}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatBox label="Properties" value={`${syncResult.properties_processed} / ${syncResult.properties_total}`} />
            <StatBox label="Hotels Processed" value={syncResult.hotels_processed || 0} />
            <StatBox label="New Imports" value={syncResult.hotels_inserted || 0} accent />
            <StatBox label="Existing Updated" value={syncResult.hotels_updated || 0} />
            <StatBox label="Duplicates Skipped" value={syncResult.duplicates_skipped || 0} />
            <StatBox label="Rooms Found" value={syncResult.rooms_found} />
            <StatBox label="Rooms Created" value={syncResult.rooms_created} />
            <StatBox label="Rooms Updated" value={syncResult.rooms_updated} />
            <StatBox label="Prices Found" value={syncResult.prices_found} />
            <StatBox label="Errors" value={syncResult.errors_count} error={syncResult.errors_count > 0} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 text-xs text-muted-foreground">
            <div><span className="text-muted-foreground/60">Started:</span> {new Date(syncResult.started_at).toLocaleString()}</div>
            <div><span className="text-muted-foreground/60">Completed:</span> {syncResult.completed_at ? new Date(syncResult.completed_at).toLocaleString() : '—'}</div>
          </div>

          {syncResult.quota_paused && (
            <div className="mt-4 flex items-start gap-2 border border-warning bg-warning/5 p-3 text-sm text-warning">
              <AlertTriangle className="h-4 w-4 shrink-0" strokeWidth={1.5} />
              <div>
                <p className="font-medium">Quota Paused</p>
                <p className="mt-1 text-xs">{syncResult.quota_paused_reason || 'Hotelbeds API quota was exceeded during sync.'}</p>
              </div>
            </div>
          )}

          {syncResult.error_messages.length > 0 && (
            <div className="mt-4 border-t border-border pt-4">
              <p className="text-xs font-medium uppercase tracking-wider text-error">Errors</p>
              <div className="mt-2 space-y-1 text-xs text-error">
                {syncResult.error_messages.map((e, i) => <p key={i}>{e}</p>)}
              </div>
            </div>
          )}

          {(syncResult.status === 'running' || syncResult.status === 'paused' || syncResult.status === 'paused_quota') && (
            <div className="mt-4 flex gap-3">
              {syncResult.status === 'running' && (
                <button
                  onClick={() => controlSync(syncResult.id, 'pause')}
                  className="inline-flex items-center gap-2 border border-warning px-4 py-2 text-xs font-medium uppercase tracking-wider text-warning hover:bg-warning/10"
                >
                  <Pause className="h-3.5 w-3.5" strokeWidth={1.5} />
                  Pause
                </button>
              )}
              {(syncResult.status === 'paused' || syncResult.status === 'paused_quota') && (
                <button
                  onClick={() => controlSync(syncResult.id, 'resume')}
                  className="inline-flex items-center gap-2 border border-accent px-4 py-2 text-xs font-medium uppercase tracking-wider text-accent hover:bg-accent/10"
                >
                  <Play className="h-3.5 w-3.5" strokeWidth={1.5} />
                  Resume
                </button>
              )}
              <button
                onClick={() => controlSync(syncResult.id, 'stop')}
                className="inline-flex items-center gap-2 border border-error px-4 py-2 text-xs font-medium uppercase tracking-wider text-error hover:bg-error/10"
              >
                <Square className="h-3.5 w-3.5" strokeWidth={1.5} />
                Stop
              </button>
            </div>
          )}
        </div>
      )}

      {/* Quota paused banner */}
      <QuotaPausedBanner />
    </div>
  );
}

// ─── History Tab ────────────────────────────────────────────────────────

function HistoryTab() {
  const [history, setHistory] = useState<SyncHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hotelbeds-sync-control`,
        { method: 'POST', headers, body: JSON.stringify({ action: 'history' }) },
      );
      const data = await res.json();
      if (data.history) {
        setHistory(data.history as SyncHistoryEntry[]);
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  if (loading) {
    return (
      <div className="border border-border bg-background p-12 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="border border-border bg-background p-12 text-center">
        <Clock className="mx-auto h-8 w-8 text-border" strokeWidth={1.5} />
        <p className="mt-4 text-sm text-muted-foreground">No sync history yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {history.map((entry) => {
        const Icon = SYNC_TYPE_ICONS[entry.sync_type] || Database;
        const isExpanded = expanded === entry.id;
        return (
          <div key={entry.id} className="border border-border bg-background">
            <button
              onClick={() => setExpanded(isExpanded ? null : entry.id)}
              className="flex w-full items-center justify-between px-4 py-4 text-left"
            >
              <div className="flex items-center gap-3">
                {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                <Icon className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                <div>
                  <p className="text-sm font-medium text-foreground">{SYNC_TYPE_LABELS[entry.sync_type] || entry.sync_type}</p>
                  <p className="text-xs text-muted-foreground">
                    {entry.properties_processed} properties · {entry.rooms_found} rooms · {entry.admin_user_email || 'admin'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  {new Date(entry.started_at).toLocaleString()}
                </span>
                <span className={cn('px-2 py-0.5 text-[0.625rem] font-medium uppercase tracking-wider', SYNC_STATUS_COLORS[entry.status])}>
                  {entry.status.replace(/_/g, ' ')}
                </span>
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-border px-4 py-4">
                <div className="grid grid-cols-2 gap-4 text-xs sm:grid-cols-4">
                  <div><span className="text-muted-foreground">Scope:</span> <span className="font-medium text-foreground">{entry.scope.replace(/_/g, ' ')}</span></div>
                  <div><span className="text-muted-foreground">Batch Size:</span> <span className="font-medium text-foreground">{entry.batch_size}</span></div>
                  <div><span className="text-muted-foreground">Rooms Created:</span> <span className="font-medium text-accent">{entry.rooms_created}</span></div>
                  <div><span className="text-muted-foreground">Rooms Updated:</span> <span className="font-medium text-foreground">{entry.rooms_updated}</span></div>
                  <div><span className="text-muted-foreground">Rooms Skipped:</span> <span className="font-medium text-muted-foreground">{entry.rooms_skipped}</span></div>
                  <div><span className="text-muted-foreground">Deactivated:</span> <span className="font-medium text-muted-foreground">{entry.rooms_deactivated}</span></div>
                  <div><span className="text-muted-foreground">Prices Found:</span> <span className="font-medium text-foreground">{entry.prices_found}</span></div>
                  <div><span className="text-muted-foreground">Hotels Processed:</span> <span className="font-medium text-foreground">{entry.hotels_processed || 0}</span></div>
                  <div><span className="text-muted-foreground">New Imports:</span> <span className="font-medium text-accent">{entry.hotels_inserted || 0}</span></div>
                  <div><span className="text-muted-foreground">Existing Updated:</span> <span className="font-medium text-foreground">{entry.hotels_updated || 0}</span></div>
                  <div><span className="text-muted-foreground">Duplicates Skipped:</span> <span className="font-medium text-muted-foreground">{entry.duplicates_skipped || 0}</span></div>
                  <div><span className="text-muted-foreground">Errors:</span> <span className="font-medium text-error">{entry.errors_count}</span></div>
                  {entry.credential_label && (
                    <div><span className="text-muted-foreground">API Account:</span> <span className="font-medium text-foreground">{entry.credential_label}</span></div>
                  )}
                  {entry.credential_environment && (
                    <div><span className="text-muted-foreground">Environment:</span> <span className="font-medium text-foreground">{entry.credential_environment}</span></div>
                  )}
                </div>

                {entry.quota_paused && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-warning">
                    <AlertTriangle className="h-3.5 w-3.5" strokeWidth={1.5} />
                    Quota was paused: {entry.quota_paused_reason}
                  </div>
                )}

                {entry.error_messages.length > 0 && (
                  <div className="mt-3 border-t border-border pt-3">
                    <p className="text-xs font-medium uppercase tracking-wider text-error">Errors</p>
                    <div className="mt-1 space-y-1 text-xs text-error">
                      {entry.error_messages.map((e, i) => <p key={i}>{e}</p>)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Quota Paused Banner ────────────────────────────────────────────────

function QuotaPausedBanner() {
  const [paused, setPaused] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [pausedAt, setPausedAt] = useState<string | null>(null);
  const [queueRunning, setQueueRunning] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from('hotelbeds_queue_settings')
          .select('quota_paused, quota_paused_reason, quota_paused_at, queue_running')
          .eq('id', 1)
          .maybeSingle();
        if (data) {
          setPaused(data.quota_paused);
          setReason(data.quota_paused_reason);
          setPausedAt(data.quota_paused_at);
          setQueueRunning(data.queue_running);
        }
      } catch { /* ignore */ }
    })();
  }, []);

  if (!paused) return null;

  const formattedDate = pausedAt
    ? new Date(pausedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
    : null;

  return (
    <div className="border border-error bg-error/5 p-4">
      <div className="flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-error">
        <AlertTriangle className="h-4 w-4 shrink-0" strokeWidth={1.5} />
        Hotelbeds API — Quota Paused
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{reason || 'Quota is currently paused.'}</p>
      {formattedDate && (
        <p className="mt-1 text-xs text-muted-foreground">Paused since: {formattedDate}</p>
      )}
      <div className="mt-3 border-t border-error/20 pt-3">
        <p className="text-xs font-medium text-foreground">What this means:</p>
        <ul className="mt-1.5 space-y-1 text-xs text-muted-foreground">
          <li>• The queue is {queueRunning ? 'still marked as running — workers will stop on the next check' : 'stopped'}.</li>
          <li>• Start and Resume are blocked until the quota pause is explicitly reset.</li>
          <li>• Resetting the quota does NOT verify the Hotelbeds quota has replenished — it only clears the block.</li>
          <li>• After resetting, you must separately call Start or Resume to begin processing.</li>
        </ul>
      </div>
    </div>
  );
}

// ─── Stat Box ───────────────────────────────────────────────────────────

function StatBox({ label, value, accent, error }: { label: string; value: string | number; accent?: boolean; error?: boolean }) {
  return (
    <div className="border border-border p-3">
      <p className="text-[0.625rem] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn(
        'mt-1 font-serif text-xl font-medium',
        accent ? 'text-accent' : error ? 'text-error' : 'text-foreground'
      )}>
        {value}
      </p>
    </div>
  );
}
