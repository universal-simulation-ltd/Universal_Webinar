# Supabase setup

This walks you through the **one-time backend setup** for Universal Webinar. Total time: ~10 minutes. No credit card required.

You'll create a Supabase project, run the migration SQL, create the admin user, and paste two env vars locally and on Vercel.

---

## 1. Create the Supabase project

1. Go to <https://supabase.com/dashboard> and sign in (GitHub login is easiest).
2. Click **New project**.
3. Fill in:
   - **Name**: `universal-webinar` (or anything you like)
   - **Database password**: generate a strong one and save it in your password manager. You won't need it day-to-day.
   - **Region**: pick the one nearest you (e.g. London for UK).
   - **Plan**: Free.
4. Click **Create new project**. Wait ~2 minutes for provisioning.

---

## 2. Run the migration SQL

In **SQL Editor → New query**, paste each migration file in order and click **Run** for each. You should see *"Success. No rows returned."*

1. [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) — creates the tables, base RLS, and the Realtime publication.
2. [`supabase/migrations/0002_phase3_chat.sql`](supabase/migrations/0002_phase3_chat.sql) — adds the guest-chat RLS policies, identity helper functions, and the `author_name` trigger.
3. [`supabase/migrations/0003_multihost.sql`](supabase/migrations/0003_multihost.sql) — pivots to multi-host SaaS: adds host-email / company / logo fields to webinars, the `manage_token`-based RPC for unverified hosts, the OTP-verification RPC, and the `logos` storage bucket. Pins `is_admin()` to `accounts@unisim.co.uk` so OTP-verified hosts don't inherit god-mode.

All migrations are idempotent and safe to re-run.

---

## 3. Create the admin user

1. In the left nav, open **Authentication → Users**.
2. Click **Add user → Create new user**.
3. Email: `Accounts@unisim.co.uk` (or whichever admin email you want).
4. Set a strong password and save it.
5. **Important**: Check **Auto Confirm User** before creating, so you don't have to click an email link.

That's your admin login.

> Email signup is the default Auth method. Anyone with the anon key can *attempt* to sign in, but only this user has a valid password.

> **Optional but recommended**: under **Authentication → Providers → Email**, turn **off** "Enable email signups" so nobody else can create an account through the front-end.

## 3a. Enable anonymous sign-in (required from Phase 3 onward)

Guests don't sign up — they join with just a name and email, which becomes an attendee row tied to a Supabase **anonymous** user. RLS uses that anonymous user's `auth.uid()` to gate who can post chat messages and reactions.

Turn it on under **Authentication → Sign In / Providers**:

1. Find **"Allow anonymous sign-ins"** (sometimes nested under the Email provider, depending on your dashboard version) and toggle it **on**.
2. Save.

If you skip this, the Join page will fail with "Anonymous sign-ins are disabled".

## 3b. Enable Email OTP (required from Phase 3.5)

Hosts verify their email with a 6-digit code when they click **Go live** for the first time. This uses Supabase's built-in Email OTP.

1. Still under **Authentication → Sign In / Providers**, open the **Email** block.
2. Make sure **"Enable Email Provider"** is on.
3. Find **"Confirm email"** / **"Email OTP expiration"** / **"OTP length"** — defaults are fine (6 digits, 1-hour expiry).
4. *(Optional)* Turn **off** **"Enable email signups"** if you only want hosts who came through the OTP flow — Supabase still allows OTP sign-in for existing users when signups are off. With signups on, anyone with an email can become a host (which is the SaaS intent).

## 3c. Wire Resend as the SMTP provider so OTP emails come from your domain

By default Supabase sends auth emails from `noreply@mail.app.supabase.io`, throttled to a handful per hour. Connect Resend (you already have a UNI SIM account) so the codes arrive from `webinar@unisim.co.uk`.

1. In Resend → **Domains** → confirm `unisim.co.uk` is verified (or use a sub-domain like `mail.unisim.co.uk`). Make sure the SPF / DKIM records are green.
2. Generate an **API key** in Resend with **Sending Access** — copy the value (`re_xxx`).
3. In Supabase → **Project Settings → Authentication → SMTP Settings** → enable **"Enable Custom SMTP"** and fill in:
   - Sender email: `webinar@unisim.co.uk`
   - Sender name: `Universal Webinar`
   - Host: `smtp.resend.com`
   - Port: `465` (SSL) or `587` (TLS)
   - Username: `resend`
   - Password: paste the Resend API key
4. Save and click **Send test email** to your own inbox. You should receive a test mail from `webinar@unisim.co.uk`.
5. *(Optional)* Customise the OTP template under **Authentication → Email Templates → "Magic Link"** — that's the one used for OTP. Replace the boilerplate with your own copy, keeping the `{{ .Token }}` placeholder for the 6-digit code.

## 3d. Verify the logos storage bucket exists

Migration 0003 already creates a public `logos` bucket. To double-check: **Storage** in the left nav → you should see a bucket named `logos` marked public. If it's not there, re-run migration 0003.

