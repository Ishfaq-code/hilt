import { App as NativeApp } from '@capacitor/app'
import { useEffect, useEffectEvent, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthToken } from '../../hooks/useAuthToken'
import { refreshAuthSession } from '../../lib/auth'
import type { AuthMode } from '../../lib/authDialog'
import { routeFromAppLink } from '../../lib/platform'
import { AuthDialog } from '../auth/AuthDialog'
import { buttonClass } from '../ui/styles'

export function MobileApp({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const token = useAuthToken()
  const [attempt, setAttempt] = useState(0)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [mode, setMode] = useState<AuthMode>('login')

  const openRoute = useEffectEvent((url?: string) => {
    const route = routeFromAppLink(url)
    if (route) navigate(route, { replace: true })
    return Boolean(route)
  })
  const goHome = useEffectEvent(() => {
    if (window.location.pathname === '/' && !window.location.search)
      navigate('/my-organizations', { replace: true })
  })

  useEffect(() => {
    let active = true
    void Promise.all([
      refreshAuthSession(),
      NativeApp.getLaunchUrl().catch(() => undefined),
    ])
      .then(([, launch]) => {
        if (!active) return
        if (!openRoute(launch?.url)) goHome()
        setStatus('ready')
      })
      .catch(() => {
        if (active) setStatus('error')
      })
    return () => {
      active = false
    }
  }, [attempt])

  useEffect(() => {
    const listener = NativeApp.addListener('appUrlOpen', ({ url }) => {
      openRoute(url)
    })
    return () => {
      void listener.then((handle) => handle.remove()).catch(() => {})
    }
  }, [])

  if (status !== 'ready')
    return (
      <main className="mx-auto max-w-md space-y-4 px-5 py-12">
        {status === 'loading' ? (
          <p role="status">Opening Hilt…</p>
        ) : (
          <>
            <p role="alert">Couldn’t restore your session.</p>
            <button
              type="button"
              className={buttonClass}
              onClick={() => {
                setStatus('loading')
                setAttempt((current) => current + 1)
              }}
            >
              Try again
            </button>
          </>
        )}
      </main>
    )

  if (!token) {
    return (
      <AuthDialog
        mode={mode}
        onModeChange={setMode}
        onFinish={() => setMode('login')}
      />
    )
  }

  return children
}
