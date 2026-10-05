import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useUniversal } from '@unisim/sdk'

const UNIVERSAL_ID_LOGIN = 'https://app.unisim.co.uk/login'

/**
 * Where to go once signed in: `?return_to=` when it is a page of THIS app
 * (same origin), else the admin dashboard. Anything else is dropped, so a
 * crafted link can't bounce a signed-in admin off to another site.
 *
 * The default carries the base path (`/webinar/` in production): a bare
 * `${origin}/admin` is outside the app.
 */
function resolveReturnTo(param: string | null): string {
  const fallback = `${window.location.origin}${import.meta.env.BASE_URL}admin`
  if (!param) return fallback
  try {
    const url = new URL(param, window.location.href)
    return url.origin === window.location.origin ? url.toString() : fallback
  } catch {
    return fallback
  }
}

// The admin area keeps the hub redirect rather than the in-app sign-in dialog:
// it sits under the enterprise UniversalNavBar, which sends people to the hub
// for the org-setup and invite flows only the hub has.
export function AdminLogin() {
  const { session, loading } = useUniversal()
  const location = useLocation()

  const returnTo = resolveReturnTo(new URLSearchParams(location.search).get('return_to'))

  useEffect(() => {
    if (loading) return
    if (session) {
      // Already signed in — go to the intended destination.
      window.location.replace(returnTo)
    } else {
      // Not signed in — redirect to Universal ID, which sets the shared
      // .unisim.co.uk session cookie and sends the user back to `return`.
      // ⚠️ The hub reads `?return=` (an https unisim.co.uk URL); it ignored the
      // `redirect_to` this used to send, and every admin who signed in here
      // landed on the Assess portal instead of back in Webinar.
      window.location.replace(
        `${UNIVERSAL_ID_LOGIN}?return=${encodeURIComponent(returnTo)}`,
      )
    }
  }, [loading, session, returnTo])

  return (
    <div className="flex min-h-full items-center justify-center text-slate-500 dark:text-slate-400">
      <Loader2 className="h-5 w-5 animate-spin" />
    </div>
  )
}
