import { useEffect, useEffectEvent, useState } from 'react'
import { secondaryClass } from '../ui/styles'

export function NativeQrScanner({
  onScan,
  onCancel,
}: {
  onScan: (value: string) => Promise<void>
  onCancel: () => void
}) {
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const scan = useEffectEvent(onScan)
  const cancel = useEffectEvent(onCancel)

  useEffect(() => {
    let active = true

    async function openCamera() {
      try {
        const { CapacitorBarcodeScanner, CapacitorBarcodeScannerTypeHint } =
          await import('@capacitor/barcode-scanner')
        if (!active) return
        const { ScanResult } = await CapacitorBarcodeScanner.scanBarcode({
          hint: CapacitorBarcodeScannerTypeHint.QR_CODE,
        })
        if (!active) return
        if (ScanResult) await scan(ScanResult)
        else cancel()
      } catch (cause) {
        if (!active) return
        const message =
          cause instanceof Error ? cause.message : 'Couldn’t scan the QR code.'
        if (/cancel/i.test(message)) cancel()
        else setError(message)
      }
    }

    void openCamera()
    return () => {
      active = false
    }
  }, [attempt])

  return error ? (
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
  ) : (
    <p role="status" className="text-sm text-muted">
      Opening camera…
    </p>
  )
}
