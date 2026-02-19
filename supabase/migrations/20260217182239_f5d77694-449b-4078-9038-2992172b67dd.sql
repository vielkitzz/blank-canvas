
ALTER TABLE public.team_folders
  ADD COLUMN parent_id uuid REFERENCES public.team_folders(id) ON DELETE SET NULL DEFAULT NULL;
