import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useUniversal } from '@unisim/sdk'

const UNIVERSAL_ID_LOGIN = 'https://app.unisim.co.uk/login'

export function AdminLogin() {
  const { session, loading } = useUniversal()
  const location = useLocation()

  const returnTo =
    (new URLSearchParams(location.search).get('return_to') ?? '') ||
    `${window.location.origin}/admin`

  useEffect(() => {
    if (loading) return
    if (session) {
      // Already signed in — go to the intended destination.
      window.location.replace(returnTo)
    } else {
      // Not signed in — redirect to Universal ID, which sets the shared
      // .unisim.co.uk session cookie and returns the user to `return_to`.
      window.location.replace(
        `${UNIVERSAL_ID_LOGIN}?redirect_to=${encodeURIComponent(returnTo)}`,
      )
    }
  }, [loading, session, returnTo])

  return (
    <div className="flex min-h-full items-center justify-center text-slate-500">
      <Loader2 className="h-5 w-5 animate-spin" />
    </div>
  )
}
