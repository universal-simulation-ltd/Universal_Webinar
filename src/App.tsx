import { Navigate, Route, Routes } from 'react-router-dom'
import { AdminLayout, PublicLayout } from '@/components/Layout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { Landing } from '@/pages/Landing'
import { Join } from '@/pages/Join'
import { Live } from '@/pages/Live'
import { Register } from '@/pages/Register'
import { AdminLogin } from '@/pages/admin/Login'
import { AdminDashboard } from '@/pages/admin/Dashboard'
import { AdminControl } from '@/pages/admin/Control'
import { AdminSettings } from '@/pages/admin/Settings'
import { HostNew } from '@/pages/host/New'
import { HostManage } from '@/pages/host/Manage'
import { HostWrapUp } from '@/pages/host/WrapUp'
import {
  HostBranding,
  HostEmails,
  HostStatistics,
  HostUpgrade,
  HostWebinars,
} from '@/pages/host/stubs'
import { NotFound } from '@/pages/NotFound'

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/w/:slug" element={<Join />} />
        <Route path="/w/:slug/register" element={<Register />} />
        <Route path="/w/:slug/live" element={<Live />} />
        <Route path="/host/new" element={<HostNew />} />
        <Route path="/host/w/:slug" element={<HostManage />} />
        {/* Where "End webinar" lands: the post-session decisions, away from
            the live control page. Reads the manage token from storage, so a
            host who bookmarks it still gets in. */}
        <Route path="/host/w/:slug/wrap" element={<HostWrapUp />} />
        <Route path="/host/webinars" element={<HostWebinars />} />
        <Route path="/host/upgrade" element={<HostUpgrade />} />
        <Route path="/host/branding" element={<HostBranding />} />
        <Route path="/host/statistics" element={<HostStatistics />} />
        <Route path="/host/emails" element={<HostEmails />} />
      </Route>

      <Route path="/admin/login" element={<AdminLogin />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/w/:slug" element={<AdminControl />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
        </Route>
      </Route>

      <Route path="/404" element={<NotFound />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  )
}
