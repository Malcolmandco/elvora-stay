import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  X, Loader2, Check, AlertTriangle, Plus, Trash2, Eye, Building2,
  ArrowLeft, MapPin, Star, Sparkles, Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  fetchDestinationForEditor,
  checkDestinationSlugUnique,
  createDestination,
  updateDestination,
  getDestinationStayStats,
  slugify,
} from '@/hooks/use-admin-destinations';
import { supabase } from '@/lib/supabase';
import type { AdminDestinationRow } from '@/hooks/use-admin-destinations';

interface DestinationEditorProps {
  destinationId?: string;
  isNew?: boolean;
  onClose: () => void;
  onSaved: () => void;
}

type EditorSection = 'basic' | 'editorial' | 'media' | 'publishing' | 'seo' | 'location' | 'stays';

export function DestinationEditor({ destinationId, isNew, onClose, onSaved }: DestinationEditorProps) {
  const [activeSection, setActiveSection] = useState<EditorSection>('basic');
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slugWarning, setSlugWarning] = useState<string | null>(null);
  const [stayStats, setStayStats] = useState({ total: 0, active: 0, featured: 0 });
  const [originalSlug, setOriginalSlug] = useState('');
  const [allDestinations, setAllDestinations] = useState<{ id: string; name: string; slug: string }[]>([]);

  const [form, setForm] = useState<Record<string, unknown>>({
    name: '',
    slug: '',
    country: '',
    country_code: '',
    region: '',
    continent: '',
    parent_destination_id: null,
    short_description: '',
    long_description: '',
    hero_image: '',
    hero_image_alt: '',
    cover_image: '',
    thumbnail_image: '',
    og_image: '',
    latitude: null,
    longitude: null,
    is_active: true,
    is_featured: false,
    is_popular: false,
    is_new: false,
    display_order: 0,
    destination_type: '',
    tags: [] as string[],
    tagline: '',
    editorial_title: '',
    editorial_description: '',
    travel_story: '',
    best_time_to_visit: '',
    why_visit: '',
    highlights: [] as string[],
    experiences: [] as string[],
    local_tips: [] as string[],
    seo_title: '',
    seo_description: '',
    seo_keywords: [] as string[],
    og_title: '',
    og_description: '',
    status: 'draft',
  });

  useEffect(() => {
    if (isNew) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const dest = await fetchDestinationForEditor(destinationId!);
        if (cancelled) return;
        setForm({
          name: dest.name,
          slug: dest.slug,
          country: dest.country,
          country_code: dest.country_code || '',
          region: dest.region || '',
          continent: dest.continent || '',
          parent_destination_id: dest.parent_destination_id || null,
          short_description: dest.short_description || '',
          long_description: dest.long_description || '',
          hero_image: dest.hero_image || '',
          hero_image_alt: dest.hero_image_alt || '',
          cover_image: dest.cover_image || '',
          thumbnail_image: dest.thumbnail_image || '',
          og_image: dest.og_image || '',
          latitude: dest.latitude,
          longitude: dest.longitude,
          is_active: dest.is_active,
          is_featured: dest.is_featured,
          is_popular: dest.is_popular,
          is_new: dest.is_new,
          display_order: dest.display_order,
          destination_type: dest.destination_type || '',
          tags: dest.tags || [],
          tagline: dest.tagline || '',
          editorial_title: dest.editorial_title || '',
          editorial_description: dest.editorial_description || '',
          travel_story: dest.travel_story || '',
          best_time_to_visit: dest.best_time_to_visit || '',
          why_visit: dest.why_visit || '',
          highlights: dest.highlights || [],
          experiences: dest.experiences || [],
          local_tips: dest.local_tips || [],
          seo_title: dest.seo_title || '',
          seo_description: dest.seo_description || '',
          seo_keywords: dest.seo_keywords || [],
          og_title: dest.og_title || '',
          og_description: dest.og_description || '',
          status: dest.status || (dest.is_active ? 'published' : 'draft'),
        });
        setOriginalSlug(dest.slug);

        const stats = await getDestinationStayStats(dest.id);
        if (cancelled) return;
        setStayStats(stats);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load destination');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [destinationId, isNew]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('destinations')
        .select('id, name, slug')
        .order('name');
      if (data) setAllDestinations(data);
    })();
  }, []);

  const setField = (key: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleNameChange = (name: string) => {
    setField('name', name);
    if (isNew || (!originalSlug && !form.slug)) {
      setField('slug', slugify(name));
    }
  };

  const handleSlugChange = (slug: string) => {
    setField('slug', slugify(slug));
    if (!isNew && originalSlug && slugify(slug) !== originalSlug) {
      setSlugWarning(`Warning: Changing the slug from "${originalSlug}" to "${slugify(slug)}" will change the public URL. Existing links to /destinations/${originalSlug} will break. Property relationships are preserved.`);
    } else {
      setSlugWarning(null);
    }
  };

  const addToArray = (key: string, value: string) => {
    if (!value.trim()) return;
    const arr = (form[key] as string[]) || [];
    if (!arr.includes(value.trim())) {
      setField(key, [...arr, value.trim()]);
    }
  };

  const removeFromArray = (key: string, index: number) => {
    const arr = (form[key] as string[]) || [];
    setField(key, arr.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setError(null);
    setSlugWarning(null);

    if (!String(form.name).trim()) { setError('Name is required'); setActiveSection('basic'); return; }
    if (!String(form.slug).trim()) { setError('Slug is required'); setActiveSection('basic'); return; }
    if (!String(form.country).trim()) { setError('Country is required'); setActiveSection('basic'); return; }

    const lat = form.latitude as number | null;
    const lng = form.longitude as number | null;
    if (lat !== null && (lat < -90 || lat > 90)) { setError('Latitude must be between -90 and 90'); setActiveSection('location'); return; }
    if (lng !== null && (lng < -180 || lng > 180)) { setError('Longitude must be between -180 and 180'); setActiveSection('location'); return; }

    setSaving(true);
    try {
      const isUnique = await checkDestinationSlugUnique(String(form.slug), isNew ? undefined : destinationId);
      if (!isUnique) {
        setError('A destination with this slug already exists. Please choose a different slug.');
        setActiveSection('basic');
        setSaving(false);
        return;
      }

      const data: Record<string, unknown> = { ...form };
      if (data.country_code === '') data.country_code = null;
      if (data.region === '') data.region = null;
      if (data.continent === '') data.continent = null;
      if (data.destination_type === '') data.destination_type = null;
      if (data.parent_destination_id === '' || data.parent_destination_id === null) data.parent_destination_id = null;
      if (data.latitude === '' || data.latitude === null) data.latitude = null;
      if (data.longitude === '' || data.longitude === null) data.longitude = null;
      ['tagline', 'editorial_title', 'editorial_description', 'travel_story', 'best_time_to_visit', 'why_visit', 'seo_title', 'seo_description', 'og_title', 'og_description', 'cover_image', 'thumbnail_image', 'og_image', 'hero_image', 'hero_image_alt', 'short_description', 'long_description'].forEach((f) => {
        if (data[f] === '') data[f] = null;
      });

      if (isNew) {
        await createDestination(data);
      } else {
        await updateDestination(destinationId!, data);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save destination');
    } finally {
      setSaving(false);
    }
  };

  const sections: { id: EditorSection; label: string }[] = [
    { id: 'basic', label: 'Basic Information' },
    { id: 'editorial', label: 'Editorial Content' },
    { id: 'media', label: 'Media' },
    { id: 'publishing', label: 'Publishing' },
    { id: 'seo', label: 'SEO' },
    { id: 'location', label: 'Location' },
  ];
  if (!isNew) sections.push({ id: 'stays', label: 'Stays' });

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-secondary">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-secondary">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-background px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
          <h2 className="font-serif text-lg font-medium text-foreground">
            {isNew ? 'Create Destination' : `Edit: ${String(form.name) || 'Destination'}`}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && String(form.slug) && (
            <Link
              to={`/destinations/${String(form.slug)}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 border border-border px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground"
            >
              <Eye className="h-3.5 w-3.5" strokeWidth={1.5} />
              Preview
            </Link>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 bg-foreground px-4 py-2 text-xs font-medium uppercase tracking-wider text-background hover:bg-foreground/85 disabled:opacity-40"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            {isNew ? 'Create' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Section nav */}
        <aside className="hidden w-56 shrink-0 overflow-y-auto border-r border-border bg-background p-4 md:block">
          <nav className="flex flex-col gap-0.5">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={cn(
                  'px-3 py-2 text-left text-sm transition-colors',
                  activeSection === s.id
                    ? 'bg-foreground text-background'
                    : 'text-foreground hover:bg-secondary'
                )}
              >
                {s.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Mobile section selector */}
        <div className="absolute left-0 right-0 top-[57px] z-10 border-b border-border bg-background px-4 py-2 md:hidden">
          <select
            value={activeSection}
            onChange={(e) => setActiveSection(e.target.value as EditorSection)}
            className="w-full border border-border bg-background px-3 py-2 text-sm"
          >
            {sections.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 pt-20 md:p-6 md:pt-6">
          <div className="mx-auto max-w-3xl space-y-6">
            {error && (
              <div className="flex items-center gap-2 border border-error bg-error/5 p-3 text-sm text-error">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}
            {slugWarning && (
              <div className="flex items-start gap-2 border border-warning bg-warning/5 p-3 text-sm text-warning">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                {slugWarning}
              </div>
            )}

            {/* BASIC INFORMATION */}
            {activeSection === 'basic' && (
              <Section title="Basic Information">
                <Field label="Name *">
                  <input type="text" value={String(form.name)} onChange={(e) => handleNameChange(e.target.value)} className={inputClass} />
                </Field>
                <Field label="Slug *">
                  <input type="text" value={String(form.slug)} onChange={(e) => handleSlugChange(e.target.value)} className={inputClass} />
                  <p className="mt-1 text-xs text-muted-foreground">Public URL: /destinations/{String(form.slug) || '...'}</p>
                </Field>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="City / Region">
                    <input type="text" value={String(form.region || '')} onChange={(e) => setField('region', e.target.value)} className={inputClass} />
                  </Field>
                  <Field label="Country *">
                    <input type="text" value={String(form.country)} onChange={(e) => setField('country', e.target.value)} className={inputClass} />
                  </Field>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="Country Code">
                    <input type="text" value={String(form.country_code || '')} onChange={(e) => setField('country_code', e.target.value)} placeholder="e.g. FR, JP, US" className={inputClass} />
                  </Field>
                  <Field label="Continent">
                    <input type="text" value={String(form.continent || '')} onChange={(e) => setField('continent', e.target.value)} className={inputClass} />
                  </Field>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="Destination Type">
                    <select value={String(form.destination_type || '')} onChange={(e) => setField('destination_type', e.target.value)} className={inputClass}>
                      <option value="">— Select —</option>
                      <option value="city">City</option>
                      <option value="beach">Beach</option>
                      <option value="island">Island</option>
                      <option value="mountain">Mountain</option>
                      <option value="desert">Desert</option>
                      <option value="countryside">Countryside</option>
                      <option value="region">Region</option>
                      <option value="country">Country</option>
                    </select>
                  </Field>
                  <Field label="Parent Destination">
                    <select value={String(form.parent_destination_id || '')} onChange={(e) => setField('parent_destination_id', e.target.value || null)} className={inputClass}>
                      <option value="">None (top-level)</option>
                      {allDestinations.filter((d) => d.id !== destinationId).map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </Field>
                </div>
                <Field label="Short Description">
                  <textarea value={String(form.short_description || '')} onChange={(e) => setField('short_description', e.target.value)} rows={2} className={inputClass} />
                </Field>
                <Field label="Long Description">
                  <textarea value={String(form.long_description || '')} onChange={(e) => setField('long_description', e.target.value)} rows={6} className={inputClass} />
                </Field>
                <StringArrayField
                  label="Tags"
                  values={(form.tags as string[]) || []}
                  onAdd={(v) => addToArray('tags', v)}
                  onRemove={(i) => removeFromArray('tags', i)}
                  placeholder="Add a tag..."
                />
              </Section>
            )}

            {/* EDITORIAL CONTENT */}
            {activeSection === 'editorial' && (
              <Section title="Editorial Content">
                <Field label="Tagline">
                  <input type="text" value={String(form.tagline || '')} onChange={(e) => setField('tagline', e.target.value)} placeholder="A short marketing tagline" className={inputClass} />
                </Field>
                <Field label="Editorial Title">
                  <input type="text" value={String(form.editorial_title || '')} onChange={(e) => setField('editorial_title', e.target.value)} className={inputClass} />
                </Field>
                <Field label="Editorial Description">
                  <textarea value={String(form.editorial_description || '')} onChange={(e) => setField('editorial_description', e.target.value)} rows={4} className={inputClass} />
                </Field>
                <Field label="Travel Story">
                  <textarea value={String(form.travel_story || '')} onChange={(e) => setField('travel_story', e.target.value)} rows={8} className={inputClass} />
                </Field>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="Best Time to Visit">
                    <input type="text" value={String(form.best_time_to_visit || '')} onChange={(e) => setField('best_time_to_visit', e.target.value)} className={inputClass} />
                  </Field>
                  <Field label="Why Visit">
                    <input type="text" value={String(form.why_visit || '')} onChange={(e) => setField('why_visit', e.target.value)} className={inputClass} />
                  </Field>
                </div>
                <StringArrayField
                  label="Highlights"
                  values={(form.highlights as string[]) || []}
                  onAdd={(v) => addToArray('highlights', v)}
                  onRemove={(i) => removeFromArray('highlights', i)}
                  placeholder="Add a highlight..."
                />
                <StringArrayField
                  label="Experiences"
                  values={(form.experiences as string[]) || []}
                  onAdd={(v) => addToArray('experiences', v)}
                  onRemove={(i) => removeFromArray('experiences', i)}
                  placeholder="Add an experience..."
                />
                <StringArrayField
                  label="Local Tips"
                  values={(form.local_tips as string[]) || []}
                  onAdd={(v) => addToArray('local_tips', v)}
                  onRemove={(i) => removeFromArray('local_tips', i)}
                  placeholder="Add a local tip..."
                />
              </Section>
            )}

            {/* MEDIA */}
            {activeSection === 'media' && (
              <Section title="Media">
                <ImageUrlField label="Hero Image" value={String(form.hero_image || '')} onChange={(v) => setField('hero_image', v)} />
                <Field label="Hero Image Alt Text">
                  <input type="text" value={String(form.hero_image_alt || '')} onChange={(e) => setField('hero_image_alt', e.target.value)} className={inputClass} />
                </Field>
                <ImageUrlField label="Cover Image" value={String(form.cover_image || '')} onChange={(v) => setField('cover_image', v)} />
                <ImageUrlField label="Thumbnail Image" value={String(form.thumbnail_image || '')} onChange={(v) => setField('thumbnail_image', v)} />
                <ImageUrlField label="OG Image" value={String(form.og_image || '')} onChange={(v) => setField('og_image', v)} />
              </Section>
            )}

            {/* PUBLISHING */}
            {activeSection === 'publishing' && (
              <Section title="Publishing">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <ToggleField
                    label="Published (Active)"
                    description="Visible on the public website"
                    checked={Boolean(form.is_active)}
                    onChange={(v) => setField('is_active', v)}
                  />
                  <ToggleField
                    label="Featured"
                    description="Shown in featured sections"
                    checked={Boolean(form.is_featured)}
                    onChange={(v) => setField('is_featured', v)}
                  />
                  <ToggleField
                    label="Popular"
                    description="Marked as a popular destination"
                    checked={Boolean(form.is_popular)}
                    onChange={(v) => setField('is_popular', v)}
                  />
                  <ToggleField
                    label="New Destination"
                    description="Marked with a 'New' badge"
                    checked={Boolean(form.is_new)}
                    onChange={(v) => setField('is_new', v)}
                  />
                </div>
                <Field label="Status">
                  <select value={String(form.status)} onChange={(e) => setField('status', e.target.value)} className={inputClass}>
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                  </select>
                </Field>
                <Field label="Display Order">
                  <input type="number" value={Number(form.display_order)} onChange={(e) => setField('display_order', Number(e.target.value))} className={inputClass} />
                  <p className="mt-1 text-xs text-muted-foreground">Lower numbers appear first. Use 0 for default ordering.</p>
                </Field>
              </Section>
            )}

            {/* SEO */}
            {activeSection === 'seo' && (
              <Section title="SEO">
                <Field label="SEO Title">
                  <input type="text" value={String(form.seo_title || '')} onChange={(e) => setField('seo_title', e.target.value)} className={inputClass} />
                </Field>
                <Field label="SEO Description">
                  <textarea value={String(form.seo_description || '')} onChange={(e) => setField('seo_description', e.target.value)} rows={3} className={inputClass} />
                </Field>
                <StringArrayField
                  label="SEO Keywords"
                  values={(form.seo_keywords as string[]) || []}
                  onAdd={(v) => addToArray('seo_keywords', v)}
                  onRemove={(i) => removeFromArray('seo_keywords', i)}
                  placeholder="Add a keyword..."
                />
                <Field label="OG Title">
                  <input type="text" value={String(form.og_title || '')} onChange={(e) => setField('og_title', e.target.value)} className={inputClass} />
                </Field>
                <Field label="OG Description">
                  <textarea value={String(form.og_description || '')} onChange={(e) => setField('og_description', e.target.value)} rows={2} className={inputClass} />
                </Field>
              </Section>
            )}

            {/* LOCATION */}
            {activeSection === 'location' && (
              <Section title="Location">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="Latitude">
                    <input
                      type="number"
                      step="any"
                      value={form.latitude === null ? '' : String(form.latitude)}
                      onChange={(e) => setField('latitude', e.target.value === '' ? null : parseFloat(e.target.value))}
                      placeholder="e.g. 48.8566"
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Longitude">
                    <input
                      type="number"
                      step="any"
                      value={form.longitude === null ? '' : String(form.longitude)}
                      onChange={(e) => setField('longitude', e.target.value === '' ? null : parseFloat(e.target.value))}
                      placeholder="e.g. 2.3522"
                      className={inputClass}
                    />
                  </Field>
                </div>
                <p className="text-xs text-muted-foreground">Latitude must be between -90 and 90. Longitude must be between -180 and 180.</p>
              </Section>
            )}

            {/* STAYS */}
            {activeSection === 'stays' && !isNew && (
              <Section title="Stays in this Destination">
                <div className="grid grid-cols-3 gap-4">
                  <StatBox label="Total Stays" value={stayStats.total} />
                  <StatBox label="Active Stays" value={stayStats.active} />
                  <StatBox label="Featured Stays" value={stayStats.featured} />
                </div>
                <p className="text-xs text-muted-foreground">
                  Stay counts are calculated automatically from the properties assigned to this destination.
                  Editing this destination does not modify its attached stays.
                </p>
                {String(form.slug) && (
                  <Link
                    to={`/admin?dest=${String(form.slug)}`}
                    className="inline-flex items-center gap-2 border border-border px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-foreground hover:bg-secondary"
                  >
                    <Building2 className="h-4 w-4" strokeWidth={1.5} />
                    View Stays
                  </Link>
                )}
              </Section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── UI helpers ──────────────────────────────────────────────────────────

const inputClass = 'w-full border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:border-foreground';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h3 className="border-b border-border pb-2 font-serif text-lg font-medium text-foreground">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function ToggleField({ label, description, checked, onChange }: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 border border-border p-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4"
      />
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </label>
  );
}

function StringArrayField({ label, values, onAdd, onRemove, placeholder }: {
  label: string;
  values: string[];
  onAdd: (v: string) => void;
  onRemove: (i: number) => void;
  placeholder: string;
}) {
  const [input, setInput] = useState('');
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</label>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onAdd(input);
              setInput('');
            }
          }}
          placeholder={placeholder}
          className={inputClass}
        />
        <button
          type="button"
          onClick={() => { onAdd(input); setInput(''); }}
          className="inline-flex items-center gap-1 border border-border px-3 py-2 text-xs font-medium uppercase tracking-wider text-foreground hover:bg-secondary"
        >
          <Plus className="h-3 w-3" /> Add
        </button>
      </div>
      {values.length > 0 && (
        <div className="mt-2 space-y-1">
          {values.map((v, i) => (
            <div key={i} className="flex items-center justify-between border border-border bg-background px-3 py-1.5 text-sm">
              <span className="text-foreground">{v}</span>
              <button type="button" onClick={() => onRemove(i)} className="text-muted-foreground hover:text-error">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ImageUrlField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</label>
      <input type="url" value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://images.example.com/photo.jpg" className={inputClass} />
      {value && (
        <div className="mt-2 h-32 w-48 overflow-hidden border border-border bg-muted">
          <img src={value} alt={label} className="h-full w-full object-cover" />
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-border bg-background p-4 text-center">
      <p className="font-serif text-2xl font-medium text-foreground">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}
