import type { Article } from './types'

const articles: Article[] = [
  {
    id: 'what-is-a-webinar',
    title: 'What is a webinar?',
    summary: 'How a webinar differs from a video call, and who does what.',
    group: 'The basics',
    body: `A webinar is a live online event: one host, or a small number of speakers, presenting to an audience who watch and take part from wherever they are. The word is a blend of "web" and "seminar".

## How it differs from a video call

On a video call, everyone is usually on camera and anyone can speak. A webinar is shaped more like a talk in a hall:

- **The host runs the stage.** They present, share material and decide who else is heard.
- **The audience watches.** Attendees see and hear the stage but are not on camera themselves.
- **The audience still takes part.** They can chat, send reactions and ask to speak. If the host agrees, they come on air for a moment and then go back to watching.

That shape makes webinars suited to larger groups, because a room of fifty or five hundred people does not dissolve into crosstalk.

## Before and after the live part

A webinar is more than the hour it runs for. Usually people register in advance, receive a confirmation and reminders, join on the day, and afterwards hear from the host again, often with a link to a recording. Universal Webinar handles each of those steps, so a host can run the whole thing from one place.

## Live, not recorded

Everything in the room happens in real time. There is a delay of a moment or so between the host speaking and the audience hearing it, which is why questions in chat sometimes arrive just after the host has moved on. It is worth leaving a short pause after asking the audience something.`,
  },
  {
    id: 'how-live-video-reaches-you',
    title: 'How live video reaches everyone',
    summary: 'The journey from the host’s camera to every screen in the room.',
    group: 'The basics',
    body: `When a host goes live, their camera and microphone are captured by their browser, compressed, and sent over the internet to a video service. That service passes the stream on to every attendee's browser, which unpacks it and plays it. The whole journey usually takes well under a second.

## Why a video service sits in the middle

It would be possible for the host's computer to send its video directly to each attendee, but that means sending the same stream once per person, and a home connection runs out of upload capacity quickly. Instead, the host sends one stream to the service, and the service does the work of copying it out to everyone. That is what lets a webinar grow to a large audience without the host needing a special connection.

## The technology underneath

Universal Webinar uses WebRTC, the standard built into modern browsers for live audio and video, together with a video service called LiveKit that relays the streams. Nothing needs to be installed: the browser does it all.

## When the picture wobbles

Live video adjusts to the connection it has. If your connection slows down, the picture may become softer or pause briefly while sound keeps going, because the stream favours staying live over staying sharp. Some practical tips:

- For hosts and anyone put on air, a wired connection or a spot close to the Wi-Fi router makes the biggest difference.
- Closing other apps that use the internet heavily, such as large downloads or other video calls, frees up capacity.
- If the video freezes for good, reloading the page usually reconnects you to the room.

## Your camera and microphone

Attendees only receive video. Your own camera and microphone are never used unless the host puts you on air and you then switch them on yourself. The first time, your browser will ask your permission.`,
  },
  {
    id: 'registering-and-joining',
    title: 'Registering and joining',
    summary: 'The confirmation, reminders and join link, and what a host can require before you get in.',
    group: 'How it works',
    body: `## Registering

Registering takes your name and email address, plus answers to any questions the host has added. You do not need an account.

Once you are registered, you get a confirmation email with the session details, a calendar invite you can add to your calendar, and your own personal join link. That link takes you straight in on any device without typing your details again, so it is worth keeping.

## Reminders and follow-up

Unless the host has switched them off, you also receive:

- a reminder in the 24 hours before the session starts;
- a second reminder about an hour before it starts;
- a follow-up once it is over, thanking you for coming or, if you missed it, saying so. If the host adds a recording link, it is included. The follow-up goes out once the host has added a recording, or a day after the webinar ends if they have not.

Each email carries the same personal join link. Hosts can switch the confirmation, the reminders and the follow-up on or off separately.

## What a host can require

Hosts can set up the door in different ways:

- **Approval** — your registration waits until the host approves it. The confirmation email with your join link is only sent once you are approved.
- **Seat limit** — once the webinar is full, new registrations join a waitlist, and people move up automatically when a seat frees.
- **Open join link** — the host can let people join on the day without registering first, and can close that door at any time. People who already registered and were approved can still get in.
- **PIN** — the host can put a PIN on the room. Everyone needs it to enter, including people who registered.

These rules are checked by the service, not just by the page you see.

## Joining on the day

Open your join link, or the link the host shared, and enter your name and email if asked. Your browser remembers them for next time. In the room you can watch, chat, send reactions and raise your hand to ask to speak.`,
  },
  {
    id: 'hosting-a-webinar',
    title: 'Hosting a webinar',
    summary: 'Your manage link, going live, taking questions and wrapping up.',
    group: 'How it works',
    body: `## Setting up

You can fill in a new webinar's details without signing in. To go live or schedule it, you need a free Universal ID: if you do not have one, the app emails you a six-digit code, and entering it creates your account. Each account has one webinar token, which a webinar holds until you close it.

When you create a webinar you get a **manage link**. It is the key to your webinar: whoever has it can change the settings, see the registrations and run the room. This browser remembers it for you, but keep a copy somewhere safe so you can manage the webinar from another device, and do not share it.

## In the room

- **Your stage** — your camera and microphone go out to everyone in the room.
- **Share a document** — you can put a PDF or image on the stage for attendees to read. Each person scrolls it themselves; pages are not kept in step with yours.
- **Questions** — attendees raise their hands. You can put someone on air, take them off again, turn a request down, or stop a person from asking again while still letting them watch and chat.
- **Registrations** — you can see who has registered, approve or decline people if you require approval, and manage a waitlist.

## Wrapping up

When the session ends, the wrap-up page brings together what is left to do.

1. **Recording** — Universal Webinar does not record the session itself. If you recorded it another way, paste the link here and it goes out in the follow-up email to everyone who registered.
2. **Your list** — download a spreadsheet file of names, email addresses, answers, who turned up and anyone who joined without registering.
3. **Keep or close** — choose **Save to cloud** to keep the webinar and everyone in it for as long as you like; your token stays with it. Or choose **Close & free my token** to get your token back for your next webinar. On the free plan, a closed webinar and its registrations are deleted 30 days later, so download your list first.`,
  },
  {
    id: 'privacy-for-attendees',
    title: 'Your privacy as an attendee',
    summary: 'What you share, who can see it, and how long it is kept.',
    group: 'Privacy and security',
    body: `## What you give

When you register or join, you give your name and email address, and answers to any questions the host has added. The app also records whether you joined the room, what you write in chat, the reactions you send and any requests to speak.

## Who can see what

- **Other attendees** see your name next to your chat messages. They do not see your email address.
- **The host** sees your name, email address, answers, whether you attended and your chat messages. They can download that list, as with any event they run.
- **Everyone in the room** can see and hear you if the host puts you on air and you switch on your camera or microphone. Otherwise your camera and microphone are not used.

## The emails you receive

Your email address is used to send the confirmation, reminders and follow-up for the webinar you registered for, unless the host has switched them off. It is passed to the email delivery service for that purpose.

## Live video and audio

Video and audio travel over encrypted connections, as all WebRTC connections do. They pass through the video service's servers on their way to everyone in the room, so they are not end-to-end encrypted. Universal Webinar does not record the session; a host may record it with other tools, and should tell you if they do.

## How long it is kept

Your registration stays with the webinar. When a host on the free plan closes a webinar, it and everyone's registrations are deleted 30 days later. A host who chooses to keep a webinar, or who is on a paid plan, can keep them for longer. Any list the host has downloaded is theirs to look after.

## What your browser remembers

Your browser remembers the name and email you joined with, so you do not have to type them again next time.`,
  },
  {
    id: 'privacy-for-hosts',
    title: 'Security for hosts',
    summary: 'Keeping your manage link safe, and what is public.',
    group: 'Privacy and security',
    body: `## Your manage link is the key

Anyone who has your manage link can run your webinar: change its settings, see every registrant's details, put people on air and close it. Treat it like a password. Do not paste it into the room chat or send it to attendees; give them the join or registration link instead.

## What is public, and what is not

- **Public** — the webinar's details, such as its title, description, schedule, company name and logo, are public so that people can decide whether to come. The email address you host with and any recording link you add are stored with those details, so use an address you are happy for attendees to see.
- **Public to anyone with the link** — a document you share on stage and your logo are stored with long, random web addresses. Anyone who has one of those addresses can open the file, which is what lets everyone in the room see it. Removing a shared document deletes it.
- **Private** — registrants' email addresses and answers, and the room PIN, are never shown on public pages. They are only returned to someone who presents your manage link.

## About the room PIN

A PIN stops casual walk-ins. It is checked by the service, not only by the page, and the service limits how many wrong guesses can be made. Even so, a PIN is a short number, so it is best suited to keeping an event tidy rather than protecting something truly sensitive. Use a longer PIN if it matters, and change it for each session.

## Your registrants' data

You are responsible for how you use the list you download. Only email people about what they signed up for, and delete copies you no longer need. On the free plan, closing a webinar deletes it and its registrations 30 days later; saving it to the cloud keeps them until you close it.

## Your account

Hosting uses your Universal ID, the same account used across UNI·SIM apps. Your email address is verified with a one-time code before you can go live.`,
  },
]

export default articles
