import { Sparkles } from 'lucide-react'
import { HostNewForm } from '@/components/HostNewForm'

export function HostNew() {
  return (
    <div className="container py-12 sm:py-16">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 dark:bg-brand-950/40 px-3 py-1 text-xs font-medium text-brand-700 dark:text-brand-400">
            <Sparkles className="h-3.5 w-3.5" />
            Free · no signup yet · OTP at go-live
          </span>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
            Set up your webinar
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Fill in the basics. You'll verify your email with a 6-digit code
            right before you go live.
          </p>
        </div>

        <HostNewForm />
      </div>
    </div>
  )
}
