import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Mail,
  Palette,
  Sparkles,
  TrendingUp,
  Video,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

interface StubProps {
  icon: React.ReactNode
  title: string
  description: string
  bullets: string[]
  cta?: string
}

function StubPage({ icon, title, description, bullets, cta }: StubProps) {
  return (
    <div className="container py-12 sm:py-16">
      <div className="mx-auto max-w-2xl">
        <Button asChild variant="ghost" size="sm" className="mb-6">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
            Back home
          </Link>
        </Button>
        <Card>
          <CardHeader>
            <div className="mb-2 grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700">
              {icon}
            </div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-slate-600">
              {bullets.map((b) => (
                <li key={b} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-500" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
              Coming soon · {cta ?? 'on the roadmap'}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export function HostWebinars() {
  return (
    <StubPage
      icon={<Video className="h-5 w-5" />}
      title="My webinars"
      description="Every room you've hosted, in one place — pick up where you left off or revisit a recording."
      bullets={[
        'Live and scheduled rooms with one-click manage',
        'Archive of ended webinars with attendance counts',
        'Recording playback (Pro) with shareable replay links',
        'Filter by status, search by title, sort by date',
        'Quick-duplicate a webinar to reuse its settings',
      ]}
      cta="lands in Phase 3.6 (after OTP host identity is wired)"
    />
  )
}

export function HostUpgrade() {
  return (
    <StubPage
      icon={<Sparkles className="h-5 w-5" />}
      title="Upgrade to Pro"
      description="Everything in Free, plus the tools that grow your audience and your numbers."
      bullets={[
        'Host-level branding — your logo, your accent color, your subdomain',
        'Full statistics dashboard across all your webinars',
        'Automatic emails — reminders, follow-ups, recording links',
        'Recording + replay (Cloudflare R2 storage)',
        'Polls and Q&A queue',
        'CSV export, webhooks, and Zapier integrations',
        'Larger room cap (200+ guests)',
        'Remove the "Hosted on Universal Webinar" badge',
      ]}
      cta="checkout flow lands in Phase 3.10"
    />
  )
}

export function HostBranding() {
  return (
    <StubPage
      icon={<Palette className="h-5 w-5" />}
      title="My branding"
      description="Theme every webinar you host, not just the next one."
      bullets={[
        'Upload a single logo + accent color, applied across all your webinars',
        'Custom subdomain (e.g. webinars.unisim.co.uk)',
        'White-label registration pages and emails',
        'Custom email sender (your domain via Resend)',
      ]}
      cta="lands in Phase 3.7"
    />
  )
}

export function HostStatistics() {
  return (
    <StubPage
      icon={<TrendingUp className="h-5 w-5" />}
      title="My statistics"
      description="See who showed up, who stayed, and what they cared about."
      bullets={[
        'Registration → attendance conversion per webinar',
        'Peak concurrent viewers + drop-off curve',
        'Chat volume, reactions, and most-active attendees',
        'CSV export of registrants + attendees + chat transcript',
      ]}
      cta="lands in Phase 3.8"
    />
  )
}

export function HostEmails() {
  return (
    <StubPage
      icon={<Mail className="h-5 w-5" />}
      title="Automatic emails"
      description="Hands-off comms before, during, and after every session."
      bullets={[
        '✅ Registration confirmation — live now, with the registrant’s own join link and a calendar attachment. Toggle it per webinar under Room settings.',
        '✅ Reminders — live now, the day before and again an hour before a scheduled session. Same personal join link, same per-webinar toggle.',
        'No-show follow-up with recording link',
        'Custom thank-you / next-steps email',
        'All sent from your verified domain via Resend',
      ]}
      cta="follow-ups land next"
    />
  )
}