---

## 4. Get your project credentials

In **Project Settings → API** (left nav, near the bottom), copy:

- **Project URL** (e.g. `https://abcdefgh.supabase.co`) → goes into `VITE_SUPABASE_URL`
- **anon / public** API key (the long JWT under "Project API keys") → goes into `VITE_SUPABASE_ANON_KEY`

> Use the **anon** key, not the `service_role` key. The anon key is safe in the browser; the service_role key is **not** — never put it in `VITE_*` vars.

---

## 5. Configure local development

In the project root, create a file `.env.local`:

```bash
VITE_SUPABASE_URL=https://YOUR-PROJECT-ID.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...your-anon-key
```

Then:

```bash
npm run dev
```

Open <http://localhost:5173/admin/login>, sign in with `Accounts@unisim.co.uk` and your password. You should land on the dashboard.

---

## 6. Configure Vercel

In your Vercel project → **Settings → Environment Variables**, add the same two variables:

| Name | Value | Environments |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | `https://YOUR-PROJECT-ID.supabase.co` | Production, Preview, Development |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGci...` | Production, Preview, Development |

Click **Save**, then **Deployments → … → Redeploy** to apply.

---

## 7. Verify end-to-end

1. **Admin login**: `https://your-vercel-url/admin/login` → sign in.
2. **Create a webinar**: click **New webinar** on the dashboard.
3. **Copy the registration link** from the control room (top of the page).
4. **Open it in another browser / incognito**, fill in name + email, submit.
5. Back in the control room: refresh — your registration appears in the right-side **Registrations** panel.

If all five steps work, Phase 2 is complete. 🎉

---

## Troubleshooting

**"Supabase isn't connected"** banner on the login page
> Env vars aren't loaded. Restart `npm run dev` after creating `.env.local`. On Vercel, you must redeploy after adding env vars.

**Login error: "Invalid login credentials"**
> The email/password don't match. Either the user wasn't created, the email wasn't auto-confirmed (try the *"Auto Confirm User"* step again), or the password is wrong.

**"new row violates row-level security policy"** when registering as a guest
> RLS denied the insert. Verify the migration ran cleanly — the `registrations anon insert` policy must exist. Re-run `0001_init.sql`; it's idempotent.

**"Could not find the table 'public.webinars'"**
> The migration didn't run. Re-run it from the SQL editor.

**Realtime not working** (relevant in Phase 3+)
> Confirm under **Database → Replication** that `webinars`, `messages`, `reactions`, `speak_requests`, `attendees` are in the `supabase_realtime` publication. The migration adds them, but you can re-toggle from the UI if anything looks off.

---

## Phase 4 — LiveKit video setup

Phase 4 adds live video and audio for the host, approved speakers, and all viewers.

### 1. Create a LiveKit Cloud project

1. Sign up at <https://livekit.io/cloud> (free tier is generous — plenty for webinars).
2. Create a new project; choose the region closest to your users.
3. Under **Settings → Keys**, generate an API key + secret. Copy both values.

### 2. Add LiveKit env vars

**Local** — add to `.env.local`:
```
VITE_LIVEKIT_URL=wss://YOUR-PROJECT.livekit.cloud
```

**Supabase Edge Function secrets** — under **Project Settings → Edge Functions → Secrets**, add:
```
LIVEKIT_API_KEY      = your-key
LIVEKIT_API_SECRET   = your-secret
LIVEKIT_URL          = wss://YOUR-PROJECT.livekit.cloud
```

**Cloudflare Pages** (production) — add `VITE_LIVEKIT_URL` to your Pages project's environment variables under **Settings → Environment variables**.

### 3. Deploy the Edge Function

```
cd /Users/jamesmarkey/Github/UNISIM/Universal_Apps/Universal_Webinar
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_ID
npx supabase functions deploy livekit-token --no-verify-jwt
```

The `--no-verify-jwt` flag lets the function verify the caller's JWT itself (which it does — it calls `auth.getUser()`). If you prefer to let the Supabase gateway verify it first, drop the flag.

### 4. Run migration 0004

In **SQL Editor**, run `supabase/migrations/0004_phase4_livekit.sql`. This adds:
- Guest RLS policies on `speak_requests` (insert + read own)
- `resolve_speak_request(request_id, status)` RPC — atomically updates request status and attendee role

### 5. Verify end-to-end

1. Admin: click **Go live** → your camera preview should appear in the control room stage.
2. Guest: open `/w/:slug/live` → see the host's video stream (may take ~2s to appear).
3. Guest: click **Request to speak** → admin sees the request in the speaker queue.
4. Admin: click **Approve** → guest's view switches to the `VideoConference` stage where they can publish their camera.
5. Admin: click a **mute** icon → guest's chat input disappears and a "muted by host" banner appears.
6. Admin: click the **✕** icon → guest is kicked and redirected to the join page.
