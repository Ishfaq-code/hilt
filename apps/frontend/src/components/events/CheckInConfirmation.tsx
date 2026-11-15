import { useEffect, useEffectEvent } from 'react'
import { Dialog } from '../ui/Dialog'

export function CheckInConfirmation({ onClose }: { onClose: () => void }) {
  const close = useEffectEvent(onClose)
  useEffect(() => {
    const timer = window.setTimeout(() => close(), 2000)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <Dialog title="Checked in" onClose={onClose}>
      <p role="status" className="text-sm text-muted">
        Your attendance was recorded.
      </p>
    </Dialog>
  )
}
