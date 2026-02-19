-- Add Swiss system columns to tournaments
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS suico_jogos_liga integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS suico_mata_mata_inicio text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS suico_playoff_vagas integer DEFAULT NULL;

-- Create published tournaments table for sharing
CREATE TABLE public.published_tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL,
  user_id uuid NOT NULL,
  share_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.published_tournaments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own published tournaments"
  ON public.published_tournaments FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow anyone to read published tournaments by share_token (for public access)
CREATE POLICY "Anyone can view published tournaments"
  ON public.published_tournaments FOR SELECT
  USING (true);

-- Create tournament collaborators table
CREATE TABLE public.tournament_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  published_tournament_id uuid NOT NULL REFERENCES public.published_tournaments(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'viewer')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (published_tournament_id, email)
);

ALTER TABLE public.tournament_collaborators ENABLE ROW LEVEL SECURITY;

-- Owner of the published tournament can manage collaborators
CREATE POLICY "Published tournament owners can manage collaborators"
  ON public.tournament_collaborators FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.published_tournaments pt 
      WHERE pt.id = published_tournament_id AND pt.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.published_tournaments pt 
      WHERE pt.id = published_tournament_id AND pt.user_id = auth.uid()
    )
  );

-- Anyone can read collaborators (for checking access)
CREATE POLICY "Anyone can view collaborators"
  ON public.tournament_collaborators FOR SELECT
  USING (true);
