import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { isNativeApp } from '../../lib/platform'
import { NativeQrScanner } from './NativeQrScanner'
import { Dialog } from '../ui/Dialog'
import { secondaryClass } from '../ui/styles'

export function QrScanner({
  onScan,
  inline = false,
}: {
  onScan: (value: string) => Promise<void>
  inline?: boolean
}) {
  const video = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [nativeFallback, setNativeFallback] = useState(false)
  const scan = useEffectEvent(onScan)

  useEffect(() => {
    const element = video.current
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d', { willReadFrequently: true })
    let active = true
    let stream: MediaStream | undefined
    let timer: number | undefined

    function stopCamera() {
      window.clearTimeout(timer)
      stream?.getTracks().forEach((track) => track.stop())
    }

    async function readFrame(decode: typeof import('jsqr').default) {
      if (!active || !element || !context) return

      if (element.videoWidth > 0 && element.readyState >= 2) {
        const scale = Math.min(1, 720 / element.videoWidth)
        canvas.width = Math.round(element.videoWidth * scale)
        canvas.height = Math.round(element.videoHeight * scale)
        context.drawImage(element, 0, 0, canvas.width, canvas.height)
        const frame = context.getImageData(0, 0, canvas.width, canvas.height)
        const result = decode(frame.data, frame.width, frame.height)
        if (result?.data) {
          stopCamera()
          try {
            await scan(result.data)
          } catch (cause) {
            if (active) {
              setError(
                cause instanceof Error ? cause.message : 'Couldn’t check in.',
              )
            }
          }
          return
        }
      }

      timer = window.setTimeout(() => void readFrame(decode), 120)
    }

    async function startCamera() {
      try {
        if (!element || !context || !navigator.mediaDevices?.getUserMedia) {
          throw new Error('Camera unavailable')
        }
        const { default: decode } = await import('jsqr')
        if (!active) return
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        })
        if (!active) {
          stopCamera()
          return
        }
        element.srcObject = stream
        await element.play()
        void readFrame(decode)
      } catch {
        stopCamera()
        if (active)
          setError('Couldn’t open the camera. Check your camera permissions.')
      }
    }

    if (!nativeFallback) void startCamera()
    return () => {
      active = false
      stopCamera()
      if (element) element.srcObject = null
    }
  }, [attempt, nativeFallback])

  if (nativeFallback)
    return (
      <NativeQrScanner
        onScan={onScan}
        onCancel={() => setNativeFallback(false)}
      />
    )

  return (
    <>
      <video
        ref={video}
        className={
          'mx-auto w-full rounded-lg bg-ink object-contain ' +
          (inline
            ? 'aspect-video max-h-60'
            : 'max-h-[calc(100dvh-8rem)] max-w-3xl')
        }
        aria-label="Camera"
        playsInline
        muted
        hidden={Boolean(error)}
      />
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
          {isNativeApp && (
            <button
              type="button"
              className={secondaryClass + ' ml-2'}
              onClick={() => setNativeFallback(true)}
            >
              Open scanner
            </button>
          )}
        </div>
      )}
    </>
  )
}

export function ScannerDialog({
  onScan,
  onClose,
}: {
  onScan: (value: string) => Promise<void>
  onClose: () => void
}) {
  return (
    <Dialog title="Scan QR" fullScreen onClose={onClose}>
      {isNativeApp ? (
        <NativeQrScanner onScan={onScan} onCancel={onClose} />
      ) : (
        <QrScanner onScan={onScan} />
      )}
    </Dialog>
  )
}
