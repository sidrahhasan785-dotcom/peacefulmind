import { supabase } from "@/integrations/supabase/client";

/**
 * Sign a private storage path from the browser. Works on any host (Netlify,
 * Vercel, Cloudflare) without needing a service-role key — the storage RLS
 * policy `media read authenticated` on `quietmind-media` lets any signed-in
 * user create signed URLs.
 */
export async function signMedia(path: string, expiresIn = 60 * 60): Promise<string> {
  const { data, error } = await supabase.storage
    .from("quietmind-media")
    .createSignedUrl(path, expiresIn);
  if (error) throw error;
  if (!data?.signedUrl) throw new Error("Could not sign media URL");
  return data.signedUrl;
}