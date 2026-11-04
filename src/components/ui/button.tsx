import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { buttonClass } from '@unisim/sdk'
import { cn } from '@/lib/utils'

// The shadcn button's own look. Kept for the two kinds of button the suite's
// key buttons don't cover: icon-only buttons (`size="icon"`) and text links
// (`variant="link"`), plus `classic` call controls (camera / mic / screen),
// which are their own controls rather than key buttons.
const classicVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-white dark:ring-offset-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 shadow-soft',
        secondary:
          'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 active:bg-slate-300 dark:active:bg-slate-600',
        outline:
          'border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 active:bg-slate-100 dark:active:bg-slate-800 text-slate-900 dark:text-slate-100',
        ghost: 'hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 text-slate-900 dark:text-slate-100',
        destructive: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
        link: 'text-brand-600 dark:text-brand-400 underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3 text-sm',
        lg: 'h-12 rounded-lg px-6 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

type Variant = NonNullable<VariantProps<typeof classicVariants>['variant']>
type Size = NonNullable<VariantProps<typeof classicVariants>['size']>

// Every other button is the suite's key button (SDK 0.216, BRANDING.md →
// Buttons, 2026-11-04); main.tsx installs its CSS. `default` is the primary,
// once per view; outline and secondary are the secondary rank, ghost is quiet,
// destructive is danger. `lg` is the normal size — the suite has two.
const RANK = {
  default: 'primary',
  secondary: undefined,
  outline: undefined,
  ghost: 'quiet',
  destructive: 'danger',
} as const

function buttonVariants({
  variant,
  size,
  classic,
  className,
}: {
  variant?: Variant | null
  size?: Size | null
  classic?: boolean
  className?: string
}): string {
  const v = variant ?? 'default'
  if (classic || v === 'link' || size === 'icon') return classicVariants({ variant: v, size, className })
  return cn(buttonClass(RANK[v], size === 'sm' ? 'sm' : undefined), className)
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof classicVariants> {
  asChild?: boolean
  /** An icon for the key at the leading edge (primary, secondary, danger). */
  icon?: React.ReactNode
  /** Keep the old shadcn look — for call controls, which aren't key buttons. */
  classic?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, icon, classic, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp className={buttonVariants({ variant, size, classic, className })} ref={ref} {...props}>
        {icon && !asChild ? (
          <>
            <span className="u-btn__key" aria-hidden>
              {icon}
            </span>
            {children}
          </>
        ) : (
          children
        )}
      </Comp>
    )
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
