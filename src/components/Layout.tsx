import { Link, Outlet, useLocation } from 'react-router-dom'
import { UniversalAppsNavBar, UniversalNavBar } from '@unisim/sdk'
import { HeaderBrandMark } from './HeaderBrandMark'
import { Logo } from './Logo'
import { cn } from '@/lib/utils'

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
        productHomeHref="/"
        suiteSwitcherIconSrc="/unisim-icon.png"
        contentClassName="container"
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
        suiteSwitcherIconSrc="/unisim-icon.png"
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
        <p className="font-medium text-slate-600">
          100% Open source. Hosted by{' '}
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
