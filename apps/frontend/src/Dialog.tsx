import { useEffect, useId, useRef } from 'react'
import type { ReactNode, SyntheticEvent } from 'react'

type Props = {
  title: string
  pending: boolean
  close: () => void
  children: ReactNode
}

export default function Dialog({ title, pending, close, children }: Props) {
  const titleId = useId()
  const dialog = useRef<HTMLDialogElement>(null)
  const opener = useRef(document.activeElement)

  useEffect(() => {
    const element = dialog.current!
    const trigger = opener.current

    element.showModal()

    return () => {
      element.close()

      if (trigger instanceof HTMLElement && trigger.isConnected) {
        trigger.focus()
      }
    }
  }, [])

  function cancel(event: SyntheticEvent<HTMLDialogElement>) {
    event.preventDefault()

    if (!pending) {
      close()
    }
  }

  return (
    <dialog
      ref={dialog}
      className="app-dialog"
      aria-labelledby={titleId}
      onCancel={cancel}
    >
      <div className="dialog-heading">
        <h2 id={titleId}>{title}</h2>
        <button
          type="button"
          className="quiet-button"
          aria-label="Close dialog"
          disabled={pending}
          onClick={close}
        >
          ×
        </button>
      </div>

      {children}
    </dialog>
  )
}
