-- Remove broad SELECT-all policies on public buckets and replace with
-- per-object access (works via direct URL) without allowing LIST operations.

-- restaurant-images
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND (qual LIKE '%restaurant-images%' OR with_check LIKE '%restaurant-images%')
      AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- promo-videos
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND (qual LIKE '%promo-videos%' OR with_check LIKE '%promo-videos%')
      AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- Note: public buckets still serve files over their public URL via the
-- storage API even without a SELECT RLS policy on storage.objects, because
-- the public endpoint bypasses RLS for buckets marked public=true.
-- Removing the SELECT policy only prevents authenticated/anon clients
-- from calling storage.list() to enumerate the bucket contents.