
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'partner');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  must_change_password BOOLEAN NOT NULL DEFAULT false,
  last_seen TIMESTAMPTZ,
  activity TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles readable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles self update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "roles readable by authenticated" ON public.user_roles FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- Settings (key/value; managed by admin)
CREATE TABLE public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings readable" ON public.app_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "settings admin write" ON public.app_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Hold My Hand messages
CREATE TABLE public.hold_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.hold_messages TO authenticated;
GRANT ALL ON public.hold_messages TO service_role;
ALTER TABLE public.hold_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hold read" ON public.hold_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "hold admin write" ON public.hold_messages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Comfort Corner letters
CREATE TABLE public.comfort_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mood TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.comfort_letters TO authenticated;
GRANT ALL ON public.comfort_letters TO service_role;
ALTER TABLE public.comfort_letters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "letters read" ON public.comfort_letters FOR SELECT TO authenticated USING (true);
CREATE POLICY "letters admin write" ON public.comfort_letters FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Media library (music, sleep sounds, voice notes, breathing, wallpapers)
CREATE TABLE public.media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL,              -- 'music' | 'voice' | 'breathing' | 'wallpaper' | 'sleep'
  category TEXT,                    -- for sleep sounds: rain/ocean/night/nature/mine
  title TEXT NOT NULL,
  storage_path TEXT NOT NULL,       -- path within bucket
  public_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.media TO authenticated;
GRANT ALL ON public.media TO service_role;
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "media read" ON public.media FOR SELECT TO authenticated USING (true);
CREATE POLICY "media admin write" ON public.media FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Journal entries (private to owner; admin cannot read)
CREATE TABLE public.journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_entries TO authenticated;
GRANT ALL ON public.journal_entries TO service_role;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "journal owner only" ON public.journal_entries FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Storage policies for the quietmind-media bucket
-- Public read (bucket is public); admin write via has_role check on JWT
CREATE POLICY "media upload admin" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'quietmind-media' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "media update admin" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'quietmind-media' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "media delete admin" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'quietmind-media' AND public.has_role(auth.uid(), 'admin'));

-- Seed default settings, hold messages, and comfort letter placeholders
INSERT INTO public.app_settings (key, value) VALUES
  ('home_greeting', 'Good Evening 🌙'),
  ('home_subtitle', 'You don''t have to carry everything alone tonight.'),
  ('wallpaper_url', '')
ON CONFLICT DO NOTHING;

INSERT INTO public.hold_messages (text, sort_order) VALUES
  ('I love you.', 1),
  ('You are safe.', 2),
  ('I''m proud of you.', 3),
  ('You are enough.', 4),
  ('You are stronger than you think.', 5),
  ('You don''t have to solve everything tonight.', 6),
  ('Breathe. I''m right here with you.', 7),
  ('You matter more than you know.', 8);

INSERT INTO public.comfort_letters (mood, title, body) VALUES
  ('sad', 'Read this when you''re sad', 'Baccha, whatever is heavy right now — you don''t have to hold it alone. Put it down for tonight. I''m right here.'),
  ('overthinking', 'Read this when you''re overthinking', 'Your mind is loud, but you are not your thoughts. Take one slow breath. Then another. That''s enough for right now.'),
  ('sleep', 'Read this when you can''t sleep', 'Close your eyes. Nothing needs solving before morning. Let the night hold you gently — I''ve got you.'),
  ('miss', 'Read this when you miss me', 'I''m with you in every quiet moment. Read this again whenever your heart needs a hand to hold. 🤍');
