import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { buttonClass, secondaryClass } from '../wireframe/Design'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'danger'
}

export default function ActionButton({ children, variant = 'primary', className = '', ...props }: Props) {
  const appearance = variant === 'primary' ? buttonClass : variant === 'secondary' ? secondaryClass : `${secondaryClass} border-red-200 text-red-800 hover:bg-red-50`
  return <button className={`${appearance} ${className}`} {...props}>{children}</button>
}
