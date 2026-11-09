import ClubCard from "../components/ClubCard";
import PageFrame from "../components/PageFrame";
import Pagination from "../components/Pagination";
import { useClubWorkspace } from "../hooks/useClubWorkspace";
import type { PageProps } from "../types";

export default function Discover(props: PageProps) {
  const workspace = useClubWorkspace("discover", props);
  const { data, search, universityId, offset, listingUrl } = workspace;

  return (
    <PageFrame
      title="Find your people."
      description="Discover clubs, meet other students, and find a place to belong."
      workspace={workspace}
    >
      {data && (
        <>
          <form className="search-row" action="/discover" method="get">
            <label className="search-field">
              Search clubs
              <input
                name="q"
                type="search"
                defaultValue={search}
                maxLength={100}
                placeholder="Club name"
              />
            </label>

            {data.universities.length > 1 && (
              <label>
                University
                <select name="universityId" defaultValue={universityId}>
                  <option value="">All universities</option>
                  {data.universities.map((university) => (
                    <option key={university.id} value={university.id}>
                      {university.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <button>Search</button>
          </form>

          <div className="club-grid">
            {data.clubs.map((club) => (
              <ClubCard key={club.id} club={club} workspace={workspace} />
            ))}
          </div>

          {!data.clubs.length && (
            <div className="empty-state">
              <h2>{search ? "No matching clubs" : "No clubs published yet"}</h2>
              <p>
                {search
                  ? "Try another name."
                  : "Clubs will appear here once they’re approved."}
              </p>
            </div>
          )}

          <Pagination offset={offset} total={data.total} href={listingUrl} />
        </>
      )}
    </PageFrame>
  );
}
