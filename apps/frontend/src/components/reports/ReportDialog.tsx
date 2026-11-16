import { useState } from 'react'
import type { SubmitEvent } from 'react'
import { useAuthPage } from '../../hooks/useAuthPage'
import { useAuthToken } from '../../hooks/useAuthToken'
import { useToast } from '../../hooks/useToast'
import { api } from '../../lib/api'
import { Dialog } from '../ui/Dialog'
import { buttonClass, inputClass, secondaryClass } from '../ui/styles'

export function ReportDialog({
  endpoint,
  onClose,
}: {
  endpoint: string
  onClose: () => void
}) {
  const token = useAuthToken()
  const openLogin = useAuthPage()
  const { toast } = useToast()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const reason = String(
      new FormData(event.currentTarget).get('reason'),
    ).trim()
    if (!reason) {
      setError('Enter a reason.')
      return
    }

    setBusy(true)
    setError('')
    try {
      await api(endpoint, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      })
      onClose()
      toast({ title: 'Report sent' })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Couldn’t send report.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog title="Report" onClose={onClose} compact>
      {token ? (
        <form className="space-y-4" onSubmit={(event) => void submit(event)}>
          <label className="block text-sm font-medium">
            Reason
            <textarea
              name="reason"
              rows={3}
              maxLength={2000}
              className={inputClass + ' mt-2'}
              required
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" className={secondaryClass} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={buttonClass} disabled={busy}>
              {busy ? 'Sending…' : 'Send report'}
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          className={buttonClass}
          aria-haspopup="dialog"
          onClick={() => openLogin()}
        >
          Log in to report
        </button>
      )}
    </Dialog>
  )
}
