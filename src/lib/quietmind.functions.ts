import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const DEFAULT_ADMIN_PIN = "290624";
const DEFAULT_PARTNER_PIN = "111111";

function emailFor(username: string) {
  return `${username.toLowerCase()}@quietmind.local`;
}

/**
 * Public bootstrap. Idempotent — creates the two fixed accounts (Sidrah & Priyanshu)
 * if they don't exist yet. Safe to call from the auth page.
 */
export const bootstrapAccounts = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  async function ensure(
    username: string,
    displayName: string,
    defaultPassword: string,
    role: "admin" | "partner",
    mustChange: boolean,
  ) {
    const email = emailFor(username);
    // Look up existing user by email
    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const existing = list?.users.find((u) => u.email === email);
    let userId = existing?.id;
    if (!userId) {
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: defaultPassword,
        email_confirm: true,
        user_metadata: { username, display_name: displayName },
      });
      if (error) throw error;
      userId = created.user!.id;
    }
    await supabaseAdmin.from("profiles").upsert(
      {
        id: userId,
        username,
        display_name: displayName,
        must_change_password: mustChange && !existing,
      },
      { onConflict: "id" },
    );
    await supabaseAdmin.from("user_roles").upsert({ user_id: userId, role }, { onConflict: "user_id,role" });
  }

  await ensure("Sidrah", "Sidrah", DEFAULT_ADMIN_PIN, "admin", false);
  await ensure("Priyanshu", "Priyanshu", DEFAULT_PARTNER_PIN, "partner", true);
  return { ok: true };
});

/**
 * Returns a signed URL for a stored media path, valid for 1 hour.
 */
export const signMediaUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { path: string }) => z.object({ path: z.string().min(1) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: signed, error } = await context.supabase.storage
      .from("quietmind-media")
      .createSignedUrl(data.path, 60 * 60);
    if (error) throw error;
    return { url: signed.signedUrl };
  });

/** Update online presence + optional activity */
export const heartbeat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { activity?: string | null }) =>
    z.object({ activity: z.string().nullable().optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await context.supabase
      .from("profiles")
      .update({ last_seen: new Date().toISOString(), activity: data.activity ?? null })
      .eq("id", context.userId);
    return { ok: true };
  });