import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { panelClass } from '../ui/styles'

type EventReport = {
  _id: string
  eventName: string
  clubName: string
  reason: string
  createdAt: string
}

export function EventReports() {
  const [reports, setReports] = useState<EventReport[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const request = new AbortController()
    api<EventReport[]>('/api/admin/event-reports', { signal: request.signal })
      .then(setReports)
      .catch((cause: unknown) => {
        if (!request.signal.aborted)
          setError(
            cause instanceof Error ? cause.message : 'Couldn’t load reports.',
          )
      })
    return () => request.abort()
  }, [])

  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-semibold tracking-tight">Event reports</h1>
      {error ? (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      ) : !reports ? (
        <p role="status" className="text-sm text-muted">
          Loading reports…
        </p>
      ) : reports.length ? (
        <ul className="space-y-3">
          {reports.map((report) => (
            <li key={report._id} className={panelClass + ' space-y-2 p-4'}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="font-semibold">{report.eventName}</h2>
                  <p className="text-sm text-muted">{report.clubName}</p>
                </div>
                <time
                  dateTime={report.createdAt}
                  className="text-sm text-muted"
                >
                  {new Date(report.createdAt).toLocaleDateString(undefined, {
                    dateStyle: 'medium',
                  })}
                </time>
              </div>
              <p className="text-sm wrap-anywhere whitespace-pre-wrap">
                {report.reason}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">No event reports.</p>
      )}
    </section>
  )
}
