import { RoleSetupSummary } from '../roles/RoleSetupSummary'
import { Icon } from '../ui/Icon'
import {
  buttonClass,
  inputClass,
  panelClass,
  secondaryClass,
} from '../ui/styles'

import type { Administration } from '../../hooks/useAdministration'

type Props = Pick<
  Administration,
  | 'selected'
  | 'setSelected'
  | 'reviewing'
  | 'review'
  | 'query'
  | 'setQuery'
  | 'statusFilter'
  | 'setStatusFilter'
  | 'matchingApplications'
>

export function ApplicationReviews({
  selected,
  setSelected,
  reviewing,
  review,
  query,
  setQuery,
  statusFilter,
  setStatusFilter,
  matchingApplications,
}: Props) {
  return (
    <section>
      <h1 className="text-3xl font-semibold tracking-tight">
        Club applications
      </h1>
      {selected ? (
        <>
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="my-5 inline-flex items-center gap-2 text-sm text-muted hover:text-ink"
          >
            <Icon name="back" size={15} />
            All applications
          </button>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold">
                {selected.organizationName}
              </h2>
              <p className="mt-1 text-sm text-muted">
                {selected.status === 'pending'
                  ? 'Pending review'
                  : selected.status}
              </p>
            </div>
            <span className="rounded-full border border-line bg-paper px-3 py-1.5 text-xs font-medium capitalize">
              {selected.status}
            </span>
          </div>
          <p className="mt-4 mb-4 text-sm">
            {typeof selected.userId === 'string' ? (
              'Applicant details unavailable'
            ) : (
              <>
                <span className="font-medium">Applicant</span> ·{' '}
                {selected.userId.firstName} {selected.userId.lastName} ·{' '}
                {selected.userId.email}
              </>
            )}
          </p>
          <div className={`${panelClass} space-y-4 p-5`}>
            <div>
              <h3 className="font-semibold">About this organization</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted">
                {selected.organizationDescription || 'No description provided.'}
              </p>
            </div>
            <div className="border-t border-line pt-4">
              <h3 className="font-semibold">Organization details</h3>
              <p className="mt-2 text-sm text-muted">
                {selected.category || 'General'}
              </p>
              {selected.contactEmail && (
                <a
                  className="mt-1 block text-sm text-accent"
                  href={`mailto:${selected.contactEmail}`}
                >
                  {selected.contactEmail}
                </a>
              )}
              {selected.link && (
                <a
                  className="mt-1 block text-sm text-accent"
                  href={selected.link}
                  target="_blank"
                  rel="noreferrer"
                >
                  Supporting link ↗
                </a>
              )}
            </div>
            {selected.additionalDocuments?.map((document) => (
              <a
                key={document._id || document.link}
                href={document.link}
                target="_blank"
                rel="noreferrer"
                className="block text-sm font-semibold text-accent"
              >
                {document.name} ↗
              </a>
            ))}
            <p className="border-t border-line pt-4 text-xs text-muted">
              Submitted {new Date(selected.createdAt).toLocaleString()}
            </p>
          </div>
          {selected.roleSetup?.length ? (
            <RoleSetupSummary roles={selected.roleSetup} />
          ) : null}
          {selected.status === 'pending' && (
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                className={secondaryClass}
                disabled={reviewing}
                onClick={() => void review('denied')}
              >
                Deny application
              </button>
              <button
                className={buttonClass}
                disabled={reviewing}
                onClick={() => void review('approved')}
              >
                {reviewing ? 'Saving…' : 'Approve club'}
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="mt-5 flex flex-wrap gap-2">
            <label className="relative min-w-56 flex-1">
              <span className="sr-only">Search applications</span>
              <input
                className={inputClass}
                type="search"
                placeholder="Search applications"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <select
              className={`${inputClass} sm:w-52`}
              aria-label="Application status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="denied">Denied</option>
            </select>
          </div>
          {matchingApplications.length ? (
            <ul className={`${panelClass} mt-4 divide-y divide-line`}>
              {matchingApplications.map((application) => (
                <li key={application._id}>
                  <button
                    type="button"
                    onClick={() => setSelected(application)}
                    className="flex w-full items-center justify-between gap-4 p-4 text-left hover:bg-paper"
                  >
                    <span className="min-w-0">
                      <span className="block font-semibold">
                        {application.organizationName}
                      </span>
                      <span className="mt-1 block text-sm text-muted">
                        {typeof application.userId === 'string'
                          ? application.status
                          : `${application.userId.firstName} ${application.userId.lastName} · ${application.status}`}
                      </span>
                    </span>
                    <Icon name="arrow" size={16} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className={`${panelClass} mt-4 p-5 text-sm text-muted`}>
              No organization applications yet.
            </p>
          )}
        </>
      )}
    </section>
  )
}
