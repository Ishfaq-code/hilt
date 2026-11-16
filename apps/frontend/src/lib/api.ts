import { getAuthToken, refreshAuthSession } from './auth'
import { apiUrl, isNativeApp } from './platform'

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request(path: string, init: RequestInit) {
  const headers = new Headers(init.headers)
  const token = getAuthToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (
    init.body &&
    !(init.body instanceof FormData) &&
    !headers.has('Content-Type')
  )
    headers.set('Content-Type', 'application/json')

  const url = apiUrl(path)
  const response = await fetch(url, { ...init, headers })
  if (
    response.status !== 401 ||
    !isNativeApp ||
    !token ||
    path.startsWith('/api/auth/')
  )
    return response

  const current = getAuthToken()
  const renewed = current !== token ? current : await refreshAuthSession()
  if (!renewed || init.signal?.aborted) return response

  headers.set('Authorization', `Bearer ${renewed}`)
  return fetch(url, { ...init, headers })
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await request(path, init)
  if (response.status === 204) return undefined as T

  const result = (await response.json()) as T & { error?: string }
  if (!response.ok)
    throw new ApiError(
      response.status,
      result.error || 'The request could not be completed.',
    )
  return result
}

export async function apiFile(path: string, signal?: AbortSignal) {
  if (!path.startsWith('/api/media/')) throw new Error('Invalid file link.')
  const response = await request(path, { signal })
  if (!response.ok) throw new Error('Unable to open the file.')
  return response.blob()
}
