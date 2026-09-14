import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export function NotFound() {
  return (
    <div className="grid min-h-full place-items-center bg-slate-50 dark:bg-slate-950 px-4 py-24">
      <div className="text-center">
        <p className="text-sm font-medium text-brand-700 dark:text-brand-400">404</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          That webinar isn't here.
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-slate-500 dark:text-slate-400">
          The link might be wrong, or the room may have ended. Try the home
          page or your invite.
        </p>
        <div className="mt-8">
          <Button asChild>
            <Link to="/">Go home</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
