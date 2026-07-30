import { FileText } from 'lucide-react'

/**
 * Renders whatever the host put on the stage.
 *
 * PDFs go in an `<iframe>` and lean on the browser's own viewer rather than
 * bundling pdf.js. That is a deliberate trade: it costs nothing to ship, gives
 * every viewer the paging, zoom, search and text selection they already know,
 * and stays accessible. What it gives up is control — we can't drive the page
 * number, which is why host-led page sync isn't offered (see migration 0098).
 *
 * The fallback link matters more than it looks: iOS Safari and several
 * in-app browsers refuse to render a PDF in an iframe at all, and without it
 * those viewers would just see an empty box.
 */
export function SharedDocViewer({
  url,
  name,
  className = 'h-[420px]',
}: {
  url: string
  name: string
  className?: string
}) {
  const isPdf = /\.pdf(\?|$)/i.test(url)

  if (!isPdf) {
    return (
      <div className={`grid place-items-center overflow-auto bg-slate-50 ${className}`}>
        <img src={url} alt={name} className="max-h-full max-w-full object-contain" />
      </div>
    )
  }

  return (
    <div className={`relative bg-slate-50 ${className}`}>
      <iframe src={url} title={name} className="h-full w-full" />
      <noscript>
        <a href={url}>{name}</a>
      </noscript>
      <p className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 bg-gradient-to-t from-slate-50 to-transparent py-1 text-[11px] text-slate-500">
        <FileText className="h-3 w-3" />
        Can't see it?{' '}
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="pointer-events-auto underline underline-offset-2"
        >
          open in a new tab
        </a>
      </p>
    </div>
  )
}
