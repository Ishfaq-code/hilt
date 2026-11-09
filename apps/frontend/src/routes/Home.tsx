import ClubCard from '../components/ClubCard'
import PageFrame from '../components/PageFrame'
import { useClubWorkspace } from '../hooks/useClubWorkspace'
import { signInUrl } from '../navigation'
import type { Application, PageProps } from '../types'

function applicationStatus(application: Application) {
  if (application.approvalStatus === 'approved') {
    return 'Approved'
  }

  if (application.approvalStatus === 'rejected') {
    return 'Rejected'
  }

  return 'Awaiting review'
}

function reviewLabel(decision: string) {
  if (decision === 'approve') {
    return 'Approved'
  }

  return decision === 'reject' ? 'Rejection' : 'Clarification requested'
}

export default function Home(props: PageProps) {
  const workspace = useClubWorkspace('mine', props)
  const { data } = workspace

  return (
    <PageFrame title="Your clubs" workspace={workspace}>
      {data && (!props.session ? (
        <div className="empty-state">
          <p>Sign in to see your clubs and applications.</p>
          <a className="button-link" href={signInUrl()}>Sign in</a>
        </div>
      ) : (
        <>
          <div className="club-grid">
            {data.mine.map((club) => (
              <ClubCard key={club.id} club={club} workspace={workspace} />
            ))}
          </div>

          {!data.mine.length && (
            <div className="empty-state">
              <h2>You haven’t joined any clubs yet.</h2>
              <a href="/discover">Explore clubs</a>
            </div>
          )}

          <section className="applications">
            <h2>Your applications</h2>

            {!data.applications.length && (
              <p className="secondary">
                Your club applications and review updates will appear here.
              </p>
            )}

            {data.applications.map((application) => (
              <article className="application-row" key={application.id}>
                <div className="row-heading">
                  <h3>{application.name}</h3>
                  <span className={`application-status ${application.approvalStatus}`}>
                    {applicationStatus(application)}
                  </span>
                </div>

                <p>{application.description}</p>

                {application.reviews.map((review, index) => (
                  <p className="review-message" key={index}>
                    {reviewLabel(review.decision)}
                    {review.message ? `: ${review.message}` : ''}
                  </p>
                ))}

                {application.approvalStatus !== 'approved' && (
                  <a href={`/apply?application=${application.id}`}>
                    {application.approvalStatus === 'rejected'
                      ? 'Edit and resubmit'
                      : 'Edit application'}
                  </a>
                )}
              </article>
            ))}
          </section>
        </>
      ))}
    </PageFrame>
  )
}
