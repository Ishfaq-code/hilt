import { signInUrl } from "../navigation";
import type { Club } from "../types";
import type { ClubWorkspace } from "../hooks/useClubWorkspace";

type Props = {
  club: Club;
  workspace: ClubWorkspace;
  detail?: boolean;
};

export default function ClubCard({ club, workspace, detail = false }: Props) {
  const { data, userId, pending, mutate, openModal, setNotice } = workspace;
  const membership = data?.mine.find((entry) => entry.id === club.id);

  async function joinClub() {
    const saved = await mutate(`/clubs/${club.id}/membership`, "PUT");

    if (saved) {
      setNotice(`Joined ${club.name}.`);
    }
  }

  function changeMembership() {
    if (membership) {
      openModal({ kind: "leave", club });
    } else {
      void joinClub();
    }
  }

  return (
    <article className="club-card">
      <p className="eyebrow">{club.university?.name}</p>

      {detail ? (
        <h2>About</h2>
      ) : (
        <h2>
          <a href={`/clubs/${club.id}`}>{club.name}</a>
        </h2>
      )}

      <p className="club-description">{club.description}</p>
      <p className="secondary">
        {club.memberCount} {club.memberCount === 1 ? "member" : "members"}
      </p>

      <div className="club-actions">
        {!userId ? (
          <a className="button-link" href={signInUrl(`/clubs/${club.id}`)}>
            Sign in to join
          </a>
        ) : (
          <button disabled={pending} onClick={changeMembership}>
            {membership ? "Leave club" : "Join club"}
          </button>
        )}

        {membership?.canManage && (
          <a href={`/clubs/${club.id}/members`}>Manage members →</a>
        )}
      </div>
    </article>
  );
}
