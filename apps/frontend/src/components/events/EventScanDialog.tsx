import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { useToast } from '../../hooks/useToast'
import { checkIn, eventCheckInParameters, readEventQr } from '../../lib/checkIn'
import { Dialog } from '../ui/Dialog'
import { secondaryClass } from '../ui/styles'
import { QrScanner, ScannerDialog } from './ScannerDialog'

export function EventScanDialog({
  onClose,
  linkQuery,
  asPage = false,
}: {
  onClose: () => void
  linkQuery?: string
  asPage?: boolean
}) {
  const { toast } = useToast()
  const complete = useEffectEvent(() => {
    onClose()
    toast({ title: 'Checked in' })
  })
  const [stage, setStage] = useState(linkQuery ? 'checking' : 'scan')
  const [error, setError] = useState('')
  const open = useRef(false)

  useEffect(() => {
    open.current = true
    return () => {
      open.current = false
    }
  }, [])

  useEffect(() => {
    if (!linkQuery) return
    let active = true
    async function checkInFromLink() {
      try {
        const { clubId, eventId, code } = eventCheckInParameters(
          new URLSearchParams(linkQuery),
        )
        await checkIn(clubId, eventId, code)
        if (active) complete()
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
    if (open.current) onClose()
    toast({ title: 'Checked in' })
  }

  if (stage === 'scan' && !asPage)
    return <ScannerDialog onScan={scan} onClose={onClose} />

  const status =
    stage === 'checking' ? (
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
    )

  if (asPage) {
    return (
      <section className="flex h-full flex-col gap-4 p-5">
        <h1 className="text-xl font-semibold">Scan QR</h1>
        <div className="min-h-0 flex-1">
          {stage === 'scan' ? <QrScanner screen onScan={scan} /> : status}
        </div>
      </section>
    )
  }

  return (
    <Dialog title="Check in" onClose={onClose}>
      {status}
    </Dialog>
  )
}
