import qrcode from 'qrcode-generator'
import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { attendeeQrValue, eventQrValue } from '../../lib/checkIn'
import { eventApi } from '../../lib/events'
import { Dialog } from '../ui/Dialog'
import { secondaryClass } from '../ui/styles'

type Target = { clubId: string; eventId: string; name: string }
type Code = {
  code: string
  expiresAt: number
  attendee?: { name: string; email: string }
}

function QrCode({ value }: { value: string }) {
  const image = qrcode(0, 'M')
  image.addData(value)
  image.make()

  const modules = image.getModuleCount()
  const path = []
  for (let row = 0; row < modules; row++) {
    for (let col = 0; col < modules; col++) {
      if (image.isDark(row, col)) path.push('M' + col + ' ' + row + 'h1v1h-1z')
    }
  }

  return (
    <svg
      role="img"
      aria-label="Check-in QR code"
      viewBox={'-4 -4 ' + (modules + 8) + ' ' + (modules + 8)}
      shapeRendering="crispEdges"
      className="mx-auto w-full max-w-[min(80vw,70dvh)] bg-white"
    >
      <path d={path.join('')} fill="#000" />
    </svg>
  )
}

export function CheckInCodeDialog({
  target,
  onClose,
}: {
  target?: Target
  onClose: () => void
}) {
  const [qr, setQr] = useState<Code | null>(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const clubId = target?.clubId
  const eventId = target?.eventId

  useEffect(() => {
    const request = new AbortController()
    let refresh: number | undefined

    async function load() {
      const endpoint =
        clubId && eventId
          ? eventApi(clubId, eventId) + '/check-in-code'
          : '/api/users/me/check-in-code'

      try {
        const result = await api<Code>(endpoint, { signal: request.signal })
        if (request.signal.aborted) return
        setQr(result)
        refresh = window.setTimeout(
          () => void load(),
          Math.max(1000, result.expiresAt - Date.now() - 30_000),
        )
      } catch (cause) {
        if (request.signal.aborted) return
        setQr(null)
        setError(
          cause instanceof Error ? cause.message : 'Couldn’t load the QR code.',
        )
      }
    }

    void load()
    return () => {
      request.abort()
      window.clearTimeout(refresh)
    }
  }, [clubId, eventId, attempt])

  const value =
    qr &&
    (target
      ? eventQrValue(target.clubId, target.eventId, qr.code)
      : attendeeQrValue(qr.code))

  return (
    <Dialog
      title={target?.name ?? qr?.attendee?.name ?? 'My QR'}
      subtitle={qr?.attendee?.email}
      fullScreen
      onClose={onClose}
    >
      {value && <QrCode value={value} />}
      {!qr && !error && <p role="status">Loading QR…</p>}
      {error && (
        <div className="mx-auto max-w-md space-y-3">
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
          <button
            type="button"
            className={secondaryClass}
            onClick={() => {
              setError('')
              setAttempt((current) => current + 1)
            }}
          >
            Try again
          </button>
        </div>
      )}
    </Dialog>
  )
}
