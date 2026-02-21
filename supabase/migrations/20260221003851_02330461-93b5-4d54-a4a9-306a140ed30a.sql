-- Create ownership check function in public schema
CREATE OR REPLACE FUNCTION public.check_logo_ownership(object_name text)
RETURNS boolean AS $$
DECLARE
  entity_id text;
BEGIN
  entity_id := substring(object_name from '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}');
  
  IF entity_id IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM public.teams WHERE id = entity_id AND user_id = auth.uid()::text
  ) OR EXISTS (
    SELECT 1 FROM public.tournaments WHERE id = entity_id AND user_id = auth.uid()::text
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Replace the unrestricted DELETE policy with ownership-scoped one
DROP POLICY IF EXISTS "Authenticated logos delete" ON storage.objects;

CREATE POLICY "Owners can delete their logos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'logos'
    AND auth.uid() IS NOT NULL
    AND public.check_logo_ownership(name)
  );

-- Also restrict UPDATE policy to owners
DROP POLICY IF EXISTS "Authenticated logos update" ON storage.objects;

CREATE POLICY "Owners can update their logos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'logos'
    AND auth.uid() IS NOT NULL
    AND public.check_logo_ownership(name)
  );