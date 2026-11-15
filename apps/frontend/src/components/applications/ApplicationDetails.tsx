import type { Application } from '../../types'
import { Icon } from '../ui/Icon'
import { panelClass } from '../ui/styles'

export function ApplicationDetails({
  application,
  onBack,
}: {
  application: Application
  onBack: () => void
}) {
  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={onBack}
        className="mb-5 inline-flex items-center gap-2 text-sm text-muted hover:text-ink"
      >
        <Icon name="back" size={15} />
        My applications
      </button>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">
            {application.organizationName}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {application.status === 'pending'
              ? 'Pending review'
              : application.status}
          </p>
        </div>
        <span
          className={`rounded-full border border-line px-3 py-1.5 text-xs font-semibold capitalize ${application.status === 'approved' ? 'bg-[#edf2eb] text-active' : application.status === 'denied' ? 'bg-soft text-accent' : 'bg-paper text-muted'}`}
        >
          {application.status}
        </span>
      </div>
      <div className={`${panelClass} space-y-4 p-5`}>
        <div>
          <h3 className="font-semibold">About the club</h3>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted">
            {application.organizationDescription || 'No description supplied.'}
          </p>
        </div>
        <div className="border-t border-line pt-4">
          <h3 className="font-semibold">Application details</h3>
          <p className="mt-2 text-sm text-muted">
            {application.category || 'General'}
          </p>
          {application.contactEmail && (
            <a
              className="mt-1 block text-sm text-accent hover:underline"
              href={`mailto:${application.contactEmail}`}
            >
              {application.contactEmail}
            </a>
          )}
          {application.link && (
            <a
              className="mt-1 block text-sm text-accent hover:underline"
              href={application.link}
              target="_blank"
              rel="noreferrer"
            >
              Supporting link ↗
            </a>
          )}
        </div>
        <p className="border-t border-line pt-4 text-xs text-muted">
          Submitted {new Date(application.createdAt).toLocaleString()}
        </p>
      </div>
    </div>
  )
}
