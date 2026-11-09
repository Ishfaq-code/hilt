import { useCallback, useEffect, useState } from 'react'

import { ApiError, request } from './api'
import { signInUrl } from './navigation'
import Router from './router'
import type { Session, User } from './types'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const path = location.pathname
  const accountPage = path === '/account'
  const discoverPage = path === '/discover' || path.startsWith('/clubs/')

  useEffect(() => {
    if (location.pathname === '/') {
      location.replace('/discover')
      return
    }

    const controller = new AbortController()

    async function restoreSession() {
      try {
        const options = { signal: controller.signal }
        const { user } = await request<{ user: User }>('/auth/me', options)
        const { isSiteAdmin } = await request<{ isSiteAdmin: boolean }>(
          '/me/clubs',
          options,
        )

        if (!controller.signal.aborted) {
          setSession({ user, isSiteAdmin })
        }
      } catch (cause) {
        if (controller.signal.aborted) {
          return
        }

        if (!(cause instanceof ApiError && cause.status === 401)) {
          setError(cause instanceof Error ? cause.message : 'Couldn’t restore your session.')
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    function restorePage(event: PageTransitionEvent) {
      if (event.persisted) {
        location.reload()
      }
    }

    void restoreSession()
    window.addEventListener('pageshow', restorePage)

    return () => {
      controller.abort()
      window.removeEventListener('pageshow', restorePage)
    }
  }, [])

  const expireSession = useCallback(() => {
    setSession(null)
    location.replace(signInUrl(undefined, true))
  }, [])

  let content = (
    <Router
      key={session?.user.id || 'anonymous'}
      session={session}
      expireSession={expireSession}
    />
  )

  if (loading) {
    content = <p role="status">Loading…</p>
  } else if (error) {
    content = (
      <div className="error" role="alert">
        {error}{' '}
        <button onClick={() => location.reload()}>Retry</button>
      </div>
    )
  }

  return (
    <>
      <header className="app-header">
        <a href="/" className="app-brand">
          Hilt<span aria-hidden="true">.</span>
        </a>
      </header>

      <main className="club-app">
        <nav className="workspace-nav" aria-label="Primary navigation">
          <div className="workspace-links">
            <a href="/discover" aria-current={discoverPage ? 'page' : undefined}>
              Discover
            </a>

            {session && (
              <a href="/home" aria-current={path === '/home' ? 'page' : undefined}>
                My clubs
              </a>
            )}

            {session?.isSiteAdmin && (
              <a
                href="/admin/applications"
                aria-current={path === '/admin/applications' ? 'page' : undefined}
              >
                Administration
              </a>
            )}
          </div>

          {!loading && (
            <a
              className={session ? 'account-nav-link' : 'account-nav-link login-button'}
              href={session || accountPage ? '/account' : signInUrl()}
              aria-current={accountPage ? 'page' : undefined}
            >
              {session ? 'Account' : 'Log in'}
            </a>
          )}
        </nav>

        {content}

        <footer className="app-footer">
          <a href="/apply">Apply for a club</a>
        </footer>
      </main>
    </>
  )
}
