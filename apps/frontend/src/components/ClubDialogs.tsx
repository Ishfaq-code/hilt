import type { FormEvent } from "react";

import Dialog from "../Dialog";
import type { ClubWorkspace } from "../hooks/useClubWorkspace";

type Props = {
  workspace: ClubWorkspace;
};

export default function ClubDialogs({ workspace }: Props) {
  const {
    modal,
    pending,
    error,
    clubId,
    userId,
    offset,
    mutate,
    closeModal,
    setNotice,
    reviewUrl,
  } = workspace;

  if (!modal) {
    return null;
  }

  async function saveReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (modal?.kind !== "review") {
      return;
    }

    const form = new FormData(event.currentTarget);
    const saved = await mutate(
      `/admin/club-applications/${modal.application.id}/review`,
      "POST",
      {
        decision: form.get("decision"),
        message: form.get("message"),
        revision: modal.application.revision,
      },
    );

    if (!saved) {
      return;
    }

    if (offset) {
      location.assign(reviewUrl(0));
    }

    closeModal();
    setNotice("Review saved.");
  }

  async function leaveClub() {
    if (modal?.kind !== "leave") {
      return;
    }

    const saved = await mutate(`/clubs/${modal.club.id}/membership`, "DELETE");

    if (saved) {
      closeModal();
      setNotice(`Left ${modal.club.name}.`);
    }
  }

  async function changeAdministrator() {
    if (modal?.kind !== "administrator") {
      return;
    }

    const { member } = modal;
    const saved = await mutate(
      `/clubs/${clubId}/administrators/${member.id}`,
      member.isAdministrator ? "DELETE" : "PUT",
    );

    if (!saved) {
      return;
    }

    closeModal();

    if (member.id === userId && member.isAdministrator) {
      location.assign(`/clubs/${clubId}`);
    } else {
      const roleChange = member.isAdministrator
        ? "is no longer an administrator."
        : "is now an administrator.";

      setNotice(`${member.firstName} ${member.lastName} ${roleChange}`);
    }
  }

  let title: string;

  if (modal.kind === "review") {
    title = `Review ${modal.application.name}`;
  } else if (modal.kind === "leave") {
    title = `Leave ${modal.club.name}?`;
  } else {
    title = modal.member.isAdministrator
      ? "Remove administrator?"
      : "Make administrator?";
  }

  return (
    <Dialog title={title} pending={pending} close={closeModal}>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}

      {modal.kind === "review" && (
        <form onSubmit={saveReview}>
          <fieldset className="fields" disabled={pending}>
            <label>
              Decision
              <select name="decision">
                <option value="approve">Approve</option>
                <option value="request_changes">Request clarification</option>
                <option value="reject">Reject</option>
              </select>
            </label>

            <label>
              Message
              <textarea name="message" rows={4} maxLength={2000} />
            </label>

            <p className="hint">
              A message is required when rejecting or requesting clarification.
              The applicant can read it in My clubs.
            </p>

            <div className="dialog-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={closeModal}
              >
                Cancel
              </button>
              <button>{pending ? "Saving…" : "Save review"}</button>
            </div>
          </fieldset>
        </form>
      )}

      {modal.kind === "leave" && (
        <>
          <p>
            You can join again at any time. A club must keep at least one
            administrator.
          </p>

          <div className="dialog-actions">
            <button
              className="secondary-button"
              disabled={pending}
              onClick={closeModal}
            >
              Cancel
            </button>
            <button
              className="danger-button"
              disabled={pending}
              onClick={leaveClub}
            >
              {pending ? "Leaving…" : "Leave club"}
            </button>
          </div>
        </>
      )}

      {modal.kind === "administrator" && (
        <>
          <p>
            {modal.member.firstName} {modal.member.lastName} will{" "}
            {modal.member.isAdministrator ? "lose" : "gain"} access to manage
            this club.
          </p>

          <div className="dialog-actions">
            <button
              className="secondary-button"
              disabled={pending}
              onClick={closeModal}
            >
              Cancel
            </button>
            <button
              className={modal.member.isAdministrator ? "danger-button" : ""}
              disabled={pending}
              onClick={changeAdministrator}
            >
              {pending
                ? "Saving…"
                : modal.member.isAdministrator
                  ? "Remove administrator"
                  : "Make administrator"}
            </button>
          </div>
        </>
      )}
    </Dialog>
  );
}
