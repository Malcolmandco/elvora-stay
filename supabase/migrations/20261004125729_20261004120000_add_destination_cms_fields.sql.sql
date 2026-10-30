/*
# Add Destination CMS Editorial Fields

## Summary
Adds editorial, SEO, classification, media, and status columns to the `destinations` table
so the admin CMS can fully manage destination content. All existing columns and data
are preserved — this is an additive migration only.

## New Columns (all nullable with safe defaults to preserve existing rows)

### Editorial
- `tagline` text — short marketing tagline
- `editorial_title` text — editorial section heading
- `editorial_description` text — editorial section body
- `travel_story` text — long-form travel narrative
- `best_time_to_visit` text — best season/time guidance
- `why_visit` text — reasons to visit
- `highlights` text[] — array of highlight bullet points
- `experiences` text[] — array of experience descriptions
- `local_tips` text[] — array of local tip strings

### Media
- `cover_image` text — secondary cover image URL
- `thumbnail_image` text — small thumbnail image URL
- `og_image` text — OpenGraph image URL

### Classification
- `destination_type` text — e.g. 'city', 'beach', 'island', 'mountain'
- `tags` text[] — flexible tag array
- `is_new` boolean default false — new destination flag
- `display_order` integer default 0 — manual sort order

### SEO
- `seo_title` text
- `seo_description` text
- `seo_keywords` text[]
- `og_title` text
- `og_description` text

### Status
- `status` text default 'published' — 'published', 'draft', 'archived'

## RLS Changes
- Replaces the existing permissive authenticated write policies with
  admin-only INSERT/UPDATE/DELETE policies matching the properties table pattern.
- SELECT policy unchanged: public reads only `is_active = true` rows.
*/

DO $$
BEGIN
  -- Editorial
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='destinations' AND column_name='tagline') THEN
    ALTER TABLE public.destinations ADD COLUMN tagline text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='destinations' AND column_name='editorial_title') THEN
    ALTER TABLE public.destinations ADD COLUMN editorial_title text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='destinations' AND column_name='editorial_description') THEN
    ALTER TABLE public.destinations ADD COLUMN editorial_description text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='destinations' AND column_name='travel_story') THEN
    ALTER TABLE public.destinations ADD COLUMN travel_story text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='destinations' AND column_name='best_time_to_visit') THEN
    ALTER TABLE public.destinations ADD COLUMN best_time_to_visit text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='destinations' AND column_name='why_visit') THEN
    ALTER TABLE public.destinations ADD COLUMN why_visit text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='destinations' AND column_name='highlights') THEN
    ALTER TABLE public.destinations ADD COLUMN highlights text[] DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='destinations' AND column_name='experiences') THEN
    ALTER TABLE public.destinations ADD COLUMN experiences text[] DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='destinations' AND column_name='local_tips') THEN
    ALTER TABLE public.destinations ADD COLUMN local_tips text[] DEFAULT '{}';
  END IF;

  -- Media
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='destinations' AND column_name='cover_image') THEN
    ALTER TABLE public.destinations ADD COLUMN cover_image text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='destinations' AND column_name='thumbnail_image') THEN
    ALTER TABLE public.destinations ADD COLUMN thumbnail_image text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='destinations' AND column_name='og_image') THEN
    ALTER TABLE public.destinations ADD COLUMN og_image text;
  END IF;

  -- Classification
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='destinations' AND column_name='destination_type') THEN
    ALTER TABLE public.destinations ADD COLUMN destination_type text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='destinations' AND column_name='tags') THEN
    ALTER TABLE public.destinations ADD COLUMN tags text[] DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='destinations' AND column_name='is_new') THEN
    ALTER TABLE public.destinations ADD COLUMN is_new boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='destinations' AND column_name='display_order') THEN
    ALTER TABLE public.destinations ADD COLUMN display_order integer NOT NULL DEFAULT 0;
  END IF;

  -- SEO
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='destinations' AND column_name='seo_title') THEN
    ALTER TABLE public.destinations ADD COLUMN seo_title text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='destinations' AND column_name='seo_description') THEN
    ALTER TABLE public.destinations ADD COLUMN seo_description text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='destinations' AND column_name='seo_keywords') THEN
    ALTER TABLE public.destinations ADD COLUMN seo_keywords text[] DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='destinations' AND column_name='og_title') THEN
    ALTER TABLE public.destinations ADD COLUMN og_title text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='destinations' AND column_name='og_description') THEN
    ALTER TABLE public.destinations ADD COLUMN og_description text;
  END IF;

  -- Status
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='destinations' AND column_name='status') THEN
    ALTER TABLE public.destinations ADD COLUMN status text NOT NULL DEFAULT 'published';
  END IF;

  -- Backfill is_featured: existing NULL -> false (should already be NOT NULL)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='destinations' AND column_name='is_new') THEN
    NULL;
  END IF;

END $$;

-- Update existing rows: set status to 'published' for active, 'archived' for inactive
UPDATE public.destinations SET status = CASE WHEN is_active THEN 'published' ELSE 'draft' END WHERE status IS NULL OR status = '';

-- Replace write policies with admin-only (matching properties pattern)
DROP POLICY IF EXISTS "auth_delete_destinations" ON public.destinations;
DROP POLICY IF EXISTS "auth_insert_destinations" ON public.destinations;
DROP POLICY IF EXISTS "auth_update_destinations" ON public.destinations;

CREATE POLICY "admin_insert_destinations"
ON public.destinations FOR INSERT
TO authenticated
WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "admin_update_destinations"
ON public.destinations FOR UPDATE
TO authenticated
USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "admin_delete_destinations"
ON public.destinations FOR DELETE
TO authenticated
USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- SELECT policy unchanged: public can only read active destinations
-- (existing public_select_destinations policy handles this)

-- Index for display_order sorting
CREATE INDEX IF NOT EXISTS destinations_display_order_idx ON public.destinations (display_order);
CREATE INDEX IF NOT EXISTS destinations_status_idx ON public.destinations (status);
CREATE INDEX IF NOT EXISTS destinations_is_featured_idx ON public.destinations (is_featured);
CREATE INDEX IF NOT EXISTS destinations_is_popular_idx ON public.destinations (is_popular);
CREATE INDEX IF NOT EXISTS destinations_is_new_idx ON public.destinations (is_new);
