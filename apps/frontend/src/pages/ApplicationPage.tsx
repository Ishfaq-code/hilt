import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { buttonClass, Icon, inputClass, panelClass, secondaryClass } from '../components/wireframe/Design'
import type { Application, AuthUser } from '../types'

const steps = ['Club details', 'Contact and links', 'Review']
type Details = { organizationName: string; organizationDescription: string; category: string; contactEmail: string; link: string }
const emptyDetails: Details = { organizationName: '', organizationDescription: '', category: '', contactEmail: '', link: '' }

function NewApplication({ onSubmitted }: { onSubmitted: (application: Application) => void }) {
  const [step, setStep] = useState(0)
  const [details, setDetails] = useState<Details>(emptyDetails)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  function set<K extends keyof Details>(key: K, value: Details[K]) { setDetails((current) => ({ ...current, [key]: value })); setError('') }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (step < 2) { setStep((current) => current + 1); return }
    setBusy(true); setError('')
    try { const result = await api<Application>('/api/applications', { method: 'POST', body: JSON.stringify(details) }); onSubmitted(result) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to submit your application.') }
    finally { setBusy(false) }
  }
  return <div className="mt-6">
    <ol aria-label="Application steps" className="mb-5 flex flex-wrap gap-x-4 gap-y-2 text-sm">{steps.map((title, index) => <li key={title} aria-current={index === step ? 'step' : undefined} className={index === step ? 'font-semibold text-accent' : 'text-muted'}>{index + 1}. {title}</li>)}</ol>
    <h2 className="mb-3 text-xl font-semibold">{step === 2 ? 'Review your application' : steps[step]}</h2>
    <form className="space-y-4" onSubmit={(event) => void submit(event)}>
      {step === 0 && <div className={`${panelClass} space-y-4 p-5`}>
        <label className="block text-sm font-medium">Club name<input className={`${inputClass} mt-2`} autoComplete="organization" maxLength={120} required value={details.organizationName} onChange={(event) => set('organizationName', event.target.value)} /></label>
        <label className="block text-sm font-medium">Category<select className={`${inputClass} mt-2`} required value={details.category} onChange={(event) => set('category', event.target.value)}><option value="">Choose a category</option><option>Technology</option><option>Outdoors</option><option>Arts</option><option>Culture</option><option>Academic</option><option>Other</option></select></label>
        <label className="block text-sm font-medium">About the club<textarea className={`${inputClass} mt-2`} rows={4} maxLength={3000} required value={details.organizationDescription} onChange={(event) => set('organizationDescription', event.target.value)} /></label>
      </div>}
      {step === 1 && <div className={`${panelClass} space-y-4 p-5`}>
        <p className="text-sm font-medium">Organization contact information</p>
        <label className="block text-sm font-medium">Contact email<input type="email" className={`${inputClass} mt-2`} autoComplete="email" required value={details.contactEmail} onChange={(event) => set('contactEmail', event.target.value)} /></label>
        <label className="block text-sm font-medium">Supporting link <span className="font-normal text-muted">(optional)</span><input type="url" className={`${inputClass} mt-2`} placeholder="https://" value={details.link} onChange={(event) => set('link', event.target.value)} /></label>
      </div>}
      {step === 2 && <div className="space-y-3"><p className="text-lg font-semibold">{details.organizationName}</p><div className={`${panelClass} space-y-3 p-5`}><p className="text-xs font-semibold text-muted">{details.category}</p><p className="whitespace-pre-wrap text-sm leading-relaxed">{details.organizationDescription}</p><div className="border-t border-line pt-3 text-sm"><p><strong>Contact:</strong> {details.contactEmail}</p>{details.link && <p className="mt-1"><strong>Link:</strong> {details.link}</p>}</div></div><p className="text-sm text-muted">An administrator will review your application. You can follow its status from My applications.</p></div>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="flex justify-end gap-2">{step > 0 && <button type="button" className={secondaryClass} onClick={() => { setError(''); setStep((current) => current - 1) }}>Back</button>}<button className={buttonClass} disabled={busy}>{busy ? 'Submitting…' : step === 2 ? 'Submit application' : 'Continue'}</button></div>
    </form>
  </div>
}

function ApplicationDetails({ application, onBack }: { application: Application; onBack: () => void }) {
  return <div className="mt-6"><button type="button" onClick={onBack} className="mb-5 inline-flex items-center gap-2 text-sm text-muted hover:text-ink"><Icon name="back" size={15} />My applications</button><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-semibold">{application.organizationName}</h2><p className="mt-1 text-sm text-muted">{application.status === 'pending' ? 'Pending review' : application.status}</p></div><span className={`rounded-full border border-line px-3 py-1.5 text-xs font-semibold capitalize ${application.status === 'approved' ? 'bg-[#edf2eb] text-active' : application.status === 'denied' ? 'bg-soft text-accent' : 'bg-paper text-muted'}`}>{application.status}</span></div><div className={`${panelClass} space-y-4 p-5`}><div><h3 className="font-semibold">About the club</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted">{application.organizationDescription || 'No description supplied.'}</p></div><div className="border-t border-line pt-4"><h3 className="font-semibold">Application details</h3><p className="mt-2 text-sm text-muted">{application.category || 'General'}</p>{application.contactEmail && <a className="mt-1 block text-sm text-accent hover:underline" href={`mailto:${application.contactEmail}`}>{application.contactEmail}</a>}{application.link && <a className="mt-1 block text-sm text-accent hover:underline" href={application.link} target="_blank" rel="noreferrer">Supporting link ↗</a>}</div><p className="border-t border-line pt-4 text-xs text-muted">Submitted {new Date(application.createdAt).toLocaleString()}</p></div></div>
}

export default function ApplicationPage() {
  const navigate = useNavigate()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [selected, setSelected] = useState<Application | null>(null)
  const [tab, setTab] = useState<'New application' | 'My applications'>('New application')
  const [loading, setLoading] = useState(() => Boolean(sessionStorage.getItem('authToken')))
  const [error, setError] = useState('')
  useEffect(() => {
    const token = sessionStorage.getItem('authToken')
    if (!token) return
    let active = true
    api<AuthUser>('/api/users/me').then(async (profile) => {
      if (!active) return
      setUser(profile)
      if (profile.role === 'admin') { navigate('/admin', { replace: true }); return }
      const list = await api<Application[]>('/api/applications/mine')
      if (active) setApplications(list)
    }).catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : 'Unable to load applications.') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [navigate])
  return <section className="mx-auto max-w-6xl px-4 pt-9 sm:px-8 sm:pt-13">
    <h1 className="mb-4 text-3xl font-semibold tracking-tight">Apply for a club</h1>
    {!user && !loading && <div className={`${panelClass} p-5`}><p className="mb-4 text-sm text-muted">Sign in to submit an organization application and track its review.</p><Link to="/login" className={buttonClass}>Log in to apply</Link></div>}
    {loading && <p className="text-sm text-muted">Loading your applications…</p>}{error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {user && <><nav aria-label="Applications" className="flex gap-6 overflow-x-auto border-b border-line">{(['New application','My applications'] as const).map((item) => <button key={item} type="button" aria-current={tab === item ? 'page' : undefined} onClick={() => { setTab(item); setSelected(null) }} className={`shrink-0 border-b-2 px-0.5 py-3 text-sm font-semibold ${tab === item ? 'border-accent text-ink' : 'border-transparent text-muted hover:text-ink'}`}>{item}</button>)}</nav>
      {selected && tab === 'My applications' ? <ApplicationDetails application={selected} onBack={() => setSelected(null)} /> : tab === 'New application' ? <NewApplication onSubmitted={(application) => { setApplications((current) => [application, ...current]); setSelected(application); setTab('My applications') }} /> : <div className="mt-6">{applications.length ? <ul className={`${panelClass} divide-y divide-line`}>{applications.map((application) => <li key={application._id}><button type="button" onClick={() => setSelected(application)} className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-paper"><span><span className="block font-semibold">{application.organizationName}</span><span className="mt-1 block text-sm text-muted">{application.status === 'pending' ? 'Pending review' : application.status}</span></span><Icon name="arrow" size={16} /></button></li>)}</ul> : <p className={`${panelClass} p-5 text-sm text-muted`}>No applications yet.</p>}</div>}
    </>}
  </section>
}
