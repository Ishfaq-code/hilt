import PageFrame from "../components/PageFrame";
import Pagination from "../components/Pagination";
import { useClubWorkspace } from "../hooks/useClubWorkspace";
import type { PageProps } from "../types";

export default function Administration(props: PageProps) {
  const workspace = useClubWorkspace("admin", props);
  const { data, reviewStatus, offset, reviewUrl, openModal } = workspace;
  const canReview = props.session?.isSiteAdmin;

  return (
    <PageFrame title="Club applications" workspace={workspace}>
      {data &&
        (!canReview ? (
          <p>Site administrator access is required to review applications.</p>
        ) : (
          <section>
            <form
              action="/admin/applications"
              method="get"
              className="review-filter"
            >
              <label>
                Status
                <select name="status" defaultValue={reviewStatus}>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </label>
              <button>Filter</button>
            </form>

            {!data.queue.length && (
              <p className="empty-state">No {reviewStatus} applications.</p>
            )}

            {data.queue.map((application) => (
              <article className="application-row" key={application.id}>
                <div className="row-heading">
                  <h2>{application.name}</h2>
                  <span className="secondary">
                    {application.university?.name}
                  </span>
                </div>

                <p>{application.description}</p>
                <p className="secondary">Contact: {application.contactEmail}</p>

                <div className="club-links">
                  {application.links.map((link, index) => (
                    <a
                      key={index}
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {link} ↗
                    </a>
                  ))}
                </div>

                {application.reviews.map((review, index) => (
                  <p className="review-message" key={index}>
                    {review.decision}: {review.message || "Approved"}
                  </p>
                ))}

                {application.approvalStatus === "pending" && (
                  <button
                    onClick={() => openModal({ kind: "review", application })}
                  >
                    Review application
                  </button>
                )}
              </article>
            ))}

            <Pagination
              offset={offset}
              total={data.queueTotal}
              href={reviewUrl}
              previousLabel="Previous reviews"
              nextLabel="Next reviews"
            />
          </section>
        ))}
    </PageFrame>
  );
}
