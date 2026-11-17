import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import type { Organization } from '../types'
import type { ManagedEvent } from '../types/management'

export type EventEntry = {
  club: Pick<Organization, '_id' | 'name' | 'tags' | 'assets'>
  event: ManagedEvent
  rsvpCount: number
}

type Result = {
  entries: EventEntry[]
  page: number
  hasNext: boolean
  total: number
  eventTags: string[]
}

export function useEventDirectory(query: string, pageSize: 5 | 10) {
  const [pagination, setPagination] = useState({ query, page: 1 })
  const [result, setResult] = useState<{ query: string; data: Result }>()
  const [error, setError] = useState<{ key: string; message: string }>()
  const [attempt, setAttempt] = useState(0)
  const nextPage = useRef<HTMLDivElement>(null)
  const page = pagination.query === query ? pagination.page : 1
  const key = [query, page, attempt].join(':')
  const current = result?.query === query ? result.data : undefined
  const message = error?.key === key ? error.message : ''
  const loading = !message && current?.page !== page

  useEffect(() => {
    const request = new AbortController()
    const params = new URLSearchParams(query)
    params.set('scope', 'discover')
    params.set('page', String(page))
    params.set('limit', String(pageSize))

    api<Result>('/api/calendar?' + params, { signal: request.signal })
      .then((data) => {
        if (request.signal.aborted) return
        setError(undefined)
        setPagination({ query, page })

        setResult((previous) => {
          const entries = new Map<string, EventEntry>()
          const previousEntries =
            previous?.query === query && page > 1 ? previous.data.entries : []
          for (const entry of [...previousEntries, ...data.entries]) {
            entries.set(entry.club._id + ':' + entry.event._id, entry)
          }
          return { query, data: { ...data, entries: [...entries.values()] } }
        })
      })
      .catch((cause: unknown) => {
        if (request.signal.aborted) return
        setError({
          key,
          message:
            cause instanceof Error ? cause.message : 'Couldn’t load events.',
        })
      })

    return () => request.abort()
  }, [query, page, pageSize, key])

  useEffect(() => {
    if (loading || message || !current?.hasNext || !nextPage.current) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        observer.disconnect()
        setPagination({ query, page: page + 1 })
      },
      { rootMargin: '180px 0px' },
    )
    observer.observe(nextPage.current)
    return () => observer.disconnect()
  }, [query, page, loading, message, current?.hasNext])

  return {
    entries: current?.entries ?? [],
    eventTags: current?.eventTags ?? [],
    total: current?.total,
    loading,
    error: message,
    nextPage,
    hasNext: current?.hasNext,
    retry: () => setAttempt((value) => value + 1),
  }
}
