import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { createWebinar } from '@/lib/db'
import { getErrorMessage } from '@/lib/errors'
import { slugifyTitle } from '@/lib/slug'
import { useAuth } from '@/lib/auth'
import type { WebinarRow } from '@/lib/database.types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (webinar: WebinarRow) => void
}

export function NewWebinarDialog({ open, onOpenChange, onCreated }: Props) {
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [showGuestCount, setShowGuestCount] = useState(true)
  const [allowSpeakRequests, setAllowSpeakRequests] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setTitle('')
    setDescription('')
    setScheduledAt('')
    setShowGuestCount(true)
    setAllowSpeakRequests(false)
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const slug = slugifyTitle(title)
      const created = await createWebinar({
        slug,
        title: title.trim(),
        description: description.trim(),
        scheduled_at: scheduledAt
          ? new Date(scheduledAt).toISOString()
          : null,
        show_guest_count: showGuestCount,
        allow_speak_requests: allowSpeakRequests,
        created_by: user?.id ?? null,
      })
      reset()
      onCreated(created)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!submitting) onOpenChange(next)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New webinar</DialogTitle>
          <DialogDescription>
            Set up a room you can share with your audience.
          </DialogDescription>
        </DialogHeader>

        {/* The form is the flex column below the header: the fields scroll and
            the Cancel/Create row stays pinned. This form is tall enough to
            overrun a 390x844 screen on its own, and before the split it took
            the dialog title off the top with it. */}
        <form className="flex min-h-0 flex-1 flex-col gap-4" onSubmit={handleSubmit}>
          <DialogBody className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Product walkthrough — Q4"
                required
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A short blurb shown on the join page."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="scheduledAt">Scheduled for (optional)</Label>
              <Input
                id="scheduledAt"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
              <p className="text-xs text-slate-500">
                You can leave this blank and start it whenever.
              </p>
            </div>

            <fieldset className="rounded-lg border border-slate-200 p-3">
              <legend className="px-1 text-xs font-medium text-slate-500">
                Default settings (you can change later)
              </legend>
              <label className="flex items-start gap-3 py-1.5">
                <input
                  type="checkbox"
                  checked={showGuestCount}
                  onChange={(e) => setShowGuestCount(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm">
                  <span className="font-medium text-slate-900">
                    Show attendee count to guests
                  </span>
                  <span className="block text-xs text-slate-500">
                    Guests see how many people are watching.
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-3 py-1.5">
                <input
                  type="checkbox"
                  checked={allowSpeakRequests}
                  onChange={(e) => setAllowSpeakRequests(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm">
                  <span className="font-medium text-slate-900">
                    Allow guests to request to speak
                  </span>
                  <span className="block text-xs text-slate-500">
                    Off by default. Toggle on during a live Q&A.
                  </span>
                </span>
              </label>
            </fieldset>

            {error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
          </DialogBody>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating…
                </>
              ) : (
                'Create webinar'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
