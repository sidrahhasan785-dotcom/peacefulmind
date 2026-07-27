# Deploying QuietMind to Netlify

This project runs on TanStack Start + Nitro. The preview inside Lovable
builds for Cloudflare; `netlify.toml` overrides that with
`NITRO_PRESET=netlify` so the same code deploys to Netlify.

## 1. Create your own Supabase project

**Important:** the Lovable preview uses Lovable Cloud, which is a managed
Supabase instance whose service-role key is not exposed to you. To deploy
outside Lovable you need your own Supabase project so you control the keys.

1. Create a project at supabase.com.
2. Re-run the SQL migrations from this project against your new database
   (schema for `profiles`, `user_roles`, `app_settings`, `hold_messages`,
   `comfort_letters`, `media`, `journal_entries`, plus the `has_role`
   function and all RLS policies).
3. Create a **private** storage bucket named `quietmind-media` and add a
   SELECT policy for `authenticated` so users can sign URLs client-side.
4. In Auth → Providers, enable Email/password and disable email
   confirmation (this app uses synthetic `username@quietmind.local`
   emails).

## 2. Configure Netlify environment variables

In **Site settings → Environment variables**, add:

| Variable                          | Value                                  |
| --------------------------------- | -------------------------------------- |
| `VITE_SUPABASE_URL`               | `https://<project-ref>.supabase.co`    |
| `VITE_SUPABASE_PUBLISHABLE_KEY`   | your Supabase publishable / anon key   |
| `SUPABASE_URL`                    | same as `VITE_SUPABASE_URL`            |
| `SUPABASE_PUBLISHABLE_KEY`        | same as `VITE_SUPABASE_PUBLISHABLE_KEY`|
| `SUPABASE_SERVICE_ROLE_KEY`       | **required** for admin server fns      |

`SUPABASE_SERVICE_ROLE_KEY` is only needed for admin actions (create user,
delete user, admin journal management). Media playback works with just the
publishable key thanks to the browser-side signer.

## 3. Deploy

Push the repo to GitHub, import into Netlify, and let it build. Netlify
will pick up `netlify.toml` automatically.

```bash
npm install
npm run build   # local sanity check
```

## What won't work on Lovable Cloud alone

If you skip step 1 and try to deploy with just the anon key from
`.env`, browser features (auth, journal, media playback) work but admin
actions in `src/lib/quietmind.functions.ts` will 500 because the
service-role key isn't available.