import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { Icon } from './Icon'

export function Dialog({
  title,
  subtitle,
  onClose,
  children,
  fullScreen = false,
  compact = false,
}: {
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  fullScreen?: boolean
  compact?: boolean
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const element = dialog.current
    const trigger = document.activeElement
    element?.showModal()
    return () => {
      element?.close()
      if (trigger instanceof HTMLElement && trigger.isConnected) {
        trigger.focus({ preventScroll: true })
      }
    }
  }, [])

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      className={
        'overscroll-contain border-line bg-white text-ink shadow-xl backdrop:bg-black/50 ' +
        (fullScreen
          ? 'm-0 h-dvh max-h-none w-full max-w-none'
          : 'm-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] rounded-xl border ' +
            (compact ? 'max-w-md' : 'max-w-2xl'))
      }
      onClose={(event) => {
        if (!event.currentTarget.open) onClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close()
      }}
    >
      <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-line bg-white px-5 py-3 sm:px-6">
        <div className="min-w-0 self-center">
          <h2 id={titleId} className="text-xl font-semibold">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-1 text-sm break-all text-muted">{subtitle}</p>
          )}
        </div>
        <button
          type="button"
          aria-label="Close"
          className="grid size-9 shrink-0 place-items-center rounded-lg hover:bg-paper"
          onClick={() => dialog.current?.close()}
        >
          <Icon name="close" />
        </button>
      </header>
      <div className="px-5 py-5 sm:px-6">{children}</div>
    </dialog>
  )
}
