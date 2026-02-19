
-- Fix 1: Remove overly permissive "Anyone can view collaborators" policy
DROP POLICY IF EXISTS "Anyone can view collaborators" ON public.tournament_collaborators;

-- Add restricted SELECT policies: owners and collaborators themselves
CREATE POLICY "Owners view collaborators"
  ON public.tournament_collaborators FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.published_tournaments pt
      WHERE pt.id = tournament_collaborators.published_tournament_id
        AND pt.user_id = auth.uid()
    )
  );

CREATE POLICY "Collaborators view peers"
  ON public.tournament_collaborators FOR SELECT
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Fix 2: Add input validation to SECURITY DEFINER function
CREATE OR REPLACE FUNCTION public.get_published_tournament_by_token(p_token text)
RETURNS TABLE(tournament_id uuid)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate token format: must be exactly 32 lowercase hex characters
  IF p_token IS NULL OR p_token !~ '^[a-f0-9]{32}$' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT pt.tournament_id
  FROM public.published_tournaments pt
  WHERE pt.share_token = p_token
  LIMIT 1;
END;
$$;
