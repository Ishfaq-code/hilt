import type { Organization } from '../types'

type OrganizationCardProps = {
  organization: Organization
  index: number
  onJoin: (organizationId: string) => void
  joining: boolean
}

function OrganizationCard({ organization, index, onJoin, joining }: OrganizationCardProps) {
  return (
    <article className="organization-card">
      <div className={`organization-symbol symbol-${index % 4}`} aria-hidden="true">
        {organization.name.trim().charAt(0).toUpperCase()}
      </div>
      <p className="card-index">COMMUNITY · {(index + 1).toString().padStart(2, '0')}</p>
      <h3>{organization.name}</h3>
      <p className="organization-description">
        {organization.description || 'A community bringing people together around shared interests and ideas.'}
      </p>
      <button className="join-button" onClick={() => onJoin(organization._id)} disabled={joining}>
        {joining ? 'Joining…' : 'Join organization'} <span aria-hidden="true">↗</span>
      </button>
    </article>
  )
}

export default OrganizationCard
