import { Navigate, Outlet } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useUniversal } from '@unisim/sdk'

export function ProtectedRoute() {
  const { session, loading } = useUniversal()

  if (loading) {
    return (
      <div className="flex h-full min-h-[60vh] items-center justify-center text-slate-500 dark:text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    )
  }
  if (!session) {
    // The full address, not origin + location.pathname: the router's pathname
    // leaves out the base path (`/webinar/` in production), so the old form
    // sent a signed-in admin back to a page outside the app.
    const returnUrl = window.location.href
    return (
      <Navigate
        to={`/admin/login?return_to=${encodeURIComponent(returnUrl)}`}
        replace
      />
    )
  }
  return <Outlet />
}
