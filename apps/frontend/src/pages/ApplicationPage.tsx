import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApplicationDetails } from '../components/applications/ApplicationDetails'
import { NewApplication } from '../components/applications/NewApplication'
import { Icon } from '../components/ui/Icon'
import { buttonClass, panelClass } from '../components/ui/styles'
import { useAuthPage } from '../hooks/useAuthPage'
import { useAuthToken } from '../hooks/useAuthToken'
import { api } from '../lib/api'
import type { Application, AuthUser } from '../types'

export default function ApplicationPage() {
  const navigate = useNavigate()
  const openLogin = useAuthPage()
  const token = useAuthToken()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [selected, setSelected] = useState<Application | null>(null)
  const [tab, setTab] = useState<'New application' | 'My applications'>(
    'New application',
  )
  const [loadedToken, setLoadedToken] = useState<string | null>(null)
  const loading = Boolean(token && loadedToken !== token)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return
    let active = true
    api<AuthUser>('/api/users/me')
      .then(async (profile) => {
        if (!active) return
        setError('')
        setUser(profile)
        if (profile.role === 'admin') {
          navigate('/admin?tab=applications', { replace: true })
          return
        }
        const list = await api<Application[]>('/api/applications/mine')
        if (active) setApplications(list)
      })
      .catch((cause: unknown) => {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : 'Unable to load applications.',
          )
      })
      .finally(() => {
        if (active) setLoadedToken(token)
      })
    return () => {
      active = false
    }
  }, [navigate, token])

  return (
    <section className="mx-auto max-w-6xl px-4 pt-9 sm:px-8 sm:pt-13">
      <h1 className="mb-4 text-3xl font-semibold tracking-tight">
        Apply for a club
      </h1>
      {!token && (
        <div className={`${panelClass} p-5`}>
          <p className="mb-4 text-sm text-muted">
            Sign in to submit an organization application and track its review.
          </p>
          <button
            type="button"
            aria-haspopup="dialog"
            className={buttonClass}
            onClick={() => openLogin()}
          >
            Log in to apply
          </button>
        </div>
      )}
      {loading && (
        <p className="text-sm text-muted">Loading your applications…</p>
      )}
      {token && !loading && error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      {token && !loading && user && (
        <>
          <nav
            aria-label="Applications"
            className="flex gap-6 overflow-x-auto border-b border-line"
          >
            {(['New application', 'My applications'] as const).map((item) => (
              <button
                key={item}
                type="button"
                aria-current={tab === item ? 'page' : undefined}
                onClick={() => {
                  setTab(item)
                  setSelected(null)
                }}
                className={`shrink-0 border-b-2 px-0.5 py-3 text-sm font-semibold ${tab === item ? 'border-accent text-ink' : 'border-transparent text-muted hover:text-ink'}`}
              >
                {item}
              </button>
            ))}
          </nav>
          {selected && tab === 'My applications' ? (
            <ApplicationDetails
              application={selected}
              onBack={() => setSelected(null)}
            />
          ) : tab === 'New application' ? (
            <NewApplication
              onSubmitted={(application) => {
                setApplications((current) => [application, ...current])
                setSelected(application)
                setTab('My applications')
              }}
            />
          ) : (
            <div className="mt-6">
              {applications.length ? (
                <ul className={`${panelClass} divide-y divide-line`}>
                  {applications.map((application) => (
                    <li key={application._id}>
                      <button
                        type="button"
                        onClick={() => setSelected(application)}
                        className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-paper"
                      >
                        <span>
                          <span className="block font-semibold">
                            {application.organizationName}
                          </span>
                          <span className="mt-1 block text-sm text-muted">
                            {application.status === 'pending'
                              ? 'Pending review'
                              : application.status}
                          </span>
                        </span>
                        <Icon name="arrow" size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={`${panelClass} p-5 text-sm text-muted`}>
                  No applications yet.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </section>
  )
}
