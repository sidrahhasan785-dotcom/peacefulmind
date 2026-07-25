import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function emailFor(username: string) {
  return `${username.toLowerCase()}@quietmind.local`;
}

/**
 * Public signup. Creates the auth user + profile atomically with a server-verified
 * unique username. Returns the synthetic email so the client can immediately sign in.
 */
export const signUp = createServerFn({ method: "POST" })
  .inputValidator((input: { full_name: string; username: string; password: string }) =>
    z
      .object({
        full_name: z.string().trim().min(1).max(80),
        username: z
          .string()
          .trim()
          .min(3)
          .max(30)
          .regex(/^[a-zA-Z0-9_]+$/, "Letters, numbers and underscore only"),
        password: z.string().min(6).max(200),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const usernameLower = data.username.toLowerCase();

    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .ilike("username", usernameLower)
      .maybeSingle();
    if (existing) throw new Error("That username is already taken.");

    const email = emailFor(data.username);
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: { username: data.username, display_name: data.full_name },
    });
    if (error) throw new Error(error.message);
    const userId = created.user!.id;

    const { error: pErr } = await supabaseAdmin.from("profiles").insert({
      id: userId,
      username: data.username,
      display_name: data.full_name,
      must_change_password: false,
    });
    if (pErr) {
      await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => {});
      throw new Error(pErr.message);
    }
    return { ok: true, email };
  });

/** Look up the synthetic email for a username so the client can call signInWithPassword. */
export const resolveLogin = createServerFn({ method: "POST" })
  .inputValidator((input: { username: string }) =>
    z.object({ username: z.string().trim().min(1).max(60) }).parse(input),
  )
  .handler(async ({ data }) => {
    return { email: emailFor(data.username) };
  });

/**
 * Returns a signed URL for a stored media path, valid for 1 hour.
 * Uses the service-role client so signed URL creation works reliably on
 * Cloudflare Workers regardless of the caller's storage RLS.
 */
export const signMediaUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { path: string }) => z.object({ path: z.string().min(1) }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await supabaseAdmin.storage
      .from("quietmind-media")
      .createSignedUrl(data.path, 60 * 60);
    if (error) throw new Error(error.message);
    if (!signed?.signedUrl) throw new Error("Could not sign media URL");
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

/** Admin only — list all non-admin users. */
export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const [{ data: users }, { data: roles }] = await Promise.all([
      context.supabase
        .from("profiles")
        .select("id,username,display_name,created_at,last_seen")
        .order("created_at", { ascending: false }),
      context.supabase.from("user_roles").select("user_id,role"),
    ]);
    const roleMap = new Map<string, string>();
    (roles || []).forEach((r: any) => roleMap.set(r.user_id, r.role));
    return {
      users: (users || [])
        .filter((u: any) => roleMap.get(u.id) !== "admin")
        .map((u: any) => ({ ...u, role: roleMap.get(u.id) ?? "user" })),
    };
  });

/** Admin only — permanently delete a user. */
export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { user_id: string }) =>
    z.object({ user_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    if (data.user_id === context.userId) throw new Error("You cannot delete your own account here.");
    const { data: targetRole } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user_id)
      .maybeSingle();
    if (targetRole?.role === "admin") throw new Error("Cannot delete another admin.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });