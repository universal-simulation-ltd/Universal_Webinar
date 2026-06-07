import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useUniversal } from '@unisim/sdk'

const UNIVERSAL_ID_LOGIN = 'https://app.unisim.co.uk/login'

export function ProtectedRoute() {
  const { session, loading } = useUniversal()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex h-full min-h-[60vh] items-center justify-center text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    )
  }
  if (!session) {
    const returnUrl = `${window.location.origin}${location.pathname}${location.search}`
    return (
      <Navigate
        to={`/admin/login?return_to=${encodeURIComponent(returnUrl)}`}
        replace
      />
    )
  }
  return <Outlet />
}

function SupabaseNotConfigured() {
  return (
    <div className="container py-16">
      <div className="mx-auto max-w-xl rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <h2 className="text-lg font-semibold text-amber-900">
          Supabase isn't connected yet
        </h2>
        <p className="mt-2 text-sm text-amber-900/80">
          Set <code className="font-mono">VITE_SUPABASE_URL</code> and{' '}
          <code className="font-mono">VITE_SUPABASE_ANON_KEY</code> in your
          environment, then reload. See{' '}
          <a
            className="underline decoration-amber-700/40 underline-offset-2 hover:decoration-amber-700"
            href="https://github.com/universal-simulation-ltd/Universal_Webinar/blob/main/SUPABASE.md"
            target="_blank"
            rel="noreferrer"
          >
            SUPABASE.md
          </a>{' '}
          for the full setup.
        </p>
      </div>
    </div>
  )
}
