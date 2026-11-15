import { capacityLabel, permissionLabels } from '../../types/clubRoles'
import type { ApplicationRole } from '../../types/clubRoles'

export function RoleSetupSummary({ roles }: { roles: ApplicationRole[] }) {
  return (
    <section>
      <h3 className="font-semibold">Roles</h3>
      <ul className="mt-2 divide-y divide-line text-sm">
        {roles.map((role) => (
          <li key={role.name} className="py-2">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-medium">{role.name}</span>
              <span className="text-xs text-muted">
                {capacityLabel(role.maxMembers)}
              </span>
              {role.assignApplicant && (
                <span className="text-xs text-accent">
                  Assigned to applicant
                </span>
              )}
            </div>
            {role.permissions.length > 0 && (
              <p className="mt-1 text-xs text-muted">
                {role.permissions
                  .map((permission) => permissionLabels[permission])
                  .join(', ')}
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
