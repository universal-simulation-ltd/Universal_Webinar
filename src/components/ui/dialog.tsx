import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogPortal = DialogPrimitive.Portal
const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      // ⚠️ z-[1100], not z-50. The SDK's UniversalAppsNavBar sets an inline
      // `zIndex: 1000`, and an inline style beats any class however specific —
      // so at Tailwind's z-50 ceiling this backdrop dimmed the whole page while
      // the bar stayed lit on top of it. Radix portals this to <body>, so there
      // is no intervening stacking context to cap the value.
      'fixed inset-0 z-[1100] bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className,
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        // A dialog is a flex COLUMN capped at the viewport, not one box that
        // grows past it. `max-h-[min(100%,100dvh)]`: on a fixed element `100%`
        // is the layout viewport and `100dvh` shrinks with iOS's browser
        // chrome, so min() takes whichever is actually visible. Everything that
        // must stay reachable — the title, the Close button, the action row —
        // lives OUTSIDE the scrolling body (see DialogBody), which is what
        // stops a tall form scrolling its own title off the top on a phone.
        // Vertical padding takes the safe-area insets once the dialog is tall
        // enough to reach the notch; max() keeps the normal 1.5rem otherwise.
        'fixed left-1/2 top-1/2 z-[1100] flex w-[calc(100%-2rem)] max-w-lg max-h-[min(100%,100dvh)] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-hidden border border-slate-200 bg-white px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] shadow-xl rounded-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        className,
      )}
      {...props}
    >
      {children}
      {/* Pinned to the dialog frame, not to the scrolling body — and its `top`
          clears the notch on the same terms as the content padding. */}
      <DialogPrimitive.Close className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex shrink-0 flex-col space-y-1.5 pr-8 text-left', className)}
    {...props}
  />
)
DialogHeader.displayName = 'DialogHeader'

/** The only part of a dialog that scrolls. Put the fields in here and leave the
 *  header and the buttons outside it, so neither can be scrolled out of reach
 *  on a 390x844 screen. The negative margin lets the scrollbar hug the dialog
 *  edge while the content keeps its 1.5rem gutter. */
const DialogBody = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('-mx-6 min-h-0 flex-1 overflow-y-auto px-6', className)}
    {...props}
  />
)
DialogBody.displayName = 'DialogBody'

/** Action row. Never inside DialogBody. */
const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex shrink-0 justify-end gap-2', className)}
    {...props}
  />
)
DialogFooter.displayName = 'DialogFooter'

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-lg font-semibold tracking-tight', className)}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-slate-500', className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
