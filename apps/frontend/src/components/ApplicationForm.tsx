import { useState } from 'react'
import type { FormEvent } from 'react'
import type { ApiResponse, Application } from '../types'

type ApplicationFormProps = {
  onCreated: (application: Application) => void
  onCancel: () => void
}

function ApplicationForm({ onCreated, onCancel }: ApplicationFormProps) {
  const [organizationName, setOrganizationName] = useState('')
  const [organizationDescription, setOrganizationDescription] = useState('')
  const [document, setDocument] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    const formData = new FormData()
    formData.set('organizationName', organizationName)
    formData.set('organizationDescription', organizationDescription)
    if (document) formData.set('document', document)
    try {
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: { Authorization: `Bearer ${sessionStorage.getItem('authToken') || ''}` },
        body: formData,
      })
      const result = (await response.json()) as Application & ApiResponse
      if (!response.ok) throw new Error(result.error || 'Unable to submit the application.')
      onCreated(result)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to submit the application.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="application-form-card">
      <div className="application-form-heading"><div><p className="eyebrow">GET STARTED</p><h2>New application</h2></div><button type="button" className="back-link" onClick={onCancel}>Cancel</button></div>
      {error && <p className="error" role="alert">{error}</p>}
      <form onSubmit={(event) => void submit(event)}>
        <label>Organization name<input value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} maxLength={120} required /></label>
        <label>Organization description<textarea value={organizationDescription} onChange={(event) => setOrganizationDescription(event.target.value)} rows={5} maxLength={3000} placeholder="Tell us about the organization and its goals." /></label>
        <label>Supporting document <span className="hint">Optional · PDF only, up to 10 MB.</span><input type="file" accept="application/pdf,.pdf" onChange={(event) => setDocument(event.target.files?.[0] || null)} /></label>
        <div className="form-actions"><button type="button" className="button button-secondary" onClick={onCancel}>Cancel</button><button type="submit" className="button button-primary" disabled={busy}>{busy ? 'Submitting…' : 'Submit application'}</button></div>
      </form>
    </section>
  )
}

export default ApplicationForm
