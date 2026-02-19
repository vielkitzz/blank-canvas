
-- Create teams table
CREATE TABLE public.teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL DEFAULT '',
  abbreviation TEXT NOT NULL DEFAULT '',
  logo TEXT,
  founding_year INTEGER,
  colors TEXT[] NOT NULL DEFAULT '{}',
  rate INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own teams" ON public.teams FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own teams" ON public.teams FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own teams" ON public.teams FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own teams" ON public.teams FOR DELETE USING (auth.uid() = user_id);

-- Create tournaments table
CREATE TABLE public.tournaments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sport TEXT NOT NULL DEFAULT 'Futebol',
  year INTEGER NOT NULL DEFAULT 2025,
  format TEXT NOT NULL DEFAULT 'liga',
  number_of_teams INTEGER NOT NULL DEFAULT 0,
  logo TEXT,
  team_ids TEXT[] NOT NULL DEFAULT '{}',
  settings JSONB NOT NULL DEFAULT '{}',
  matches JSONB NOT NULL DEFAULT '[]',
  finalized BOOLEAN NOT NULL DEFAULT false,
  seasons JSONB NOT NULL DEFAULT '[]',
  liga_turnos INTEGER,
  grupos_quantidade INTEGER,
  grupos_turnos INTEGER,
  grupos_mata_mata_inicio TEXT,
  mata_mata_inicio TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tournaments" ON public.tournaments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own tournaments" ON public.tournaments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own tournaments" ON public.tournaments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own tournaments" ON public.tournaments FOR DELETE USING (auth.uid() = user_id);
