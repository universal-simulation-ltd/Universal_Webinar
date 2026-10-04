import { lazy, Suspense, type ComponentType, type ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { AdminLayout, PublicLayout } from '@/components/Layout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { Landing } from '@/pages/Landing'
import { Join } from '@/pages/Join'
import { Register } from '@/pages/Register'
import { AdminLogin } from '@/pages/admin/Login'
import { HostNew } from '@/pages/host/New'
import { NotFound } from '@/pages/NotFound'

// The pages that carry the video stack (livekit-client and its React
// components) or are host/admin-only are split out of the first download. A
// guest opening an invitation lands on Join or Register and used to fetch the
// whole room — LiveKit included — before seeing a form with two fields.
const RELOAD_FLAG = 'uw:chunk-reload'

/**
 * `lazy` with one recovery: a tab left open across a deploy asks for a chunk
 * whose hash no longer exists. Reload once to pick up the new build instead of
 * showing a blank page; the flag stops a genuinely broken chunk looping.
 */
function lazyPage<T extends Record<string, unknown>>(
  load: () => Promise<T>,
  pick: (m: T) => ComponentType,
) {
  return lazy(async () => {
    try {
      const mod = await load()
      try {
        sessionStorage.removeItem(RELOAD_FLAG)
      } catch {
        // Storage unavailable — nothing to clear.
      }
      return { default: pick(mod) }
    } catch (err) {
      let reloaded = false
      try {
        reloaded = sessionStorage.getItem(RELOAD_FLAG) === '1'
        if (!reloaded) sessionStorage.setItem(RELOAD_FLAG, '1')
      } catch {
        reloaded = true
      }
      if (!reloaded) {
        window.location.reload()
        return new Promise<never>(() => {})
      }
      throw err
    }
  })
}

const Live = lazyPage(() => import('@/pages/Live'), (m) => m.Live)
const HostManage = lazyPage(() => import('@/pages/host/Manage'), (m) => m.HostManage)
const HostWrapUp = lazyPage(() => import('@/pages/host/WrapUp'), (m) => m.HostWrapUp)
const Replay = lazyPage(() => import('@/pages/Replay'), (m) => m.Replay)
const AdminDashboard = lazyPage(() => import('@/pages/admin/Dashboard'), (m) => m.AdminDashboard)
const AdminControl = lazyPage(() => import('@/pages/admin/Control'), (m) => m.AdminControl)

function Page({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-24 text-slate-400" role="status" aria-label="Loading">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      }
    >
      {children}
    </Suspense>
  )
}

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/w/:slug" element={<Join />} />
        <Route path="/w/:slug/register" element={<Register />} />
        <Route path="/w/:slug/live" element={<Page><Live /></Page>} />
        {/* The replay link the follow-up email carries (lib/replay.ts). */}
        <Route path="/replay/:id" element={<Page><Replay /></Page>} />
        <Route path="/host/new" element={<HostNew />} />
        <Route path="/host/w/:slug" element={<Page><HostManage /></Page>} />
        {/* Where "End webinar" lands: the post-session decisions, away from
            the live control page. Reads the manage token from storage, so a
            host who bookmarks it still gets in. */}
        <Route path="/host/w/:slug/wrap" element={<Page><HostWrapUp /></Page>} />
      </Route>

      <Route path="/admin/login" element={<AdminLogin />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<Page><AdminDashboard /></Page>} />
          <Route path="/admin/w/:slug" element={<Page><AdminControl /></Page>} />
          {/* The Settings page went into "Tune this app" (2026-09-28). */}
          <Route path="/admin/settings" element={<Navigate to="/admin" replace />} />
        </Route>
      </Route>

      <Route path="/404" element={<NotFound />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  )
}
