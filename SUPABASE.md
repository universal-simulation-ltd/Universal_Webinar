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
4. [`supabase/migrations/0005_registration_list.sql`](supabase/migrations/0005_registration_list.sql) — the read counterpart of the `manage_token` write RPC: `list_registrations_by_token(slug, token)` lets an unverified host see their own registrations on `/host/w/:slug`. Also tightens the authenticated registration policies so an OTP-verified host only sees / manages registrations for their own webinars (the old policy let any host read every host's registrant emails).

(`0004_phase4_livekit.sql` is the Phase 4 video migration — see the LiveKit section below; run it when you reach Phase 4.)

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

**Free tier note:** LiveKit Cloud gives you 25,000 participant-minutes/month for free — no credit card needed. A 1-hour webinar with 50 viewers uses ~3,000 participant-minutes, so you can run roughly 8 webinars like that per month before paying anything (~$0.006/participant-minute after that).

---

### Step 1 — Create a LiveKit Cloud project

1. Go to <https://livekit.io/cloud> and sign up (GitHub login works).
2. Click **New Project**.
3. Give it a name (e.g. `universal-webinar`) and pick the region nearest your audience (London for UK).
4. Click **Create**.
5. On the project dashboard, note the **WebSocket URL** — it looks like `wss://universal-webinar-abc123.livekit.cloud`. Copy this.
6. In the left nav, go to **Settings → Keys**.
7. Click **Generate new key**.
8. Copy the **API Key** (starts with `API...`) and the **Secret Key** (a long random string). Save both somewhere safe — the secret is only shown once.

---

### Step 2 — Add env vars locally

Open `Universal_Apps/Universal_Webinar/.env.local` (create it if it doesn't exist) and add:

```
VITE_LIVEKIT_URL=wss://YOUR-PROJECT.livekit.cloud
```

Replace `wss://YOUR-PROJECT.livekit.cloud` with the WebSocket URL you copied in Step 1.

Your full `.env.local` will look something like:

```
VITE_SUPABASE_URL=https://abcdefgh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
VITE_LIVEKIT_URL=wss://universal-webinar-abc123.livekit.cloud
```

Restart `npm run dev` after editing the file.

---

### Step 3 — Add LiveKit secrets to Supabase

The Edge Function that mints LiveKit tokens needs the API key and secret server-side (never in the browser).

1. Go to your Supabase dashboard → your Universal Webinar project.
2. Left nav → **Project Settings → Edge Functions**.
3. Click **Add new secret** for each of the three values:

| Name | Value |
|---|---|
| `LIVEKIT_API_KEY` | the API Key from Step 1 |
| `LIVEKIT_API_SECRET` | the Secret Key from Step 1 |
| `LIVEKIT_URL` | `wss://YOUR-PROJECT.livekit.cloud` |

Click **Save** after each one.

---

### Step 4 — Deploy the Edge Function

The `livekit-token` Edge Function is already written at `supabase/functions/livekit-token/index.ts`. You just need to push it to Supabase.

You'll need the Supabase CLI installed (`npm install -g supabase` or `brew install supabase/tap/supabase`). You'll also need your **project ref** — this is the part of your Supabase URL before `.supabase.co` (e.g. if your URL is `https://abcdefgh.supabase.co` then the ref is `abcdefgh`).

Run these commands:

```
cd /Users/jamesmarkey/Github/UNISIM/Universal_Apps/Universal_Webinar
npx supabase login
npx supabase link --project-ref abcdefgh
npx supabase functions deploy livekit-token --no-verify-jwt
```

You should see `Deployed Functions livekit-token`. The `--no-verify-jwt` flag is intentional — the function does its own auth check internally by calling `auth.getUser()` with the caller's JWT.

---

### Step 5 — Run the Phase 4 database migration

In your Supabase dashboard → **SQL Editor → New query**, paste the contents of:

```
supabase/migrations/0004_phase4_livekit.sql
```

Click **Run**. You should see `Success. No rows returned.`

This migration adds:
- Guest RLS policies on the `speak_requests` table so attendees can submit and read their own requests.
- A `resolve_speak_request(request_id, status)` function that the admin calls to atomically approve/deny a request and update the attendee's role in one transaction.

---

### Step 6 — Add env var to Cloudflare Pages (production)

1. Go to your Cloudflare dashboard → Pages → your `universal-webinar` project.
2. **Settings → Environment variables → Production**.
3. Add a new variable:
   - **Variable name:** `VITE_LIVEKIT_URL`
   - **Value:** `wss://YOUR-PROJECT.livekit.cloud`
4. Click **Save**.
5. Trigger a redeploy: **Deployments → your latest deployment → … → Retry deployment**.

---

### Step 7 — Test it end-to-end

Open two browser windows — one for admin, one for a test guest.

**Browser permissions:** the first time you use the camera/mic, your browser will ask for permission. Click **Allow**. If you accidentally clicked Block, reset it in your browser's address bar (click the lock icon → Permissions).

1. **Admin** (`/admin/login`) → create a webinar or open an existing one → open the control room (`/admin/w/:slug`).
2. **Guest** → open `/w/:slug` in a second browser/incognito → fill in name + email → join.
3. **Admin** → click **Go live**. Your camera preview should appear in the stage area. If it asks for camera permission, click Allow.
4. **Guest** → refresh (or the status will update automatically via realtime) → you should see the host's video stream appear.
5. **Guest** → click **Request to speak**. The button changes to "Request sent — waiting…"
6. **Admin** → the speaker queue card shows the guest's name with Approve/Deny buttons → click **Approve**.
7. **Guest** → their view switches to the full `VideoConference` stage. They can now turn on their camera/mic.
8. **Admin** → click the mute icon (speaker icon) next to any attendee → the guest sees "The host has muted you" and their chat input disappears.
9. **Admin** → click **✕** next to an attendee → they are kicked and redirected back to the join page.
10. **Admin** → click **End webinar** → the session closes.

---

### Troubleshooting

**"LiveKit is not configured" shown in the admin stage**
> `VITE_LIVEKIT_URL` is not set. Add it to `.env.local` and restart `npm run dev`, or add it to Cloudflare Pages env vars and redeploy.

**Camera/mic not working**
> The browser blocked access. Click the lock icon in the address bar, find Camera and Microphone, set both to Allow, then reload the page.

**"Could not get LiveKit token" in the browser console**
> The Edge Function isn't deployed or the Supabase secrets aren't set. Re-run Step 3 and Step 4. Check the function logs in Supabase → **Edge Functions → livekit-token → Logs**.

**Video not appearing for guests**
> The host hasn't published their camera yet (LiveKit only sends a stream once the host has turned on camera in the `VideoConference` UI). Also confirm the guest's browser allows autoplay — some block audio until the user interacts with the page.

**"Only the admin may request a host token" error**
> The admin user's email doesn't match `accounts@unisim.co.uk` in the Supabase auth table. The Edge Function pins the host role to that email. Check the user's email in Supabase → Authentication → Users.

**Speaker request fails with RLS error**
> Migration 0004 hasn't been run. Re-run Step 5.
