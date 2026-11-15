import { createContext, useContext } from 'react'

export type ToastOptions = {
  title: string
  description?: string
  variant?: 'default' | 'destructive'
}

export const ToastContext = createContext<{
  toast: (options: ToastOptions) => { id: string; dismiss: () => void }
  dismiss: (id?: string) => void
} | null>(null)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast requires ToastProvider')
  return context
}
