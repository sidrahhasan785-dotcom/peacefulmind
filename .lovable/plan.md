# QuietMind — Build Plan

## Product outcome
A private, mobile-first wellness PWA for Android that feels like a calm night-time safe space. It supports exactly two users — Sidrah (Admin) and Priyanshu (Partner) — with role-based access, PIN/password login, and fully working media, journaling, letters, and admin features.

## Platform choice
- **PWA on Android** (installable from the browser). Native Android Studio/export can be added later if needed.
- **Lovable Cloud** for auth, database, storage, and server functions.

## Technical stack
- TanStack Start + React 19 + Tailwind CSS v4
- Lovable Cloud (Supabase) for auth, Postgres, Storage, and server functions
- Web Audio / HTML5 audio for playback
- PWA manifest + service worker for installability and offline shell

## Milestone 0 — Cloud foundation
1. Enable Lovable Cloud.
2. Create PWA manifest, icons, and head meta tags for installability.
3. Configure storage buckets: `music`, `voice_notes`, `breathing_audio`, `wallpapers`, `sleep_sounds`.
4. Create the database schema and RLS policies.

### Schema highlights
- `profiles` (linked to `auth.users`)
- `user_roles` with `app_role` enum (`admin`, `partner`) + `has_role` security-definer function
- `settings` (home greeting, quotes)
- `hold_my_hand_messages` (rotating comforting messages)
- `comfort_letters` (mood-tagged letters)
- `journal_entries` (partner-only, private)
- `content_library` (uploaded audio/wallpaper metadata)
- `online_status` (last seen + optional activity)

## Milestone 1 — Auth & onboarding
- Public `/auth` route with username + PIN/password login.
- Seed Sidrah (admin) with default PIN `290624`.
- One-time partner setup flow so Priyanshu can set his own password on first login.
- Role-based route guards: admin dashboard restricted to `admin`; partner routes to `partner`.
- Change PIN/password from Settings.

## Milestone 2 — Home screen & navigation
- Animated night-sky background: deep gradient, glowing stars, floating particles, large moon.
- Greeting area and subtitle.
- Main menu buttons: Breathe With Me, Hold My Hand, Empty Your Mind, Comfort Corner, Sleep Sounds.
- Soft fade screen transitions and ripple button feedback.

## Milestone 3 — Breathe With Me
- Full-screen glowing moon that expands/contracts in rhythm.
- Play the uploaded breathing audio with play/pause/resume/stop.
- Sync animation phases to the audio timeline.

## Milestone 4 — Hold My Hand
- Press-and-hold interaction on a large glowing button.
- Play soft background music while holding.
- Cycle comforting messages with fade animation while the session is active.
- Stop button ends music and session.

## Milestone 5 — Empty Your Mind
- Large, calm writing area.
- Save and delete journal entries.
- Entries are private to Priyanshu via RLS; admin cannot read them.
- View saved entries list.

## Milestone 6 — Comfort Corner
- Mood cards: sad, overthinking, can't sleep, miss me.
- Admin: create, edit, delete letters.
- Partner: read-only letter view.

## Milestone 7 — Sleep Sounds
- Premium audio player with play/pause/stop, seek bar, volume slider, and sleep timer.
- Category filters: Rain, Ocean, Night, Nature, My recordings.
- Background playback via the Media Session API.

## Milestone 8 — Admin dashboard
- PIN re-entry on dashboard entry (in addition to role gate).
- Upload music, voice notes, breathing audio, wallpapers, and sleep sounds.
- Manage Comfort Corner letters.
- Manage home greeting and Hold My Hand messages.
- Change background wallpaper.

## Milestone 9 — Settings & online status
- Show online indicator and last seen time.
- Optional activity status (e.g., breathing, listening, writing, reading).
- Role-specific settings: admin uploads/management; partner password change and app info.
- Dark-only theme.

## Milestone 10 — PWA & offline shell
- Installable manifest with app name, theme, icons, and `display: standalone`.
- Service worker for offline shell and asset caching.
- Static UI works offline; new media uploads require connectivity.

## Milestone 11 — QA & polish
- Responsive mobile layouts.
- Android audio playback behavior (autoplay policies, Media Session).
- Accessibility basics (labels, focus states, reduced-motion support).
- Smoke test login and each feature path.

## Notes & constraints
- This is a web-based PWA, not a native Android Studio project. Native-only features like true background audio execution are constrained by the mobile browser; we will use the Media Session API and foreground audio playback.
- Offline support applies to the app shell and previously accessed assets; cloud-backed content requires an internet connection for first upload/sync.
- Admin cannot read partner journal entries; this is enforced by Row Level Security on the `journal_entries` table.
