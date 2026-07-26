
-- Admin can read all journal entries (users still only manage own via existing policy)
CREATE POLICY "journal admin read" ON public.journal_entries
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Admin can delete any journal entry
CREATE POLICY "journal admin delete" ON public.journal_entries
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Seed Heart Constellation default settings (idempotent)
INSERT INTO public.app_settings (key, value) VALUES
  ('hc_enabled', 'true'),
  ('hc_colors', '#ff6b9d,#c084fc,#f9a8d4,#fbbf24,#60a5fa'),
  ('hc_count', '24'),
  ('hc_speed', '1'),
  ('hc_message', 'No matter how heavy today felt… tomorrow is another chance. 🤍'),
  ('hc_song_path', '')
ON CONFLICT (key) DO NOTHING;
