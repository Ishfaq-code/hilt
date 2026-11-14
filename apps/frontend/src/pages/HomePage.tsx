import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import OrganizationCard from '../components/OrganizationCard'
import SiteHeader from '../components/SiteHeader'
import type { ApiResponse, Organization } from '../types'

function HomePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState('')
  const [joining, setJoining] = useState('')
  const [joinMessage, setJoinMessage] = useState('')

  useEffect(() => {
    let active = true
    fetch('/api/organizations')
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load organizations. Please try again.')
        return response.json() as Promise<Organization[]>
      })
      .then((items) => { if (active) setOrganizations(items) })
      .catch((cause: unknown) => { if (active) setListError(cause instanceof Error ? cause.message : 'Unable to load organizations.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const joinOrganization = useCallback(async (organizationId: string) => {
    const token = sessionStorage.getItem('authToken')
    if (!token) {
      navigate('/login', { state: { from: '/', joinOrganizationId: organizationId } })
      return
    }
    setJoining(organizationId)
    setJoinMessage('')
    try {
      const response = await fetch('/api/memberships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ organizationId }),
      })
      const result = (await response.json()) as ApiResponse
      if (!response.ok) throw new Error(result.error || 'Unable to join this organization.')
      setJoinMessage('Your membership request was successful.')
    } catch (cause) {
      setJoinMessage(cause instanceof Error ? cause.message : 'Unable to join this organization.')
    } finally {
      setJoining('')
    }
  }, [navigate])

  useEffect(() => {
    const state = location.state as { joinOrganizationId?: string } | null
    if (!state?.joinOrganizationId || !sessionStorage.getItem('authToken')) return
    navigate('/', { replace: true, state: null })
    const timer = window.setTimeout(() => void joinOrganization(state.joinOrganizationId!), 0)
    return () => window.clearTimeout(timer)
  }, [joinOrganization, location.state, navigate])

  return (
    <main className="home-page">
      <SiteHeader />
      <section className="hero">
        <p className="eyebrow">FIND YOUR PEOPLE</p>
        <h1>Good things happen<br />when we <span>come together.</span></h1>
        <p className="hero-copy">Explore the organizations building community, creating opportunities, and making an impact.</p>
        <a className="scroll-link" href="#organizations">Explore organizations <span aria-hidden="true">↓</span></a>
        <div className="hero-orbit orbit-one" aria-hidden="true" /><div className="hero-orbit orbit-two" aria-hidden="true" />
      </section>
      <section className="organizations-section" id="organizations">
        <div className="section-heading"><div><p className="eyebrow">YOUR NEXT CHAPTER</p><h2>Organizations</h2></div><span className="organization-count">{organizations.length.toString().padStart(2, '0')} communities</span></div>
        {joinMessage && <p className="notice" role="status">{joinMessage}</p>}
        {loading && <p className="state-message">Loading organizations…</p>}
        {!loading && listError && <p className="error" role="alert">{listError}</p>}
        {!loading && !listError && organizations.length === 0 && <p className="state-message">There are no organizations to show yet. Check back soon.</p>}
        <div className="organization-grid">
          {organizations.map((organization, index) => (
            <OrganizationCard key={organization._id} organization={organization} index={index} onJoin={(id) => void joinOrganization(id)} joining={joining === organization._id} />
          ))}
        </div>
      </section>
      <footer className="site-footer"><span>Hilt</span><span>Find your community.</span></footer>
    </main>
  )
}

export default HomePage
