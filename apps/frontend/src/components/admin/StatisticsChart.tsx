import type { ReactNode } from 'react'
import { panelClass } from '../ui/styles'

export function StatisticsChart({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <figure className={`${panelClass} min-w-0 p-4`}>
      <h3 className="text-center font-serif text-xl font-semibold tracking-wide text-ink">
        {title}
      </h3>
      <div
        aria-hidden="true"
        className="mx-auto mt-2 h-0.5 w-10 rounded-full bg-active"
      />
      <div className="mt-3 h-64 w-full">{children}</div>
    </figure>
  )
}
