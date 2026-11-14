import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ApplicationDetailsModal from '../components/ApplicationDetailsModal'
import ApplicationForm from '../components/ApplicationForm'
import SiteHeader from '../components/SiteHeader'
import { clearAuthSession } from '../auth'
import type { ApiResponse, Application, AuthUser } from '../types'

function ApplicationPage() {
  const navigate = useNavigate()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [reviewError, setReviewError] = useState('')

  useEffect(() => {
    const token = sessionStorage.getItem('authToken')
    if (!token) {
      navigate('/login', { replace: true, state: { from: '/application' } })
      return
    }

    let active = true
    async function load() {
      setLoading(true)
      setError('')
      try {
        const profileResponse = await fetch('/api/users/me', { headers: { Authorization: `Bearer ${token}` } })
        if (profileResponse.status === 401) {
          clearAuthSession()
          navigate('/login', { replace: true, state: { from: '/application' } })
          return
        }
        if (!profileResponse.ok) throw new Error('Unable to load your account.')
        const profile = await profileResponse.json() as AuthUser
        const listResponse = await fetch(profile.role === 'admin' ? '/api/applications' : '/api/applications/mine', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const listResult = await listResponse.json() as Application[] & ApiResponse
        if (!listResponse.ok) throw new Error((listResult as ApiResponse).error || 'Unable to load applications.')
        if (active) {
          setUser(profile)
          setApplications((listResult as Application[]).map((application) => ({ ...application, status: application.status || 'pending' })))
        }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Unable to load applications.')
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [navigate])

  function handleCreated(application: Application) {
    setApplications((current) => [{ ...application, userId: user || application.userId }, ...current])
    setShowForm(false)
  }

  async function reviewApplication(status: 'approved' | 'denied') {
    if (!selectedApplication) return
    setBusy(true)
    setReviewError('')
    try {
      const response = await fetch(`/api/applications/${selectedApplication._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('authToken') || ''}` },
        body: JSON.stringify({ status }),
      })
      const result = await response.json() as ApiResponse
      if (!response.ok) throw new Error(result.error || 'Unable to update application status.')
      const updated = { ...selectedApplication, status, reviewedAt: new Date().toISOString() }
      setApplications((current) => current.map((application) => application._id === updated._id ? updated : application))
      setSelectedApplication(updated)
    } catch (cause) {
      setReviewError(cause instanceof Error ? cause.message : 'Unable to update application status.')
    } finally {
      setBusy(false)
    }
  }

  const isAdmin = user?.role === 'admin'

  return (
    <main className="application-page">
      <SiteHeader />
      <section className="application-dashboard">
        <button className="back-link application-back" onClick={() => navigate('/')}>← Back to organizations</button>
        <div className="application-page-heading">
          <div><p className="eyebrow">HILT APPLICATIONS</p><h1>{isAdmin ? 'Application review' : 'Your applications'}</h1><p className="application-subtitle">{isAdmin ? 'Review organization applications and their supporting documents.' : 'Keep track of your organization applications and start a new one.'}</p></div>
          {!showForm && <button className="button button-primary new-application-button" onClick={() => setShowForm(true)}>New application <span aria-hidden="true">＋</span></button>}
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        {showForm && <ApplicationForm onCreated={handleCreated} onCancel={() => setShowForm(false)} />}
        {!showForm && <>
          <div className="application-list-heading"><h2>{isAdmin ? 'All applications' : 'Submitted applications'}</h2><span>{applications.length} total</span></div>
          {loading && <p className="state-message">Loading applications…</p>}
          {!loading && !error && applications.length === 0 && <div className="application-empty"><div className="empty-icon" aria-hidden="true">✳</div><h3>No applications yet</h3><p>{isAdmin ? 'Submitted organization applications will appear here.' : 'Start an application to introduce your organization.'}</p>{!isAdmin && <button className="button button-primary" onClick={() => setShowForm(true)}>Create your first application</button>}</div>}
          {!loading && applications.length > 0 && <div className="application-list">{applications.map((application) => {
            const applicant = typeof application.userId === 'string' ? null : application.userId
            return <article className={`application-row ${isAdmin ? 'application-row-clickable' : ''}`} key={application._id} onClick={() => { if (isAdmin) { setSelectedApplication(application); setReviewError('') } }} onKeyDown={(event) => { if (isAdmin && event.key === 'Enter') setSelectedApplication(application) }} role={isAdmin ? 'button' : undefined} tabIndex={isAdmin ? 0 : undefined}>
              <div className="application-row-main"><div className="application-row-icon" aria-hidden="true">{application.organizationName.trim().charAt(0).toUpperCase()}</div><div><h3>{application.organizationName}</h3><p>{isAdmin && applicant ? `${applicant.firstName} ${applicant.lastName} · ${applicant.email}` : application.organizationDescription || 'No description provided.'}</p></div></div>
              <div className="application-row-meta"><span className={`status-badge status-${application.status}`}>{application.status}</span><span className="application-date">{new Date(application.createdAt).toLocaleDateString()}</span>{isAdmin && <span className="application-open-label">View details ↗</span>}</div>
            </article>
          })}</div>}
        </>}
      </section>
      <footer className="site-footer"><span>Hilt</span><span>Find your community.</span></footer>
      {selectedApplication && <ApplicationDetailsModal application={selectedApplication} busy={busy} error={reviewError} onClose={() => setSelectedApplication(null)} onReview={(status) => void reviewApplication(status)} />}
    </main>
  )
}

export default ApplicationPage
