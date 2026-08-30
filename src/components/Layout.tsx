import { Link, Outlet, useLocation } from 'react-router-dom'
import { AdvancedMenu, UniversalAppsNavBar, UniversalNavBar, UpdateNotice } from '@unisim/sdk'
import { HeaderBrandMark } from './HeaderBrandMark'
import { Logo } from './Logo'
import { cn } from '@/lib/utils'

const REPO_URL = 'https://github.com/universal-simulation-ltd/Universal_Webinar'

// Icon-only product mark. The SDK's UniversalAppsNavBar renders the product
// name from its catalogue beside this slot, and the productHomeHref prop wraps
// logo+name in a single home-link.
function ProductLogo() {
  return (
    <span className="inline-flex items-center" aria-hidden="true">
      <Logo showWordmark={false} />
    </span>
  )
}

export function PublicLayout() {
  return (
    <div className="flex min-h-full flex-col bg-slate-50">
      {/* Every public page and the footer lay out inside Tailwind's `.container`,
          so handing the same class to the navbar lines the suite switcher up
          with the page content (and the changelog cluster with its right edge)
          at every breakpoint. */}
      <UniversalAppsNavBar
        product="webinar"
        productLogo={<ProductLogo />}
        actions={
          /* Advanced — the SDK's own category, so every app in the suite has
             one in the same place, and whatever goes in it next is one change
             rather than nineteen. "About this app" is always its last row. */
          <AdvancedMenu
            about={{
              repo:    'https://github.com/universal-simulation-ltd/Universal_Webinar',
              // Server-backed: the local-first claim is not true here.
              privacy: false,
            }}
          />
        }
        // ⚠️ Both of these go through BASE_URL, as every sibling app's do. The
        // app is served under `/webinar/` in production, so a root-absolute
        // `/unisim-icon.png` is a 404 — the suite switcher was a broken image
        // — and a root-absolute home href walks out of the app entirely.
        // BASE_URL is `/webinar/` in a production build and `/` in dev, and it
        // already carries its trailing slash.
        productHomeHref={import.meta.env.BASE_URL}
        suiteSwitcherIconSrc={`${import.meta.env.BASE_URL}unisim-icon.png`}
        contentClassName="container"
      />
      {/* Renders nothing until this tab is genuinely running superseded code.
          See the SDK's useAppUpdate: an autoUpdate PWA hands the new worker
          control but leaves the running page on its old JavaScript. The spacing
          is inline because "container" here is this app's own CSS class, not a
          Tailwind utility, so a `pt-4` beside it would do nothing. */}
      <div className="container">
        <UpdateNotice style={{ marginTop: '16px' }} />
      </div>
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

export function AdminLayout() {
  const { pathname } = useLocation()
  const navItems = [
    { to: '/admin', label: 'Dashboard' },
    { to: '/admin/settings', label: 'Settings' },
  ]

  return (
    <div className="flex min-h-full flex-col bg-slate-50">
      <UniversalNavBar
        product="webinar"
        productLogo={<ProductLogo />}
        newAssessmentHref={null}
        // BASE_URL, not `/` — see the note in PublicLayout.
        suiteSwitcherIconSrc={`${import.meta.env.BASE_URL}unisim-icon.png`}
      />
      <div className="border-b border-slate-200 bg-white">
        <div className="container flex h-10 items-center gap-1">
          <nav className="flex items-center gap-1">
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
        <div className="flex items-center gap-3">
          <p className="font-medium text-slate-600">
            With{' '}
            <span aria-hidden="true" className="text-orange-600">&hearts;</span>
            <span className="sr-only">love</span>{' '}
            from{' '}
            <a
              href="https://www.unisim.co.uk"
              target="_blank"
              rel="noreferrer"
              className="underline-offset-2 transition-colors hover:text-brand-700 hover:underline"
            >
              UNISIM.co.uk
            </a>
          </p>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="Universal Webinar on GitHub"
            title="View source on GitHub"
            className="inline-flex shrink-0 items-center gap-1.5 text-slate-600 transition-colors hover:text-slate-900"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
              <path d="M12 .5C5.65.5.5 5.65.5 12.02c0 5.09 3.29 9.4 7.86 10.92.57.1.78-.25.78-.55 0-.27-.01-1-.02-1.96-3.2.69-3.87-1.54-3.87-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.76 2.7 1.25 3.36.95.1-.74.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.18-3.08-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.18 1.18.92-.26 1.91-.39 2.89-.39.98 0 1.97.13 2.89.39 2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.8 1.18 1.82 1.18 3.08 0 4.42-2.69 5.39-5.26 5.68.41.35.77 1.05.77 2.12 0 1.53-.01 2.76-.01 3.14 0 .3.21.66.79.55 4.57-1.52 7.86-5.83 7.86-10.92C23.5 5.65 18.35.5 12 .5z" />
            </svg>
            <span className="hidden sm:inline">GitHub</span>
          </a>
        </div>
      </div>
    </footer>
  )
}
