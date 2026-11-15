function authHeaders(init?: HeadersInit) {
  const headers = new Headers(init)
  const token = sessionStorage.getItem('authToken')
  if (token) headers.set('Authorization', `Bearer ${token}`)
  return headers
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = authHeaders(init.headers)
  if (
    init.body &&
    !(init.body instanceof FormData) &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json')
  }
  const response = await fetch(path, { ...init, headers })
  if (response.status === 204) return undefined as T
  const result = (await response.json()) as T & { error?: string }
  if (!response.ok)
    throw new Error(result.error || 'The request could not be completed.')
  return result
}

export async function apiFile(path: string, signal?: AbortSignal) {
  if (!path.startsWith('/api/media/')) throw new Error('Invalid file link.')
  const response = await fetch(path, { headers: authHeaders(), signal })
  if (!response.ok) throw new Error('Unable to open the file.')
  return response.blob()
}
