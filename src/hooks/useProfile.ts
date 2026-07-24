import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  username: string;
  display_name: string;
  must_change_password: boolean;
  role: "admin" | "partner" | null;
};

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        if (!cancelled) {
          setProfile(null);
          setLoading(false);
        }
        return;
      }
      const [{ data: p }, { data: r }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", u.user.id).maybeSingle(),
      ]);
      if (cancelled) return;
      setProfile(
        p
          ? {
              id: p.id,
              username: p.username,
              display_name: p.display_name,
              must_change_password: p.must_change_password,
              role: (r?.role as "admin" | "partner" | null) ?? null,
            }
          : null,
      );
      setLoading(false);
    }
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { profile, loading };
}