import PageFrame from '../components/PageFrame'
import { useClubWorkspace } from '../hooks/useClubWorkspace'
import { signInUrl } from '../navigation'
import type { PageProps } from '../types'

export default function Members(props: PageProps) {
  const workspace = useClubWorkspace('members', props)
  const { data, userId, clubId, pending, openModal } = workspace
  const canManage = data?.mine.some((club) => club.id === clubId && club.canManage)

  return (
    <PageFrame
      title="Members"
      back={{ href: `/clubs/${clubId}`, label: data?.selected?.name || 'Club' }}
      workspace={workspace}
    >
      {data?.selected && (
        !userId ? (
          <div className="empty-state">
            <p>Sign in to manage club members.</p>
            <a className="button-link" href={signInUrl()}>Sign in</a>
          </div>
        ) : !canManage ? (
          <p>Club administrator access is required to manage members.</p>
        ) : (
          <section className="members-page">
            <p className="secondary">
              Club administrators share management access. Keep at least one administrator.
            </p>

            <div className="member-list">
              {data.members.map((member) => (
                <div className="member-row" key={member.id}>
                  <div>
                    {member.firstName} {member.lastName}
                    {member.id === userId ? ' (you)' : ''}
                    <p className="secondary">
                      {member.isAdministrator ? 'Club administrator' : 'Member'}
                    </p>
                  </div>

                  <button
                    className="secondary-button"
                    disabled={pending}
                    onClick={() => openModal({ kind: 'administrator', member })}
                  >
                    {member.isAdministrator ? 'Remove administrator' : 'Make administrator'}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )
      )}
    </PageFrame>
  )
}
