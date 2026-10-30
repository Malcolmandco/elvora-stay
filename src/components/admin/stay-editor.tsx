import { useState, useEffect, useCallback } from 'react';
import {
  Save, X, Plus, Trash2, GripVertical, Image as ImageIcon, Star,
  AlertTriangle, Loader2, CheckCircle2, ArrowLeft, Archive, RotateCcw,
  Copy, ExternalLink, History, Tag, MapPin, Building2, FileText,
  Settings2, Package, BedDouble, RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { Switch } from '@/components/ui/switch';
import {
  fetchStayForEditor, fetchDestinationsForAdmin, fetchAmenitiesLibrary,
  fetchAuditLog, updatePropertyWithAudit, deleteProperty,
  updateDestinationStayCount, checkPropertyBookings,
  getEffective, getEffectiveImages,
} from '@/hooks/use-admin-stays';
import { useAdminAuth } from '@/hooks/use-admin-auth';

interface StayEditorProps {
  stayId: string;
  onClose: () => void;
  onSaved: () => void;
}

interface Destination {
  id: string;
  name: string;
  slug: string;
  country: string;
  is_active: boolean;
}

interface AmenityItem {
  id: string;
  name: string;
  category: string;
}

interface AuditEntry {
  id: string;
  admin_user_email: string | null;
  action: string;
  changed_fields: Record<string, { previous: unknown; new: unknown }>;
  created_at: string;
}

interface RoomRecord {
  id: string;
  supplier_room_code: string | null;
  supplier_room_name: string | null;
  supplier_room_type: string | null;
  supplier_description: string | null;
  supplier_max_adults: number | null;
  supplier_max_children: number | null;
  supplier_max_occupancy: number | null;
  supplier_facilities: string[] | null;
  elvora_room_name: string | null;
  elvora_description: string | null;
  elvora_price_per_night: number;
  currency: string;
  price_source: string | null;
  price_synced_at: string | null;
  price_override: boolean;
  is_active: boolean;
  display_order: number;
  room_image: string | null;
}

interface PropertyData {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  description: string;
  long_description: string;
  property_type: string;
  property_status: string;
  supplier_status: string;
  verification_status: string;
  booking_enabled: boolean;
  price_display_mode: string;
  destination_id: string | null;
  destination_slug: string | null;
  destination_name: string | null;
  country: string;
  city: string;
  region: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  price_per_night: number | null;
  currency: string;
  rating: number | null;
  review_count: number | null;
  max_guests: number | null;
  bedrooms: number | null;
  beds: number | null;
  bathrooms: number | null;
  amenities: string[];
  supplier_amenities: string[] | null;
  amenities_override: boolean | null;
  tags: string[];
  collections: string[];
  featured: boolean;
  is_active: boolean;
  images: { id: string; url: string; alt: string; caption?: string }[];
  video: string | null;
  house_rules: string[];
  policies: Record<string, string>;
  source_url: string | null;
  website: string | null;
  last_verified_at: string | null;
  last_synced_at: string | null;
  supplier_name: string | null;
  supplier_hotel_code: string | null;
  elvora_name: string | null;
  elvora_short_description: string | null;
  elvora_description: string | null;
  elvora_editorial_title: string | null;
  elvora_editorial_subtitle: string | null;
  elvora_editorial_description: string | null;
  elvora_images: { id: string; url: string; alt: string; caption?: string }[] | null;
  elvora_tags: string[];
  elvora_amenities: string[];
  elvora_featured: boolean | null;
  elvora_popular: boolean | null;
  elvora_new: boolean | null;
  elvora_property_status: string | null;
  elvora_booking_enabled: boolean | null;
  elvora_is_active: boolean | null;
  elvora_price_display: number | null;
  elvora_currency: string | null;
  elvora_phone: string | null;
  elvora_email: string | null;
  elvora_website: string | null;
  elvora_neighborhood: string | null;
  elvora_primary_image_index: number | null;
  editorial_override: boolean;
  created_at: string;
  updated_at: string;
}

type TabId = 'basic' | 'editorial' | 'images' | 'amenities' | 'rooms' | 'location' | 'status' | 'supplier' | 'audit';

const TAG_OPTIONS = [
  'Luxury', 'Beachfront', 'Villa', 'Resort', 'Hotel', 'Island', 'Mountain',
  'City', 'Featured', 'New', 'Popular', 'Family', 'Romantic', 'Secluded',
  'Ocean View', 'Oceanfront', 'Infinity Pool', 'Private Pool', 'Waterfront',
  'Desert', 'Coastal', 'Nature', 'Wellness', 'Golf', 'Design', 'Urban',
  'Ski', 'Winter', 'Overwater', 'Forest', 'Safari', 'Spa',
];

const PROPERTY_TYPES = [
  'Hotel', 'Resort', 'Villa', 'Private Residence', 'Apartment', 'Boutique Hotel',
  'Lodge', 'Cabin', 'Safari Lodge', 'Island Resort', 'Beach Resort',
  'Mountain Resort', 'Urban Hotel', 'Wellness Retreat', 'Luxury Estate',
];

export function StayEditor({ stayId, onClose, onSaved }: StayEditorProps) {
  const { user } = useAdminAuth();
  const [data, setData] = useState<PropertyData | null>(null);
  const [originalData, setOriginalData] = useState<PropertyData | null>(null);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [amenityLibrary, setAmenityLibrary] = useState<AmenityItem[]>([]);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('basic');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newImageAlt, setNewImageAlt] = useState('');
  const [newAmenityName, setNewAmenityName] = useState('');
  const [newAmenityCategory, setNewAmenityCategory] = useState('General');
  const [bookingCount, setBookingCount] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [propertyRooms, setPropertyRooms] = useState<RoomRecord[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [roomSyncing, setRoomSyncing] = useState(false);
  const [roomSyncResult, setRoomSyncResult] = useState<string | null>(null);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editRoomPrice, setEditRoomPrice] = useState('');
  const [editRoomCurrency, setEditRoomCurrency] = useState('USD');
  const [editRoomActive, setEditRoomActive] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [stay, dests, amens, audit, bookings] = await Promise.all([
          fetchStayForEditor(stayId),
          fetchDestinationsForAdmin(),
          fetchAmenitiesLibrary(),
          fetchAuditLog(stayId),
          checkPropertyBookings(stayId),
        ]);
        setData(stay as unknown as PropertyData);
        setOriginalData(stay as unknown as PropertyData);
        setDestinations(dests as Destination[]);
        setAmenityLibrary(amens as AmenityItem[]);
        setAuditLog(audit as AuditEntry[]);
        setBookingCount(bookings);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load property');
      } finally {
        setLoading(false);
      }
    })();
  }, [stayId]);

  const update = useCallback((field: string, value: unknown) => {
    setData((prev) => prev ? { ...prev, [field]: value } : prev);
  }, []);

  const handleSave = async () => {
    if (!data || !user) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updates: Record<string, unknown> = {};
      const fieldsToCheck: (keyof PropertyData)[] = [
        'elvora_name', 'elvora_short_description', 'elvora_description',
        'elvora_editorial_title', 'elvora_editorial_subtitle', 'elvora_editorial_description',
        'elvora_images', 'elvora_tags', 'elvora_amenities',
        'amenities_override',
        'elvora_featured', 'elvora_popular', 'elvora_new',
        'elvora_property_status', 'elvora_booking_enabled', 'elvora_is_active',
        'elvora_price_display', 'elvora_currency',
        'elvora_phone', 'elvora_email', 'elvora_website', 'elvora_neighborhood',
        'elvora_primary_image_index',
        'destination_id', 'destination_slug', 'destination_name',
        'country', 'city', 'address', 'latitude', 'longitude',
        'property_type', 'rating', 'brand',
      ];

      for (const field of fieldsToCheck) {
        const newVal = data[field];
        const oldVal = originalData?.[field];
        if (JSON.stringify(newVal) !== JSON.stringify(oldVal)) {
          updates[field] = newVal;
        }
      }

      if (Object.keys(updates).length === 0) {
        setSuccess('No changes to save.');
        setSaving(false);
        return;
      }

      await updatePropertyWithAudit(
        stayId,
        updates,
        originalData as unknown as Record<string, unknown>,
        user.email || 'admin',
        user.id,
        'edit'
      );

      // Update destination counts if destination changed
      if (updates.destination_id && originalData?.destination_id && updates.destination_id !== originalData.destination_id) {
        await updateDestinationStayCount(updates.destination_id as string);
        await updateDestinationStayCount(originalData.destination_id);
      }

      setSuccess('Property saved successfully.');
      setOriginalData(data);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!data || !user) return;
    setSaving(true);
    try {
      await updatePropertyWithAudit(
        stayId,
        { elvora_property_status: 'archived', elvora_is_active: false, editorial_override: true },
        originalData as unknown as Record<string, unknown>,
        user.email || 'admin',
        user.id,
        'archive'
      );
      if (data.destination_id) await updateDestinationStayCount(data.destination_id);
      setSuccess('Property archived.');
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to archive');
    } finally {
      setSaving(false);
    }
  };

  const handleRestore = async () => {
    if (!data || !user) return;
    setSaving(true);
    try {
      await updatePropertyWithAudit(
        stayId,
        { elvora_property_status: 'catalog', elvora_is_active: true, editorial_override: true },
        originalData as unknown as Record<string, unknown>,
        user.email || 'admin',
        user.id,
        'restore'
      );
      if (data.destination_id) await updateDestinationStayCount(data.destination_id);
      setSuccess('Property restored.');
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!data || !user) return;
    setSaving(true);
    try {
      await deleteProperty(stayId, user.email || 'admin', user.id);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setSaving(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleAddImage = () => {
    if (!newImageUrl.trim() || !data) return;
    const newImg = {
      id: `elvora-img-${Date.now()}`,
      url: newImageUrl.trim(),
      alt: newImageAlt.trim() || data.elvora_name || data.name,
    };
    const currentImgs = data.elvora_images || [];
    update('elvora_images', [...currentImgs, newImg]);
    setNewImageUrl('');
    setNewImageAlt('');
  };

  const handleRemoveImage = (idx: number) => {
    if (!data) return;
    const imgs = data.elvora_images || [];
    update('elvora_images', imgs.filter((_, i) => i !== idx));
  };

  const handleMoveImage = (idx: number, dir: -1 | 1) => {
    if (!data) return;
    const imgs = [...(data.elvora_images || [])];
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= imgs.length) return;
    [imgs[idx], imgs[newIdx]] = [imgs[newIdx], imgs[idx]];
    update('elvora_images', imgs);
  };

  const handleSetPrimary = (idx: number) => {
    update('elvora_primary_image_index', idx);
  };

  const handleAddAmenity = () => {
    if (!newAmenityName.trim() || !data) return;
    const current = data.elvora_amenities || [];
    if (!current.includes(newAmenityName.trim())) {
      update('elvora_amenities', [...current, newAmenityName.trim()]);
    }
    setNewAmenityName('');
  };

  const handleRemoveAmenity = (name: string) => {
    if (!data) return;
    update('elvora_amenities', (data.elvora_amenities || []).filter((a) => a !== name));
  };

  const handleAddAmenityToLibrary = async () => {
    if (!newAmenityName.trim()) return;
    const { error: insertError } = await supabase
      .from('amenities')
      .insert({ name: newAmenityName.trim(), category: newAmenityCategory });
    if (!insertError) {
      setAmenityLibrary((prev) => [...prev, {
        id: Date.now().toString(),
        name: newAmenityName.trim(),
        category: newAmenityCategory,
      }]);
      handleAddAmenity();
    }
  };

  const handleAddTag = (tag: string) => {
    if (!data) return;
    const current = data.elvora_tags || [];
    if (!current.includes(tag)) {
      update('elvora_tags', [...current, tag]);
    }
  };

  const handleRemoveTag = (tag: string) => {
    if (!data) return;
    update('elvora_tags', (data.elvora_tags || []).filter((t) => t !== tag));
  };

  const effectiveName = data ? getEffective(data.elvora_name, data.name) : '';
  const effectiveStatus = data ? getEffective(data.elvora_property_status, data.property_status) : '';
  const effectiveActive = data ? getEffective(data.elvora_is_active, data.is_active) : true;
  const effectiveImages = data ? getEffectiveImages({
    images: data.images,
    elvora_images: data.elvora_images,
    elvora_primary_image_index: data.elvora_primary_image_index,
  }) : [];

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/80">
        <Loader2 className="h-8 w-8 animate-spin text-white" strokeWidth={1} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/80">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-white/60" strokeWidth={1} />
          <p className="mt-4 text-sm text-white/70">Property not found.</p>
          <button onClick={onClose} className="mt-4 text-sm text-white underline">Close</button>
        </div>
      </div>
    );
  }

  const isArchived = effectiveStatus === 'archived';
  const isSupplier = data.supplier_name === 'hotelbeds';

  const fetchRooms = useCallback(async () => {
    if (!stayId) return;
    setRoomsLoading(true);
    try {
      const { data: rooms, error: roomsError } = await supabase
        .from('property_rooms')
        .select('*')
        .eq('property_id', stayId)
        .order('display_order', { ascending: true });
      if (roomsError) throw roomsError;
      setPropertyRooms((rooms || []) as unknown as RoomRecord[]);
    } catch {
      setPropertyRooms([]);
    } finally {
      setRoomsLoading(false);
    }
  }, [stayId]);

  useEffect(() => {
    if (data) fetchRooms();
  }, [data, fetchRooms]);

  const handleSyncRooms = async () => {
    if (!data?.supplier_hotel_code) return;
    setRoomSyncing(true);
    setRoomSyncResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session) headers['Authorization'] = `Bearer ${session.access_token}`;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hotelbeds-room-sync`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ propertyId: stayId }),
        }
      );
      const result = await response.json();
      if (result.error) {
        setRoomSyncResult(`Error: ${result.error}`);
      } else {
        setRoomSyncResult(
          `${result.status}: ${result.roomsFound} found, ${result.roomsCreated} created, ${result.roomsUpdated} updated, ${result.pricesUpdated} prices updated` +
          (result.errors?.length > 0 ? ` (${result.errors.length} warnings)` : '')
        );
        fetchRooms();
      }
    } catch {
      setRoomSyncResult('Room sync request failed');
    } finally {
      setRoomSyncing(false);
    }
  };

  const handleEditRoom = (room: RoomRecord) => {
    setEditingRoomId(room.id);
    setEditRoomPrice(String(room.elvora_price_per_night));
    setEditRoomCurrency(room.currency);
    setEditRoomActive(room.is_active);
  };

  const handleSaveRoom = async () => {
    if (!editingRoomId) return;
    const { error: updateError } = await supabase
      .from('property_rooms')
      .update({
        elvora_price_per_night: Number(editRoomPrice) || 0,
        currency: editRoomCurrency,
        is_active: editRoomActive,
        price_override: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', editingRoomId);
    if (updateError) {
      setRoomSyncResult(`Failed to save room: ${updateError.message}`);
    } else {
      setEditingRoomId(null);
      fetchRooms();
    }
  };

  const handleToggleRoomActive = async (roomId: string, currentActive: boolean) => {
    const { error: toggleError } = await supabase
      .from('property_rooms')
      .update({ is_active: !currentActive, updated_at: new Date().toISOString() })
      .eq('id', roomId);
    if (toggleError) {
      setRoomSyncResult(`Failed to toggle room: ${toggleError.message}`);
    } else {
      fetchRooms();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-secondary">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-background px-4 py-3 md:px-6">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onClose} className="shrink-0 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" strokeWidth={1.5} />
          </button>
          <div className="min-w-0">
            <h2 className="truncate font-serif text-lg font-medium text-foreground">{effectiveName}</h2>
            <p className="text-xs text-muted-foreground">
              {data.supplier_name === 'hotelbeds' ? 'Hotelbeds' : 'Elvora Curated'}
              {data.supplier_hotel_code && ` · Code: ${data.supplier_hotel_code}`}
              {data.editorial_override && ' · Editorial overrides active'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {error && <span className="hidden text-xs text-error md:inline">{error}</span>}
          {success && <span className="hidden items-center gap-1 text-xs text-accent md:inline-flex"><CheckCircle2 className="h-3 w-3" /> {success}</span>}
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 bg-foreground px-4 py-2 text-xs font-medium uppercase tracking-wider text-background transition-all hover:bg-foreground/85 disabled:opacity-40"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} /> : <Save className="h-3.5 w-3.5" strokeWidth={1.5} />}
            Save
          </button>
        </div>
      </div>

      {/* Error/Success bar (mobile) */}
      {(error || success) && (
        <div className={cn("px-4 py-2 text-xs md:hidden", error ? "bg-error/10 text-error" : "bg-accent/10 text-accent")}>
          {error || success}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Tab sidebar */}
        <div className="w-16 shrink-0 overflow-y-auto border-r border-border bg-background md:w-48">
          <div className="p-2 md:p-3">
            <nav className="flex flex-col gap-0.5">
              {([
                { id: 'basic', label: 'Basic Info', icon: FileText },
                { id: 'editorial', label: 'Editorial', icon: Star },
                { id: 'images', label: 'Images', icon: ImageIcon },
                { id: 'amenities', label: 'Amenities', icon: Package },
                { id: 'rooms', label: 'Room Types', icon: BedDouble },
                { id: 'location', label: 'Location', icon: MapPin },
                { id: 'status', label: 'Status', icon: Settings2 },
                { id: 'supplier', label: 'Supplier', icon: Building2 },
                { id: 'audit', label: 'Audit History', icon: History },
              ] as { id: TabId; label: string; icon: typeof FileText }[]).map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'flex items-center gap-2 px-2 py-2 text-xs transition-colors md:px-3 md:text-sm',
                      activeTab === tab.id
                        ? 'bg-foreground text-background'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                    <span className="hidden md:inline">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="mx-auto max-w-3xl space-y-6">
            {/* BASIC INFO */}
            {activeTab === 'basic' && (
              <div className="space-y-4">
                <h3 className="font-serif text-xl font-medium text-foreground">Basic Information</h3>
                <Field label="Property Name (Editorial Override)" hint="Overrides the supplier name when set">
                  <input
                    type="text"
                    value={data.elvora_name ?? ''}
                    onChange={(e) => update('elvora_name', e.target.value || null)}
                    placeholder={data.name}
                    className="w-full border border-border bg-background px-3 py-2 text-sm"
                  />
                </Field>
                <Field label="Slug">
                  <input
                    type="text"
                    value={data.slug}
                    disabled
                    className="w-full border border-border bg-secondary px-3 py-2 text-sm text-muted-foreground"
                  />
                </Field>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="Property Type">
                    <select
                      value={data.property_type}
                      onChange={(e) => update('property_type', e.target.value)}
                      className="w-full border border-border bg-background px-3 py-2 text-sm"
                    >
                      {PROPERTY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </Field>
                  <Field label="Brand">
                    <input
                      type="text"
                      value={data.brand ?? ''}
                      onChange={(e) => update('brand', e.target.value || null)}
                      className="w-full border border-border bg-background px-3 py-2 text-sm"
                    />
                  </Field>
                </div>
                <Field label="Short Description (Editorial Override)" hint="Overrides the supplier short description when set">
                  <textarea
                    value={data.elvora_short_description ?? ''}
                    onChange={(e) => update('elvora_short_description', e.target.value || null)}
                    placeholder={data.description}
                    rows={2}
                    className="w-full border border-border bg-background px-3 py-2 text-sm"
                  />
                </Field>
                <Field label="Full Description (Editorial Override)" hint="Overrides the supplier description when set">
                  <textarea
                    value={data.elvora_description ?? ''}
                    onChange={(e) => update('elvora_description', e.target.value || null)}
                    placeholder={data.long_description}
                    rows={6}
                    className="w-full border border-border bg-background px-3 py-2 text-sm"
                  />
                </Field>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <Field label="Star Rating">
                    <input
                      type="number"
                      min={0} max={5} step={0.5}
                      value={data.rating ?? ''}
                      onChange={(e) => update('rating', e.target.value ? Number(e.target.value) : null)}
                      className="w-full border border-border bg-background px-3 py-2 text-sm"
                    />
                  </Field>
                  <Field label="Max Guests">
                    <input
                      type="number"
                      min={0}
                      value={data.max_guests ?? ''}
                      onChange={(e) => update('max_guests', e.target.value ? Number(e.target.value) : null)}
                      className="w-full border border-border bg-background px-3 py-2 text-sm"
                    />
                  </Field>
                  <Field label="Bedrooms">
                    <input
                      type="number"
                      min={0}
                      value={data.bedrooms ?? ''}
                      onChange={(e) => update('bedrooms', e.target.value ? Number(e.target.value) : null)}
                      className="w-full border border-border bg-background px-3 py-2 text-sm"
                    />
                  </Field>
                </div>
              </div>
            )}

            {/* EDITORIAL */}
            {activeTab === 'editorial' && (
              <div className="space-y-4">
                <h3 className="font-serif text-xl font-medium text-foreground">Elvora Editorial Content</h3>
                <p className="text-xs text-muted-foreground">These fields are Elvora-original content. They are never overwritten by Hotelbeds sync.</p>
                <Field label="Editorial Title">
                  <input
                    type="text"
                    value={data.elvora_editorial_title ?? ''}
                    onChange={(e) => update('elvora_editorial_title', e.target.value || null)}
                    placeholder="e.g., A Secluded Oceanfront Retreat"
                    className="w-full border border-border bg-background px-3 py-2 text-sm"
                  />
                </Field>
                <Field label="Editorial Subtitle">
                  <input
                    type="text"
                    value={data.elvora_editorial_subtitle ?? ''}
                    onChange={(e) => update('elvora_editorial_subtitle', e.target.value || null)}
                    placeholder="e.g., Where the jungle meets the sea"
                    className="w-full border border-border bg-background px-3 py-2 text-sm"
                  />
                </Field>
                <Field label="Editorial Description">
                  <textarea
                    value={data.elvora_editorial_description ?? ''}
                    onChange={(e) => update('elvora_editorial_description', e.target.value || null)}
                    rows={8}
                    placeholder="Elvora's own description of this property..."
                    className="w-full border border-border bg-background px-3 py-2 text-sm"
                  />
                </Field>
                <div className="border-t border-border pt-4">
                  <h4 className="text-sm font-medium text-foreground">Tags & Categories</h4>
                  <p className="mt-1 text-xs text-muted-foreground">Click to add tags. Elvora tags override supplier tags when set.</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {(data.elvora_tags || []).map((tag) => (
                      <span key={tag} className="inline-flex items-center gap-1 bg-foreground px-2 py-1 text-xs text-background">
                        {tag}
                        <button onClick={() => handleRemoveTag(tag)} className="hover:text-background/70"><X className="h-3 w-3" /></button>
                      </span>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {TAG_OPTIONS.filter((t) => !(data.elvora_tags || []).includes(t)).map((tag) => (
                      <button
                        key={tag}
                        onClick={() => handleAddTag(tag)}
                        className="inline-flex items-center gap-1 border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <Plus className="h-3 w-3" />
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* IMAGES */}
            {activeTab === 'images' && (
              <div className="space-y-4">
                <h3 className="font-serif text-xl font-medium text-foreground">Images</h3>
                {isSupplier && (
                  <div className="border border-warning/30 bg-warning/5 p-3 text-xs text-muted-foreground">
                    <p><strong className="text-foreground">Supplier images:</strong> {data.images.length} images from {data.supplier_name}.</p>
                    <p className="mt-1">Elvora override images replace supplier images on the public site when set. Hotelbeds sync will not overwrite your Elvora images.</p>
                  </div>
                )}

                {/* Supplier images (read-only) */}
                {isSupplier && data.images.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Supplier Images (read-only)</h4>
                    <div className="mt-2 grid grid-cols-3 gap-2 md:grid-cols-4">
                      {data.images.map((img, idx) => (
                        <div key={img.id} className="relative aspect-square overflow-hidden border border-border bg-muted">
                          <img src={img.url} alt={img.alt} className="h-full w-full object-cover" />
                          <span className="absolute bottom-0 left-0 bg-foreground/70 px-1.5 py-0.5 text-[0.5rem] text-white">Supplier {idx + 1}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Elvora override images */}
                <div className="border-t border-border pt-4">
                  <h4 className="text-sm font-medium text-foreground">Elvora Override Images</h4>
                  <p className="mt-1 text-xs text-muted-foreground">These replace supplier images when set. Drag to reorder. Mark one as primary.</p>

                  {(data.elvora_images || []).length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {(data.elvora_images || []).map((img, idx) => (
                        <div key={img.id} className="flex items-center gap-3 border border-border bg-background p-2">
                          <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                          <div className="h-16 w-24 shrink-0 overflow-hidden bg-muted">
                            <img src={img.url} alt={img.alt} className="h-full w-full object-cover" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <input
                              type="text"
                              value={img.alt}
                              onChange={(e) => {
                                const imgs = [...(data.elvora_images || [])];
                                imgs[idx] = { ...imgs[idx], alt: e.target.value };
                                update('elvora_images', imgs);
                              }}
                              placeholder="Alt text"
                              className="w-full border border-border bg-background px-2 py-1 text-xs"
                            />
                            {data.elvora_primary_image_index === idx && (
                              <span className="mt-1 inline-flex items-center gap-1 text-xs text-accent"><Star className="h-3 w-3 fill-current" /> Primary</span>
                            )}
                          </div>
                          <div className="flex flex-col gap-1">
                            <button onClick={() => handleMoveImage(idx, -1)} disabled={idx === 0} className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30">↑</button>
                            <button onClick={() => handleMoveImage(idx, 1)} disabled={idx === (data.elvora_images || []).length - 1} className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30">↓</button>
                          </div>
                          <button onClick={() => handleSetPrimary(idx)} className="text-xs text-muted-foreground hover:text-accent" title="Set as primary"><Star className="h-4 w-4" /></button>
                          <button onClick={() => handleRemoveImage(idx)} className="text-muted-foreground hover:text-error"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-muted-foreground">No Elvora override images. Supplier images will be used.</p>
                  )}

                  {/* Add new image */}
                  <div className="mt-4 border border-dashed border-border p-3">
                    <h5 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Add Image</h5>
                    <div className="mt-2 space-y-2">
                      <input
                        type="url"
                        value={newImageUrl}
                        onChange={(e) => setNewImageUrl(e.target.value)}
                        placeholder="https://images.example.com/photo.jpg"
                        className="w-full border border-border bg-background px-3 py-2 text-sm"
                      />
                      <input
                        type="text"
                        value={newImageAlt}
                        onChange={(e) => setNewImageAlt(e.target.value)}
                        placeholder="Alt text / caption"
                        className="w-full border border-border bg-background px-3 py-2 text-sm"
                      />
                      <button
                        onClick={handleAddImage}
                        disabled={!newImageUrl.trim()}
                        className="inline-flex items-center gap-2 border border-border px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-foreground hover:bg-secondary disabled:opacity-40"
                      >
                        <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
                        Add Image
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* AMENITIES */}
            {activeTab === 'amenities' && (
              <div className="space-y-4">
                <h3 className="font-serif text-xl font-medium text-foreground">Amenities</h3>
                <p className="text-xs text-muted-foreground">When amenities override is ON, Elvora amenities are shown to customers. When OFF, real Hotelbeds supplier amenities are used.</p>

                {/* Amenities override toggle */}
                {isSupplier && (
                  <div className="flex items-center gap-3 border border-border bg-secondary p-3">
                    <Switch
                      checked={data.amenities_override === true}
                      onCheckedChange={(v) => update('amenities_override', v)}
                    />
                    <div>
                      <p className="text-sm font-medium text-foreground">Use Elvora amenities instead of supplier</p>
                      <p className="text-xs text-muted-foreground">Toggle on to show your curated amenities instead of Hotelbeds facilities.</p>
                    </div>
                  </div>
                )}

                {/* Current amenities */}
                <div className="flex flex-wrap gap-1.5">
                  {(data.elvora_amenities || []).length > 0 ? (
                    (data.elvora_amenities || []).map((a) => (
                      <span key={a} className="inline-flex items-center gap-1 bg-foreground px-2 py-1 text-xs text-background">
                        {a}
                        <button onClick={() => handleRemoveAmenity(a)} className="hover:text-background/70"><X className="h-3 w-3" /></button>
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">No Elvora amenities set. Supplier amenities will be used.</span>
                  )}
                </div>

                {/* Supplier amenities (read-only) — real data from Hotelbeds Content API */}
                {isSupplier && (
                  <div className="border-t border-border pt-3">
                    <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Supplier Amenities (Hotelbeds — read-only)</h4>
                    <p className="mt-1 text-[0.6875rem] text-muted-foreground">These are the real amenities returned by the Hotelbeds Content API for this property.</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(data.supplier_amenities || []).length > 0 ? (
                        (data.supplier_amenities || []).map((a) => (
                          <span key={a} className="border border-border px-2 py-1 text-xs text-muted-foreground">{a}</span>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground italic">No supplier amenities returned by Hotelbeds. Use "Enrich Amenities" to fetch them.</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Add from library */}
                <div className="border-t border-border pt-3">
                  <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Add from Library</h4>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {amenityLibrary
                      .filter((a) => !(data.elvora_amenities || []).includes(a.name))
                      .map((a) => (
                        <button
                          key={a.id}
                          onClick={() => {
                            const current = data.elvora_amenities || [];
                            if (!current.includes(a.name)) update('elvora_amenities', [...current, a.name]);
                          }}
                          className="inline-flex items-center gap-1 border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                          <Plus className="h-3 w-3" />
                          {a.name}
                        </button>
                      ))}
                  </div>
                </div>

                {/* Add custom amenity */}
                <div className="border-t border-border pt-3">
                  <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Add Custom Amenity</h4>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <input
                      type="text"
                      value={newAmenityName}
                      onChange={(e) => setNewAmenityName(e.target.value)}
                      placeholder="Custom amenity name"
                      className="flex-1 border border-border bg-background px-3 py-2 text-sm"
                    />
                    <select
                      value={newAmenityCategory}
                      onChange={(e) => setNewAmenityCategory(e.target.value)}
                      className="border border-border bg-background px-3 py-2 text-sm"
                    >
                      <option>General</option>
                      <option>Room</option>
                      <option>Service</option>
                      <option>Dining</option>
                      <option>Outdoor</option>
                      <option>Wellness</option>
                      <option>Recreation</option>
                      <option>Building</option>
                    </select>
                    <button
                      onClick={handleAddAmenityToLibrary}
                      disabled={!newAmenityName.trim()}
                      className="inline-flex items-center gap-2 border border-border px-3 py-2 text-xs font-medium uppercase tracking-wider text-foreground hover:bg-secondary disabled:opacity-40"
                    >
                      <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
                      Add
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ROOM TYPES */}
            {activeTab === 'rooms' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-serif text-xl font-medium text-foreground">Room Types</h3>
                    <p className="mt-1 text-xs text-muted-foreground">Real room types from Hotelbeds Content API. Prices are reference snapshots, not live rates.</p>
                  </div>
                  {isSupplier && data.supplier_hotel_code && (
                    <button
                      onClick={handleSyncRooms}
                      disabled={roomSyncing}
                      className="inline-flex items-center gap-2 border border-accent px-3 py-2 text-xs font-medium uppercase tracking-wider text-accent hover:bg-accent/10 disabled:opacity-40"
                    >
                      {roomSyncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} /> : <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.5} />}
                      Sync Rooms
                    </button>
                  )}
                </div>

                {roomSyncResult && (
                  <div className="flex items-center gap-2 border border-border bg-background p-3 text-xs text-foreground">
                    <BedDouble className="h-4 w-4 shrink-0 text-accent" strokeWidth={1.5} />
                    {roomSyncResult}
                    <button onClick={() => setRoomSyncResult(null)} className="ml-auto text-xs text-muted-foreground hover:text-foreground">Dismiss</button>
                  </div>
                )}

                {!isSupplier && (
                  <div className="border border-border bg-secondary p-4 text-center">
                    <BedDouble className="mx-auto h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
                    <p className="mt-2 text-sm text-muted-foreground">Room types are only available for Hotelbeds properties.</p>
                  </div>
                )}

                {isSupplier && roomsLoading && (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" strokeWidth={1.5} />
                  </div>
                )}

                {isSupplier && !roomsLoading && propertyRooms.length === 0 && (
                  <div className="border border-border bg-secondary p-6 text-center">
                    <p className="text-sm text-muted-foreground">No room types synced yet. Click "Sync Rooms" to fetch real room data from Hotelbeds.</p>
                  </div>
                )}

                {isSupplier && !roomsLoading && propertyRooms.length > 0 && (
                  <div className="space-y-2">
                    {propertyRooms.map((room) => (
                      <div key={room.id} className={cn('border p-3', room.is_active ? 'border-border bg-background' : 'border-border bg-secondary/50 opacity-60')}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-medium text-foreground">{room.elvora_room_name || room.supplier_room_name || 'Unnamed Room'}</h4>
                              {room.price_override && (
                                <span className="border border-accent px-1.5 py-0.5 text-[0.625rem] uppercase tracking-wider text-accent">Manual Price</span>
                              )}
                              {!room.is_active && (
                                <span className="border border-border px-1.5 py-0.5 text-[0.625rem] uppercase tracking-wider text-muted-foreground">Inactive</span>
                              )}
                            </div>
                            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                              <span>Code: {room.supplier_room_code || '—'}</span>
                              {room.supplier_room_type && <span>· {room.supplier_room_type}</span>}
                              {room.supplier_max_adults !== null && <span>· {room.supplier_max_adults} adults</span>}
                              {room.supplier_max_occupancy !== null && <span>· sleeps {room.supplier_max_occupancy}</span>}
                            </div>
                            {room.supplier_description && (
                              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{room.supplier_description}</p>
                            )}
                            {room.supplier_facilities && room.supplier_facilities.length > 0 && (
                              <div className="mt-1.5 flex flex-wrap gap-1">
                                {room.supplier_facilities.slice(0, 5).map((f, i) => (
                                  <span key={i} className="border border-border px-1.5 py-0.5 text-[0.625rem] text-muted-foreground">{f}</span>
                                ))}
                                {room.supplier_facilities.length > 5 && <span className="text-[0.625rem] text-muted-foreground">+{room.supplier_facilities.length - 5}</span>}
                              </div>
                            )}
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="font-serif text-lg font-medium text-foreground">{room.currency} {room.elvora_price_per_night.toLocaleString()}</p>
                            <p className="text-[0.625rem] uppercase tracking-wider text-muted-foreground">per night</p>
                            {room.price_synced_at && (
                              <p className="mt-0.5 text-[0.625rem] text-muted-foreground">Synced: {new Date(room.price_synced_at).toLocaleDateString()}</p>
                            )}
                          </div>
                        </div>

                        {editingRoomId === room.id ? (
                          <div className="mt-3 border-t border-border pt-3">
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <label className="mb-1 block text-[0.625rem] uppercase tracking-wider text-muted-foreground">Price/night</label>
                                <input type="number" min={0} step="0.01" value={editRoomPrice} onChange={(e) => setEditRoomPrice(e.target.value)} className="w-full border border-border bg-background px-2 py-1.5 text-sm" />
                              </div>
                              <div>
                                <label className="mb-1 block text-[0.625rem] uppercase tracking-wider text-muted-foreground">Currency</label>
                                <input type="text" value={editRoomCurrency} onChange={(e) => setEditRoomCurrency(e.target.value.toUpperCase())} maxLength={3} className="w-full border border-border bg-background px-2 py-1.5 text-sm" />
                              </div>
                              <div>
                                <label className="mb-1 block text-[0.625rem] uppercase tracking-wider text-muted-foreground">Active</label>
                                <select value={editRoomActive ? '1' : '0'} onChange={(e) => setEditRoomActive(e.target.value === '1')} className="w-full border border-border bg-background px-2 py-1.5 text-sm">
                                  <option value="1">Yes</option>
                                  <option value="0">No</option>
                                </select>
                              </div>
                            </div>
                            <div className="mt-2 flex gap-2">
                              <button onClick={handleSaveRoom} className="bg-foreground px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-background hover:bg-foreground/85">Save</button>
                              <button onClick={() => setEditingRoomId(null)} className="border border-border px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-2 flex gap-2">
                            <button onClick={() => handleEditRoom(room)} className="text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground">Edit</button>
                            <button onClick={() => handleToggleRoomActive(room.id, room.is_active)} className="text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground">
                              {room.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* LOCATION */}
            {activeTab === 'location' && (
              <div className="space-y-4">
                <h3 className="font-serif text-xl font-medium text-foreground">Location</h3>
                <Field label="Destination">
                  <select
                    value={data.destination_id ?? ''}
                    onChange={(e) => {
                      const dest = destinations.find((d) => d.id === e.target.value);
                      if (dest) {
                        update('destination_id', dest.id);
                        update('destination_slug', dest.slug);
                        update('destination_name', dest.name);
                        update('country', dest.country);
                      }
                    }}
                    className="w-full border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">— Select destination —</option>
                    {destinations.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}, {d.country}</option>
                    ))}
                  </select>
                </Field>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="Country">
                    <input type="text" value={data.country} onChange={(e) => update('country', e.target.value)} className="w-full border border-border bg-background px-3 py-2 text-sm" />
                  </Field>
                  <Field label="City">
                    <input type="text" value={data.city} onChange={(e) => update('city', e.target.value)} className="w-full border border-border bg-background px-3 py-2 text-sm" />
                  </Field>
                </div>
                <Field label="Neighborhood (Elvora)">
                  <input type="text" value={data.elvora_neighborhood ?? ''} onChange={(e) => update('elvora_neighborhood', e.target.value || null)} className="w-full border border-border bg-background px-3 py-2 text-sm" />
                </Field>
                <Field label="Address">
                  <input type="text" value={data.address ?? ''} onChange={(e) => update('address', e.target.value || null)} className="w-full border border-border bg-background px-3 py-2 text-sm" />
                </Field>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="Latitude">
                    <input type="number" step="any" value={data.latitude ?? ''} onChange={(e) => update('latitude', e.target.value ? Number(e.target.value) : null)} className="w-full border border-border bg-background px-3 py-2 text-sm" />
                  </Field>
                  <Field label="Longitude">
                    <input type="number" step="any" value={data.longitude ?? ''} onChange={(e) => update('longitude', e.target.value ? Number(e.target.value) : null)} className="w-full border border-border bg-background px-3 py-2 text-sm" />
                  </Field>
                </div>
              </div>
            )}

            {/* STATUS */}
            {activeTab === 'status' && (
              <div className="space-y-4">
                <h3 className="font-serif text-xl font-medium text-foreground">Inventory Status</h3>

                <Field label="Property Status (Elvora Override)">
                  <select
                    value={data.elvora_property_status ?? ''}
                    onChange={(e) => update('elvora_property_status', e.target.value || null)}
                    className="w-full border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Use supplier default ({data.property_status})</option>
                    <option value="catalog">Catalog</option>
                    <option value="bookable">Bookable</option>
                    <option value="coming_soon">Coming Soon</option>
                    <option value="archived">Archived</option>
                  </select>
                </Field>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <ToggleField
                    label="Active (visible publicly)"
                    value={getEffective(data.elvora_is_active, data.is_active)}
                    onChange={(v) => update('elvora_is_active', v)}
                    hint="When OFF, property disappears from public inventory"
                  />
                  <ToggleField
                    label="Booking Enabled"
                    value={getEffective(data.elvora_booking_enabled, data.booking_enabled)}
                    onChange={(v) => update('elvora_booking_enabled', v)}
                  />
                  <ToggleField
                    label="Featured"
                    value={getEffective(data.elvora_featured, data.featured)}
                    onChange={(v) => update('elvora_featured', v)}
                    hint="Appears in homepage Featured Stays section"
                  />
                  <ToggleField
                    label="Popular"
                    value={getEffective(data.elvora_popular, false)}
                    onChange={(v) => update('elvora_popular', v)}
                  />
                  <ToggleField
                    label="New"
                    value={getEffective(data.elvora_new, false)}
                    onChange={(v) => update('elvora_new', v)}
                  />
                </div>

                <div className="border-t border-border pt-4">
                  <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Display Price (Editorial Only)</h4>
                  <p className="mt-1 text-xs text-muted-foreground">This is an editorial display value only. It does NOT affect live Hotelbeds pricing. If a property is bookable, live rates come from the supplier at search time.</p>
                  <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Field label="Display Price">
                      <input type="number" min={0} value={data.elvora_price_display ?? ''} onChange={(e) => update('elvora_price_display', e.target.value ? Number(e.target.value) : null)} className="w-full border border-border bg-background px-3 py-2 text-sm" />
                    </Field>
                    <Field label="Display Currency">
                      <input type="text" value={data.elvora_currency ?? ''} onChange={(e) => update('elvora_currency', e.target.value || null)} placeholder={data.currency} className="w-full border border-border bg-background px-3 py-2 text-sm" />
                    </Field>
                  </div>
                </div>

                {/* Contact info */}
                <div className="border-t border-border pt-4">
                  <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Contact Information (Elvora)</h4>
                  <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Field label="Phone"><input type="text" value={data.elvora_phone ?? ''} onChange={(e) => update('elvora_phone', e.target.value || null)} className="w-full border border-border bg-background px-3 py-2 text-sm" /></Field>
                    <Field label="Email"><input type="email" value={data.elvora_email ?? ''} onChange={(e) => update('elvora_email', e.target.value || null)} className="w-full border border-border bg-background px-3 py-2 text-sm" /></Field>
                  </div>
                  <div className="mt-3">
                    <Field label="Website"><input type="url" value={data.elvora_website ?? ''} onChange={(e) => update('elvora_website', e.target.value || null)} className="w-full border border-border bg-background px-3 py-2 text-sm" /></Field>
                  </div>
                </div>

                {/* Danger zone */}
                <div className="border-t border-border pt-4">
                  <h4 className="text-xs font-medium uppercase tracking-wider text-error">Danger Zone</h4>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {!isArchived ? (
                      <button
                        onClick={handleArchive}
                        disabled={saving}
                        className="inline-flex items-center gap-2 border border-warning px-3 py-2 text-xs font-medium uppercase tracking-wider text-warning hover:bg-warning/10 disabled:opacity-40"
                      >
                        <Archive className="h-3.5 w-3.5" strokeWidth={1.5} />
                        Archive Property
                      </button>
                    ) : (
                      <button
                        onClick={handleRestore}
                        disabled={saving}
                        className="inline-flex items-center gap-2 border border-accent px-3 py-2 text-xs font-medium uppercase tracking-wider text-accent hover:bg-accent/10 disabled:opacity-40"
                      >
                        <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} />
                        Restore Property
                      </button>
                    )}

                    {bookingCount > 0 ? (
                      <div className="inline-flex items-center gap-2 border border-border px-3 py-2 text-xs text-muted-foreground">
                        <AlertTriangle className="h-3.5 w-3.5" strokeWidth={1.5} />
                        Cannot delete: {bookingCount} booking{bookingCount > 1 ? 's' : ''} exist. Archive instead.
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        disabled={saving}
                        className="inline-flex items-center gap-2 border border-error px-3 py-2 text-xs font-medium uppercase tracking-wider text-error hover:bg-error/10 disabled:opacity-40"
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                        Permanently Delete
                      </button>
                    )}
                  </div>
                </div>

                {/* Delete confirmation */}
                {showDeleteConfirm && (
                  <div className="border-2 border-error bg-error/5 p-4">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 shrink-0 text-error" strokeWidth={1.5} />
                      <div>
                        <p className="text-sm font-medium text-foreground">Confirm permanent deletion</p>
                        <p className="mt-1 text-xs text-muted-foreground">This action cannot be undone. The property and all its data will be permanently removed.</p>
                        <div className="mt-3 flex gap-2">
                          <button onClick={handleDelete} disabled={saving} className="bg-error px-4 py-2 text-xs font-medium uppercase tracking-wider text-white hover:bg-error/85 disabled:opacity-40">
                            {saving ? 'Deleting...' : 'Yes, delete permanently'}
                          </button>
                          <button onClick={() => setShowDeleteConfirm(false)} className="border border-border px-4 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground">Cancel</button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SUPPLIER */}
            {activeTab === 'supplier' && (
              <div className="space-y-4">
                <h3 className="font-serif text-xl font-medium text-foreground">Supplier Information</h3>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <InfoRow label="Supplier" value={data.supplier_name || 'Elvora Curated'} />
                  <InfoRow label="Supplier Hotel Code" value={data.supplier_hotel_code || '—'} />
                  <InfoRow label="Supplier Status" value={data.supplier_status} />
                  <InfoRow label="Verification Status" value={data.verification_status} />
                  <InfoRow label="Last Synced" value={data.last_synced_at ? new Date(data.last_synced_at).toLocaleString() : 'Never'} />
                  <InfoRow label="Last Verified" value={data.last_verified_at ? new Date(data.last_verified_at).toLocaleString() : 'Never'} />
                  <InfoRow label="Source URL" value={data.source_url || '—'} link={data.source_url || undefined} />
                  <InfoRow label="Editorial Override Active" value={data.editorial_override ? 'Yes' : 'No'} />
                </div>

                {isSupplier && (
                  <div className="border border-border bg-secondary p-4">
                    <p className="text-xs text-muted-foreground">
                      <strong className="text-foreground">Hotelbeds Sync Protection:</strong>{' '}
                      {data.editorial_override
                        ? 'Editorial overrides are active. Hotelbeds content sync will NOT overwrite your Elvora editorial changes (name, description, images, tags, amenities, featured status, etc.).'
                        : 'No editorial overrides set. Hotelbeds sync will update supplier data fields (name, description, images, amenities) as normal.'}
                    </p>
                  </div>
                )}

                <div className="border-t border-border pt-4">
                  <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Supplier Data (Read-Only)</h4>
                  <p className="mt-1 text-xs text-muted-foreground">These fields come from the supplier and are managed by the sync process. Use the Editorial tabs to override how they appear on Elvora.</p>
                  <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                    <InfoRow label="Supplier Name (original)" value={data.name} />
                    <InfoRow label="Supplier Description" value={data.long_description.substring(0, 100) + (data.long_description.length > 100 ? '...' : '')} />
                  </div>
                </div>
              </div>
            )}

            {/* AUDIT */}
            {activeTab === 'audit' && (
              <div className="space-y-4">
                <h3 className="font-serif text-xl font-medium text-foreground">Audit History</h3>
                {auditLog.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No audit entries yet.</p>
                ) : (
                  <div className="space-y-2">
                    {auditLog.map((entry) => (
                      <div key={entry.id} className="border border-border bg-background p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium uppercase tracking-wider text-foreground">{entry.action}</span>
                          <span className="text-xs text-muted-foreground">{new Date(entry.created_at).toLocaleString()}</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">by {entry.admin_user_email || 'Unknown'}</p>
                        {Object.keys(entry.changed_fields).length > 0 && (
                          <div className="mt-2 space-y-1">
                            {Object.entries(entry.changed_fields).slice(0, 5).map(([field, change]) => (
                              <div key={field} className="text-xs">
                                <span className="text-muted-foreground">{field}:</span>{' '}
                                <span className="text-muted-foreground/60 line-through">{formatValue(change.previous)}</span>{' '}
                                → <span className="text-foreground">{formatValue(change.new)}</span>
                              </div>
                            ))}
                            {Object.keys(entry.changed_fields).length > 5 && (
                              <p className="text-xs text-muted-foreground">+ {Object.keys(entry.changed_fields).length - 5} more fields</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-muted-foreground/70">{hint}</p>}
    </div>
  );
}

function ToggleField({ label, value, onChange, hint }: { label: string; value: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <button
          type="button"
          onClick={() => onChange(!value)}
          className={cn(
            'relative h-5 w-9 rounded-full transition-colors',
            value ? 'bg-accent' : 'bg-border'
          )}
        >
          <span className={cn(
            'absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform',
            value ? 'left-[1.125rem]' : 'left-0.5'
          )} />
        </button>
        {label}
      </label>
      {hint && <p className="mt-1 text-xs text-muted-foreground/70">{hint}</p>}
    </div>
  );
}

function InfoRow({ label, value, link }: { label: string; value: string; link?: string }) {
  return (
    <div className="border border-border bg-background p-3">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      {link ? (
        <a href={link} target="_blank" rel="noopener noreferrer" className="mt-1 flex items-center gap-1 text-sm text-foreground hover:text-accent">
          {value} <ExternalLink className="h-3 w-3" />
        </a>
      ) : (
        <p className="mt-1 text-sm text-foreground">{value}</p>
      )}
    </div>
  );
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'string') return v.length > 50 ? v.substring(0, 50) + '...' : v;
  if (Array.isArray(v)) return `[${v.length} items]`;
  if (typeof v === 'object') return JSON.stringify(v).substring(0, 50) + '...';
  return String(v);
}
