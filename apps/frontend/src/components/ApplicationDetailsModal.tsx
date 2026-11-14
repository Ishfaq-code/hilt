import type { Application, AuthUser } from '../types'

type ApplicationDetailsModalProps = {
  application: Application
  busy: boolean
  error: string
  onClose: () => void
  onReview: (status: 'approved' | 'denied') => void
}

function ApplicationDetailsModal({ application, busy, error, onClose, onReview }: ApplicationDetailsModalProps) {
  const applicant = typeof application.userId === 'string' ? null : application.userId as AuthUser

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="application-modal" role="dialog" aria-modal="true" aria-labelledby="application-modal-title">
        <div className="modal-heading"><div><p className="eyebrow">APPLICATION DETAILS</p><h2 id="application-modal-title">{application.organizationName}</h2></div><button className="modal-close" aria-label="Close details" onClick={onClose}>×</button></div>
        <span className={`status-badge status-${application.status}`}>{application.status}</span>
        <h3>About this organization</h3>
        <p className="application-detail-description">{application.organizationDescription || 'No description provided.'}</p>
        <h3>Submitted by</h3>
        {applicant ? <div className="applicant-details"><strong>{applicant.firstName} {applicant.lastName}</strong><a href={`mailto:${applicant.email}`}>{applicant.email}</a></div> : <p>Applicant details unavailable.</p>}
        <h3>Supporting document</h3>
        {application.additionalDocuments.map((document) => <a className="document-link" href={document.link} target="_blank" rel="noreferrer" key={document._id || document.link}>{document.name} <span aria-hidden="true">↗</span></a>)}
        <p className="application-meta">Submitted {new Date(application.createdAt).toLocaleString()}</p>
        {error && <p className="error" role="alert">{error}</p>}
        {application.status === 'pending' && <div className="review-actions"><button className="button button-secondary deny-button" disabled={busy} onClick={() => onReview('denied')}>{busy ? 'Saving…' : 'Deny application'}</button><button className="button button-primary" disabled={busy} onClick={() => onReview('approved')}>{busy ? 'Saving…' : 'Approve application'}</button></div>}
      </section>
    </div>
  )
}

export default ApplicationDetailsModal
