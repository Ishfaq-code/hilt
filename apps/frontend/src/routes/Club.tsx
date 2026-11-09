import ClubCard from "../components/ClubCard";
import PageFrame from "../components/PageFrame";
import { useClubWorkspace } from "../hooks/useClubWorkspace";
import type { PageProps } from "../types";

export default function Club(props: PageProps) {
  const workspace = useClubWorkspace("club", props);
  const club = workspace.data?.selected;

  return (
    <PageFrame
      title={club?.name || "Club"}
      back={{ href: "/discover", label: "All clubs" }}
      workspace={workspace}
    >
      {club && (
        <div className="club-detail">
          <ClubCard club={club} workspace={workspace} detail />

          {!!club.links.length && (
            <section className="club-card">
              <h2>Find us online</h2>
              <ul>
                {club.links.map((link, index) => (
                  <li key={index}>
                    <a href={link} target="_blank" rel="noopener noreferrer">
                      {link} ↗
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </PageFrame>
  );
}
