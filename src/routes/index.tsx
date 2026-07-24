import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { NightSky } from "@/components/NightSky";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/home" });
    throw redirect({ to: "/auth" });
  },
  component: () => (
    <div className="min-h-screen">
      <NightSky />
    </div>
  ),
});
