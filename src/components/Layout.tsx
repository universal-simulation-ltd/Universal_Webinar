import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { UniversalAppsNavBar } from '@unisim/sdk'
import { CompanyMenu } from './CompanyMenu'
import { HeaderBrandMark } from './HeaderBrandMark'
import { Logo } from './Logo'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth'

// Wordmark trigger inside the suite-switcher. Clicking the inner <a>
// navigates to home; hover opens the apps switcher dropdown.
function ProductLogo({ to = '/' }: { to?: string }) {
  return (
    <Link to={to} className="inline-flex items-center text-slate-900 no-underline">
      <Logo />
    </Link>
  )
}

export function PublicLayout() {
  return (
    <div className="flex min-h-full flex-col bg-slate-50">
      <UniversalAppsNavBar
        product="webinar"
        productLogo={<ProductLogo to="/" />}
        suiteSwitcherIconSrc="/unisim-icon.png"
        fileMenu={
          <div className="flex items-center gap-1">
            <CompanyMenu />
            <Link
              to="/admin/login"
              className="rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              Admin
            </Link>
          </div>
        }
      />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

export function AdminLayout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const navItems = [
    { to: '/admin', label: 'Dashboard' },
    { to: '/admin/settings', label: 'Settings' },
  ]

  async function handleSignOut() {
    await signOut()
    navigate('/admin/login', { replace: true })
  }

  return (
    <div className="flex min-h-full flex-col bg-slate-50">
      <UniversalAppsNavBar
        product="webinar"
        productLogo={<ProductLogo to="/admin" />}
        suiteSwitcherIconSrc="/unisim-icon.png"
        fileMenu={
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const active =
                pathname === item.to ||
                (item.to !== '/admin' && pathname.startsWith(item.to))
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    active
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                  )}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
        }
      />
      {/* Secondary admin strip — user identity + sign-out. Lives below the
          unified navbar so the admin-only chrome stays separate from the
          suite-wide top-of-page surface. */}
      <div className="border-b border-slate-200 bg-white">
        <div className="container flex h-10 items-center justify-end gap-2 text-sm">
          {user?.email && (
            <span className="hidden sm:inline truncate max-w-[260px] text-slate-500">
              {user.email}
            </span>
          )}
          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only">Sign out</span>
          </button>
        </div>
      </div>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}

function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-slate-200 bg-white">
      <div className="container flex flex-col items-center justify-between gap-2 py-6 text-xs text-slate-500 sm:flex-row">
        <div className="relative">
          <HeaderBrandMark />
          <p className="relative z-10 whitespace-nowrap">
            &copy; {new Date().getFullYear()} Universal Webinar
          </p>
        </div>
        <p className="font-medium text-slate-600">
          100% Open source and free. Hosted by{' '}
          <a
            href="https://www.unisim.co.uk"
            target="_blank"
            rel="noreferrer"
            className="underline-offset-2 transition-colors hover:text-brand-700 hover:underline"
          >
            UNI SIM
          </a>
        </p>
      </div>
    </footer>
  )
}
