export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  const token = sessionStorage.getItem('authToken')
  if (token) headers.set('Authorization', `Bearer ${token}`)
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
