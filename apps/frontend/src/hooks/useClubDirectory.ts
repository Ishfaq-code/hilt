import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { Organization } from '../types'

export function useClubDirectory() {
  const [clubs, setClubs] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const request = new AbortController()
    api<Organization[]>('/api/organizations', { signal: request.signal })
      .then((items) => {
        if (!request.signal.aborted) setClubs(items)
      })
      .catch((cause: unknown) => {
        if (!request.signal.aborted) {
          setError(
            cause instanceof Error ? cause.message : 'Couldn’t load clubs.',
          )
        }
      })
      .finally(() => {
        if (!request.signal.aborted) setLoading(false)
      })
    return () => request.abort()
  }, [])

  return { clubs, loading, error }
}
