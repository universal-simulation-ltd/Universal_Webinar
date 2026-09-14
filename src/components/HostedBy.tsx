import type { WebinarRow } from '@/lib/database.types'

interface Props {
  webinar: WebinarRow
  className?: string
}

// Per-webinar branding header: shows the host's logo + company name when
// either is set. Used at the top of registration, join, and live pages so
// guests know whose room they're in.
export function HostedBy({ webinar, className }: Props) {
  const company = webinar.company_name?.trim() || webinar.host_name?.trim()
  const logo = webinar.logo_url
  if (!company && !logo) return null

  return (
    <div
      className={
        'mb-6 flex items-center justify-center gap-3 text-sm text-slate-500 dark:text-slate-400 ' +
        (className ?? '')
      }
    >
      {logo && (
        <img
          src={logo}
          alt={company ?? 'Host logo'}
          className="h-8 w-8 rounded-md border border-slate-200 dark:border-slate-800 bg-white object-contain p-1"
        />
      )}
      {company && (
        <span>
          Hosted by <span className="font-medium text-slate-900 dark:text-slate-100">{company}</span>
        </span>
      )}
    </div>
  )
}
