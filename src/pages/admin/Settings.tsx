import { useNavigate } from 'react-router-dom'
import { LogOut, Mail, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useAuth } from '@/lib/auth'

export function AdminSettings() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()

  async function handleSignOut() {
    await signOut()
    navigate('/admin/login', { replace: true })
  }

  return (
    <div className="container max-w-2xl py-10 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Settings</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Your admin account and session.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-brand-600 dark:text-brand-400" />
            Admin account
          </CardTitle>
          <CardDescription>
            One Supabase user owns this platform. To rotate the password, use
            the Supabase dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 rounded-md bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm">
            <Mail className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            <span className="text-slate-900 dark:text-slate-100">
              {user?.email ?? 'Not signed in'}
            </span>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Coming soon</CardTitle>
          <CardDescription>
            Branding, LiveKit credentials, default room settings, and recording
            storage — coming in later phases.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
