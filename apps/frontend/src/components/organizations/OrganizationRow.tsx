import type { Organization } from '../../types'
import { HorizontalCardRow } from '../ui/HorizontalCardRow'
import { panelClass } from '../ui/styles'
import OrganizationCard from './OrganizationCard'

export function OrganizationRow({
  title,
  organizations,
}: {
  title: string
  organizations: Organization[]
}) {
  if (!organizations.length) {
    return (
      <section className="mt-8">
        <h2 className="mb-3 text-2xl font-semibold tracking-tight">{title}</h2>
        <p className={`${panelClass} p-6 text-muted`}>No clubs to show.</p>
      </section>
    )
  }

  return (
    <HorizontalCardRow title={title}>
      {organizations.map((organization) => (
        <li key={organization._id} className="[&>a]:h-full">
          <OrganizationCard organization={organization} />
        </li>
      ))}
    </HorizontalCardRow>
  )
}
