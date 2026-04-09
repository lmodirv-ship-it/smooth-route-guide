
-- Create public storage bucket for promo videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('promo-videos', 'promo-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read from this bucket
CREATE POLICY "Public read access for promo videos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'promo-videos');
