
-- Fix rate column type to support decimals
ALTER TABLE public.teams ALTER COLUMN rate TYPE numeric USING rate::numeric;
ALTER TABLE public.teams ALTER COLUMN rate SET DEFAULT 5;

-- Fix teams RLS policies: drop restrictive and recreate as permissive
DROP POLICY IF EXISTS "Users can create their own teams" ON public.teams;
DROP POLICY IF EXISTS "Users can delete their own teams" ON public.teams;
DROP POLICY IF EXISTS "Users can update their own teams" ON public.teams;
DROP POLICY IF EXISTS "Users can view their own teams" ON public.teams;

CREATE POLICY "Users can view their own teams" ON public.teams FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own teams" ON public.teams FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own teams" ON public.teams FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own teams" ON public.teams FOR DELETE USING (auth.uid() = user_id);

-- Fix tournaments RLS policies: drop restrictive and recreate as permissive
DROP POLICY IF EXISTS "Users can create their own tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Users can delete their own tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Users can update their own tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Users can view their own tournaments" ON public.tournaments;

CREATE POLICY "Users can view their own tournaments" ON public.tournaments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own tournaments" ON public.tournaments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own tournaments" ON public.tournaments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own tournaments" ON public.tournaments FOR DELETE USING (auth.uid() = user_id);
