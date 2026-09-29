import type { Source } from './types'

// The research, standards and reports behind each article, keyed by article
// id. The same in every language, so kept once here and attached by index.ts.
//
// Original research papers first, then the standards, then guidance — and
// only sources for what the app really does (checked against src/,
// supabase/functions and the platform's migrations on 2026-09-29: live video
// is WebRTC through livekit-client / @livekit/components-react to a LiveKit
// SFU, with tokens minted by the livekit-token edge function; the calendar
// invite is an RFC 5545 .ics built in lib/calendar.ts and _shared/ics.ts; the
// host's export is RFC 4180 CSV that neutralises leading = + - @ in
// lib/csv.ts; the room PIN is checked server-side with a guess limit
// (migration 0102); the manage link is a secret token that works as a
// capability URL). The app does not record sessions, so nothing on recording
// or media storage is cited.
//
// ⚠️ `pdf` (our hosted copy at opensource.unisim.co.uk/kb/papers/) ONLY where
// the licence allows redistribution: US Government works, IETF RFCs, and EU
// acts under Decision 2011/833/EU. Bailenson's paper is CC BY-NC-ND, which is
// narrower than the CC BY rule, so it links to the author's lab copy instead.
// EUR-Lex bot-blocks curl, so the GDPR PDF was fetched from (and its link
// confirmed by) the Wayback Machine's capture.

const CAPABILITY_URLS: Source = {
  kind: 'guidance',
  title: 'Good Practices for Capability URLs',
  authors: 'Jeni Tennison (ed.)',
  publisher: 'W3C Technical Architecture Group',
  year: 2014,
  href: 'https://www.w3.org/TR/capability-urls/',
}

const GDPR: Source = {
  kind: 'law',
  title: 'Regulation (EU) 2016/679 — General Data Protection Regulation',
  publisher: 'Official Journal of the European Union, L 119/1',
  year: 2016,
  href: 'https://eur-lex.europa.eu/eli/reg/2016/679/oj',
  pdf: 'papers/gdpr-regulation-2016-679.pdf',
  licence: '© European Union, reused under Commission Decision 2011/833/EU',
}

export const SOURCES: Record<string, Source[]> = {
  'what-is-a-webinar': [
    {
      kind: 'paper',
      title: 'Nonverbal Overload: A Theoretical Argument for the Causes of Zoom Fatigue',
      authors: 'Jeremy N. Bailenson',
      publisher: 'Technology, Mind, and Behavior (APA)',
      year: 2021,
      href: 'https://vhil.stanford.edu/sites/g/files/sbiybj29011/files/media/file/bailenson-apa-nonverbal-overload.pdf',
    },
    {
      kind: 'standard',
      title: 'Recommendation ITU-T G.114: One-way transmission time',
      publisher: 'ITU Telecommunication Standardization Sector',
      year: 2003,
      href: 'https://www.itu.int/rec/T-REC-G.114',
    },
  ],
  'how-live-video-reaches-you': [
    {
      kind: 'standard',
      title: 'Overview: Real-Time Protocols for Browser-Based Applications (RFC 8825)',
      authors: 'Harald Alvestrand',
      publisher: 'IETF',
      year: 2021,
      href: 'https://www.rfc-editor.org/rfc/rfc8825.html',
      pdf: 'papers/rfc-8825-webrtc-overview.pdf',
      licence: 'IETF Trust — RFC, freely redistributable unmodified',
    },
    {
      kind: 'standard',
      title: 'WebRTC: Real-Time Communication in Browsers',
      publisher: 'W3C',
      href: 'https://www.w3.org/TR/webrtc/',
    },
    {
      kind: 'standard',
      title: 'RTP Topologies (RFC 7667) — the Selective Forwarding Middlebox',
      authors: 'Magnus Westerlund, Stephan Wenger',
      publisher: 'IETF',
      year: 2015,
      href: 'https://www.rfc-editor.org/rfc/rfc7667.html',
    },
    {
      kind: 'paper',
      title: 'Congestion Control for Web Real-Time Communication',
      authors: 'Gaetano Carlucci, Luca De Cicco, Stefan Holmer, Saverio Mascolo',
      publisher: 'IEEE/ACM Transactions on Networking',
      year: 2017,
      href: 'https://c3lab.poliba.it/sites/default/files/2026-05/Congestion_Control_for_Web_Real-Time_Communication.pdf',
    },
  ],
  'registering-and-joining': [
    {
      kind: 'standard',
      title: 'Internet Calendaring and Scheduling Core Object Specification (iCalendar) (RFC 5545)',
      authors: 'Bernard Desruisseaux (ed.)',
      publisher: 'IETF',
      year: 2009,
      href: 'https://www.rfc-editor.org/rfc/rfc5545.html',
    },
  ],
  'hosting-a-webinar': [
    CAPABILITY_URLS,
    {
      kind: 'standard',
      title: 'Common Format and MIME Type for Comma-Separated Values (CSV) Files (RFC 4180)',
      authors: 'Yakov Shafranovich',
      publisher: 'IETF',
      year: 2005,
      href: 'https://www.rfc-editor.org/rfc/rfc4180.html',
    },
    {
      kind: 'guidance',
      title: 'CSV Injection',
      publisher: 'OWASP Foundation',
      href: 'https://owasp.org/www-community/attacks/CSV_Injection',
    },
  ],
  'privacy-for-attendees': [
    {
      kind: 'standard',
      title: 'WebRTC Security Architecture (RFC 8827)',
      authors: 'Eric Rescorla',
      publisher: 'IETF',
      year: 2021,
      href: 'https://www.rfc-editor.org/rfc/rfc8827.html',
      pdf: 'papers/rfc-8827-webrtc-security-architecture.pdf',
      licence: 'IETF Trust — RFC, freely redistributable unmodified',
    },
    {
      kind: 'standard',
      title: 'Datagram Transport Layer Security (DTLS) Extension to Establish Keys for the Secure Real-time Transport Protocol (SRTP) (RFC 5764)',
      authors: 'David McGrew, Eric Rescorla',
      publisher: 'IETF',
      year: 2010,
      href: 'https://www.rfc-editor.org/rfc/rfc5764.html',
    },
    GDPR,
  ],
  'privacy-for-hosts': [
    CAPABILITY_URLS,
    {
      kind: 'guidance',
      title: 'NIST SP 800-63B-4: Digital Identity Guidelines — Authentication and Authenticator Management (rate limiting)',
      publisher: 'NIST',
      year: 2025,
      href: 'https://doi.org/10.6028/NIST.SP.800-63B-4',
      pdf: 'papers/nist-sp-800-63b-4-authentication.pdf',
      licence: 'Public domain (US Government work)',
    },
    GDPR,
  ],
}
