# What Universal Webinar does with your details

A webinar is a service, not a file on your computer, so some of what you type
here has to be kept on a server: the host needs to know who registered, and
the room needs to know who is in it. This page says exactly what is kept, who
can see it, which other companies handle it, and when it is deleted. Where it
can, it names the code that makes each claim true.

This page is about the hosted version at
[opensource.unisim.co.uk/webinar](https://opensource.unisim.co.uk/webinar/),
run by UNI·SIM. A copy someone hosts themselves is run by them, not us.

---

## If you register for or join a webinar

**Opening a webinar page creates nothing.** Your browser only gets a session
when you press the button to register or join: that is an anonymous guest
account, with no password and no email attached to it, and it is how the room
recognises you if you come back. See `handleSubmit` in
[`src/pages/Register.tsx`](src/pages/Register.tsx) and
[`src/pages/Join.tsx`](src/pages/Join.tsx).

What is stored about you:

| What | Why | Who can see it |
|---|---|---|
| Your name and email address | so the host knows who registered, and to email you your link | the host |
| Your time zone | so reminders and the host's list show times you can read | the host |
| Your answers to the host's registration questions, if they asked any | the host asked | the host |
| When you joined and left the room | the host's attendance list | the host |
| Your chat messages, with your name | the room's chat | everyone in the room, and the host |
| Whether you asked to speak | so the host can bring you on | the host |

Your browser also remembers the name and email you last typed, in its own
local storage, so you don't have to type them again
([`src/lib/localPrefs.ts`](src/lib/localPrefs.ts)).

**The host** is whoever created the webinar. They can see the registration
list and the attendance list, and download them as a spreadsheet. What they do
with a copy they downloaded is up to them. UNI·SIM's own administrators can
also see webinars, for support.

**Emails.** If you register, we email you a confirmation with your personal
join link, a reminder before the webinar starts, and a follow-up afterwards
(with the replay, if there is one). They are sent through
[Resend](https://resend.com).

---

## The live room: LiveKit Cloud

Audio and video in the room are carried by [LiveKit Cloud](https://livekit.io),
which processes them in real time. If you are only watching, you send no audio
or video. If the host brings you on to speak, your camera and microphone are
sent through LiveKit to everyone in the room; your browser asks your permission
first. LiveKit does not keep the stream unless the host records the session
(below). See [`src/lib/livekit.ts`](src/lib/livekit.ts).

## Recordings and replays

The register and join pages say, before you join, that a session may be
recorded ([`src/components/RecordingNotice.tsx`](src/components/RecordingNotice.tsx)).
A host can record in two ways:

- **in their own browser**, which they can then download, or upload as the
  replay; or
- **in the cloud**, on paid webinars, where LiveKit records the room.

Either way, the replay is stored in a private
[Cloudflare R2](https://www.cloudflare.com/developer-platform/r2/) bucket held
in the EU (older replays may be in our Supabase storage). Anyone with the replay
link can watch it, through a short-lived signed link. It stays until the host
removes it. See [`src/lib/replay.ts`](src/lib/replay.ts).

If the host shares a document in the room, it is kept in our Supabase storage
and shown to people in the room through short-lived signed links
([`src/lib/sharedDoc.ts`](src/lib/sharedDoc.ts)).

---

## Where it is kept: Supabase

The registration list, the attendance list, chat and the webinars themselves
are kept in our [Supabase](https://supabase.com) database, which also runs the
sign-in (including the anonymous guest accounts).

## When it is deleted

- **When the host closes a webinar on a free plan**, it disappears from public
  view straight away, and 30 days later the webinar is deleted along with its
  registrations, attendance and chat. A nightly job does this.
- **On a paid plan**, closing a webinar keeps its history, so the host can
  compare runs of the same webinar. It stays until the host, or you, asks us
  to delete it.
- **Your guest account** is deleted after 90 days without use, and your
  attendance records in the webinars you joined go with it.
- **Replays** stay until the host removes them.

To have your details removed from a webinar sooner, ask its host, or email us
at **inbox@unisim.co.uk** and we will do it.

---

## What else the page talks to a server for

- **Signing in with a Universal ID.** Only if you choose to. A host confirms
  their email with a one-time code to manage their webinars, and anyone can
  sign in for the suite's shared account and settings. You can delete a Universal ID from inside the app: **Delete my
  account** at the foot of Global Tuning, in the profile menu.
- **"You opened the app".** When you are signed in with a Universal ID, the app
  records one event saying the app was opened, so your account's activity page
  is accurate. See `UsageTracker` in `@unisim/sdk`, mounted in
  [`src/main.tsx`](src/main.tsx).
- **"This app is in use".** While the app is open and on screen, it tells our
  server every 45 seconds that this app is in use on this device, so the menu
  can say how many people use it and how many are using it now. That message
  holds the app's name and a random ID made on this device, and your account
  if you are signed in. See `presence.ts` in `@unisim/sdk`.
- **The changelog and update notice**, which is just fetching a list of
  releases.

**There is no third-party analytics, no tracking pixel, and no advertising
script.** The font is served from this site, not Google Fonts. The site's
Content-Security-Policy ([`public/_headers`](public/_headers)) only lets the
page run its own code and Google's sign-in script, so anything else injected
into the page is refused.

---

## If you find this page is wrong

Please tell us. Open an issue on
[the repository](https://github.com/universal-simulation-ltd/Universal_Webinar/issues),
or email inbox@unisim.co.uk.
