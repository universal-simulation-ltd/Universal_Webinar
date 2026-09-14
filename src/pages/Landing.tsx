import {
  ArrowRight,
  Github,
  MessageCircle,
  Mic,
  Sparkles,
  Video,
} from 'lucide-react'
import { installChipStyles } from '@unisim/sdk'
import { HostNewForm } from '@/components/HostNewForm'
import { WebinarPreview } from '@/components/WebinarPreview'

export function Landing() {
  // The hero's open-source link uses the `u-chip` class directly; the
  // components inject the CSS themselves, plain markup has to ask.
  installChipStyles()
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute -top-32 left-1/2 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-brand-200/50 blur-3xl" />
          <div className="absolute -top-10 left-[10%] h-72 w-72 rounded-full bg-brand-100/70 dark:bg-brand-950/70 blur-3xl" />
          <div className="absolute top-20 right-[8%] h-64 w-64 rounded-full bg-amber-100/70 dark:bg-amber-950/70 blur-3xl" />
        </div>

        <div className="container py-16 sm:py-20 lg:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            {/* Left column — heading, copy, then animated preview */}
            <div className="order-1 lg:order-1 text-center lg:text-left">
              <h1 className="text-4xl font-semibold leading-tight tracking-tight text-slate-900 dark:text-slate-100 sm:text-5xl xl:text-6xl">
                Webinars that feel like a{' '}
                <span className="bg-gradient-to-r from-brand-500 to-brand-700 bg-clip-text text-transparent">
                  real conversation
                </span>
                .
              </h1>
              <p className="mt-6 max-w-xl text-lg text-slate-600 dark:text-slate-300 sm:text-xl lg:mx-0 mx-auto">
                Host a polished live session, let the audience react in real
                time, and invite anyone up on stage with a single tap — no
                installs, no friction.
              </p>
              <div className="mt-8">
                <WebinarPreview />
              </div>
            </div>

            {/* Right column — form, CTAs */}
            <div className="order-2 lg:order-2 text-center lg:text-left">
              <div className="mt-6">
                <HostNewForm />
              </div>
              {/* An Orbit chip on a link, so it's the class rather than the
                  <Chip> span; the wrapper carries the margin, which the chip's
                  own CSS would otherwise reset. */}
              <div className="mt-4">
                <a
                  href="https://github.com/universal-simulation-ltd/Universal_Webinar"
                  target="_blank"
                  rel="noreferrer"
                  className="u-chip"
                >
                  <span className="u-chip__icon" aria-hidden="true">
                    <Github />
                  </span>
                  Open source — self-host or PRO hosted by UNI SIM
                  <ArrowRight className="h-3 w-3 opacity-60" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="container py-16">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Feature
              icon={<Video className="h-5 w-5" />}
              title="Live, low-latency"
              body="Stream your camera and screen in HD. Guests watch on web or phone with one tap."
            />
            <Feature
              icon={<MessageCircle className="h-5 w-5" />}
              title="Chat & reactions"
              body="Threaded chat with emoji reactions on every message and floating hearts on the video."
            />
            <Feature
              icon={<Mic className="h-5 w-5" />}
              title="Audience speakers"
              body="Approve any guest to share their camera and microphone for live Q&A — on your terms."
            />
            <Feature
              icon={<Sparkles className="h-5 w-5" />}
              title="Yours, branded"
              body="PIN-lock the room, hide attendee counts, theme it to match — you're in full control."
            />
          </div>
        </div>
      </section>
    </>
  )
}

function Feature({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode
  title: string
  body: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-6 transition hover:bg-white dark:hover:bg-slate-800 hover:shadow-soft">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-400">
        {icon}
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300">{body}</p>
    </div>
  )
}
