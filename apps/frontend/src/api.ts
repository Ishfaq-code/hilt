export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response

  try {
    response = await fetch(`/api${path}`, {
      ...options,
      credentials: 'same-origin',
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    })
  } catch (cause) {
    if (cause instanceof Error && cause.name === 'AbortError') {
      throw cause
    }

    throw new Error('Couldn’t reach Hilt. Check your connection and try again.', { cause })
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null)

    throw new ApiError(
      body?.error || 'Couldn’t complete the request. Try again.',
      response.status,
    )
  }

  return response.status === 204 ? undefined as T : await response.json() as T
}
