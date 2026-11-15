import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ToastContext } from '../../hooks/useToast'
import type { ToastOptions } from '../../hooks/useToast'
import { Icon } from './Icon'

type Toast = ToastOptions & { id: string }

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef(new Map<string, number>())
  const container = useRef<HTMLDivElement>(null)

  const dismiss = useCallback((id?: string) => {
    for (const [key, timer] of timers.current) {
      if (id && key !== id) continue
      window.clearTimeout(timer)
      timers.current.delete(key)
    }
    setToasts((items) => (id ? items.filter((toast) => toast.id !== id) : []))
  }, [])

  const toast = useCallback(
    (options: ToastOptions) => {
      const id = crypto.randomUUID()
      setToasts((items) => [...items, { ...options, id }])
      timers.current.set(
        id,
        window.setTimeout(() => dismiss(id), 4000),
      )
      return { id, dismiss: () => dismiss(id) }
    },
    [dismiss],
  )

  useEffect(() => {
    const pending = timers.current
    return () => {
      pending.forEach((timer) => window.clearTimeout(timer))
      pending.clear()
    }
  }, [])

  useEffect(() => {
    const element = container.current
    if (!element) return
    if (toasts.length) {
      if (element.matches(':popover-open')) element.hidePopover()
      element.showPopover()
    } else if (element.matches(':popover-open')) {
      element.hidePopover()
    }
  }, [toasts])

  const context = useMemo(() => ({ toast, dismiss }), [toast, dismiss])

  return (
    <ToastContext.Provider value={context}>
      {children}
      <div
        ref={container}
        popover="manual"
        aria-label="Notifications"
        className="fixed inset-auto right-4 bottom-4 m-0 w-[calc(100%-2rem)] max-w-sm space-y-2 overflow-visible border-0 bg-transparent p-0"
      >
        {toasts.map(({ id, title, description, variant }) => (
          <div
            key={id}
            role={variant === 'destructive' ? 'alert' : 'status'}
            className="flex items-start gap-3 rounded-xl border border-line bg-white p-3.5 text-ink shadow-lg"
          >
            {variant !== 'destructive' && <Icon name="check" size={17} />}
            <div className="min-w-0 flex-1">
              <p
                className={
                  'text-sm font-semibold ' +
                  (variant === 'destructive' ? 'text-red-700' : '')
                }
              >
                {title}
              </p>
              {description && (
                <p className="mt-1 text-sm text-muted">{description}</p>
              )}
            </div>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => dismiss(id)}
              className="rounded p-0.5 text-muted hover:bg-paper"
            >
              <Icon name="close" size={15} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
