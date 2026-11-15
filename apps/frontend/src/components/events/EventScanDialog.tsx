import { useEffect, useState } from 'react'
import { checkIn, eventCheckInParameters, readEventQr } from '../../lib/checkIn'
import { Dialog } from '../ui/Dialog'
import { secondaryClass } from '../ui/styles'
import { CheckInConfirmation } from './CheckInConfirmation'
import { ScannerDialog } from './ScannerDialog'

export function EventScanDialog({
  onClose,
  linkQuery,
}: {
  onClose: () => void
  linkQuery?: string
}) {
  const [stage, setStage] = useState(linkQuery ? 'checking' : 'scan')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!linkQuery) return
    let active = true
    async function checkInFromLink() {
      try {
        const { clubId, eventId, code } = eventCheckInParameters(
          new URLSearchParams(linkQuery),
        )
        await checkIn(clubId, eventId, code)
        if (active) setStage('done')
      } catch (cause) {
        if (!active) return
        setError(cause instanceof Error ? cause.message : 'Couldn’t check in.')
        setStage('error')
      }
    }
    void checkInFromLink()
    return () => {
      active = false
    }
  }, [linkQuery])

  async function scan(value: string) {
    const { clubId, eventId, code } = readEventQr(value)
    await checkIn(clubId, eventId, code)
    setStage('done')
  }

  if (stage === 'done') return <CheckInConfirmation onClose={onClose} />
  if (stage === 'scan') return <ScannerDialog onScan={scan} onClose={onClose} />

  return (
    <Dialog title="Check in" onClose={onClose}>
      {stage === 'checking' ? (
        <p role="status" className="text-sm text-muted">
          Checking in…
        </p>
      ) : (
        <>
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
          <button
            type="button"
            className={secondaryClass + ' mt-4'}
            onClick={() => setStage('scan')}
          >
            Scan QR
          </button>
        </>
      )}
    </Dialog>
  )
}
