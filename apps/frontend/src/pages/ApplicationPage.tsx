import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApplicationDetails } from '../components/applications/ApplicationDetails'
import { NewApplication } from '../components/applications/NewApplication'
import { Icon } from '../components/ui/Icon'
import { buttonClass, panelClass } from '../components/ui/styles'
import { api } from '../lib/api'
import type { Application, AuthUser } from '../types'

export default function ApplicationPage() {
  const navigate = useNavigate()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [selected, setSelected] = useState<Application | null>(null)
  const [tab, setTab] = useState<'New application' | 'My applications'>(
    'New application',
  )
  const [loading, setLoading] = useState(() =>
    Boolean(sessionStorage.getItem('authToken')),
  )
  const [error, setError] = useState('')

  useEffect(() => {
    const token = sessionStorage.getItem('authToken')
    if (!token) return
    let active = true
    api<AuthUser>('/api/users/me')
      .then(async (profile) => {
        if (!active) return
        setUser(profile)
        if (profile.role === 'admin') {
          navigate('/admin', { replace: true })
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
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [navigate])

  return (
    <section className="mx-auto max-w-6xl px-4 pt-9 sm:px-8 sm:pt-13">
      <h1 className="mb-4 text-3xl font-semibold tracking-tight">
        Apply for a club
      </h1>
      {!user && !loading && (
        <div className={`${panelClass} p-5`}>
          <p className="mb-4 text-sm text-muted">
            Sign in to submit an organization application and track its review.
          </p>
          <Link to="/login" className={buttonClass}>
            Log in to apply
          </Link>
        </div>
      )}
      {loading && (
        <p className="text-sm text-muted">Loading your applications…</p>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      {user && (
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
