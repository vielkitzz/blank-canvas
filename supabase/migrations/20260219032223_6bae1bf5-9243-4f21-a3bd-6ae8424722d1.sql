
-- Create storage bucket for logos (team + tournament)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'logos',
  'logos',
  true,
  2097152, -- 2MB max (post-compression WebP files are small)
  ARRAY['image/webp', 'image/png', 'image/jpeg', 'image/gif', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Public read access for anyone
CREATE POLICY "Public logos read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'logos');

-- Authenticated users can upload logos
CREATE POLICY "Authenticated logos upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'logos'
    AND auth.uid() IS NOT NULL
  );

-- Users can update their own logos
CREATE POLICY "Authenticated logos update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'logos'
    AND auth.uid() IS NOT NULL
  );

-- Users can delete their own logos
CREATE POLICY "Authenticated logos delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'logos'
    AND auth.uid() IS NOT NULL
  );
