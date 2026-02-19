
-- Fix #1: PUBLIC_DATA_EXPOSURE - Replace overly permissive SELECT on published_tournaments
DROP POLICY IF EXISTS "Anyone can view published tournaments" ON public.published_tournaments;

-- Allow owners to see their own published tournaments
CREATE POLICY "Owners can view their published tournaments"
  ON public.published_tournaments FOR SELECT
  USING (auth.uid() = user_id);

-- Allow anyone to look up a published tournament by share_token (needed for /shared/:token route)
CREATE POLICY "Anyone can lookup by share_token"
  ON public.published_tournaments FOR SELECT
  USING (true);
-- Note: We keep USING(true) but the SharedTournamentPage only queries by share_token.
-- Postgres RLS cannot conditionally restrict which filter is used. The realistic mitigation
-- is that share_tokens are UUIDs (unguessable). We'll tighten this with a view approach below.

-- Actually, let's use a better approach: drop the broad policy and use a security definer function
DROP POLICY IF EXISTS "Anyone can lookup by share_token" ON public.published_tournaments;

CREATE OR REPLACE FUNCTION public.get_published_tournament_by_token(p_token text)
RETURNS TABLE(tournament_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pt.tournament_id
  FROM public.published_tournaments pt
  WHERE pt.share_token = p_token
  LIMIT 1;
$$;

-- Fix #2: MISSING_RLS - Allow reading tournaments that have been published
-- Add policy so anyone can view a tournament if it's been published
CREATE POLICY "Anyone can view published tournament data"
  ON public.tournaments FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.published_tournaments pt
      WHERE pt.tournament_id = tournaments.id
    )
  );

-- Drop the old owner-only SELECT policy since the new one covers both cases
DROP POLICY IF EXISTS "Users can view their own tournaments" ON public.tournaments;

-- Fix #3: INPUT_VALIDATION - Add CHECK constraints
ALTER TABLE public.tournaments
  ADD CONSTRAINT chk_tournament_name CHECK (length(name) > 0 AND length(name) <= 255);

ALTER TABLE public.teams
  ADD CONSTRAINT chk_team_name CHECK (length(name) > 0 AND length(name) <= 255);

ALTER TABLE public.tournament_collaborators
  ADD CONSTRAINT chk_collaborator_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
