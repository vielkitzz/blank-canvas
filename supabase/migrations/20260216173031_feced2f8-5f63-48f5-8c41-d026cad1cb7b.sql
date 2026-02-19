
-- Create folders table
CREATE TABLE public.team_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Nova Pasta',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.team_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own folders" ON public.team_folders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own folders" ON public.team_folders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own folders" ON public.team_folders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own folders" ON public.team_folders FOR DELETE USING (auth.uid() = user_id);

-- Add folder_id to teams
ALTER TABLE public.teams ADD COLUMN folder_id UUID REFERENCES public.team_folders(id) ON DELETE SET NULL;
