import { useEffect, useState } from 'react'
import { Loader2, MailCheck, ShieldCheck } from 'lucide-react'
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
import { markWebinarVerified, sendHostOtp, verifyHostOtp } from '@/lib/host'
import { getErrorMessage } from '@/lib/errors'
import type { WebinarRow } from '@/lib/database.types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  webinar: WebinarRow
  onVerified: (webinar: WebinarRow) => void
}

export function OtpVerifyDialog({
  open,
  onOpenChange,
  webinar,
  onVerified,
}: Props) {
  const [step, setStep] = useState<'send' | 'verify'>('send')
  const [code, setCode] = useState('')
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset state every time the dialog opens.
  useEffect(() => {
    if (open) {
      setStep('send')
      setCode('')
      setError(null)
    }
  }, [open])

  async function handleSend() {
    if (!webinar.host_email) {
      setError('This webinar has no host email on file.')
      return
    }
    setSending(true)
    setError(null)
    try {
      await sendHostOtp(webinar.host_email)
      setStep('verify')
    } catch (err) {
      setError(getErrorMessage(err, 'Could not send the code. Try again.'))
    } finally {
      setSending(false)
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    if (!webinar.host_email) return
    setVerifying(true)
    setError(null)
    try {
      await verifyHostOtp(webinar.host_email, code)
      const updated = await markWebinarVerified(webinar.slug)
      onVerified(updated)
      onOpenChange(false)
    } catch (err) {
      setError(getErrorMessage(err, 'That code didn\'t work.'))
    } finally {
      setVerifying(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !sending && !verifying && onOpenChange(next)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-brand-600" />
            Verify your email
          </DialogTitle>
          <DialogDescription>
            We send a 6-digit code to <strong>{webinar.host_email}</strong> so we
            know it's really you before you broadcast.
          </DialogDescription>
        </DialogHeader>

        {step === 'send' ? (
          <div className="flex min-h-0 flex-1 flex-col gap-4">
            <DialogBody className="space-y-4 py-1">
              <div className="flex items-start gap-3 rounded-lg border border-brand-200 bg-brand-50 p-3 text-sm text-brand-900">
                <MailCheck className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <p>
                  Click below to send the code. It usually arrives in under a
                  minute.
                </p>
              </div>
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
                disabled={sending}
              >
                Cancel
              </Button>
              <Button type="button" onClick={handleSend} disabled={sending}>
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending…
                  </>
                ) : (
                  'Send the code'
                )}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form className="flex min-h-0 flex-1 flex-col gap-4" onSubmit={handleVerify}>
            <DialogBody className="space-y-4 py-1">
              <div className="space-y-1.5">
                <Label htmlFor="otp">6-digit code</Label>
                <Input
                  id="otp"
                  value={code}
                  onChange={(e) =>
                    setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))
                  }
                  placeholder="123456"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  autoComplete="one-time-code"
                  autoFocus
                  maxLength={6}
                  className="text-center text-lg tracking-[0.4em] font-semibold"
                  required
                />
                <p className="text-xs text-slate-500">
                  Didn't get it?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setStep('send')
                      setCode('')
                    }}
                    className="font-medium text-brand-700 hover:underline"
                  >
                    Send again
                  </button>
                </p>
              </div>
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
                disabled={verifying}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={verifying || code.length !== 6}>
                {verifying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying…
                  </>
                ) : (
                  'Verify & continue'
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
