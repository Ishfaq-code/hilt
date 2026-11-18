import { lazy, Suspense } from 'react'
import type { OrgStats } from '../../../types/administration'
import { buttonClass, panelClass } from '../../ui/styles'

const ClubStatistics = lazy(() => import('./ClubStatistics'))

export function ClubOverview({
  statistics,
  checkIn,
}: {
  statistics?: OrgStats
  checkIn?: { eventName: string; onClick: () => void }
}) {
  const loading = (
    <p className="mt-5 text-sm text-muted">Loading club statistics…</p>
  )

  return (
    <section>
      <h1 className="text-3xl font-semibold tracking-tight">Overview</h1>
      {checkIn && (
        <div
          className={
            panelClass +
            ' mt-5 flex flex-wrap items-center justify-between gap-3 p-4'
          }
        >
          <div>
            <p className="text-xs font-medium text-active">In progress</p>
            <h2 className="font-semibold">{checkIn.eventName}</h2>
          </div>
          <button
            type="button"
            aria-haspopup="dialog"
            className={buttonClass}
            onClick={checkIn.onClick}
          >
            Check in
          </button>
        </div>
      )}
      <Suspense fallback={loading}>
        {statistics ? <ClubStatistics statistics={statistics} /> : loading}
      </Suspense>
    </section>
  )
}
