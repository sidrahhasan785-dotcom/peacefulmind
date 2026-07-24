
CREATE POLICY "media read authenticated" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'quietmind-media');
