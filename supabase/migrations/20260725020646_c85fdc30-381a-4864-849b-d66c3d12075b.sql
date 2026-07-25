
-- Case-insensitive unique username
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_key
  ON public.profiles (lower(username));

-- Per-user ownership on media (null = official/app content)
ALTER TABLE public.media
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS media_user_id_idx ON public.media(user_id);

-- Replace media policies
DROP POLICY IF EXISTS "media read" ON public.media;
DROP POLICY IF EXISTS "media admin write" ON public.media;

CREATE POLICY "media read own or official"
  ON public.media FOR SELECT TO authenticated
  USING (user_id IS NULL OR user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "media insert own or admin official"
  ON public.media FOR INSERT TO authenticated
  WITH CHECK (
    (user_id = auth.uid())
    OR (user_id IS NULL AND public.has_role(auth.uid(), 'admin'))
  );

CREATE POLICY "media delete own or admin"
  ON public.media FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "media update admin"
  ON public.media FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
