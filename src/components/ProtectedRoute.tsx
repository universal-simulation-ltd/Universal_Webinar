import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useUniversal } from '@unisim/sdk'

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
