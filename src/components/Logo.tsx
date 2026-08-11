import { cn } from '@/lib/utils'
import ProductLogo from './ProductLogo'

interface LogoProps {
  className?: string
  showWordmark?: boolean
}

// The mark itself is generated — see ProductLogo.tsx and the spec it comes
// from. This component only adds the wordmark beside it, which is why Webinar
// keeps its own Logo rather than passing ProductLogo straight to the SDK navbar
// like the other apps do.
//
// It used to draw a white camera on a `brand-gradient` tile. Every other
// surface in the suite — the favicon, the switcher glyph, the portal tile —
// showed the same camera on a dark slate tile, so the app's own header was the
// one place the mark looked like a different product.
export function Logo({ className, showWordmark = true }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div className="relative grid h-9 w-9 place-items-center [&_span]:h-9 [&_span]:w-9 [&_svg]:h-9 [&_svg]:w-9">
        <ProductLogo />
      </div>
      {showWordmark && (
        <div className="flex flex-col leading-none">
          <span className="text-base font-semibold tracking-tight text-slate-900">
            Universal Webinar
          </span>
        </div>
      )}
    </div>
  )
}
