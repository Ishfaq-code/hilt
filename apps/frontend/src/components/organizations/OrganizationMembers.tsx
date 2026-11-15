import { inputClass, panelClass } from '../ui/styles'

import type { OrganizationManagement } from '../../hooks/useOrganizationManagement'

type Props = Pick<
  OrganizationManagement,
  | 'matchingMembers'
  | 'query'
  | 'setQuery'
  | 'updateMember'
  | 'removeMember'
  | 'actorRole'
>

export function OrganizationMembers({
  matchingMembers,
  query,
  setQuery,
  updateMember,
  removeMember,
  actorRole,
}: Props) {
  const canChangeRoles = actorRole === 'owner' || actorRole === 'admin'

  return (
    <section>
      <h1 className="mb-5 text-3xl font-semibold tracking-tight">Members</h1>
      <label className="block sm:max-w-sm">
        <span className="sr-only">Search members</span>
        <input
          type="search"
          className={inputClass}
          placeholder="Search members"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      {matchingMembers.length ? (
        <div
          className={`${panelClass} mt-4 overflow-x-auto`}
          tabIndex={0}
          role="region"
          aria-label="Member table"
        >
          <table
            className="w-full min-w-[38rem] text-left text-sm"
            aria-label="Organization members"
          >
            <thead className="bg-paper text-xs text-muted">
              <tr>
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3 text-right">Dues</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line border-t border-line">
              {matchingMembers.map((member) => (
                <tr key={member._id} className="hover:bg-paper">
                  <th scope="row" className="px-4 py-3">
                    <span className="font-semibold">
                      {member.userId.firstName} {member.userId.lastName}
                    </span>
                    <span className="mt-1 block text-xs font-normal text-muted">
                      {member.userId.email}
                    </span>
                  </th>
                  <td className="px-4 py-3 text-muted capitalize">
                    {member.organizationRole}
                  </td>
                  <td className="px-4 py-3 text-right text-muted">
                    {member.isPaid ? 'Paid' : 'Unpaid'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {member.organizationRole !== 'owner' && (
                        <>
                          {canChangeRoles && (
                            <button
                              className="text-xs font-semibold text-accent hover:underline"
                              onClick={() =>
                                void updateMember(member, {
                                  organizationRole:
                                    member.organizationRole === 'officer'
                                      ? 'student'
                                      : 'officer',
                                })
                              }
                            >
                              {member.organizationRole === 'officer'
                                ? 'Remove officer'
                                : 'Make officer'}
                            </button>
                          )}
                          {actorRole !== 'student' && (
                            <button
                              className="text-xs font-semibold text-accent hover:underline"
                              onClick={() =>
                                void updateMember(member, {
                                  isPaid: !member.isPaid,
                                })
                              }
                            >
                              {member.isPaid ? 'Mark unpaid' : 'Mark paid'}
                            </button>
                          )}
                          <button
                            className="text-xs font-semibold text-red-700 hover:underline"
                            onClick={() => void removeMember(member)}
                          >
                            Remove
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className={`${panelClass} mt-4 p-4 text-sm text-muted`}>
          No members match your search.
        </p>
      )}
    </section>
  )
}
